import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, success, error, c } from './output.mjs';

/**
 * Labels are the free-text `tags` of characters (PCs, NPCs, monsters), sound effects and assets.
 * They are not the @entity[...] markdown references used inside text.
 */

/** Comma-separated string -> trimmed, de-duplicated (case-insensitive) label list. */
export function parseLabels(value) {
  if (value === undefined || value === null || value === true) return [];
  const seen = new Set();
  const out = [];
  for (const raw of String(value).split(',')) {
    const label = raw.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/**
 * Applies --labels / --tags (replace), --add-label and --remove-label to an entity's current labels.
 * Returns the new list, or undefined when no label option was given (leave the entity untouched).
 */
export function applyLabelOptions(current, options) {
  const replace = options.labels !== undefined ? options.labels : options.tags;
  const add = options['add-label'];
  const remove = options['remove-label'];
  if (replace === undefined && add === undefined && remove === undefined) return undefined;

  let labels = replace !== undefined ? parseLabels(replace) : parseLabels((current || []).join(','));
  if (add !== undefined) labels = parseLabels([...labels, ...parseLabels(add)].join(','));
  if (remove !== undefined) {
    const drop = new Set(parseLabels(remove).map((l) => l.toLowerCase()));
    labels = labels.filter((l) => !drop.has(l.toLowerCase()));
  }
  return labels;
}

/** Keeps entities carrying every label given in --label / --tag (comma separated, case-insensitive). */
export function filterByLabels(list, options) {
  const wanted = parseLabels(options.label !== undefined ? options.label : options.tag).map((l) =>
    l.toLowerCase()
  );
  if (wanted.length === 0) return list;
  return list.filter((item) => {
    const own = new Set((item.tags || []).map((t) => t.toLowerCase()));
    return wanted.every((w) => own.has(w));
  });
}

const GROUPS = [
  ['characters', 'character'],
  ['sfxCatalog', 'sfx'],
  ['assets', 'asset'],
];

export function handleLabels(action, positionals, options) {
  const { db } = loadDb(options);

  switch (action) {
    case 'list':
      return listLabels(db, options);
    case 'rename':
      return renameLabel(positionals[0], positionals[1], db, options);
    default:
      if (!action || action === 'help') {
        printLabelsHelp();
        return;
      }
      error(`Unknown labels action '${action}'. Run 'vellum labels --help' for usage.`);
  }
}

function listLabels(db, options) {
  const counts = new Map();
  for (const [key, type] of GROUPS) {
    for (const item of db[key] || []) {
      for (const label of parseLabels((item.tags || []).join(','))) {
        const k = label.toLowerCase();
        const entry = counts.get(k) || { label, character: 0, sfx: 0, asset: 0 };
        entry[type] += 1;
        counts.set(k, entry);
      }
    }
  }
  const rows = [...counts.values()]
    .map((e) => ({ ...e, total: e.character + e.sfx + e.asset }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (options.json) {
    printJson(rows);
    return;
  }
  console.log(c.bold(`\nLabels (${rows.length}):\n`));
  printTable(
    [
      { key: 'label', label: 'Label', maxWidth: 30, color: (s) => c.bold(s) },
      { key: 'character', label: 'Characters', maxWidth: 10 },
      { key: 'sfx', label: 'SFX', maxWidth: 6 },
      { key: 'asset', label: 'Assets', maxWidth: 8 },
      { key: 'total', label: 'Total', maxWidth: 6, color: (s) => c.cyan(s) },
    ],
    rows
  );
  console.log('');
}

function renameLabel(from, to, db, options) {
  if (!from || !to) error('Usage: vellum labels rename <old> <new>');
  const target = parseLabels(to)[0];
  if (!target) error('The new label cannot be empty.');
  const old = from.trim().toLowerCase();
  let changed = 0;
  for (const [key] of GROUPS) {
    for (const item of db[key] || []) {
      if (!(item.tags || []).some((t) => t.trim().toLowerCase() === old)) continue;
      item.tags = parseLabels(item.tags.map((t) => (t.trim().toLowerCase() === old ? target : t)).join(','));
      changed += 1;
    }
  }
  if (changed === 0) error(`No entity carries the label "${from}".`);
  saveDb(db, options);
  if (options.json) printJson({ renamed: { from, to: target }, entitiesChanged: changed });
  else success(`Label "${from}" renamed to "${target}" on ${changed} entit${changed === 1 ? 'y' : 'ies'}.`, options);
}

function printLabelsHelp() {
  console.log(`
${c.bold('vellum labels')} — Free-text labels shared by characters, sound effects and assets

${c.bold('USAGE:')}
  vellum labels list [--json]               All labels with usage counts per entity type
  vellum labels rename <old> <new> [--json] Rename a label everywhere (merges with <new> if it already exists)

${c.bold('PER-ENTITY OPTIONS')} (characters, sfx, assets):
  --label a,b           (list) Keep only entities carrying ALL these labels
  --labels a,b          (create/update) Replace the labels (alias: --tags)
  --add-label a,b       (update) Add labels
  --remove-label a,b    (update) Remove labels

Labels are not the @entity[...] markdown references used inside text.
`);
}
