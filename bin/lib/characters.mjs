import crypto from 'node:crypto';
import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, printStatblockCard, success, error, warn, c } from './output.mjs';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

function parseAbilities(options, defaults = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }) {
  const result = { ...defaults };
  if (options.abilities) {
    const parts = String(options.abilities).split(',').map((s) => Number(s.trim()));
    if (parts.length >= 6) {
      result.str = parts[0] || 10;
      result.dex = parts[1] || 10;
      result.con = parts[2] || 10;
      result.int = parts[3] || 10;
      result.wis = parts[4] || 10;
      result.cha = parts[5] || 10;
    }
  }
  if (options.str !== undefined) result.str = Number(options.str);
  if (options.dex !== undefined) result.dex = Number(options.dex);
  if (options.con !== undefined) result.con = Number(options.con);
  if (options.int !== undefined) result.int = Number(options.int);
  if (options.wis !== undefined) result.wis = Number(options.wis);
  if (options.cha !== undefined) result.cha = Number(options.cha);
  return result;
}

export function handleCharacters(action, positionals, options) {
  const { db } = loadDb(options);

  if (action === 'action') {
    return handleCharacterActions(positionals[0], positionals.slice(1), options, db);
  }

  switch (action) {
    case 'list':
      return listCharacters(db, options);
    case 'get':
      return getCharacter(positionals[0], db, options);
    case 'create':
      return createCharacter(positionals, options, db);
    case 'update':
      return updateCharacter(positionals[0], options, db);
    case 'delete':
      return deleteCharacter(positionals[0], options, db);
    case 'level-up':
      return levelUpCharacter(positionals[0], options, db);
    default:
      if (!action || action === 'help') {
        printCharactersHelp();
        return;
      }
      error(`Unknown characters action '${action}'. Run 'vellum characters --help' for usage.`);
  }
}

function listCharacters(db, options) {
  let list = db.characters;

  if (options.kind) {
    const kind = String(options.kind).toLowerCase();
    list = list.filter((c) => c.kind.toLowerCase() === kind);
  }
  if (options.tag) {
    const tag = String(options.tag).toLowerCase();
    list = list.filter((c) => c.tags?.some((t) => t.toLowerCase() === tag));
  }
  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.playerOrRole?.toLowerCase().includes(q) ||
        c.creatureType?.toLowerCase().includes(q) ||
        c.classOrArchetype?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nCharacters / PGs / NPCs / Monsters (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 18, color: (s) => c.cyan(s) },
      {
        key: 'kind',
        label: 'Kind',
        maxWidth: 10,
        color: (s) => {
          if (s === 'pc') return c.green(s);
          if (s === 'npc') return c.blue(s);
          return c.red(s);
        },
      },
      { key: 'name', label: 'Name', maxWidth: 24, color: (s) => c.bold(s) },
      { key: 'playerOrRole', label: 'Role / Player', maxWidth: 22 },
      { key: 'levelOrCr', label: 'CR/Lvl', maxWidth: 12 },
      { key: 'ac', label: 'AC', maxWidth: 6 },
      { key: 'hpMax', label: 'HP', maxWidth: 6 },
      { key: 'creatureType', label: 'Type', maxWidth: 18, color: (s) => c.dim(s) },
    ],
    list
  );
  console.log('');
}

function getCharacter(id, db, options) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum characters get <id>".');
  }

  const char = db.characters.find(
    (c) => c.id === id || c.name.toLowerCase() === id.toLowerCase()
  );
  if (!char) {
    error(`Character with ID or name "${id}" not found.`);
  }

  if (options.json) {
    printJson(char);
    return;
  }

  // Statblock card format
  printStatblockCard(char);
}

function createCharacter(positionals, options, db) {
  let blueprint = {};

  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON passed to --data: ${err.message}`);
    }
  }

  const name = options.name || positionals[0] || blueprint.name;
  if (!name) {
    error('Missing required argument: --name <name>');
  }

  const kind = (options.kind || blueprint.kind || 'pc').toLowerCase();
  const idPrefix = kind === 'pc' ? 'pc' : kind === 'npc' ? 'npc' : 'mon';
  const id =
    options.id ||
    blueprint.id ||
    `${idPrefix}-${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

  if (db.characters.some((c) => c.id === id)) {
    error(`A character with ID "${id}" already exists.`);
  }

  const abilities = parseAbilities(options, blueprint.abilities);

  const newChar = {
    id,
    kind,
    name,
    playerOrRole: options.role || options.player || blueprint.playerOrRole || (kind === 'pc' ? 'Player Character' : 'NPC'),
    size: options.size || blueprint.size || 'Media',
    creatureType: options.creatureType || options.type || blueprint.creatureType || 'Humanoid',
    alignment: options.alignment || blueprint.alignment || 'Neutral',
    classOrArchetype: options.class || blueprint.classOrArchetype || '',
    levelOrCr: options.cr || options.level || options.levelOrCr || blueprint.levelOrCr || 'Level 1',
    ac: options.ac !== undefined ? Number(options.ac) : blueprint.ac || 10,
    acNote: options.acNote || blueprint.acNote || '',
    hpMax: options.hp !== undefined ? Number(options.hp) : blueprint.hpMax || 10,
    hitDiceFormula: options.hitDice || options.hitDiceFormula || blueprint.hitDiceFormula || '1d8 + 2',
    speed: options.speed || blueprint.speed || '30 ft.',
    initiativeBonus: options.initiative !== undefined ? Number(options.initiative) : blueprint.initiativeBonus || 0,
    passivePerception: options.passivePerception !== undefined ? Number(options.passivePerception) : blueprint.passivePerception || 10,
    abilities,
    savingThrows: options.savingThrows || blueprint.savingThrows || '',
    skills: options.skills || blueprint.skills || '',
    damageResistances: options.damageResistances || blueprint.damageResistances || '',
    senses: options.senses || blueprint.senses || '',
    languages: options.languages || blueprint.languages || 'Common',
    traits: blueprint.traits || [],
    actions: blueprint.actions || [],
    reactionsOrLegendary: blueprint.reactionsOrLegendary || [],
    spellsNotes: options.spells || blueprint.spellsNotes || '',
    biographyOrLore: options.lore || blueprint.biographyOrLore || '',
    tags: options.tags
      ? String(options.tags).split(',').map((t) => t.trim())
      : blueprint.tags || [],
    accentColor: options.color || blueprint.accentColor || '#6366f1',
  };

  db.characters.push(newChar);
  saveDb(db, options);

  if (options.json) {
    printJson(newChar);
  } else {
    success(`Character "${newChar.name}" (${newChar.kind}) created with ID "${newChar.id}".`, options);
  }
}

function updateCharacter(id, options, db) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum characters update <id> [options]".');
  }

  const char = db.characters.find((c) => c.id === id);
  if (!char) {
    error(`Character with ID "${id}" not found.`);
  }

  let patch = {};
  if (options.data) {
    try {
      patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON passed to --data: ${err.message}`);
    }
  }

  if (options.name) char.name = options.name;
  if (options.kind) char.kind = options.kind.toLowerCase();
  if (options.role) char.playerOrRole = options.role;
  if (options.class) char.classOrArchetype = options.class;
  if (options.size) char.size = options.size;
  if (options.creatureType || options.type) char.creatureType = options.creatureType || options.type;
  if (options.alignment) char.alignment = options.alignment;
  if (options.cr || options.level) char.levelOrCr = options.cr || options.level;
  if (options.ac !== undefined) char.ac = Number(options.ac);
  if (options.acNote !== undefined) char.acNote = options.acNote;
  if (options.hp !== undefined) char.hpMax = Number(options.hp);
  if (options.hitDice !== undefined) char.hitDiceFormula = options.hitDice;
  if (options.speed !== undefined) char.speed = options.speed;
  if (options.abilities || options.str || options.dex || options.con || options.int || options.wis || options.cha) {
    char.abilities = parseAbilities(options, char.abilities);
  }
  if (options.lore !== undefined) char.biographyOrLore = options.lore;
  if (options.tags) {
    char.tags = String(options.tags).split(',').map((t) => t.trim());
  }

  Object.assign(char, patch);
  saveDb(db, options);

  if (options.json) {
    printJson(char);
  } else {
    success(`Character "${char.name}" (${char.id}) updated.`, options);
  }
}

function deleteCharacter(id, options, db) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum characters delete <id>".');
  }

  const index = db.characters.findIndex((c) => c.id === id);
  if (index === -1) {
    error(`Character with ID "${id}" not found.`);
  }

  const char = db.characters[index];

  // Check if character is used in parties or adventures
  const linkedParties = db.parties.filter((p) => p.memberCharacterIds?.includes(id));
  if (linkedParties.length > 0 && !options.force) {
    error(
      `Cannot delete character "${id}": linked to party "${linkedParties[0].name}". Use --force to delete.`
    );
  }

  db.characters.splice(index, 1);

  // Clean references in parties if forced
  for (const party of db.parties) {
    party.memberCharacterIds = party.memberCharacterIds.filter((cid) => cid !== id);
  }

  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, name: char.name });
  } else {
    success(`Character "${char.name}" (${id}) deleted.`, options);
  }
}

function handleCharacterActions(actionCmd, positionals, options, db) {
  const [charId, actionName] = positionals;
  if (!charId) error('Usage: vellum characters action <add|remove> <characterId> [options]');

  const char = db.characters.find((c) => c.id === charId);
  if (!char) error(`Character "${charId}" not found.`);

  const listType = (options.type || 'action').toLowerCase(); // action, trait, reaction
  const targetArray =
    listType === 'trait'
      ? char.traits || (char.traits = [])
      : listType === 'reaction'
      ? char.reactionsOrLegendary || (char.reactionsOrLegendary = [])
      : char.actions || (char.actions = []);

  if (actionCmd === 'add') {
    const name = options.name || actionName;
    const desc = options.desc || options.description || '';
    if (!name) error('Missing flag: --name <name>');

    const entry = {
      name,
      description: desc,
      attackBonus: options.attack !== undefined ? Number(options.attack) : undefined,
      damageFormula: options.damage || undefined,
    };

    targetArray.push(entry);
    saveDb(db, options);

    if (options.json) {
      printJson(entry);
    } else {
      success(`Added ${listType} "${entry.name}" to character "${char.name}".`, options);
    }
  } else if (actionCmd === 'remove') {
    const name = actionName || options.name;
    if (!name) error('Missing action name to remove.');

    const idx = targetArray.findIndex((e) => e.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) error(`${listType} "${name}" not found on "${char.name}".`);

    const removed = targetArray.splice(idx, 1)[0];
    saveDb(db, options);

    if (options.json) {
      printJson({ removed: true, entry: removed });
    } else {
      success(`Removed ${listType} "${removed.name}" from "${char.name}".`, options);
    }
  } else {
    error(`Unknown action command '${actionCmd}'. Use 'add' or 'remove'.`);
  }
}


function levelUpCharacter(id, options, db) {
  if (!id) error('Character ID is required for level-up. e.g. vellum characters level-up <id> --to-level <N>');

  const index = (db.characters || []).findIndex((c) => c.id === id);
  if (index === -1) error(`Character '${id}' not found in database.`);

  const original = db.characters[index];
  const currentMatch = (original.levelOrCr || '').match(/(\d+)/);
  const currentLevel = currentMatch ? parseInt(currentMatch[1], 10) : 1;

  const toLevel = options['to-level'] ? Number(options['to-level']) : options.level ? Number(options.level) : currentLevel + 1;
  if (isNaN(toLevel) || toLevel < 1 || toLevel > 20) {
    error(`Invalid target level '${toLevel}'. Must be between 1 and 20.`);
  }
  if (toLevel <= currentLevel) {
    error(`Target level (${toLevel}) must be greater than current level (${currentLevel}).`);
  }

  // Detect hit die from hitDiceFormula or class
  let hitDie = 8;
  const formulaMatch = (original.hitDiceFormula || '').match(/d(\d+)/);
  if (formulaMatch) {
    hitDie = parseInt(formulaMatch[1], 10);
  } else {
    const cls = (original.classOrArchetype || '').toLowerCase();
    if (cls.includes('barbarian') || cls.includes('barbaro')) hitDie = 12;
    else if (cls.includes('fighter') || cls.includes('guerriero') || cls.includes('paladin') || cls.includes('paladino') || cls.includes('ranger')) hitDie = 10;
    else if (cls.includes('wizard') || cls.includes('mago') || cls.includes('sorcerer') || cls.includes('stregone')) hitDie = 6;
  }

  const conScore = original.abilities?.con || 10;
  const conMod = Math.floor((conScore - 10) / 2);
  const levelsGained = toLevel - currentLevel;

  const avgPerLevel = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const maxPerLevel = Math.max(1, hitDie + conMod);
  const hpGain = options['hp-mode'] === 'max' ? levelsGained * maxPerLevel : levelsGained * avgPerLevel;
  const newHpMax = Math.max(1, (original.hpMax || 10) + hpGain);

  const totalConMod = conMod * toLevel;
  const newHitDiceFormula = totalConMod > 0 ? `${toLevel}d${hitDie} + ${totalConMod}` : totalConMod < 0 ? `${toLevel}d${hitDie} - ${Math.abs(totalConMod)}` : `${toLevel}d${hitDie}`;

  const isItalian = (original.levelOrCr || '').toLowerCase().includes('livello');
  const newLevelStr = isItalian ? `Livello ${toLevel}` : `Level ${toLevel}`;

  const saveAsNew = Boolean(options['save-as-new']);
  const updated = structuredClone(original);
  updated.levelOrCr = newLevelStr;
  updated.hpMax = newHpMax;
  updated.hitDiceFormula = newHitDiceFormula;

  if (saveAsNew) {
    updated.id = `pc-bp-${Date.now()}`;
    updated.name = options.name || `${original.name} (${newLevelStr})`;
    updated.isPreGenBlueprint = true;
    updated.sourceBlueprintId = original.id;
    if (!updated.tags.includes('Pre-Gen Blueprint') && !updated.tags.includes('Blueprint Pre-Gen')) {
      updated.tags.push(isItalian ? 'Blueprint Pre-Gen' : 'Pre-Gen Blueprint');
    }
    db.characters.push(updated);
  } else {
    db.characters[index] = updated;
  }

  saveDb(db, options);

  if (options.json) {
    printJson({
      action: 'level-up',
      saveMode: saveAsNew ? 'save-as-new' : 'update',
      originalId: original.id,
      character: updated,
      gainedLevels: levelsGained,
      hpGain,
      newHpMax,
      newHitDiceFormula,
    });
  } else {
    success(
      saveAsNew
        ? `Created new Leveled Blueprint "${updated.name}" [${updated.id}] at ${newLevelStr} (HP: ${newHpMax}, ${newHitDiceFormula}).`
        : `Leveled up "${updated.name}" from Lv ${currentLevel} to ${newLevelStr} (HP: ${newHpMax}, ${newHitDiceFormula}).`,
      options
    );
  }
}

function printCharactersHelp() {
  console.log(`
${c.bold('vellum characters')} (alias: pgs, chars) — Manage PCs, NPCs, and Monsters

${c.bold('USAGE:')}
  vellum characters list [options]
  vellum characters get <id> [--json] [--statblock]
  vellum characters create --name <name> [options]
  vellum characters update <id> [options]
  vellum characters delete <id> [--force]
  vellum characters level-up <id> --to-level <N> [--save-as-new] [--hp-mode <average|max>] [--name <name>]

  vellum characters action add <characterId> --name <name> --desc <desc> [options]
  vellum characters action remove <characterId> <actionName> [options]

${c.bold('OPTIONS:')}
  --kind <pc|npc|monster>      Filter or set entity kind (default: pc)
  --role <role>                Narrative role or player name
  --class <class>              Class and subclass (e.g. "Paladin (Oath of Ancients)")
  --cr <crOrLevel>             Challenge rating or character level
  --ac <number>                Armor class
  --hp <number>                Maximum hit points
  --abilities <str,dex,...>    Comma-separated scores, e.g. 16,14,14,10,12,8
  --speed <speed>              Speed, e.g. "30 ft."
  --size <size>                Size category (Media/Medium, Grande/Large, etc.)
  --creature-type <type>       Type, e.g. "Humanoid (Elf)", "Undead", "Fiend"
  --lore <text>                Biography or lore description
  --data <json|@file>          JSON payload or @file to merge
  --json                       Machine-readable JSON output
`);
}
