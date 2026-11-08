import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, success, error, c } from './output.mjs';

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

/** Reads a local image file (or accepts a data URL) and returns a data URL. */
function toDataUrl(source) {
  if (String(source).startsWith('data:image/')) return String(source);
  const file = path.resolve(String(source));
  const mime = MIME_BY_EXT[path.extname(file).toLowerCase()];
  if (!mime) error(`Unsupported image type for "${source}". Use png, jpg, webp or gif.`);
  let bytes;
  try {
    bytes = fs.readFileSync(file);
  } catch (err) {
    error(`Cannot read image "${source}": ${err.message}`);
  }
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function splitTags(value) {
  return String(value)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseData(options) {
  if (!options.data) return {};
  try {
    return typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
  } catch (err) {
    error(`Invalid JSON in --data: ${err.message}`);
  }
}

export function handleAssets(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listAssets(db, options);
    case 'get':
      return getAsset(positionals[0], db, options);
    case 'create':
      return createAsset(positionals, options, db);
    case 'update':
      return updateAsset(positionals[0], options, db);
    case 'delete':
      return deleteAsset(positionals[0], options, db);
    default:
      if (!action || action === 'help') {
        printAssetsHelp();
        return;
      }
      error(`Unknown assets action '${action}'. Run 'vellum assets --help' for usage.`);
  }
}

// The image data URL can be megabytes: keep it out of listings unless --full is given.
function summarize(asset, options) {
  if (options.full) return asset;
  return { ...asset, imageUrl: asset.imageUrl ? `[image ${asset.imageUrl.length} chars]` : '' };
}

function listAssets(db, options) {
  let list = db.assets;
  if (options.tag) {
    const tag = String(options.tag).toLowerCase();
    list = list.filter((a) => a.tags?.some((t) => t.toLowerCase() === tag));
  }
  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.caption?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (options.json) {
    printJson(list.map((a) => summarize(a, options)));
    return;
  }

  console.log(c.bold(`\nAssets (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 24, color: (s) => c.cyan(s) },
      { key: 'name', label: 'Name', maxWidth: 28, color: (s) => c.bold(s) },
      { key: 'tagList', label: 'Tags', maxWidth: 20, color: (s) => c.green(s) },
      { key: 'caption', label: 'Caption', maxWidth: 40, color: (s) => c.dim(s) },
    ],
    list.map((a) => ({ ...a, tagList: (a.tags || []).join(', ') }))
  );
  console.log('');
}

function findAsset(id, db) {
  return db.assets.find((a) => a.id === id || a.name.toLowerCase() === String(id).toLowerCase());
}

function getAsset(id, db, options) {
  if (!id) error('Usage: vellum assets get <id> [--full] [--json]');
  const asset = findAsset(id, db);
  if (!asset) error(`Asset "${id}" not found.`);

  if (options.json) {
    printJson(summarize(asset, options));
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` ASSET: ${asset.name}`)));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}      ${asset.id}`);
  console.log(` ${c.bold('Tag:')}     @asset[${asset.id}]`);
  console.log(` ${c.bold('Tags:')}    ${asset.tags?.join(', ') || 'none'}`);
  console.log(` ${c.bold('Image:')}   ${asset.imageUrl ? `yes (${asset.imageUrl.length} chars)` : 'none'}`);
  console.log(` ${c.bold('Caption:')} ${asset.caption || 'none'}`);
  console.log(c.yellow('═'.repeat(60)));
}

function createAsset(positionals, options, db) {
  const blueprint = parseData(options);
  const name = options.name || positionals[0] || blueprint.name;
  if (!name) error('Missing required flag: --name <name>');

  const image = options.image || blueprint.imageUrl;
  if (!image) error('Missing required flag: --image <file path or data URL>');

  const id = options.id || blueprint.id || `asset-${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
  if (db.assets.some((a) => a.id === id)) error(`Asset with ID "${id}" already exists.`);

  const asset = {
    id,
    name,
    caption: options.caption || blueprint.caption || '',
    imageUrl: toDataUrl(image),
    tags: options.tags ? splitTags(options.tags) : blueprint.tags || [],
  };

  db.assets.push(asset);
  saveDb(db, options);

  if (options.json) {
    printJson(summarize(asset, options));
  } else {
    success(`Asset "${asset.name}" (${asset.id}) created. Tag it in markdown with @asset[${asset.id}].`, options);
  }
}

function updateAsset(id, options, db) {
  if (!id) error('Usage: vellum assets update <id> [options]');
  const asset = db.assets.find((a) => a.id === id);
  if (!asset) error(`Asset "${id}" not found.`);

  const patch = parseData(options);
  if (options.name) asset.name = options.name;
  if (options.caption !== undefined) asset.caption = String(options.caption);
  if (options.image) asset.imageUrl = toDataUrl(options.image);
  if (options.tags !== undefined) asset.tags = splitTags(options.tags);
  const { id: _ignored, ...rest } = patch;
  Object.assign(asset, rest);
  saveDb(db, options);

  if (options.json) {
    printJson(summarize(asset, options));
  } else {
    success(`Asset "${asset.name}" (${asset.id}) updated.`, options);
  }
}

function deleteAsset(id, options, db) {
  if (!id) error('Usage: vellum assets delete <id>');
  const idx = db.assets.findIndex((a) => a.id === id);
  if (idx === -1) error(`Asset "${id}" not found.`);

  const asset = db.assets.splice(idx, 1)[0];
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, name: asset.name });
  } else {
    success(`Asset "${asset.name}" (${id}) deleted. Remove any @asset[${id}] tags from your text.`, options);
  }
}

function printAssetsHelp() {
  console.log(`
${c.bold('vellum assets')} — Images with a caption, taggable in markdown and showable to players

${c.bold('USAGE:')}
  vellum assets list [--tag <tag>] [--search <text>] [--json]
  vellum assets get <id> [--full] [--json]
  vellum assets create --name <name> --image <file|dataUrl> [--caption <text>] [--tags a,b] [--id <id>] [--json]
  vellum assets update <id> [--name <n>] [--caption <text>] [--image <file|dataUrl>] [--tags a,b] [--json]
  vellum assets delete <id> [--json]

${c.bold('NOTES:')}
  Tag an asset in any scene text with @asset[<id>]; clicking it in the Live Console opens it
  and lets the DM show it to players. Listings omit the image data unless --full is given.
`);
}
