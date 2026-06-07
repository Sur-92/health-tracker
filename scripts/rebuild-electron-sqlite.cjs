#!/usr/bin/env node
/**
 * Rebuild better-sqlite3's native binary against Electron's ABI.
 *
 * Why this is needed:
 *  - System Node here is v26; Electron 28 bundles Node 18 (a different ABI).
 *    The binary npm installs (a Node-ABI prebuilt) makes Electron throw a
 *    NODE_MODULE_VERSION mismatch at runtime.
 *  - node-gyp cannot compile in place because this project's path contains
 *    spaces (and colons). So we copy better-sqlite3 into a clean temp dir,
 *    compile there against Electron's headers, and copy the .node back.
 *
 * Runs automatically via the "postinstall" npm hook, and can be run manually:
 *    node scripts/rebuild-electron-sqlite.cjs
 *
 * It is intentionally fail-soft: if Electron or better-sqlite3 isn't present
 * yet, it logs and exits 0 so it never blocks `npm install`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

function resolveFrom(rel) {
  try {
    return require.resolve(rel, { paths: [projectRoot] });
  } catch {
    return null;
  }
}

// node-gyp bakes its OWN install path into the generated Makefile (node_gyp_dir
// / addon.gypi prerequisites). If that path contains a space or a colon, GNU
// make misparses the rule ("multiple target patterns" / "target pattern
// contains no '%'") and the build dies. This project lives under a folder named
// ".../8:39:01 PM/..." — colon and spaces — so any node-gyp located *inside*
// this tree (node_modules/node-gyp, node_modules/@electron/node-gyp) can never
// work. We must use a node-gyp whose own path is clean (e.g. the global npm one
// under /opt/homebrew or /usr/local).
function hasUnsafeChars(p) {
  return /[\s:]/.test(p);
}

function findNodeGyps() {
  const candidates = [
    // Global npm's bundled node-gyp (clean Homebrew / standard layouts).
    '/opt/homebrew/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js',
    '/usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js',
    // Project-local fallbacks — only usable if the project path is clean.
    path.join(projectRoot, 'node_modules/node-gyp/bin/node-gyp.js'),
    path.join(projectRoot, 'node_modules/@electron/node-gyp/bin/node-gyp.js'),
  ];
  return candidates.filter((p) => {
    if (!fs.existsSync(p)) return false;
    if (hasUnsafeChars(p)) {
      console.log(`[rebuild-electron-sqlite] skipping node-gyp at unsafe path (space/colon): ${p}`);
      return false;
    }
    return true;
  });
}

function main() {
  const electronPkg = resolveFrom('electron/package.json');
  const betterSqlitePkg = resolveFrom('better-sqlite3/package.json');

  if (!electronPkg || !betterSqlitePkg) {
    console.log('[rebuild-electron-sqlite] electron or better-sqlite3 not installed yet — skipping.');
    return;
  }

  const electronVersion = require(electronPkg).version;
  const bs3Dir = path.dirname(betterSqlitePkg);
  const arch = process.arch; // arm64 on Apple Silicon
  const nodeGyps = findNodeGyps();

  if (nodeGyps.length === 0) {
    console.error('[rebuild-electron-sqlite] Could not locate node-gyp. Skipping (Electron build will be broken).');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bs3-electron-'));
  console.log(`[rebuild-electron-sqlite] electron=${electronVersion} arch=${arch}`);
  console.log(`[rebuild-electron-sqlite] building in ${tmp}`);

  try {
    // Copy the module into a space/colon-free directory so node-gyp can run.
    fs.cpSync(bs3Dir, tmp, { recursive: true });

    const builtBinary = path.join(tmp, 'build', 'Release', 'better_sqlite3.node');
    let built = false;

    for (const nodeGyp of nodeGyps) {
      fs.rmSync(path.join(tmp, 'build'), { recursive: true, force: true });
      console.log(`[rebuild-electron-sqlite] trying node-gyp: ${nodeGyp}`);

      const result = spawnSync(
        process.execPath,
        [
          nodeGyp,
          'rebuild',
          '--runtime=electron',
          `--target=${electronVersion}`,
          `--arch=${arch}`,
          '--dist-url=https://electronjs.org/headers',
        ],
        { cwd: tmp, stdio: 'inherit', env: process.env }
      );

      if (result.status === 0 && fs.existsSync(builtBinary)) {
        built = true;
        break;
      }
      console.warn(`[rebuild-electron-sqlite] that node-gyp failed (status ${result.status}); trying next.`);
    }

    if (!built) {
      throw new Error('all node-gyp candidates failed to build better-sqlite3 for Electron');
    }

    const destDir = path.join(bs3Dir, 'build', 'Release');
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(builtBinary, path.join(destDir, 'better_sqlite3.node'));

    console.log(`[rebuild-electron-sqlite] OK -> ${path.join(destDir, 'better_sqlite3.node')}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
