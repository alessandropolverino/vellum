# Changelog

All notable user-facing changes to Vellum are documented in this file.

## Unreleased

- App: Add comprehensive Data Preservation, Automatic Backup, and Schema Migration engine across frequent application updates:
  - Atomic disk writes (`fs::write` to temporary file + disk flush + atomic rename) in Tauri desktop backend and local dev API to guarantee zero file truncation or corruption even during power failure or sudden crashes.
  - Automatic rolling snapshots in `backups/` directory (up to 20 retained snapshots) created every 15 minutes of activity, prior to database imports/restores, and before schema upgrades.
  - Schema migration runner and defensive normalizer (`normalizeDatabase` / `migrateDatabase`) ensuring old or partial database snapshots always initialize with safe defaults without crashing UI components or losing custom entities.
  - Dedicated interactive Data Preservation & Backups Manager modal (`DataBackupModal`) accessible from the top storage indicator or shield icon: create labeled manual snapshots, inspect local backup history, one-click restore with automatic pre-restore safety copy, reveal local storage folder in Windows Explorer or macOS Finder, and non-destructively sync newly released official 5e adventures and pre-gen blueprints without overwriting user creations.

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
