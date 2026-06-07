// Database abstraction layer
// Uses Electron IPC when available, falls back to sql.js + IndexedDB for web

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

// ============================================
// ELECTRON MODE - Use IPC to main process
// ============================================
if (isElectron) {
  console.log('Running in Electron mode - using native SQLite');
}

// ============================================
// WEB MODE - Use sql.js + IndexedDB
// ============================================
import initSqlJs from 'sql.js';

let db = null;
let SQL = null;

function getDbName() {
  return 'health-tracker-default';
}

// IndexedDB helpers (web only)
function openIndexedDB() {
  const dbName = getDbName();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const idb = event.target.result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database');
      }
    };
  });
}

async function loadFromIndexedDB() {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('database', 'readonly');
      const store = tx.objectStore('database');
      const request = store.get('sqliteDb');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (e) {
    console.error('Error loading from IndexedDB:', e);
    return null;
  }
}

async function saveToIndexedDB() {
  if (!db) return;
  try {
    const data = db.export();
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('database', 'readwrite');
      const store = tx.objectStore('database');
      const request = store.put(data, 'sqliteDb');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (e) {
    console.error('Error saving to IndexedDB:', e);
  }
}

async function initWebDatabase() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `${import.meta.env.BASE_URL}${file}`
    });
  }

  const savedData = await loadFromIndexedDB();

  if (savedData) {
    db = new SQL.Database(savedData);
  } else {
    // Create fresh empty database
    db = new SQL.Database();
  }

  ensureTablesExist();
  await saveToIndexedDB();

  return db;
}

function ensureTablesExist() {
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      food_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date)`);

  db.run(`
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
  db.run(`CREATE INDEX IF NOT EXISTS idx_vitals_date ON vitals(date)`);

  db.run(`
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
  db.run(`INSERT OR IGNORE INTO user_settings (id) VALUES (1)`);

  // Nutrition config table - stores complete nutrition targets as JSON
  db.run(`
    CREATE TABLE IF NOT EXISTS nutrition_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_data TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
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
}

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

function insertFoodIntoWebDb(food) {
  if (!db) return;
  const placeholders = FOOD_COLUMNS.map(() => '?').join(', ');
  const values = FOOD_COLUMNS.map(col => food[col] ?? (typeof food[col] === 'string' ? null : 0));
  try {
    db.run(`INSERT INTO foods (${FOOD_COLUMNS.join(', ')}) VALUES (${placeholders})`, values);
  } catch (e) {
    console.error('Error inserting food:', e);
  }
}

// ============================================
// EXPORTED FUNCTIONS - Auto-detect mode
// ============================================

export async function getAllFoods() {
  if (isElectron) {
    return window.electronAPI.getAllFoods();
  }

  const database = await initWebDatabase();
  const results = database.exec('SELECT * FROM foods ORDER BY name');
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const food = {};
    columns.forEach((col, i) => {
      food[col] = row[i];
    });
    return food;
  });
}

export async function foodExists(name) {
  if (isElectron) {
    return window.electronAPI.foodExists(name);
  }

  const database = await initWebDatabase();
  const stmt = database.prepare('SELECT COUNT(*) as count FROM foods WHERE name = ?');
  stmt.bind([name]);
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result.count > 0;
}

export async function addFood(food) {
  if (isElectron) {
    return window.electronAPI.addFood(food);
  }

  await initWebDatabase();
  if (await foodExists(food.name)) {
    return false;
  }
  insertFoodIntoWebDb(food);
  await saveToIndexedDB();
  return true;
}

export async function deleteFood(foodId) {
  if (isElectron) {
    return window.electronAPI.deleteFood(foodId);
  }

  await initWebDatabase();
  db.run('DELETE FROM foods WHERE id = ?', [foodId]);
  await saveToIndexedDB();
  return true;
}

export async function saveDayLog(date, foods) {
  if (isElectron) {
    return window.electronAPI.saveDayLog(date, foods);
  }

  await initWebDatabase();
  db.run('DELETE FROM daily_logs WHERE date = ?', [date]);
  if (foods.length > 0) {
    const foodData = JSON.stringify(foods);
    db.run('INSERT INTO daily_logs (date, food_data) VALUES (?, ?)', [date, foodData]);
  }
  await saveToIndexedDB();
}

export async function getDayLog(date) {
  if (isElectron) {
    return window.electronAPI.getDayLog(date);
  }

  await initWebDatabase();
  const stmt = db.prepare('SELECT food_data FROM daily_logs WHERE date = ?');
  stmt.bind([date]);

  let foods = [];
  if (stmt.step()) {
    const result = stmt.getAsObject();
    try {
      foods = JSON.parse(result.food_data);
    } catch (e) {
      console.error('Error parsing food data:', e);
    }
  }
  stmt.free();
  return foods;
}

export async function getAllDayLogs() {
  if (isElectron) {
    return window.electronAPI.getAllDayLogs();
  }

  await initWebDatabase();
  const results = db.exec('SELECT date, food_data FROM daily_logs ORDER BY date DESC');
  if (results.length === 0) return {};

  const logs = {};
  results[0].values.forEach(([date, foodData]) => {
    try {
      logs[date] = JSON.parse(foodData);
    } catch (e) {
      console.error('Error parsing food data for', date, e);
    }
  });
  return logs;
}

export async function getCategories() {
  if (isElectron) {
    const foods = await window.electronAPI.getAllFoods();
    const categories = [...new Set(foods.map(f => f.category).filter(Boolean))];
    return categories.sort();
  }

  const database = await initWebDatabase();
  const results = database.exec('SELECT DISTINCT category FROM foods WHERE category IS NOT NULL ORDER BY category');
  if (results.length === 0) return [];
  return results[0].values.map(row => row[0]);
}

export async function searchFoods(query) {
  if (isElectron) {
    const foods = await window.electronAPI.getAllFoods();
    return foods.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  }

  const database = await initWebDatabase();
  const stmt = database.prepare('SELECT * FROM foods WHERE name LIKE ? ORDER BY name');
  stmt.bind([`%${query}%`]);

  const foods = [];
  while (stmt.step()) {
    foods.push(stmt.getAsObject());
  }
  stmt.free();
  return foods;
}

// ============================================
// VITALS FUNCTIONS
// ============================================

export async function addVital(vital) {
  if (isElectron) {
    return window.electronAPI.addVital(vital);
  }

  await initWebDatabase();
  db.run(`
    INSERT INTO vitals (date, time, weight, systolicBP, diastolicBP, heartRate, spO2, temperature, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    vital.date,
    vital.time,
    vital.weight || null,
    vital.systolicBP || null,
    vital.diastolicBP || null,
    vital.heartRate || null,
    vital.spO2 || null,
    vital.temperature || null,
    vital.notes || null
  ]);
  await saveToIndexedDB();
  return true;
}

export async function getVitalsForDate(date) {
  if (isElectron) {
    return window.electronAPI.getVitalsForDate(date);
  }

  await initWebDatabase();
  const results = db.exec(`SELECT * FROM vitals WHERE date = ? ORDER BY time DESC`, [date]);
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const vital = {};
    columns.forEach((col, i) => {
      vital[col] = row[i];
    });
    return vital;
  });
}

export async function getAllVitals() {
  if (isElectron) {
    return window.electronAPI.getAllVitals();
  }

  await initWebDatabase();
  const results = db.exec('SELECT * FROM vitals ORDER BY date DESC, time DESC');
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const vital = {};
    columns.forEach((col, i) => {
      vital[col] = row[i];
    });
    return vital;
  });
}

export async function deleteVital(vitalId) {
  if (isElectron) {
    return window.electronAPI.deleteVital(vitalId);
  }

  await initWebDatabase();
  db.run('DELETE FROM vitals WHERE id = ?', [vitalId]);
  await saveToIndexedDB();
  return true;
}

export async function getVitalsRange(startDate, endDate) {
  if (isElectron) {
    return window.electronAPI.getVitalsRange(startDate, endDate);
  }

  await initWebDatabase();
  const results = db.exec(
    'SELECT * FROM vitals WHERE date >= ? AND date <= ? ORDER BY date ASC, time ASC',
    [startDate, endDate]
  );
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map(row => {
    const vital = {};
    columns.forEach((col, i) => {
      vital[col] = row[i];
    });
    return vital;
  });
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

export async function getSettings() {
  if (isElectron) {
    return window.electronAPI.getSettings();
  }

  await initWebDatabase();
  const results = db.exec('SELECT * FROM user_settings WHERE id = 1');
  if (results.length === 0) return {};

  const columns = results[0].columns;
  const row = results[0].values[0];
  const settings = {};
  columns.forEach((col, i) => {
    settings[col] = row[i];
  });
  return settings;
}

export async function saveSettings(settings) {
  if (isElectron) {
    return window.electronAPI.saveSettings(settings);
  }

  await initWebDatabase();
  db.run(`
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
  `, [
    settings.name || null,
    settings.birthdate || null,
    settings.sex || null,
    settings.height_inches || null,
    settings.goal_weight || null,
    settings.activity_level || null,
    settings.notes || null
  ]);
  await saveToIndexedDB();
  return true;
}

// ============================================
// NUTRITION CONFIG FUNCTIONS
// ============================================

export async function getNutritionConfig() {
  if (isElectron) {
    return window.electronAPI.getNutritionConfig();
  }

  await initWebDatabase();
  const results = db.exec('SELECT config_data FROM nutrition_config WHERE id = 1');
  if (results.length === 0 || results[0].values.length === 0) {
    return null;
  }

  try {
    return JSON.parse(results[0].values[0][0]);
  } catch (e) {
    console.error('Error parsing nutrition config:', e);
    return null;
  }
}

export async function saveNutritionConfig(config) {
  if (isElectron) {
    return window.electronAPI.saveNutritionConfig(config);
  }

  await initWebDatabase();
  const configData = JSON.stringify(config);

  // Upsert - insert or replace
  db.run('DELETE FROM nutrition_config WHERE id = 1');
  db.run('INSERT INTO nutrition_config (id, config_data) VALUES (1, ?)', [configData]);

  await saveToIndexedDB();
  return true;
}

// ============================================
// CLOUD BACKUP (desktop only)
// ============================================

export const canBackup = isElectron;

export async function backupData() {
  if (isElectron) {
    return window.electronAPI.backup();
  }
  return { ok: false, message: 'Backup is available in the desktop app only' };
}

export async function restoreData() {
  if (isElectron) {
    return window.electronAPI.restore();
  }
  return { ok: false, message: 'Restore is available in the desktop app only' };
}