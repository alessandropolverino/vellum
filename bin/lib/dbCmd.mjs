import fs from 'node:fs';
import path from 'node:path';
import { loadDb, saveDb, validateDb, getDbStats, backupDb, resolveDbPath } from './db.mjs';
import { printJson, success, error, warn, info, c } from './output.mjs';

export function handleDb(action, positionals, options) {
  switch (action) {
    case 'stats':
      return showDbStats(options);
    case 'validate':
      return validateDatabase(options);
    case 'backup':
      return createDbBackup(options);
    case 'export':
      return exportDatabase(options);
    case 'import':
      return importDatabase(positionals[0], options);
    case 'seed':
      return seedDatabase(options);
    default:
      if (!action || action === 'help') {
        printDbHelp();
        return;
      }
      error(`Unknown db action '${action}'. Run 'vellum db --help' for usage.`);
  }
}

function showDbStats(options) {
  const { db, dbPath } = loadDb(options);
  const stats = getDbStats(db, dbPath);

  if (options.json) {
    printJson(stats);
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(' VELLUM DATABASE STATUS')));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('Location:')}       ${stats.path}`);
  console.log(` ${c.bold('File Size:')}      ${stats.fileSizeFormatted} (${stats.fileSize} bytes)`);
  console.log(` ${c.bold('Last Modified:')}  ${stats.fileMtime || 'N/A'}`);
  console.log(` ${c.bold('Last Saved At:')}  ${stats.lastSavedAt || 'N/A'}`);
  console.log(c.yellow('─'.repeat(60)));
  console.log(c.bold(' ENTITY COUNTS:'));
  console.log(`   Campaigns:         ${c.bold(c.green(String(stats.counts.campaigns)))}`);
  console.log(`   Adventures:        ${c.bold(c.green(String(stats.counts.adventures)))} (total scenes: ${stats.counts.scenes})`);
  console.log(`   Characters Total:  ${c.bold(c.green(String(stats.counts.characters)))}`);
  console.log(`     - Player Characters (PCs): ${stats.counts.pcs}`);
  console.log(`     - NPCs:                   ${stats.counts.npcs}`);
  console.log(`     - Monsters / Beasts:      ${stats.counts.monsters}`);
  console.log(`   Parties:           ${c.bold(c.green(String(stats.counts.parties)))}`);
  console.log(`   Play Instances:    ${c.bold(c.green(String(stats.counts.playInstances)))}`);
  console.log(`   SFX Presets:       ${c.bold(c.green(String(stats.counts.sfx)))}`);
  console.log(c.yellow('═'.repeat(60)));
}

function validateDatabase(options) {
  const { db, dbPath } = loadDb(options);
  const result = validateDb(db);

  if (options.json) {
    printJson(result);
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` VALIDATING DATABASE: ${path.basename(dbPath)}`)));
  console.log(c.yellow('─'.repeat(60)));

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(c.green('✔ All database relationships and integrity checks passed with 0 errors!'));
  } else {
    if (result.errors.length > 0) {
      console.log(c.bold(c.red(` ERRORS (${result.errors.length}):`)));
      for (const err of result.errors) {
        console.log(`  ${c.red('✖')} ${err}`);
      }
    }
    if (result.warnings.length > 0) {
      console.log(c.bold(c.yellow(` WARNINGS (${result.warnings.length}):`)));
      for (const w of result.warnings) {
        console.log(`  ${c.yellow('⚠')} ${w}`);
      }
    }
  }
  console.log(c.yellow('═'.repeat(60)));
}

function createDbBackup(options) {
  const result = backupDb(options);
  if (options.json) {
    printJson(result);
  } else {
    success(`Backup created at: ${result.backupPath}`, options);
  }
}

function exportDatabase(options) {
  const { db, dbPath } = loadDb(options);
  const output = options.output || options.file;

  if (output) {
    fs.writeFileSync(path.resolve(output), JSON.stringify(db, null, 2), 'utf-8');
    if (options.json) {
      printJson({ exported: true, path: path.resolve(output) });
    } else {
      success(`Database exported to: ${path.resolve(output)}`, options);
    }
  } else {
    // Print directly
    console.log(JSON.stringify(db, null, 2));
  }
}

function importDatabase(filePath, options) {
  const targetFile = filePath || options.file;
  if (!targetFile) error('Usage: vellum db import <filePath> [--replace|--merge]');

  const fullPath = path.resolve(targetFile);
  if (!fs.existsSync(fullPath)) error(`Import file "${fullPath}" not found.`);

  let importedData;
  try {
    importedData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch (err) {
    error(`Failed to parse import JSON: ${err.message}`);
  }

  const { db, dbPath } = loadDb(options);

  if (options.merge) {
    // Merge entities by ID
    const mergeCollection = (target, incoming) => {
      if (!Array.isArray(incoming)) return;
      for (const item of incoming) {
        const idx = target.findIndex((t) => t.id === item.id);
        if (idx !== -1) {
          target[idx] = { ...target[idx], ...item };
        } else {
          target.push(item);
        }
      }
    };

    mergeCollection(db.campaigns, importedData.campaigns);
    mergeCollection(db.adventures, importedData.adventures);
    mergeCollection(db.characters, importedData.characters);
    mergeCollection(db.parties, importedData.parties);
    mergeCollection(db.playInstances, importedData.playInstances);
    saveDb(db, options);

    if (options.json) {
      printJson({ merged: true, dbPath });
    } else {
      success(`Database merged with entries from "${targetFile}".`, options);
    }
  } else {
    // Replace mode
    if (!options.force) {
      info('Replacing entire database. Use --force to suppress this check.');
    }
    saveDb(importedData, options);

    if (options.json) {
      printJson({ replaced: true, dbPath });
    } else {
      success(`Database replaced with content from "${targetFile}".`, options);
    }
  }
}

function seedDatabase(options) {
  const seedFile = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    'defaultSeed.json'
  );

  if (!fs.existsSync(seedFile)) {
    error('Seed template defaultSeed.json not found.');
  }

  const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
  saveDb(seedData, options);

  if (options.json) {
    printJson({ seeded: true, path: resolveDbPath(options) });
  } else {
    success(`Database seeded with default content at: ${resolveDbPath(options)}`, options);
  }
}

function printDbHelp() {
  console.log(`
${c.bold('vellum db')} — Database status, backup, integrity verification, and import/export

${c.bold('USAGE:')}
  vellum db stats [--json]
  vellum db validate [--json]
  vellum db backup [--output <path>]
  vellum db export [--output <path>]
  vellum db import <filePath> [--merge | --replace] [--force]
  vellum db seed [--force]

${c.bold('OPTIONS:')}
  --db <path>           Custom path to database file (default: data/dnd5e-db.json)
  --output <path>       Target output file path
  --merge               Merge entities by ID rather than replacing
  --json                Machine-readable JSON output
`);
}
