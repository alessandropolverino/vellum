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
   - Complete D&D 5e statblocks and character sheets with automatic ability modifiers, all 18 skills & 6 saving throws, portraits, AC, HP, hit dice, initiative bonus, passive perception, traits, actions, and legendary actions.
   - Support for **Pre-Gen PC Blueprints**, player-specific instantiated sheets, session-only PCs, and **Official D&D 5e PDF Character Sheet & Statblock export**.

4. **Integrated Combat Tracker (Planned or Ad-Hoc)**:
   - Launch combat with 1 click from an inline `@encounter[id]` block or start an **ad-hoc encounter** on the fly.
   - Automatic initiative rolling (`1d20 + bonus`), turn/round progression, damage/healing controls, D&D 5e condition toggles, and a live statblock inspector for the active combatant.
   - Ending combat automatically syncs surviving PC hit points back to the play instance and records a summary in the session log.

5. **Contextual SFX & Ambience Soundboard**:
   - Global library of looping background ambiences and one-shot sound effects (includes a built-in procedural Web Audio synthesizer out of the box + support for custom `.mp3`, `.wav`, and `.ogg` files).
   - Pin specific soundtracks and SFX to each scene so they are immediately ready in the Live DM Console.

6. **Multi-Language UI (`EN` / `IT`)**:
   - Full English (`EN`, default) and Italian (`IT`) UI localization, switchable at any time from the top navigation bar.

7. **Local Disk Persistence & Cloud-Ready Architecture**:
   - Automatically saves to `./data/dnd5e-db.json` in web/dev mode and to the OS AppData directory in the native Tauri desktop app (plus full JSON Export/Import).
   - The storage layer (`src/services/storageRepository.ts`) implements the `IStorageRepository` interface, ready to plug into a future cloud/SaaS adapter.

## Install & Quick Start

### Using `Makefile` (Unix / Linux / macOS / Windows)

```bash
make help         # List all available targets
make dev          # Start Vite dev server (http://localhost:1420)
make build        # Typecheck (tsc -b) and build production bundle (./dist)
make tauri-dev    # Start native Tauri v2 desktop app in dev mode
make tauri-build  # Build native Tauri v2 desktop installer
make clean        # Remove ./dist build artifacts
```

### Using PowerShell Scripts (Windows)

```powershell
# Start development server (auto-installs node_modules if missing)
.\dev.ps1
.\dev.ps1 -Tauri   # Or launch native Tauri v2 desktop dev mode

# Build production bundle in ./dist
.\build.ps1
.\build.ps1 -Clean # Clean ./dist before building
.\build.ps1 -Tauri # Package native Tauri v2 desktop installer
```

### Using `npm` Directly

```bash
# Install dependencies
npm install

# Start Web UI + local disk persistence (./data/dnd5e-db.json)
npm run dev

# Build production frontend
npm run build

# Run or build as a native Tauri v2 desktop application
npm run tauri dev
npm run tauri build
```

## Releases

| Version | Date | Platform | Notes |
| :--- | :--- | :--- | :--- |
| *Unreleased* | — | Windows / macOS | [CHANGELOG.md](./CHANGELOG.md) |
