# Changelog

All notable user-facing changes to Vellum are documented in this file.

## Unreleased

- App: Add cross-platform `Makefile` (Unix/Linux/macOS/Windows) and Windows PowerShell scripts (`dev.ps1` and `build.ps1`) for starting the development server and building the application.
- App: Add Pre-Gen PC Blueprints, player/instance PC instantiation, session-only custom PCs in the Live Session Console, full D&D 5e 18-skill & 6-saving-throw matrix with proficiency/expertise calculation, character/NPC/monster portraits, and official D&D 5e PDF Character Sheet & Statblock export.
- App: Add comprehensive Vellum CLI (`npm run cli -- ...`) and AI agent skill (`skills/vellum-cli/SKILL.md`) for programmatic CRUD operations on stories, characters/PGs, campaigns, parties, encounters, instances, and DB maintenance with `--json` support and integrity validation.
- App: Translate application, documentation, and default starter adventure to English (`EN`), and add multi-language UI support with an instant `EN` / `IT` switcher in the header.
- Windows: Initial MVP of Vellum with Homebrewery-style D&D 5e editor, global PC/NPC/Monster repository, multi-instance session runner, integrated Combat Tracker, and multi-track SFX Soundboard.
