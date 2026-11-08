---
name: vellum-cli
description: CLI interface for autonomous CRUD operations on D&D 5e campaigns, adventures, scenes, characters (PCs/NPCs/monsters), parties, encounters, and live play sessions. Use this skill whenever an AI agent needs to inspect, create, update, or delete Vellum entities.
---

# Vellum CLI — Agent Skill

This skill guides AI agents (Claude, Gemini, Codex, Antigravity, etc.) to programmatically inspect, query, create, update, and manage entities in **Vellum** (the D&D 5e Campaign & One-Shot Engine).

## 1. Running the CLI

**Use `vellum-cli`.** It is installed globally by the Vellum desktop installer (the `bin` folder is on the user's `PATH`), so it works from any directory. Every example below uses it.

```bash
vellum-cli <command> [subcommand] [arguments] [options]
```

`vellum-cli` vs `vellum`:
- `vellum-cli` **never opens the app window**. It is a pure CLI wrapper (Node.js required) and the only name agents should use.
- `vellum` with no arguments **launches the desktop app**. With a subcommand (`vellum stories list`) it behaves like `vellum-cli`, but don't rely on that: a typo or a missing argument can start the GUI instead.
- Both read and write the database **file** directly. Neither talks to a running app window.

Fallbacks, only when `vellum-cli` is not on `PATH` (e.g. an unbuilt checkout of the repo):

```bash
npm run cli -- <command> ...          # from the repo root or any worktree
node bin/vellum.mjs <command> ...
```

### Critical Rules for AI Agents
1. **Always use `--json` (or `-j`)**: Produces strict, machine-readable JSON without terminal colors or decorative borders.
2. **Database Auto-Discovery**: The CLI looks for `data/vellum-db.json` in the current folder, then parent folders and worktree roots (this is the dev database of a repo checkout). If none is found it uses the desktop app database in OS AppData. It also transparently migrates any legacy `dnd5e-db.json`. So **the working directory decides which database you touch**: run from a repo checkout and you edit the dev DB, run from anywhere else and you edit the installed app's DB. To force one: `--db <path>` or set `VELLUM_DB_PATH`. Run `vellum-cli db stats --json` first if unsure which one you got.
3. **Atomic Saves**: The CLI writes changes atomically to prevent file corruption.
4. **Use `@filepath` syntax**: For large markdown texts or complex JSON blueprints, write a temporary file and pass `--data @file.json` or `--markdown @scene.md`.
5. **Validate after changes**: run `vellum-cli db validate --json` after creating or modifying adventures, scenes or characters.
6. **Start with the guide**: `vellum-cli agent-guide` prints schemas, patterns and recipes.

---

## 2. Command Reference

### Database (`db`)
- `vellum-cli db stats --json`
  Returns entity counts (campaigns, adventures, scenes, characters, parties, instances, sfx, assets), file size, and timestamps.
- `vellum-cli db validate --json`
  Validates database integrity: schema errors, duplicate IDs, and dangling foreign key references.
- `vellum-cli db backup [--output <path>] --json`
  Creates a timestamped snapshot in `data/backups/`.
- `vellum-cli db export [--output <path>]`
  Exports full database JSON.
- `vellum-cli db import <file> [--merge | --replace] [--force] --json`
  Imports an external database snapshot.
- `vellum-cli db seed [--force] --json`
  Re-seeds the database with default 5e content.

---

### Stories & Adventures (`stories` / `adventures`)
- **List stories**:
  ```bash
  vellum-cli stories list [--campaign <id>] [--type <oneshot|campaign_module>] [--tag <tag>] [--search <query>] --json
  ```
- **Get story**:
  ```bash
  vellum-cli stories get <adventureId> --json
  # To extract full Homebrewery markdown of all scenes:
  vellum-cli stories get <adventureId> --markdown
  ```
- **Create story**:
  ```bash
  vellum-cli stories create --title "The Sunken Vault" --type oneshot --level "Level 3-4" --duration "3 hours" --tags "dungeon,undead" --json
  ```
- **Update story**:
  ```bash
  vellum-cli stories update <adventureId> --title "New Title" --level "Level 5" --json
  ```
- **Delete story**:
  ```bash
  vellum-cli stories delete <adventureId> [--force] --json
  ```

#### Story Scenes (`stories scene`)
- **List scenes**:
  ```bash
  vellum-cli stories scene list <adventureId> --json
  ```
- **Get scene**:
  ```bash
  vellum-cli stories scene get <adventureId> <sceneId> --json
  ```
- **Add scene**:
  ```bash
  vellum-cli stories scene add <adventureId> \
    --title "The Ancient Portcullis" \
    --code "Act I - Scene 1" \
    --location "Sunken Caverns" \
    --minutes 45 \
    --markdown "### Description\nThe heavy iron gate is barred from within." \
    --characters "npc-locandiere,mon-scheletro" \
    --json
  ```
- **Update scene**:
  ```bash
  vellum-cli stories scene update <adventureId> <sceneId> --summary "New summary" --markdown @updated_scene.md --json
  ```
- **Delete scene**:
  ```bash
  vellum-cli stories scene delete <adventureId> <sceneId> --json
  ```

---

### Characters, PGs, NPCs & Monsters (`characters` / `pgs` / `chars`)
- **List characters**:
  ```bash
  vellum-cli characters list [--kind <pc|npc|monster>] [--search <query>] [--label a,b] --json
  # Labels (see "Labels" below): --labels a,b on create/update, or --add-label / --remove-label on update
  ```
- **Get character**:
  ```bash
  vellum-cli characters get <characterId> --json
  # Or print ASCII statblock card:
  vellum-cli characters get <characterId>
  ```
- **Create character**:
  ```bash
  vellum-cli characters create \
    --name "Valerius Dawnstrider" \
    --kind pc \
    --role "Player: Alex" \
    --class "Paladin (Oath of Ancients)" \
    --level "Level 4" \
    --hp 38 \
    --ac 18 \
    --abilities 16,12,14,10,12,16 \
    --speed "30 ft." \
    --lore "A guardian of ancient grove oaths." \
    --json
  ```
- **Update character**:
  ```bash
  vellum-cli characters update <characterId> --hp 45 --ac 19 --json
  ```
- **Level up character (in-place or save as new blueprint)**:
  ```bash
  # In-place level-up (advances level, recalculates HP max and hit dice formula)
  vellum-cli characters level-up <characterId> --to-level 5 --json

  # Level up and save as new blueprint template (preserves lower-level original)
  vellum-cli characters level-up <characterId> --to-level 5 --save-as-new --name "Valerius (Level 5)" --json
  ```
- **Delete character**:
  ```bash
  vellum-cli characters delete <characterId> [--force] --json
  ```
- **Manage actions & traits**:
  ```bash
  # Add action
  vellum-cli characters action add <characterId> \
    --name "Smite" \
    --desc "Deals extra 2d8 radiant damage on melee hit" \
    --damage "2d8" \
    --json

  # Remove action
  vellum-cli characters action remove <characterId> "Smite" --json
  ```

---

### Campaigns (`campaigns`)
- **List campaigns**:
  ```bash
  vellum-cli campaigns list [--status <status>] --json
  ```
- **Get campaign**:
  ```bash
  vellum-cli campaigns get <campaignId> --json
  ```
- **Create campaign**:
  ```bash
  vellum-cli campaigns create \
    --title "Shadows over Neverwinter" \
    --setting "Sword Coast" \
    --desc "An investigative and heroic arc against the Cult of the Dragon." \
    --status "Active" \
    --json
  ```
- **Update campaign**:
  ```bash
  vellum-cli campaigns update <campaignId> --status "Concluded" --json
  ```
- **Delete campaign**:
  ```bash
  vellum-cli campaigns delete <campaignId> [--force] --json
  ```

---

### Adventuring Parties (`parties`)
- **List parties**:
  ```bash
  vellum-cli parties list --json
  ```
- **Get party**:
  ```bash
  vellum-cli parties get <partyId> --json
  ```
- **Create party**:
  ```bash
  vellum-cli parties create --name "The Silver Ravens" --members "pc-tharion,pc-lyra" --json
  ```
- **Add / Remove party member**:
  ```bash
  vellum-cli parties add-member <partyId> <characterId> --json
  vellum-cli parties remove-member <partyId> <characterId> --json
  ```

---

### Assets (`assets`)
Images with a caption, taggable in scene text as `@asset[<name>]` (case-insensitive; the id also works). The image is optional. In the Live Console a click on the tag opens the image and lets the DM show it to all connected players or only some of them.
- **List / get** (image data is omitted unless `--full`):
  ```bash
  vellum-cli assets list [--label a,b] [--search <query>] --json
  vellum-cli assets get <assetId> [--full] --json
  ```
- **Create** (names must be unique and without `[ ]`; optional `--image` takes a png/jpg/webp/gif file path or a data URL):
  ```bash
  vellum-cli assets create --name "Tavern map" --image ./tavern.png --caption "The Silver Stag" --labels "map,tavern" --json
  ```
- **Update / delete**:
  ```bash
  vellum-cli assets update <assetId> --caption "New caption" [--image ./new.png | --clear-image] --json
  vellum-cli assets delete <assetId> --json
  ```

---

### Sound effects (`sfx`)
- **List / get / label**:
  ```bash
  vellum-cli sfx list [--category <cat>] [--label a,b] [--search <query>] --json
  vellum-cli sfx get <sfxId> --json
  vellum-cli sfx update <sfxId> --add-label "tavern" --json
  ```

---

### Labels (`labels`)
Labels are free-text tags stored in the `tags` array of **characters (PCs, NPCs, monsters), sound effects and assets**. The app lets the DM edit them in each entity's editor and filter every list by them. They are **not** the `@character[...]` / `@asset[...]` markdown references used inside text.
- **Set on an entity** (`characters`, `assets`, `sfx`): `--labels "a,b"` replaces them (`--tags` is a legacy alias), `--add-label "a,b"` and `--remove-label "a,b"` adjust them. Matching is case-insensitive and duplicates are dropped.
- **Filter a list**: `--label "a,b"` (alias `--tag`) keeps only entities carrying **all** the given labels.
- **Inspect / rename across entities**:
  ```bash
  vellum-cli labels list --json
  vellum-cli labels rename "tavern" "inn" --json
  ```

---

### Battle Encounters (`encounters`)
- **List encounters**:
  ```bash
  vellum-cli encounters list <adventureId> [sceneId] --json
  ```
- **Add encounter**:
  ```bash
  vellum-cli encounters add <adventureId> <sceneId> \
    --name "Crypt Ambush" \
    --difficulty "Media" \
    --slots '[{"characterId":"mon-skeleton-guard","count":3}]' \
    --json
  ```
- **Delete encounter**:
  ```bash
  vellum-cli encounters delete <adventureId> <sceneId> <encounterId> --json
  ```

---

### Live Play Instances & Combat Tracker (`instances`)
- **List active instances**:
  ```bash
  vellum-cli instances list [--status <active|paused|completed>] --json
  ```
- **Get instance details & timeline**:
  ```bash
  vellum-cli instances get <instanceId> --json
  ```
- **Create session instance**:
  ```bash
  vellum-cli instances create --adventure <adventureId> --name "Thursday Night Campaign" --party <partyId> --json
  ```
- **Transition scene**:
  ```bash
  vellum-cli instances set-scene <instanceId> <sceneId> --json
  ```
- **Log timeline event**:
  ```bash
  vellum-cli instances log <instanceId> \
    --category choice \
    --title "Bribed the Gate Guard" \
    --details "Paid 25gp to avoid raising the alarm" \
    --json
  ```
- **Update PC runtime status**:
  ```bash
  vellum-cli instances pc-status <instanceId> <characterId> \
    --hp 12 \
    --temp-hp 5 \
    --condition "Avvelenato" \
    --inspiration true \
    --json
  ```
- **Combat management**:
  ```bash
  # Start combat encounter
  vellum-cli instances combat start <instanceId> --title "Ambush in the Catacombs" --json

  # Advance initiative turn
  vellum-cli instances combat next <instanceId> --json

  # End combat
  vellum-cli instances combat end <instanceId> --json
  ```

---

## 3. Standard AI Agent Recipes

### Recipe A: Generating a New 3-Scene One-Shot Adventure
1. Check available PCs/NPCs/Monsters:
   `vellum-cli characters list --json`
2. Create the adventure blueprint:
   `vellum-cli stories create --title "Whispers of the Frost Peak" --type oneshot --level "Level 3" --json`
3. Add Scene 1, Scene 2, and Scene 3 with Homebrewery markdown and linked characters.
4. Run integrity check:
   `vellum-cli db validate --json`

### Recipe B: Batch Importing Entities via JSON
Write an array or object to a file `payload.json`, then:
```bash
vellum-cli characters create --name "Captain Roderick" --data @payload.json --json
```
