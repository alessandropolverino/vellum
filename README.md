# Vellum — D&D 5e Campaign, One-Shot & DM Studio

Web & Desktop application (**Tauri v2 + React 19 + TypeScript + Tailwind CSS**) built for D&D 5e Dungeon Masters to author campaigns and one-shots, manage parties and statblocks, and run live tabletop sessions.

## Key Features

1. **Interactive Homebrewery-Style Editor & Renderer**:
   - Authentic D&D 5e parchment typography and layout (single or two-column book layout, classic headings, drop caps, and stat tables).
   - Dedicated interactive DM syntax:
     - `:::read-aloud` ... `:::` → Boxed narrative text to read aloud to players (with a 1-click button to log it into the session chronicle).
     - `:::dm-note` ... `:::` → Secret Dungeon Master notes (hidden with 1 click in *Player View*).
     - `@sfx[id]` → Embeds an interactive audio trigger button right inside your story text.
     - `@npc[id]` → Embeds a clickable badge that opens the character or monster's 5e sheet/statblock in a modal.
     - `@statblock[id]` → Renders the full D&D 5e statblock card inline on the page.
     - `@encounter[id]` → Embeds a prepared combat encounter card with a **"⚔️ Start Combat"** button.

2. **Multi-Instance Session Runner (Same Adventure, Multiple Groups)**:
   - Clean separation between the **Adventure Blueprint** (One-Shot or Campaign Chapter) and the **Play Instance (`PlayInstance`)**.
   - Run the exact same One-Shot or Campaign simultaneously for your *Thursday Group*, *Saturday Group*, etc.
   - Each play instance tracks its own isolated state: current scene, visited scenes, PC hit points/conditions/inspiration, active combat state, scene-specific DM scratchpad notes, and timestamped session log.

3. **Global PC, NPC, Bestiary & Party Repository**:
   - Complete D&D 5e statblocks and character sheets with automatic ability modifiers, AC, HP, hit dice, initiative bonus, passive perception, traits, actions, and legendary actions.
   - Reusable **Parties** to spin up new play instances in one click.

4. **Integrated Combat Tracker (Planned or Ad-Hoc)**:
   - Launch combat with 1 click from an inline `@encounter[id]` block or start an **ad-hoc encounter** on the fly.
   - Automatic initiative rolling (`1d20 + bonus`), turn/round progression, damage/healing controls, D&D 5e condition toggles, and a live statblock inspector for the active combatant.
   - Ending combat automatically syncs surviving PC hit points back to the play instance and records a summary in the session log.

5. **Contextual SFX & Ambience Soundboard**:
   - Global library of looping background ambiences and one-shot sound effects (includes a built-in procedural Web Audio synthesizer out of the box + support for custom `.mp3`, `.wav`, and `.ogg` files).
   - Pin specific soundtracks and SFX to each scene so they are immediately ready in the Live DM Console.

6. **Multi-Language UI (`EN` / `IT`)**:
   - Full English (`EN`, default) and Italian (`IT`) UI localization, switchable at any time from the top navigation bar.

7. **Vellum CLI & AI Agent Integration**:
   - Built-in command line interface (`npm run cli -- ...`) providing full CRUD capabilities on stories, characters/PGs, campaigns, parties, encounters, instances, and DB maintenance.
   - Strict `--json` output mode for automated pipelines and AI coding assistants (Claude, Gemini, Codex, Antigravity).
   - Embedded agent instructions and skill specification in [`skills/vellum-cli/SKILL.md`](./skills/vellum-cli/SKILL.md).

8. **Local Disk Persistence & Cloud-Ready Architecture**:
   - Automatically saves to `./data/dnd5e-db.json` in web/dev mode and to the OS AppData directory in the native Tauri desktop app (plus full JSON Export/Import).
   - The storage layer (`src/services/storageRepository.ts`) implements the `IStorageRepository` interface, ready to plug into a future cloud/SaaS adapter.

## Install & Quick Start

```bash
# Install dependencies
npm install

# Start Web UI + local disk persistence (./data/dnd5e-db.json)
npm run dev

# Run CLI commands (see `npm run cli -- --help`)
npm run cli -- stories list
npm run cli -- characters get pc-tharion

# Run or build as a native Tauri v2 desktop application
npm run tauri dev
npm run tauri build
```

## CLI Usage for Developers & AI Agents

```bash
# General help and command overview
npm run cli -- --help

# AI Agent protocol and usage guide
npm run cli -- agent-guide

# List stories/adventures in machine-readable JSON
npm run cli -- stories list --json

# View a character statblock formatted for terminal
npm run cli -- characters get pc-tharion

# Create a new character (PC, NPC, or Monster)
npm run cli -- characters create --name "Valerius" --kind pc --class "Paladin" --hp 38 --ac 18 --json

# Validate database integrity (foreign keys, broken references)
npm run cli -- db validate --json
```

## Releases

| Version | Date | Platform | Notes |
| :--- | :--- | :--- | :--- |
| *Unreleased* | — | Windows / macOS | [CHANGELOG.md](./CHANGELOG.md) |
