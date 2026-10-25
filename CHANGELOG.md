# Changelog

All notable user-facing changes to Vellum are documented in this file.

## Unreleased

- App: Add interactive character portrait framing and cropping modal with real-time statblock and token previews:
  - Automatic framing/crop dialog immediately after uploading an image file or via the new "Adjust Framing / Crop" action in the character sheet editor.
  - Interactive pan and zoom controls (drag to pan, mouse wheel zoom, zoom slider with +/- buttons, reset button, and rule-of-thirds grid guides) ensuring character faces, monsters, or focal details are never cut off.
  - Synchronized real-time live previews displaying both square statblock card framing and circular combat token avatar framing side-by-side.
  - Relocated portrait in `StatblockCard` to the upper right corner to optimize space utilization and align with the official 5e statblock PDF layout, with an interactive hover crop trigger directly from the live preview.
  - Preservation of original uncropped image source (`portraitOriginalUrl`) so users can re-adjust framing at any time without re-uploading.

- App: Add real-time auto-save status indicator and manual save trigger in Adventure Studio:
  - Contextual status badges displaying real-time save state (`Saving...`, `Saved (HH:MM:SS)`, `Save Error`) in the Adventure Studio top bar and directly above the Homebrewery Markdown editor.
  - Interactive save trigger and keyboard shortcut (`Ctrl+S` / `Cmd+S`) allowing users and DMs to instantly verify or force persistence with visual feedback while authoring one-shots, campaign modules, and scenes.
  - Improved header storage status button visibility on medium/laptop screens (`md`).

- App: Add comprehensive Data Preservation, Automatic Backup, and Schema Migration engine across frequent application updates:
  - Atomic disk writes (`fs::write` to temporary file + disk flush + atomic rename) in Tauri desktop backend and local dev API to guarantee zero file truncation or corruption even during power failure or sudden crashes.
  - Automatic rolling snapshots in `backups/` directory (up to 20 retained snapshots) created every 15 minutes of activity, prior to database imports/restores, and before schema upgrades.
  - Dedicated local media storage (`media/audio/` in AppData) for 3–5 minute audio files and soundscapes: audio files are saved directly to disk and referenced cleanly, keeping the JSON database lightweight, instantaneous to save, and under 200 KB.
  - Schema migration runner and defensive normalizer (`normalizeDatabase` / `migrateDatabase`) ensuring old or partial database snapshots always initialize with safe defaults without crashing UI components or losing custom entities.
  - Dedicated interactive Data Preservation & Backups Manager modal (`DataBackupModal`):
    - **Ripristina Backup ("Restore Backup")**: restores the full application state to any historical snapshot, with an automatic pre-restore safety copy taken first.
    - **Integra Backup ("Integrate / Merge Backup")**: merges all missing campaigns, adventures, characters, sessions, and SFX from a backup (local or uploaded JSON) into the active database, without deleting or overwriting any unrelated current data.
    - **Esporta Backup**: downloads a standalone JSON snapshot.
    - **Sync Official 5e Content**: non-destructively syncs newly released official adventures, pre-gens, and SFX.
    - **Open Data Folder**: reveals the AppData / local data directory in Windows Explorer or macOS Finder with one click.

- App: Replace cramped modal dialogs with full-page dedicated views for Character (PG) Creation and Character Sheet Editing:
  - Full-page Supervised PC Creator (`SupervisedPgCreateView`) with spacious race and class cards, starting level slider, live attributes preview, and dual options to either "Save Direct to Repository" or "Customize in Full Editor".
  - Full-page Character Sheet Editor (`FullPageCharacterEditor`) providing generous workspace, sticky action header (`Save Sheet`, `Level Up ▲`, `Export Official 5e PDF`), toggleable sticky live Statblock Preview panel, and bottom actions.
  - Fix overlapping and crowded labels in character sheet editor: decoupled presets dropdowns and Level-Up buttons from field labels so they never collide or wrap awkwardly.
  - Fix character header and badge squeezing in `StatblockCard`: separated character identity and portrait from card action buttons into an action toolbar so titles, names, and badges never get squished into narrow columns.

- App: Add Supervised PG Creation, Editing, and Level-Up system for D&D 5e Player Characters (Blueprints and Active Heroes):
  - Guided creation wizard selecting Race, Class, and Level with automatic assembly of standard D&D 5e SRD traits, HP formulas, and class features.
  - Automatic source tagging for added traits and abilities (e.g. `(Elf) Darkvision`, `(Elf) Keen Senses`, `(Fighter) Action Surge`, `(Fighter) Second Wind`).
  - Real-time rules validation advisory banner checking HP ranges, hit dice formulas, saving throw proficiencies, proficiency bonus, and ability scores with one-click standard alignment.
  - Non-blocking Master authority: The Dungeon Master is ALWAYS the final decision maker; all inputs support custom/homebrew values and a prominent "Continue anyway / Master Override" mechanism.
  - Interactive Level-Up Wizard supporting both Pre-Gen Blueprints and active campaign PCs, with target level jumping, average or rolled HP calculation, proficiency bonus scaling (+2 to +6), new feature unlock checklists, and notification badges for pending choices (ASI/feats, subclasses, expertise).
  - Dual-save pathways for Blueprints: "Save as New Leveled Blueprint" (preserving lower-level templates) vs "Update Existing Blueprint".
  - CLI command `vellum characters level-up <id> --to-level <N> [--save-as-new] [--name <name>] [--json]` for AI agent automation.

- App: Add cross-platform `Makefile` (Unix/Linux/macOS/Windows) and Windows PowerShell scripts (`dev.ps1` and `build.ps1`) for starting the development server and building the application.
- App: Add Pre-Gen PC Blueprints, player/instance PC instantiation, session-only custom PCs in the Live Session Console, full D&D 5e 18-skill & 6-saving-throw matrix with proficiency/expertise calculation, character/NPC/monster portraits, and official D&D 5e PDF Character Sheet & Statblock export.
- App: Add comprehensive Vellum CLI (`npm run cli -- ...`) and AI agent skill (`skills/vellum-cli/SKILL.md`) for programmatic CRUD operations on stories, characters/PGs, campaigns, parties, encounters, instances, and DB maintenance with `--json` support and integrity validation.
- App: Translate application, documentation, and default starter adventure to English (`EN`), and add multi-language UI support with an instant `EN` / `IT` switcher in the header.
- Windows: Initial MVP of Vellum with Homebrewery-style D&D 5e editor, global PC/NPC/Monster repository, multi-instance session runner, integrated Combat Tracker, and multi-track SFX Soundboard.
