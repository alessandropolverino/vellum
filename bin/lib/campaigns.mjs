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

export function handleCampaigns(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listCampaigns(db, options);
    case 'get':
      return getCampaign(positionals[0], db, options);
    case 'create':
      return createCampaign(positionals, options, db);
    case 'update':
      return updateCampaign(positionals[0], options, db);
    case 'delete':
      return deleteCampaign(positionals[0], options, db);
    default:
      if (!action || action === 'help') {
        printCampaignsHelp();
        return;
      }
      error(`Unknown campaigns action '${action}'. Run 'vellum campaigns --help' for usage.`);
  }
}

function listCampaigns(db, options) {
  let list = db.campaigns;

  if (options.status) {
    const s = String(options.status).toLowerCase();
    list = list.filter((c) => c.status.toLowerCase().includes(s));
  }
  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.setting?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nCampaigns (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 20, color: (s) => c.cyan(s) },
      { key: 'title', label: 'Title', maxWidth: 28, color: (s) => c.bold(s) },
      { key: 'setting', label: 'Setting', maxWidth: 26 },
      { key: 'status', label: 'Status', maxWidth: 16, color: (s) => c.green(s) },
      { key: 'adventuresCount', label: 'Adventures', maxWidth: 10 },
    ],
    list.map((camp) => ({
      ...camp,
      adventuresCount: db.adventures.filter((a) => a.campaignId === camp.id).length,
    }))
  );
  console.log('');
}

function getCampaign(id, db, options) {
  if (!id) error('Missing required argument: <id>. Run "vellum campaigns get <id>".');
  const camp = db.campaigns.find((c) => c.id === id || c.title.toLowerCase() === id.toLowerCase());
  if (!camp) error(`Campaign "${id}" not found.`);

  if (options.json) {
    printJson(camp);
    return;
  }

  const linkedAdvs = db.adventures.filter((a) => a.campaignId === camp.id);

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` CAMPAIGN: ${camp.title}`)));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}          ${camp.id}`);
  console.log(` ${c.bold('Setting:')}     ${camp.setting}`);
  console.log(` ${c.bold('Status:')}      ${camp.status}`);
  console.log(` ${c.bold('Created:')}     ${camp.createdAt}`);
  console.log(` ${c.bold('Description:')} ${camp.description}`);
  console.log(c.yellow('─'.repeat(60)));
  console.log(c.bold(` Linked Adventures (${linkedAdvs.length}):`));
  for (const adv of linkedAdvs) {
    console.log(`  - [${adv.id}] ${adv.title} (${adv.levelRange || 'Any'})`);
  }
  console.log(c.yellow('═'.repeat(60)));
}

function createCampaign(positionals, options, db) {
  let blueprint = {};
  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  const title = options.title || positionals[0] || blueprint.title;
  if (!title) error('Missing required flag: --title <title>');

  const id = options.id || blueprint.id || `camp-${slugify(title)}-${crypto.randomBytes(2).toString('hex')}`;
  if (db.campaigns.some((c) => c.id === id)) {
    error(`Campaign with ID "${id}" already exists.`);
  }

  const newCamp = {
    id,
    title,
    setting: options.setting || blueprint.setting || '',
    description: options.desc || options.description || blueprint.description || '',
    status: options.status || blueprint.status || 'Active',
    createdAt: new Date().toISOString(),
  };

  db.campaigns.push(newCamp);
  saveDb(db, options);

  if (options.json) {
    printJson(newCamp);
  } else {
    success(`Campaign "${newCamp.title}" (${newCamp.id}) created.`, options);
  }
}

function updateCampaign(id, options, db) {
  if (!id) error('Usage: vellum campaigns update <id> [options]');
  const camp = db.campaigns.find((c) => c.id === id);
  if (!camp) error(`Campaign "${id}" not found.`);

  let patch = {};
  if (options.data) {
    try {
      patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  if (options.title) camp.title = options.title;
  if (options.setting !== undefined) camp.setting = options.setting;
  if (options.desc !== undefined || options.description !== undefined) {
    camp.description = options.desc || options.description;
  }
  if (options.status) camp.status = options.status;

  Object.assign(camp, patch);
  saveDb(db, options);

  if (options.json) {
    printJson(camp);
  } else {
    success(`Campaign "${camp.title}" (${camp.id}) updated.`, options);
  }
}

function deleteCampaign(id, options, db) {
  if (!id) error('Usage: vellum campaigns delete <id> [--force]');
  const idx = db.campaigns.findIndex((c) => c.id === id);
  if (idx === -1) error(`Campaign "${id}" not found.`);

  const camp = db.campaigns[idx];
  const linkedAdvs = db.adventures.filter((a) => a.campaignId === id);

  if (linkedAdvs.length > 0 && !options.force) {
    error(
      `Cannot delete campaign "${id}": ${linkedAdvs.length} adventure(s) belong to it. Use --force to detach and delete.`
    );
  }

  for (const adv of linkedAdvs) {
    adv.campaignId = undefined;
  }

  db.campaigns.splice(idx, 1);
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, title: camp.title });
  } else {
    success(`Campaign "${camp.title}" deleted.`, options);
  }
}

function printCampaignsHelp() {
  console.log(`
${c.bold('vellum campaigns')} — Manage campaigns and overarching story settings

${c.bold('USAGE:')}
  vellum campaigns list [options]
  vellum campaigns get <id> [--json]
  vellum campaigns create --title <title> [options]
  vellum campaigns update <id> [options]
  vellum campaigns delete <id> [--force]

${c.bold('OPTIONS:')}
  --title <title>       Campaign title
  --setting <setting>   Setting (e.g. "Forgotten Realms", "Eberron", "Barovia")
  --desc <description>  Long campaign description / background
  --status <status>     Status ("Active", "In Preparation", "Concluded")
  --data <json|@file>   JSON payload to merge
  --json                Machine-readable JSON output
`);
}
