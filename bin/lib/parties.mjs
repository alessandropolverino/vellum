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

export function handleParties(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listParties(db, options);
    case 'get':
      return getParty(positionals[0], db, options);
    case 'create':
      return createParty(positionals, options, db);
    case 'update':
      return updateParty(positionals[0], options, db);
    case 'delete':
      return deleteParty(positionals[0], options, db);
    case 'add-member':
      return addPartyMember(positionals[0], positionals[1], options, db);
    case 'remove-member':
      return removePartyMember(positionals[0], positionals[1], options, db);
    default:
      if (!action || action === 'help') {
        printPartiesHelp();
        return;
      }
      error(`Unknown parties action '${action}'. Run 'vellum parties --help' for usage.`);
  }
}

function listParties(db, options) {
  let list = db.parties;

  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nAdventuring Parties (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 18, color: (s) => c.cyan(s) },
      { key: 'name', label: 'Name', maxWidth: 28, color: (s) => c.bold(s) },
      { key: 'membersCount', label: 'Members', maxWidth: 8 },
      { key: 'memberNames', label: 'PCs', maxWidth: 40, color: (s) => c.dim(s) },
    ],
    list.map((p) => {
      const charNames = (p.memberCharacterIds || [])
        .map((cid) => db.characters.find((c) => c.id === cid)?.name || cid)
        .join(', ');
      return {
        ...p,
        membersCount: p.memberCharacterIds?.length || 0,
        memberNames: charNames || 'Empty',
      };
    })
  );
  console.log('');
}

function getParty(id, db, options) {
  if (!id) error('Usage: vellum parties get <id>');
  const party = db.parties.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
  if (!party) error(`Party "${id}" not found.`);

  if (options.json) {
    printJson(party);
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` PARTY: ${party.name}`)));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}          ${party.id}`);
  console.log(` ${c.bold('Description:')} ${party.description || 'None'}`);
  console.log(c.yellow('─'.repeat(60)));
  console.log(c.bold(` Members (${party.memberCharacterIds?.length || 0}):`));

  for (const cid of party.memberCharacterIds || []) {
    const char = db.characters.find((c) => c.id === cid);
    if (char) {
      console.log(`  - [${char.id}] ${char.name} (${char.classOrArchetype || char.levelOrCr || 'PC'}, AC ${char.ac}, HP ${char.hpMax})`);
    } else {
      console.log(`  - [${cid}] (Missing character)`);
    }
  }
  console.log(c.yellow('═'.repeat(60)));
}

function createParty(positionals, options, db) {
  let blueprint = {};
  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  const name = options.name || positionals[0] || blueprint.name;
  if (!name) error('Missing required flag: --name <name>');

  const id = options.id || blueprint.id || `party-${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
  if (db.parties.some((p) => p.id === id)) {
    error(`Party with ID "${id}" already exists.`);
  }

  const memberCharacterIds = options.members
    ? String(options.members).split(',').map((m) => m.trim())
    : blueprint.memberCharacterIds || [];

  const newParty = {
    id,
    name,
    description: options.desc || options.description || blueprint.description || '',
    memberCharacterIds,
  };

  db.parties.push(newParty);
  saveDb(db, options);

  if (options.json) {
    printJson(newParty);
  } else {
    success(`Party "${newParty.name}" (${newParty.id}) created with ${memberCharacterIds.length} member(s).`, options);
  }
}

function updateParty(id, options, db) {
  if (!id) error('Usage: vellum parties update <id> [options]');
  const party = db.parties.find((p) => p.id === id);
  if (!party) error(`Party "${id}" not found.`);

  let patch = {};
  if (options.data) {
    try {
      patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  if (options.name) party.name = options.name;
  if (options.desc !== undefined || options.description !== undefined) {
    party.description = options.desc || options.description;
  }
  if (options.members) {
    party.memberCharacterIds = String(options.members).split(',').map((m) => m.trim());
  }

  Object.assign(party, patch);
  saveDb(db, options);

  if (options.json) {
    printJson(party);
  } else {
    success(`Party "${party.name}" (${party.id}) updated.`, options);
  }
}

function deleteParty(id, options, db) {
  if (!id) error('Usage: vellum parties delete <id>');
  const idx = db.parties.findIndex((p) => p.id === id);
  if (idx === -1) error(`Party "${id}" not found.`);

  const party = db.parties.splice(idx, 1)[0];
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, name: party.name });
  } else {
    success(`Party "${party.name}" (${id}) deleted.`, options);
  }
}

function addPartyMember(partyId, charId, options, db) {
  if (!partyId || !charId) error('Usage: vellum parties add-member <partyId> <characterId>');
  const party = db.parties.find((p) => p.id === partyId);
  if (!party) error(`Party "${partyId}" not found.`);

  const char = db.characters.find((c) => c.id === charId);
  if (!char) error(`Character "${charId}" not found in database.`);

  if (!party.memberCharacterIds) party.memberCharacterIds = [];
  if (party.memberCharacterIds.includes(charId)) {
    error(`Character "${char.name}" is already in party "${party.name}".`);
  }

  party.memberCharacterIds.push(charId);
  saveDb(db, options);

  if (options.json) {
    printJson(party);
  } else {
    success(`Added "${char.name}" to party "${party.name}".`, options);
  }
}

function removePartyMember(partyId, charId, options, db) {
  if (!partyId || !charId) error('Usage: vellum parties remove-member <partyId> <characterId>');
  const party = db.parties.find((p) => p.id === partyId);
  if (!party) error(`Party "${partyId}" not found.`);

  const idx = party.memberCharacterIds?.indexOf(charId);
  if (idx === -1 || idx === undefined) {
    error(`Character "${charId}" is not a member of "${party.name}".`);
  }

  party.memberCharacterIds.splice(idx, 1);
  saveDb(db, options);

  if (options.json) {
    printJson(party);
  } else {
    success(`Removed character "${charId}" from party "${party.name}".`, options);
  }
}

function printPartiesHelp() {
  console.log(`
${c.bold('vellum parties')} — Manage player parties and character rosters

${c.bold('USAGE:')}
  vellum parties list [options]
  vellum parties get <id> [--json]
  vellum parties create --name <name> [options]
  vellum parties update <id> [options]
  vellum parties delete <id> [--force]
  vellum parties add-member <partyId> <characterId>
  vellum parties remove-member <partyId> <characterId>

${c.bold('OPTIONS:')}
  --name <name>         Party name
  --desc <description>  Description
  --members <id1,id2>   Comma-separated character IDs
  --data <json|@file>   JSON payload
  --json                Machine-readable JSON output
`);
}
