# Vellum CLI & Entity Operations for AI Agents

## Overview
Vellum includes a command-line interface (`npm run cli -- <command>` or `node bin/vellum.mjs <command>`) for performing full CRUD operations on all campaign and 5e entities without opening the UI.

## Golden Rules for Agents
1. **Always append `--json`**: When reading or mutating data, always pass `--json` to receive structured, machine-parseable JSON responses.
2. **Database Auto-Discovery**: The CLI automatically locates `data/dnd5e-db.json` across parent directories and git worktrees. Custom DB paths can be set with `--db <path>`.
3. **Complex Payloads**: Use `--data @<filename>.json` or `--markdown @<filename>.md` when passing complex character statblocks, scene text, or encounter configurations.
4. **Post-mutation validation**: After creating or modifying adventures, scenes, or characters, run `npm run cli -- db validate --json` to verify there are no dangling references or integrity errors.

## Key Subcommands
- `stories` (or `adventures`): `list`, `get`, `create`, `update`, `delete`, `scene <list|get|add|update|delete>`
- `characters` (or `pgs`, `chars`): `list`, `get`, `create`, `update`, `delete`, `action <add|remove>`
- `campaigns`: `list`, `get`, `create`, `update`, `delete`
- `parties`: `list`, `get`, `create`, `update`, `delete`, `add-member`, `remove-member`
- `encounters`: `list`, `add`, `delete`
- `instances`: `list`, `get`, `create`, `set-scene`, `log`, `pc-status`, `combat <start|next|end>`
- `sfx`: `list`, `get`
- `db`: `stats`, `validate`, `backup`, `export`, `import`, `seed`
- `agent-guide`: prints the agent usage guide
