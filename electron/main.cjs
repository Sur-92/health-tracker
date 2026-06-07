const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const Database = require('better-sqlite3');

// --- Git cloud backup ----------------------------------------------------
// Mirrors the Divot backup pattern, but since Electron isn't sandboxed we run
// git directly here (no LaunchAgent/trigger file needed). Snapshots the live
// DB into the private ~/app-data repo and pushes to GitHub via the gh token.
const APP_DATA_REPO = path.join(os.homedir(), 'app-data');
const BACKUP_REMOTE = 'https://github.com/Sur-92/app-data.git';

// GUI-launched apps get a minimal PATH; ensure git/gh (Homebrew + system) resolve.
const BACKUP_ENV = () => ({
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`,
});

// Run a command, resolving { code, stdout, stderr } — never rejects, so callers
// can branch on exit code like the shell script does.
function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function backupStamp() {
  return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Local safety copy of the DB taken just before a restore, so a mistaken
// restore can be undone. Lives next to the live DB (never pushed anywhere).
function preRestorePath() {
  return path.join(path.dirname(DB_PATH), 'health-tracker.pre-restore.db');
}
function clearPreRestore() {
  try { fs.rmSync(preRestorePath(), { force: true }); } catch { /* ignore */ }
}

async function runBackup() {
  if (!fs.existsSync(path.join(APP_DATA_REPO, '.git'))) {
    return { ok: false, message: 'Backup repo (~/app-data) not found' };
  }
  const destDir = path.join(APP_DATA_REPO, 'HealthTracker');
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, 'health-tracker.db');

  // Consistent point-in-time snapshot of the live DB (safe while app runs).
  try {
    await db.backup(dest);
  } catch (e) {
    return { ok: false, message: `Snapshot failed: ${e.message}` };
  }

  const env = BACKUP_ENV();
  const git = (...args) => runCmd('git', args, { cwd: APP_DATA_REPO, env });

  await git('add', '-A');
  // `diff --cached --quiet` exits 0 when nothing is staged.
  if ((await git('diff', '--cached', '--quiet')).code === 0) {
    clearPreRestore(); // current state is the saved state
    return { ok: true, message: `Up to date — ${backupStamp()}` };
  }

  const commit = await git('commit', '-q', '-m', `HealthTracker snapshot ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  if (commit.code !== 0) return { ok: false, message: 'Commit failed' };

  const tok = await runCmd('gh', ['auth', 'token'], { env });
  const token = tok.code === 0 ? tok.stdout.trim() : '';
  const authUrl = token ? `https://x-access-token:${token}@github.com/Sur-92/app-data.git` : BACKUP_REMOTE;

  // Absorb any out-of-band commits on the remote before pushing.
  await git('fetch', '-q', authUrl, 'main');
  const rebase = await git('rebase', '-q', 'FETCH_HEAD');
  if (rebase.code !== 0) {
    await git('rebase', '--abort');
    return { ok: false, message: 'Rebase conflict — fix manually' };
  }

  let push;
  if (token) {
    push = await git('push', '-q', authUrl, 'HEAD:main');
    if (push.code === 0) await git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  } else {
    push = await git('push', '-q', 'origin', 'main');
  }
  if (push.code === 0) {
    clearPreRestore(); // restored state is now committed; drop the undo copy
    return { ok: true, message: `Backed up — ${backupStamp()}` };
  }
  return { ok: false, message: 'Saved locally; push failed' };
}

// Pull the latest snapshot from the cloud and swap it in for the live DB.
// Destructive: overwrites local data with the cloud copy (the renderer confirms
// first, then reloads).
async function runRestore() {
  if (!fs.existsSync(path.join(APP_DATA_REPO, '.git'))) {
    return { ok: false, message: 'Backup repo (~/app-data) not found' };
  }
  const snap = path.join(APP_DATA_REPO, 'HealthTracker', 'health-tracker.db');

  const env = BACKUP_ENV();
  const git = (...args) => runCmd('git', args, { cwd: APP_DATA_REPO, env });

  const tok = await runCmd('gh', ['auth', 'token'], { env });
  const token = tok.code === 0 ? tok.stdout.trim() : '';
  const authUrl = token ? `https://x-access-token:${token}@github.com/Sur-92/app-data.git` : BACKUP_REMOTE;

  // Fetch and check out just our snapshot file at the remote's latest.
  if ((await git('fetch', '-q', authUrl, 'main')).code !== 0) {
    return { ok: false, message: 'Could not reach cloud backup' };
  }
  const co = await git('checkout', 'FETCH_HEAD', '--', 'HealthTracker/health-tracker.db');
  if (co.code !== 0 || !fs.existsSync(snap)) {
    return { ok: false, message: 'No cloud backup found' };
  }

  // Safety: consistent copy of the CURRENT db before overwriting it. Abort the
  // whole restore if this fails, so we never do an irreversible overwrite.
  try {
    await db.backup(preRestorePath());
  } catch (e) {
    return { ok: false, message: `Restore aborted: safety copy failed (${e.message})` };
  }

  // Swap the file in for the live DB, then reopen the connection.
  try {
    db.close();
    for (const ext of ['', '-wal', '-shm']) {
      try { fs.rmSync(DB_PATH + ext); } catch { /* ignore */ }
    }
    fs.copyFileSync(snap, DB_PATH);
    db = new Database(DB_PATH);
  } catch (e) {
    try { db = new Database(DB_PATH); } catch { /* leave closed */ }
    return { ok: false, message: `Restore failed: ${e.message}` };
  }
  return { ok: true, message: `Restored — ${backupStamp()}` };
}

// Undo the last restore by swapping the pre-restore safety copy back in.
async function runRestoreUndo() {
  const safety = preRestorePath();
  if (!fs.existsSync(safety)) {
    return { ok: false, message: 'No pre-restore copy to undo' };
  }
  try {
    db.close();
    for (const ext of ['', '-wal', '-shm']) {
      try { fs.rmSync(DB_PATH + ext); } catch { /* ignore */ }
    }
    fs.copyFileSync(safety, DB_PATH);
    db = new Database(DB_PATH);
    fs.rmSync(safety, { force: true }); // consume it
  } catch (e) {
    try { db = new Database(DB_PATH); } catch { /* leave closed */ }
    return { ok: false, message: `Undo failed: ${e.message}` };
  }
  return { ok: true, message: `Reverted to pre-restore — ${backupStamp()}` };
}

let mainWindow;
let db;
let DB_PATH;

// Initialize database
function initDatabase() {
  // Database path - in app's user data directory for persistence
  DB_PATH = path.join(app.getPath('userData'), 'health-tracker.db');

  db = new Database(DB_PATH);

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      servingSize TEXT,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      saturatedFat REAL DEFAULT 0,
      transFat REAL DEFAULT 0,
      fiber REAL DEFAULT 0,
      sugar REAL DEFAULT 0,
      addedSugar REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      cholesterol REAL DEFAULT 0,
      vitA REAL DEFAULT 0,
      vitC REAL DEFAULT 0,
      vitD REAL DEFAULT 0,
      vitE REAL DEFAULT 0,
      vitK REAL DEFAULT 0,
      thiamin REAL DEFAULT 0,
      riboflavin REAL DEFAULT 0,
      niacin REAL DEFAULT 0,
      pantothenicAcid REAL DEFAULT 0,
      b6 REAL DEFAULT 0,
      biotin REAL DEFAULT 0,
      folate REAL DEFAULT 0,
      b12 REAL DEFAULT 0,
      choline REAL DEFAULT 0,
      calcium REAL DEFAULT 0,
      iron REAL DEFAULT 0,
      magnesium REAL DEFAULT 0,
      phosphorus REAL DEFAULT 0,
      potassium REAL DEFAULT 0,
      zinc REAL DEFAULT 0,
      copper REAL DEFAULT 0,
      manganese REAL DEFAULT 0,
      selenium REAL DEFAULT 0,
      iodine REAL DEFAULT 0,
      chromium REAL DEFAULT 0,
      molybdenum REAL DEFAULT 0,
      omega3ALA REAL DEFAULT 0,
      omega3EPA REAL DEFAULT 0,
      omega3DHA REAL DEFAULT 0,
      nac REAL DEFAULT 0,
      lionsMane REAL DEFAULT 0,
      creatine REAL DEFAULT 0,
      lTheanine REAL DEFAULT 0,
      ashwagandha REAL DEFAULT 0,
      shilajit REAL DEFAULT 0,
      lysine REAL DEFAULT 0,
      glycine REAL DEFAULT 0,
      taurine REAL DEFAULT 0,
      rhodiola REAL DEFAULT 0,
      caffeine REAL DEFAULT 0,
      citicoline REAL DEFAULT 0,
      alphaGPC REAL DEFAULT 0,
      uridine REAL DEFAULT 0,
      brain REAL DEFAULT 0,
      heart REAL DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      weight REAL,
      systolicBP INTEGER,
      diastolicBP INTEGER,
      heartRate INTEGER,
      spO2 INTEGER,
      temperature REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_vitals_date ON vitals(date)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      birthdate TEXT,
      sex TEXT,
      height_inches REAL,
      goal_weight REAL,
      activity_level TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default row if not exists
  db.exec(`INSERT OR IGNORE INTO user_settings (id) VALUES (1)`);

  // Nutrition config table - stores complete nutrition targets as JSON
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_data TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      food_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date)`);

  console.log('Database initialized at:', DB_PATH);
}

// Create window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// IPC Handlers for database operations
const FOOD_COLUMNS = [
  'name', 'category', 'servingSize', 'calories', 'protein', 'carbs', 'fat',
  'saturatedFat', 'transFat', 'fiber', 'sugar', 'addedSugar', 'sodium', 'cholesterol',
  'vitA', 'vitC', 'vitD', 'vitE', 'vitK', 'thiamin', 'riboflavin', 'niacin',
  'pantothenicAcid', 'b6', 'biotin', 'folate', 'b12', 'choline',
  'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'zinc', 'copper',
  'manganese', 'selenium', 'iodine', 'chromium', 'molybdenum',
  'omega3ALA', 'omega3EPA', 'omega3DHA',
  'nac', 'lionsMane', 'creatine', 'lTheanine', 'ashwagandha', 'shilajit',
  'lysine', 'glycine', 'taurine', 'rhodiola', 'caffeine', 'citicoline', 'alphaGPC', 'uridine',
  'brain', 'heart'
];

// Register IPC handlers
function registerIpcHandlers() {
  ipcMain.handle('db:getAllFoods', () => {
    const stmt = db.prepare('SELECT * FROM foods ORDER BY name');
    return stmt.all();
  });

  ipcMain.handle('db:foodExists', (event, name) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM foods WHERE name = ?');
    const result = stmt.get(name);
    return result.count > 0;
  });

  ipcMain.handle('db:addFood', (event, food) => {
    // Check if exists
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM foods WHERE name = ?');
    const exists = checkStmt.get(food.name);
    if (exists.count > 0) return false;

    const placeholders = FOOD_COLUMNS.map(() => '?').join(', ');
    const values = FOOD_COLUMNS.map(col => {
      if (col === 'name' || col === 'category' || col === 'servingSize') {
        return food[col] || null;
      }
      return food[col] || 0;
    });

    const stmt = db.prepare(`INSERT INTO foods (${FOOD_COLUMNS.join(', ')}) VALUES (${placeholders})`);
    stmt.run(values);
    return true;
  });

  ipcMain.handle('db:deleteFood', (event, foodId) => {
    const stmt = db.prepare('DELETE FROM foods WHERE id = ?');
    stmt.run(foodId);
    return true;
  });

  ipcMain.handle('db:saveDayLog', (event, date, foods) => {
    // Delete existing
    const deleteStmt = db.prepare('DELETE FROM daily_logs WHERE date = ?');
    deleteStmt.run(date);

    // Insert new
    if (foods.length > 0) {
      const insertStmt = db.prepare('INSERT INTO daily_logs (date, food_data) VALUES (?, ?)');
      insertStmt.run(date, JSON.stringify(foods));
    }
    return true;
  });

  ipcMain.handle('db:getDayLog', (event, date) => {
    const stmt = db.prepare('SELECT food_data FROM daily_logs WHERE date = ?');
    const result = stmt.get(date);
    if (result) {
      try {
        return JSON.parse(result.food_data);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  ipcMain.handle('db:getAllDayLogs', () => {
    const stmt = db.prepare('SELECT date, food_data FROM daily_logs ORDER BY date DESC');
    const rows = stmt.all();
    const logs = {};
    for (const row of rows) {
      try {
        logs[row.date] = JSON.parse(row.food_data);
      } catch (e) {
        // skip
      }
    }
    return logs;
  });

  // Vitals handlers
  ipcMain.handle('db:addVital', (event, vital) => {
    const stmt = db.prepare(`
      INSERT INTO vitals (date, time, weight, systolicBP, diastolicBP, heartRate, spO2, temperature, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      vital.date,
      vital.time,
      vital.weight || null,
      vital.systolicBP || null,
      vital.diastolicBP || null,
      vital.heartRate || null,
      vital.spO2 || null,
      vital.temperature || null,
      vital.notes || null
    );
    return result.lastInsertRowid;
  });

  ipcMain.handle('db:getVitalsForDate', (event, date) => {
    const stmt = db.prepare('SELECT * FROM vitals WHERE date = ? ORDER BY time DESC');
    return stmt.all(date);
  });

  ipcMain.handle('db:getAllVitals', () => {
    const stmt = db.prepare('SELECT * FROM vitals ORDER BY date DESC, time DESC');
    return stmt.all();
  });

  ipcMain.handle('db:deleteVital', (event, vitalId) => {
    const stmt = db.prepare('DELETE FROM vitals WHERE id = ?');
    stmt.run(vitalId);
    return true;
  });

  ipcMain.handle('db:getVitalsRange', (event, startDate, endDate) => {
    const stmt = db.prepare('SELECT * FROM vitals WHERE date >= ? AND date <= ? ORDER BY date ASC, time ASC');
    return stmt.all(startDate, endDate);
  });

  // Settings handlers
  ipcMain.handle('db:getSettings', () => {
    const stmt = db.prepare('SELECT * FROM user_settings WHERE id = 1');
    return stmt.get() || {};
  });

  ipcMain.handle('db:saveSettings', (event, settings) => {
    const stmt = db.prepare(`
      UPDATE user_settings SET
        name = ?,
        birthdate = ?,
        sex = ?,
        height_inches = ?,
        goal_weight = ?,
        activity_level = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    stmt.run(
      settings.name || null,
      settings.birthdate || null,
      settings.sex || null,
      settings.height_inches || null,
      settings.goal_weight || null,
      settings.activity_level || null,
      settings.notes || null
    );
    return true;
  });

  // Nutrition config handlers
  ipcMain.handle('db:getNutritionConfig', () => {
    const stmt = db.prepare('SELECT config_data FROM nutrition_config WHERE id = 1');
    const result = stmt.get();
    if (result) {
      try {
        return JSON.parse(result.config_data);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  ipcMain.handle('db:saveNutritionConfig', (event, config) => {
    const configData = JSON.stringify(config);
    // Delete existing and insert new (upsert)
    db.prepare('DELETE FROM nutrition_config WHERE id = 1').run();
    const stmt = db.prepare('INSERT INTO nutrition_config (id, config_data) VALUES (1, ?)');
    stmt.run(configData);
    return true;
  });

  // Cloud backup: snapshot DB into ~/app-data and push to GitHub
  ipcMain.handle('backup:run', async () => {
    try {
      return await runBackup();
    } catch (e) {
      return { ok: false, message: `Backup error: ${e.message}` };
    }
  });

  // Cloud restore: pull latest snapshot from GitHub and swap it in
  ipcMain.handle('restore:run', async () => {
    try {
      return await runRestore();
    } catch (e) {
      return { ok: false, message: `Restore error: ${e.message}` };
    }
  });

  // Undo the last restore (swap the pre-restore safety copy back in)
  ipcMain.handle('restore:undo', async () => {
    try {
      return await runRestoreUndo();
    } catch (e) {
      return { ok: false, message: `Undo error: ${e.message}` };
    }
  });

  // Whether an undo (pre-restore copy) is currently available
  ipcMain.handle('restore:hasPrev', () => {
    try { return fs.existsSync(preRestorePath()); } catch { return false; }
  });
}

// App lifecycle
app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});