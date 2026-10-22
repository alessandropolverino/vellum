import crypto from 'node:crypto';
import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, success, error, c } from './output.mjs';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

export function handleEncounters(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listEncounters(positionals[0], positionals[1], options, db);
    case 'add':
      return addEncounter(positionals[0], positionals[1], options, db);
    case 'delete':
      return deleteEncounter(positionals[0], positionals[1], positionals[2], options, db);
    default:
      if (!action || action === 'help') {
        printEncountersHelp();
        return;
      }
      error(`Unknown encounters action '${action}'. Run 'vellum encounters --help' for usage.`);
  }
}

function listEncounters(advId, sceneId, options, db) {
  if (!advId) error('Usage: vellum encounters list <adventureId> [sceneId]');

  const adv = db.adventures.find((a) => a.id === advId);
  if (!adv) error(`Adventure "${advId}" not found.`);

  let scenes = adv.scenes || [];
  if (sceneId) {
    scenes = scenes.filter((s) => s.id === sceneId);
    if (scenes.length === 0) error(`Scene "${sceneId}" not found in adventure "${advId}".`);
  }

  const allEncounters = [];
  for (const sc of scenes) {
    for (const enc of sc.encounters || []) {
      allEncounters.push({
        sceneId: sc.id,
        sceneTitle: sc.title,
        ...enc,
      });
    }
  }

  if (options.json) {
    printJson(allEncounters);
    return;
  }

  console.log(c.bold(`\nEncounters in "${adv.title}" (${allEncounters.length}):\n`));
  printTable(
    [
      { key: 'sceneId', label: 'Scene', maxWidth: 16, color: (s) => c.dim(s) },
      { key: 'id', label: 'Encounter ID', maxWidth: 18, color: (s) => c.cyan(s) },
      { key: 'name', label: 'Name', maxWidth: 26, color: (s) => c.bold(s) },
      { key: 'difficulty', label: 'Difficulty', maxWidth: 12, color: (s) => c.yellow(s) },
      { key: 'environment', label: 'Environment', maxWidth: 18 },
      { key: 'monstersSummary', label: 'Creatures', maxWidth: 30 },
    ],
    allEncounters.map((e) => {
      const summary = (e.slots || [])
        .map((sl) => {
          const char = db.characters.find((c) => c.id === sl.characterId);
          return `${sl.count}x ${char ? char.name : sl.characterId}`;
        })
        .join(', ');
      return {
        ...e,
        monstersSummary: summary || 'None',
      };
    })
  );
  console.log('');
}

function addEncounter(advId, sceneId, options, db) {
  if (!advId || !sceneId) error('Usage: vellum encounters add <adventureId> <sceneId> --name <name> [options]');

  const adv = db.adventures.find((a) => a.id === advId);
  if (!adv) error(`Adventure "${advId}" not found.`);

  const scene = adv.scenes?.find((s) => s.id === sceneId);
  if (!scene) error(`Scene "${sceneId}" not found in adventure "${advId}".`);

  let blueprint = {};
  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  const name = options.name || blueprint.name;
  if (!name) error('Missing required flag: --name <name>');

  const id = options.id || blueprint.id || `enc-${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

  let slots = blueprint.slots || [];
  if (options.slots) {
    try {
      slots = typeof options.slots === 'string' ? JSON.parse(options.slots) : options.slots;
    } catch (err) {
      error(`Invalid JSON in --slots: ${err.message}`);
    }
  }

  const newEnc = {
    id,
    name,
    difficulty: options.difficulty || blueprint.difficulty || 'Media',
    environment: options.environment || blueprint.environment || scene.location || 'Dungeon',
    description: options.desc || options.description || blueprint.description || '',
    slots,
    autoSfxId: options.sfx || blueprint.autoSfxId || undefined,
  };

  if (!scene.encounters) scene.encounters = [];
  scene.encounters.push(newEnc);
  adv.updatedAt = new Date().toISOString();
  saveDb(db, options);

  if (options.json) {
    printJson(newEnc);
  } else {
    success(`Encounter "${newEnc.name}" (${newEnc.id}) added to scene "${scene.title}".`, options);
  }
}

function deleteEncounter(advId, sceneId, encId, options, db) {
  if (!advId || !sceneId || !encId) {
    error('Usage: vellum encounters delete <adventureId> <sceneId> <encounterId>');
  }

  const adv = db.adventures.find((a) => a.id === advId);
  if (!adv) error(`Adventure "${advId}" not found.`);

  const scene = adv.scenes?.find((s) => s.id === sceneId);
  if (!scene) error(`Scene "${sceneId}" not found in adventure "${advId}".`);

  const idx = scene.encounters?.findIndex((e) => e.id === encId);
  if (idx === -1 || idx === undefined) error(`Encounter "${encId}" not found in scene "${sceneId}".`);

  const deleted = scene.encounters.splice(idx, 1)[0];
  adv.updatedAt = new Date().toISOString();
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, encounterId: encId, sceneId, adventureId: advId });
  } else {
    success(`Encounter "${deleted.name}" deleted.`, options);
  }
}

function printEncountersHelp() {
  console.log(`
${c.bold('vellum encounters')} — Manage battle encounters attached to scenes

${c.bold('USAGE:')}
  vellum encounters list <adventureId> [sceneId] [--json]
  vellum encounters add <adventureId> <sceneId> --name <name> [options]
  vellum encounters delete <adventureId> <sceneId> <encounterId>

${c.bold('OPTIONS:')}
  --name <name>             Encounter title
  --difficulty <diff>       Difficulty ("Facile", "Media", "Difficile", "Mortale" or Easy/Medium/Hard/Deadly)
  --environment <env>       Environment note
  --slots <json|@file>      Monster slots, e.g. '[{"characterId":"mon-scheletro","count":3}]'
  --sfx <sfxId>             Auto-play sound preset ID
  --data <json|@file>       Full encounter payload
  --json                    Machine-readable JSON output
`);
}
