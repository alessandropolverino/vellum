import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printJson, success, info, warn, error, c } from './output.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SKILL_NAME = 'vellum-cli';
const home = (...p) => path.join(os.homedir(), ...p);

/**
 * Skills folders each agent reads, from the agents' own docs:
 * - Claude Code:   ~/.claude/skills            | .claude/skills        (code.claude.com/docs/en/skills)
 * - Codex:         ~/.agents/skills            | .agents/skills        (learn.chatgpt.com/docs/build-skills)
 * - Gemini CLI:    ~/.gemini/skills or its alias ~/.agents/skills | .agents/skills (geminicli.com/docs/cli/skills)
 * - Cursor:        ~/.cursor/skills or ~/.agents/skills | .agents/skills (cursor.com/docs/skills)
 * - Antigravity:   ~/.gemini/config/skills     | .agents/skills        (antigravity.google/docs/skills)
 * Every agent uses the same `<skills dir>/<skill name>/SKILL.md` layout, so the skill is copied as is.
 * `detect` is the folder whose presence means the agent is set up on this machine.
 */
const AGENTS = {
  claude: {
    label: 'Claude Code',
    detect: () => home('.claude'),
    user: () => home('.claude', 'skills'),
    project: () => path.resolve('.claude', 'skills'),
  },
  codex: {
    label: 'Codex',
    detect: () => home('.codex'),
    user: () => home('.agents', 'skills'),
    project: () => path.resolve('.agents', 'skills'),
  },
  gemini: {
    label: 'Gemini CLI',
    detect: () => home('.gemini'),
    user: () => home('.agents', 'skills'),
    project: () => path.resolve('.agents', 'skills'),
  },
  cursor: {
    label: 'Cursor',
    detect: () => home('.cursor'),
    user: () => home('.agents', 'skills'),
    project: () => path.resolve('.agents', 'skills'),
  },
  antigravity: {
    label: 'Antigravity',
    detect: () => home('.gemini', 'antigravity'),
    user: () => home('.gemini', 'config', 'skills'),
    project: () => path.resolve('.agents', 'skills'),
  },
};

/** Finds the skill shipped with Vellum: repo checkout (skills/vellum-cli/SKILL.md) or installer (skills/SKILL.md). */
export function findSkillSource() {
  const root = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.join(root, 'skills', SKILL_NAME, 'SKILL.md'),
    path.join(root, 'skills', 'SKILL.md'),
    path.join(root, '_up_', 'skills', 'SKILL.md'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function getScope(options) {
  const scope = options.scope === undefined ? 'user' : String(options.scope).toLowerCase();
  if (scope !== 'user' && scope !== 'project') error(`Invalid --scope '${options.scope}'. Use 'user' or 'project'.`);
  return scope;
}

function resolveAgents(options) {
  const requested = options.agent;
  if (requested === undefined || requested === true) {
    // No --agent: every supported agent already set up on this machine.
    return Object.keys(AGENTS).filter((n) => fs.existsSync(AGENTS[n].detect()));
  }
  const names = String(requested).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (names.includes('all')) return Object.keys(AGENTS);
  const unknown = names.filter((n) => !AGENTS[n]);
  if (unknown.length) {
    error(`Unknown agent '${unknown.join(', ')}'. Supported: ${Object.keys(AGENTS).join(', ')}, all.`);
  }
  return [...new Set(names)];
}

/** Groups agents that share a folder so the file is written once. */
function planTargets(agents, scope) {
  const byPath = new Map();
  for (const name of agents) {
    const file = path.join(AGENTS[name][scope](), SKILL_NAME, 'SKILL.md');
    const key = process.platform === 'win32' ? file.toLowerCase() : file;
    if (!byPath.has(key)) byPath.set(key, { path: file, agents: [] });
    byPath.get(key).agents.push(name);
  }
  return [...byPath.values()];
}

const agentList = (names) => names.map((n) => AGENTS[n].label).join(', ');

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

function loadSource() {
  const source = findSkillSource();
  if (!source) error(`Could not locate the bundled Vellum skill (skills/${SKILL_NAME}/SKILL.md).`);
  return { source, content: fs.readFileSync(source, 'utf8') };
}

function runInstall(options) {
  const { source, content } = loadSource();
  const scope = getScope(options);
  const agents = resolveAgents(options);
  const dryRun = Boolean(options['dry-run']);

  if (agents.length === 0) {
    error(
      'No supported agent found on this machine (looked for ~/.claude, ~/.codex, ~/.gemini, ~/.cursor). ' +
        `Pass --agent ${Object.keys(AGENTS).join('|')}|all to install anyway.`
    );
  }

  const results = planTargets(agents, scope).map((t) => {
    const existing = readIfExists(t.path);
    const status = existing === null ? 'created' : existing === content ? 'unchanged' : 'updated';
    if (status !== 'unchanged' && !dryRun) {
      fs.mkdirSync(path.dirname(t.path), { recursive: true });
      fs.writeFileSync(t.path, content, 'utf8');
    }
    return { agents: t.agents, scope, path: t.path, status, dryRun };
  });

  if (options.json) {
    printJson({ source, results });
    return;
  }
  for (const r of results) {
    const line = `${r.dryRun ? `would be ${r.status}` : r.status} → ${r.path}  ${c.dim(`(${agentList(r.agents)})`)}`;
    if (r.status === 'unchanged') info(line, options);
    else success(line, options);
  }
  if (dryRun) warn('Dry run: nothing was written.', options);
  else info('Restart the agent (or open a new session) if it does not pick up the skill.', options);
}

function runStatus(options) {
  const { content } = loadSource();
  const scope = getScope(options);
  const rows = planTargets(Object.keys(AGENTS), scope).map((t) => {
    const existing = readIfExists(t.path);
    const state = existing === null ? 'missing' : existing === content ? 'up-to-date' : 'outdated';
    return { agents: t.agents, scope, path: t.path, state };
  });

  if (options.json) {
    printJson({ results: rows });
    return;
  }
  for (const r of rows) {
    const color = r.state === 'up-to-date' ? c.green : r.state === 'outdated' ? c.yellow : c.dim;
    console.log(`${color(r.state.padEnd(11))} ${r.path}  ${c.dim(`(${agentList(r.agents)})`)}`);
  }
}

function printSkillHelp() {
  console.log(`
${c.bold('vellum-cli skill')} — Install or update the Vellum skill for your coding agents

${c.bold('USAGE:')}
  vellum-cli skill install [--agent <name>] [--scope user|project] [--dry-run] [--json]
  vellum-cli skill status  [--scope user|project] [--json]

${c.bold('AGENTS')} (--user scope folder, from each agent's docs):
  claude        ~/.claude/skills/vellum-cli/SKILL.md
  codex         ~/.agents/skills/vellum-cli/SKILL.md
  gemini        ~/.agents/skills/vellum-cli/SKILL.md   (Gemini CLI)
  cursor        ~/.agents/skills/vellum-cli/SKILL.md
  antigravity   ~/.gemini/config/skills/vellum-cli/SKILL.md
  all           All of the above (creates the folders if missing)
  Without --agent: every agent already set up on this machine (~/.claude, ~/.codex, ~/.gemini, ~/.cursor).
  Comma-separate several: --agent claude,codex. Agents sharing a folder are written once.

${c.bold('OPTIONS:')}
  --scope user      (default) Install for your whole machine
  --scope project   Install in the current folder (.claude/skills, .agents/skills)
  --dry-run         Show what would change without writing anything

Running install again updates what is already there; unchanged files are left alone.
`);
}
