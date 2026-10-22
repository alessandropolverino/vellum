import { loadDb } from './db.mjs';
import { printJson, printTable, error, c } from './output.mjs';

export function handleSfx(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listSfx(db, options);
    case 'get':
      return getSfx(positionals[0], db, options);
    default:
      if (!action || action === 'help') {
        printSfxHelp();
        return;
      }
      error(`Unknown sfx action '${action}'. Run 'vellum sfx --help' for usage.`);
  }
}

function listSfx(db, options) {
  let list = db.sfxCatalog;

  if (options.category) {
    const cat = String(options.category).toLowerCase();
    list = list.filter((s) => s.category.toLowerCase() === cat);
  }
  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nSFX Catalog (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 18, color: (s) => c.cyan(s) },
      { key: 'category', label: 'Category', maxWidth: 16, color: (s) => c.green(s) },
      { key: 'name', label: 'Name', maxWidth: 24, color: (s) => c.bold(s) },
      { key: 'synthPreset', label: 'Synth Preset', maxWidth: 18 },
      { key: 'loop', label: 'Loop', maxWidth: 6, color: (s) => (s ? c.yellow('yes') : c.dim('no')) },
      { key: 'description', label: 'Description', maxWidth: 36, color: (s) => c.dim(s) },
    ],
    list
  );
  console.log('');
}

function getSfx(id, db, options) {
  if (!id) error('Usage: vellum sfx get <id>');
  const sfx = db.sfxCatalog.find((s) => s.id === id || s.name.toLowerCase() === id.toLowerCase());
  if (!sfx) error(`SFX preset "${id}" not found.`);

  if (options.json) {
    printJson(sfx);
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` SFX PRESET: ${sfx.name}`)));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}          ${sfx.id}`);
  console.log(` ${c.bold('Category:')}    ${sfx.category}`);
  console.log(` ${c.bold('Preset:')}      ${sfx.synthPreset}`);
  console.log(` ${c.bold('Looping:')}     ${sfx.loop ? 'Yes' : 'No'}`);
  console.log(` ${c.bold('Default Vol:')} ${Math.round(sfx.defaultVolume * 100)}%`);
  console.log(` ${c.bold('Tags:')}        ${sfx.tags?.join(', ') || 'none'}`);
  console.log(` ${c.bold('Description:')} ${sfx.description}`);
  console.log(c.yellow('═'.repeat(60)));
}

function printSfxHelp() {
  console.log(`
${c.bold('vellum sfx')} — Inspect ambient tracks, synth sound presets, and SFX cues

${c.bold('USAGE:')}
  vellum sfx list [options]
  vellum sfx get <id> [--json]

${c.bold('OPTIONS:')}
  --category <cat>      Filter by category (ambience, combat_music, sfx_environment, sfx_creature, sfx_magic, sfx_ui)
  --search <text>       Search query
  --json                Machine-readable JSON output
`);
}
