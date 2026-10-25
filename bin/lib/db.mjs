import fs from 'node:fs';
import path from 'node:path';
import { c } from './output.mjs';

const DEFAULT_DB_FILENAME = 'vellum-db.json';
const LEGACY_DB_FILENAME = 'dnd5e-db.json';

/**
 * Checks if a legacy database file exists in a target directory and migrates (renames) it
 * to the new vellum-db.json name if the new file does not yet exist.
 * Returns the resolved path to vellum-db.json if found/migrated, or null.
 */
function tryMigrateAndResolve(dirPath) {
  const newPath = path.resolve(dirPath, DEFAULT_DB_FILENAME);
  const legacyPath = path.resolve(dirPath, LEGACY_DB_FILENAME);

  if (fs.existsSync(newPath)) {
    return newPath;
  }

  if (fs.existsSync(legacyPath)) {
    try {
      fs.renameSync(legacyPath, newPath);
      return newPath;
    } catch {
      try {
        fs.copyFileSync(legacyPath, newPath);
        fs.unlinkSync(legacyPath);
        return newPath;
      } catch {
        return legacyPath;
      }
    }
  }

  return null;
}

/**
 * Returns the default Tauri AppData storage directory where desktop Vellum stores its database.
 */
function getTauriAppDataDir() {
  const identifier = 'com.vellum.dmstudio';
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, identifier);
  }
  if (process.platform === 'darwin' && process.env.HOME) {
    return path.join(process.env.HOME, 'Library', 'Application Support', identifier);
  }
  if (process.env.HOME) {
    return path.join(process.env.HOME, '.config', identifier);
  }
  return null;
}

/**
 * Resolves the path to the Vellum database file.
 */
export function resolveDbPath(options = {}) {
  if (options.db) {
    const customPath = path.resolve(process.cwd(), options.db);
    if (fs.existsSync(customPath)) {
      return customPath;
    }
    const customDir = path.dirname(customPath);
    const migrated = tryMigrateAndResolve(customDir);
    if (migrated) return migrated;
    return customPath;
  }

  if (process.env.VELLUM_DB_PATH) {
    const envPath = path.resolve(process.cwd(), process.env.VELLUM_DB_PATH);
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    const envDir = path.dirname(envPath);
    const migrated = tryMigrateAndResolve(envDir);
    if (migrated) return migrated;
    return envPath;
  }

  // 1. Current working directory /data/vellum-db.json (or legacy dnd5e-db.json)
  const cwdData = path.resolve(process.cwd(), 'data');
  const cwdFound = tryMigrateAndResolve(cwdData);
  if (cwdFound) return cwdFound;

  // 2. Check if we're in a worktree (e.g. .claude/worktrees/<name>)
  const worktreeParentData = path.resolve(process.cwd(), '..', '..', 'data');
  const worktreeFound = tryMigrateAndResolve(worktreeParentData);
  if (worktreeFound) return worktreeFound;

  // 3. Search up directories for a data/ folder until root
  let currentDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidateData = path.resolve(currentDir, 'data');
    const candidateFound = tryMigrateAndResolve(candidateData);
    if (candidateFound) {
      return candidateFound;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // 4. Auto-discover desktop app database in OS AppData directory
  const appDataDir = getTauriAppDataDir();
  if (appDataDir && fs.existsSync(appDataDir)) {
    const appDataFound = tryMigrateAndResolve(appDataDir);
    if (appDataFound) {
      return appDataFound;
    }
  }

  // Fallback: default to cwd's data directory vellum-db.json
  return path.resolve(process.cwd(), 'data', DEFAULT_DB_FILENAME);
}

/**
 * Loads the database from disk, initializing with default seed if absent.
 */
export function loadDb(options = {}) {
  const dbPath = resolveDbPath(options);

  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const db = JSON.parse(raw);
      ensureDbArrays(db);
      return { db, dbPath, isNew: false };
    } catch (err) {
      throw new Error(`Failed to parse database at '${dbPath}': ${err.message}`);
    }
  }

  // Initialize from default seed if available
  let initialDb = null;
  const seedFile = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'defaultSeed.json');
  if (fs.existsSync(seedFile)) {
    try {
      initialDb = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
    } catch {
      // ignore
    }
  }

  if (!initialDb) {
    initialDb = {
      version: 1,
      lastSavedAt: new Date().toISOString(),
      campaigns: [],
      adventures: [],
      characters: [],
      parties: [],
      sfxCatalog: [],
      playInstances: [],
    };
  }

  ensureDbArrays(initialDb);
  saveDb(initialDb, { db: dbPath });

  return { db: initialDb, dbPath, isNew: true };
}

/**
 * Ensures all expected entity array collections exist in the DB.
 */
export function ensureDbArrays(db) {
  if (!Array.isArray(db.campaigns)) db.campaigns = [];
  if (!Array.isArray(db.adventures)) db.adventures = [];
  if (!Array.isArray(db.characters)) db.characters = [];
  if (!Array.isArray(db.parties)) db.parties = [];
  if (!Array.isArray(db.sfxCatalog)) db.sfxCatalog = [];
  if (!Array.isArray(db.playInstances)) db.playInstances = [];
  return db;
}

/**
 * Atomically saves the database to disk.
 */
export function saveDb(db, options = {}) {
  const dbPath = resolveDbPath(options);
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db.lastSavedAt = new Date().toISOString();
  ensureDbArrays(db);

  const payload = JSON.stringify(db, null, 2);
  const tmpPath = `${dbPath}.tmp.${process.pid}.${Date.now()}`;

  fs.writeFileSync(tmpPath, payload, 'utf-8');
  try {
    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    // Fallback on Windows if rename fails due to file lock
    fs.copyFileSync(tmpPath, dbPath);
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }

  return { dbPath, savedAt: db.lastSavedAt };
}

/**
 * Creates a timestamped backup of the database.
 */
export function backupDb(options = {}) {
  const { db, dbPath } = loadDb(options);
  const dataDir = path.dirname(dbPath);
  const backupDir = options.output ? path.dirname(path.resolve(options.output)) : path.join(dataDir, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = options.output
    ? path.resolve(options.output)
    : path.join(backupDir, `vellum-db-backup-${timestamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');
  return { backupPath, sourcePath: dbPath };
}

/**
 * Validates entity relationships and schema integrity.
 */
export function validateDb(db) {
  const errors = [];
  const warnings = [];

  const characterIds = new Set(db.characters.map((c) => c.id));
  const campaignIds = new Set(db.campaigns.map((c) => c.id));
  const adventureIds = new Set(db.adventures.map((a) => a.id));
  const sfxIds = new Set(db.sfxCatalog.map((s) => s.id));

  // Check character unique IDs
  const seenCharIds = new Set();
  for (const char of db.characters) {
    if (!char.id) errors.push(`Character has missing id: "${char.name || 'unnamed'}"`);
    else if (seenCharIds.has(char.id)) errors.push(`Duplicate character id: "${char.id}"`);
    seenCharIds.add(char.id);
  }

  // Check adventure unique IDs
  const seenAdvIds = new Set();
  for (const adv of db.adventures) {
    if (!adv.id) errors.push(`Adventure has missing id: "${adv.title || 'untitled'}"`);
    else if (seenAdvIds.has(adv.id)) errors.push(`Duplicate adventure id: "${adv.id}"`);
    seenAdvIds.add(adv.id);

    if (adv.campaignId && !campaignIds.has(adv.campaignId)) {
      warnings.push(`Adventure "${adv.id}" links to nonexistent campaign "${adv.campaignId}"`);
    }

    if (Array.isArray(adv.scenes)) {
      const seenSceneIds = new Set();
      for (const scene of adv.scenes) {
        if (!scene.id) errors.push(`Scene in adventure "${adv.id}" has missing id: "${scene.title}"`);
        else if (seenSceneIds.has(scene.id)) errors.push(`Duplicate scene id "${scene.id}" in adventure "${adv.id}"`);
        seenSceneIds.add(scene.id);

        if (Array.isArray(scene.linkedCharacterIds)) {
          for (const charId of scene.linkedCharacterIds) {
            if (!characterIds.has(charId)) {
              warnings.push(`Scene "${scene.id}" in adventure "${adv.id}" references missing character "${charId}"`);
            }
          }
        }

        if (Array.isArray(scene.linkedSfxIds)) {
          for (const sfxId of scene.linkedSfxIds) {
            if (!sfxIds.has(sfxId)) {
              warnings.push(`Scene "${scene.id}" in adventure "${adv.id}" references missing sfx "${sfxId}"`);
            }
          }
        }
      }
    }
  }

  // Check parties
  for (const party of db.parties) {
    if (Array.isArray(party.memberCharacterIds)) {
      for (const charId of party.memberCharacterIds) {
        if (!characterIds.has(charId)) {
          warnings.push(`Party "${party.name}" (${party.id}) references missing character "${charId}"`);
        }
      }
    }
  }

  // Check play instances
  for (const inst of db.playInstances) {
    if (!adventureIds.has(inst.adventureId)) {
      warnings.push(`PlayInstance "${inst.id}" references nonexistent adventure "${inst.adventureId}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Returns summary statistics for the database.
 */
export function getDbStats(db, dbPath) {
  let fileSize = 0;
  let fileMtime = null;

  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    fileSize = stat.size;
    fileMtime = stat.mtime.toISOString();
  }

  const scenesCount = db.adventures.reduce((sum, a) => sum + (a.scenes?.length || 0), 0);
  const pcsCount = db.characters.filter((c) => c.kind === 'pc').length;
  const npcsCount = db.characters.filter((c) => c.kind === 'npc').length;
  const monstersCount = db.characters.filter((c) => c.kind === 'monster').length;

  return {
    path: dbPath,
    fileSize,
    fileSizeFormatted: `${(fileSize / 1024).toFixed(1)} KB`,
    fileMtime,
    lastSavedAt: db.lastSavedAt,
    counts: {
      campaigns: db.campaigns.length,
      adventures: db.adventures.length,
      scenes: scenesCount,
      characters: db.characters.length,
      pcs: pcsCount,
      npcs: npcsCount,
      monsters: monstersCount,
      parties: db.parties.length,
      sfx: db.sfxCatalog.length,
      playInstances: db.playInstances.length,
    },
  };
}
