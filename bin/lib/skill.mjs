import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printJson, success, info, warn, error, c } from './output.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BEGIN = '<!-- vellum-cli:begin (managed by `vellum-cli skill install`, do not edit) -->';
const END = '<!-- vellum-cli:end -->';

/**
 * Where each agent reads its instructions.
 * - `skill`: the agent has a skills folder, so the full SKILL.md is copied there.
 * - `block`: the agent only has an always-loaded instruction file, so a short managed block is
 *   inserted into it (and replaced in place on every update).
 */
const AGENTS = {
  claude: {
    label: 'Claude Code',
    kind: 'skill',
    home: () => path.join(os.homedir(), '.claude'),
    userTarget: () => path.join(os.homedir(), '.claude', 'skills', 'vellum-cli', 'SKILL.md'),
    projectTarget: () => path.resolve('.claude', 'skills', 'vellum-cli', 'SKILL.md'),
  },
  codex: {
    label: 'Codex',
    kind: 'block',
    home: () => path.join(os.homedir(), '.codex'),
    userTarget: () => path.join(os.homedir(), '.codex', 'AGENTS.md'),
    projectTarget: () => path.resolve('AGENTS.md'),
  },
  gemini: {
    label: 'Gemini CLI',
    kind: 'block',
    home: () => path.join(os.homedir(), '.gemini'),
    userTarget: () => path.join(os.homedir(), '.gemini', 'GEMINI.md'),
    projectTarget: () => path.resolve('GEMINI.md'),
  },
};

/** Finds the skill shipped with Vellum: repo checkout (skills/vellum-cli/SKILL.md) or installer (skills/SKILL.md). */
export function findSkillSource() {
  const root = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.join(root, 'skills', 'vellum-cli', 'SKILL.md'),
    path.join(root, 'skills', 'SKILL.md'),
    path.join(root, '_up_', 'skills', 'SKILL.md'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/** Short always-on instructions for agents that only read one instruction file. */
function buildBlock() {
  return [
    BEGIN,
    '## Vellum CLI',
    '',
    'To read or change Vellum data (adventures, scenes, characters, campaigns, parties, encounters,',
    'live sessions, assets, labels) use the globally installed `vellum-cli` command; never edit the',
    'database JSON by hand. Do not use bare `vellum`: with no arguments it launches the desktop app.',
    '',
    '1. Run `vellum-cli agent-guide` first: it prints the current schemas, patterns and recipes.',
    '2. Always append `--json`.',
    '3. For long payloads use `--data @file.json` or `--markdown @file.md`.',
    '4. Run `vellum-cli db validate --json` after every change.',
    '5. The CLI edits the database file directly. Run from a repo checkout it uses `data/vellum-db.json`;',
    '   elsewhere it uses the installed app database. Check with `vellum-cli db stats --json`, or force one',
    '   with `--db <path>`.',
    END,
  ].join('\n');
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function eolOf(text) {
  return text && text.includes('\r\n') ? '\r\n' : '\n';
}

function withEol(text, eol) {
  return eol === '\r\n' ? text.replace(/\r?\n/g, '\r\n') : text.replace(/\r\n/g, '\n');
}

/** Returns { next, found } for a file's text with the managed block inserted or replaced. */
function applyBlock(existing, block) {
  const eol = eolOf(existing);
  const managed = withEol(block, eol);
  if (existing === null || existing.trim() === '') return { next: managed + eol, found: false };

  const start = existing.indexOf(BEGIN);
  const stop = existing.indexOf(END);
  if (start !== -1 && stop > start) {
    return { next: existing.slice(0, start) + managed + existing.slice(stop + END.length), found: true };
  }
  const sep = existing.endsWith(eol + eol) ? '' : existing.endsWith(eol) ? eol : eol + eol;
  return { next: existing + sep + managed + eol, found: false };
}

function extractBlock(text) {
  if (text === null) return null;
  const start = text.indexOf(BEGIN);
  const stop = text.indexOf(END);
  if (start === -1 || stop < start) return null;
  return text.slice(start, stop + END.length);
}

/** Plans (and optionally writes) the install for one agent. */
function installFor(name, scope, source, dryRun) {
  const agent = AGENTS[name];
  const target = scope === 'project' ? agent.projectTarget() : agent.userTarget();
  const existing = readIfExists(target);
  let next;
  let status;

  if (agent.kind === 'skill') {
    next = fs.readFileSync(source, 'utf8');
    status = existing === null ? 'created' : existing === next ? 'unchanged' : 'updated';
  } else {
    const block = buildBlock();
    const applied = applyBlock(existing, block);
    next = applied.next;
    status = !applied.found ? (existing === null || existing.trim() === '' ? 'created' : 'added') : next === existing ? 'unchanged' : 'updated';
  }

  if (status !== 'unchanged' && !dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, next, 'utf8');
  }
  return { agent: name, label: agent.label, scope, kind: agent.kind, path: target, status, dryRun };
}

function statusFor(name, scope, source) {
  const agent = AGENTS[name];
  const target = scope === 'project' ? agent.projectTarget() : agent.userTarget();
  const existing = readIfExists(target);
  let state;
  if (existing === null) state = 'missing';
  else if (agent.kind === 'skill') state = existing === fs.readFileSync(source, 'utf8') ? 'up-to-date' : 'outdated';
  else {
    const found = extractBlock(existing);
    state = found === null ? 'missing' : found === withEol(buildBlock(), eolOf(existing)) ? 'up-to-date' : 'outdated';
  }
  return { agent: name, label: agent.label, scope, path: target, state };
}

function resolveAgents(options) {
  const requested = options.agent;
  if (requested === undefined || requested === true) {
    // No --agent: every supported agent already set up on this machine (its config folder exists).
    return Object.keys(AGENTS).filter((n) => fs.existsSync(AGENTS[n].home()));
  }
  const names = String(requested).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (names.includes('all')) return Object.keys(AGENTS);
  const unknown = names.filter((n) => !AGENTS[n]);
  if (unknown.length) {
    error(`Unknown agent '${unknown.join(', ')}'. Supported: ${Object.keys(AGENTS).join(', ')}, all.`);
  }
  return [...new Set(names)];
}

export function handleSkill(action, positionals, options) {
  switch (action) {
    case 'install':
    case 'update':
      return runInstall(options);
    case 'status':
      return runStatus(options);
    default:
      if (!action || action === 'help') {
        printSkillHelp();
        return;
      }
      error(`Unknown skill action '${action}'. Run 'vellum-cli skill --help' for usage.`);
  }
}

function getScope(options) {
  const scope = options.scope === undefined ? 'user' : String(options.scope).toLowerCase();
  if (scope !== 'user' && scope !== 'project') error(`Invalid --scope '${options.scope}'. Use 'user' or 'project'.`);
  return scope;
}

function runInstall(options) {
  const source = findSkillSource();
  if (!source) error('Could not locate the bundled Vellum skill (skills/vellum-cli/SKILL.md).');
  const scope = getScope(options);
  const agents = resolveAgents(options);

  if (agents.length === 0) {
    error(
      'No supported agent found on this machine (looked for ~/.claude, ~/.codex, ~/.gemini). ' +
        `Pass --agent ${Object.keys(AGENTS).join('|')}|all to install anyway.`
    );
  }

  const results = agents.map((name) => installFor(name, scope, source, Boolean(options['dry-run'])));

  if (options.json) {
    printJson({ source, results });
    return;
  }
  for (const r of results) {
    const verb = r.dryRun ? `would be ${r.status}` : r.status;
    const line = `${r.label}: ${verb} → ${r.path}`;
    if (r.status === 'unchanged') info(line, options);
    else success(line, options);
  }
  if (options['dry-run']) warn('Dry run: nothing was written.', options);
  else info('Restart the agent (or open a new session) so it picks up the instructions.', options);
}

function runStatus(options) {
  const source = findSkillSource();
  if (!source) error('Could not locate the bundled Vellum skill (skills/vellum-cli/SKILL.md).');
  const scope = getScope(options);
  const rows = Object.keys(AGENTS).map((name) => statusFor(name, scope, source));

  if (options.json) {
    printJson({ source, results: rows });
    return;
  }
  for (const r of rows) {
    const color = r.state === 'up-to-date' ? c.green : r.state === 'outdated' ? c.yellow : c.dim;
    console.log(`${r.label.padEnd(12)} ${color(r.state.padEnd(11))} ${c.dim(r.path)}`);
  }
}

function printSkillHelp() {
  console.log(`
${c.bold('vellum-cli skill')} — Install or update the Vellum instructions for your coding agents

${c.bold('USAGE:')}
  vellum-cli skill install [--agent <name>] [--scope user|project] [--dry-run] [--json]
  vellum-cli skill status  [--scope user|project] [--json]

${c.bold('AGENTS:')}
  claude    Copies the full skill to ~/.claude/skills/vellum-cli/SKILL.md
  codex     Adds/updates a managed block in ~/.codex/AGENTS.md
  gemini    Adds/updates a managed block in ~/.gemini/GEMINI.md
  all       All of the above (creates the folders if missing)
  Without --agent: every agent whose config folder already exists on this machine.
  Comma-separate several: --agent claude,codex

${c.bold('OPTIONS:')}
  --scope user      (default) Install for your whole machine
  --scope project   Install in the current folder (.claude/skills, AGENTS.md, GEMINI.md)
  --dry-run         Show what would change without writing anything

Running install again updates what is already there; unchanged files are left alone.
Content outside the managed block in AGENTS.md / GEMINI.md is never touched.
`);
}
