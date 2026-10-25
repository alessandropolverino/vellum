---
name: vellum-cli
description: CLI interface for autonomous CRUD operations on D&D 5e campaigns, adventures, scenes, characters (PCs/NPCs/monsters), parties, encounters, and live play sessions. Use this skill whenever an AI agent needs to inspect, create, update, or delete Vellum entities.
---

# Vellum CLI — Agent Skill

This skill guides AI agents (Claude, Gemini, Codex, Antigravity, etc.) to programmatically inspect, query, create, update, and manage entities in **Vellum** (the D&D 5e Campaign & One-Shot Engine).

## 1. Running the CLI

From the project root (or inside any worktree):

```bash
# Recommended command via npm:
npm run cli -- <command> [subcommand] [arguments] [options]

# Or direct invocation:
node bin/vellum.mjs <command> [subcommand] [arguments] [options]
```

### Critical Rules for AI Agents
1. **Always use `--json` (or `-j`)**: Produces strict, machine-readable JSON without terminal colors or decorative borders.
2. **Database Auto-Discovery**: The CLI automatically locates `data/vellum-db.json` in the current folder, parent folders, or worktree roots. If running outside the repository, it automatically discovers the desktop app database in OS AppData. It also transparently migrates any legacy `dnd5e-db.json` file. To specify a custom database: `--db <path>` or set `VELLUM_DB_PATH`.
3. **Atomic Saves**: The CLI writes changes atomically to prevent file corruption.
4. **Use `@filepath` syntax**: For large markdown texts or complex JSON blueprints, write a temporary file and pass `--data @file.json` or `--markdown @scene.md`.

---

## 2. Command Reference

### Database (`db`)
- `npm run cli -- db stats --json`
  Returns entity counts (campaigns, adventures, scenes, characters, parties, instances, sfx), file size, and timestamps.
- `npm run cli -- db validate --json`
  Validates database integrity: schema errors, duplicate IDs, and dangling foreign key references.
- `npm run cli -- db backup [--output <path>] --json`
  Creates a timestamped snapshot in `data/backups/`.
- `npm run cli -- db export [--output <path>]`
  Exports full database JSON.
- `npm run cli -- db import <file> [--merge | --replace] [--force] --json`
  Imports an external database snapshot.
- `npm run cli -- db seed [--force] --json`
  Re-seeds the database with default 5e content.

---

### Stories & Adventures (`stories` / `adventures`)
- **List stories**:
  ```bash
  npm run cli -- stories list [--campaign <id>] [--type <oneshot|campaign_module>] [--tag <tag>] [--search <query>] --json
  ```
- **Get story**:
  ```bash
  npm run cli -- stories get <adventureId> --json
  # To extract full Homebrewery markdown of all scenes:
  npm run cli -- stories get <adventureId> --markdown
  ```
- **Create story**:
  ```bash
  npm run cli -- stories create --title "The Sunken Vault" --type oneshot --level "Level 3-4" --duration "3 hours" --tags "dungeon,undead" --json
  ```
- **Update story**:
  ```bash
  npm run cli -- stories update <adventureId> --title "New Title" --level "Level 5" --json
  ```
- **Delete story**:
  ```bash
  npm run cli -- stories delete <adventureId> [--force] --json
  ```

#### Story Scenes (`stories scene`)
- **List scenes**:
  ```bash
  npm run cli -- stories scene list <adventureId> --json
  ```
- **Get scene**:
  ```bash
  npm run cli -- stories scene get <adventureId> <sceneId> --json
  ```
- **Add scene**:
  ```bash
  npm run cli -- stories scene add <adventureId> \
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
  npm run cli -- stories scene update <adventureId> <sceneId> --summary "New summary" --markdown @updated_scene.md --json
  ```
- **Delete scene**:
  ```bash
  npm run cli -- stories scene delete <adventureId> <sceneId> --json
  ```

---

### Characters, PGs, NPCs & Monsters (`characters` / `pgs` / `chars`)
- **List characters**:
  ```bash
  npm run cli -- characters list [--kind <pc|npc|monster>] [--search <query>] [--tag <tag>] --json
  ```
- **Get character**:
  ```bash
  npm run cli -- characters get <characterId> --json
  # Or print ASCII statblock card:
  npm run cli -- characters get <characterId>
  ```
- **Create character**:
  ```bash
  npm run cli -- characters create \
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
  npm run cli -- characters update <characterId> --hp 45 --ac 19 --json
  ```
- **Level up character (in-place or save as new blueprint)**:
  ```bash
  # In-place level-up (advances level, recalculates HP max and hit dice formula)
  npm run cli -- characters level-up <characterId> --to-level 5 --json

  # Level up and save as new blueprint template (preserves lower-level original)
  npm run cli -- characters level-up <characterId> --to-level 5 --save-as-new --name "Valerius (Level 5)" --json
  ```
- **Delete character**:
  ```bash
  npm run cli -- characters delete <characterId> [--force] --json
  ```
- **Manage actions & traits**:
  ```bash
  # Add action
  npm run cli -- characters action add <characterId> \
    --name "Smite" \
    --desc "Deals extra 2d8 radiant damage on melee hit" \
    --damage "2d8" \
    --json

  # Remove action
  npm run cli -- characters action remove <characterId> "Smite" --json
  ```

---

### Campaigns (`campaigns`)
- **List campaigns**:
  ```bash
  npm run cli -- campaigns list [--status <status>] --json
  ```
- **Get campaign**:
  ```bash
  npm run cli -- campaigns get <campaignId> --json
  ```
- **Create campaign**:
  ```bash
  npm run cli -- campaigns create \
    --title "Shadows over Neverwinter" \
    --setting "Sword Coast" \
    --desc "An investigative and heroic arc against the Cult of the Dragon." \
    --status "Active" \
    --json
  ```
- **Update campaign**:
  ```bash
  npm run cli -- campaigns update <campaignId> --status "Concluded" --json
  ```
- **Delete campaign**:
  ```bash
  npm run cli -- campaigns delete <campaignId> [--force] --json
  ```

---

### Adventuring Parties (`parties`)
- **List parties**:
  ```bash
  npm run cli -- parties list --json
  ```
- **Get party**:
  ```bash
  npm run cli -- parties get <partyId> --json
  ```
- **Create party**:
  ```bash
  npm run cli -- parties create --name "The Silver Ravens" --members "pc-tharion,pc-lyra" --json
  ```
- **Add / Remove party member**:
  ```bash
  npm run cli -- parties add-member <partyId> <characterId> --json
  npm run cli -- parties remove-member <partyId> <characterId> --json
  ```

---

### Battle Encounters (`encounters`)
- **List encounters**:
  ```bash
  npm run cli -- encounters list <adventureId> [sceneId] --json
  ```
- **Add encounter**:
  ```bash
  npm run cli -- encounters add <adventureId> <sceneId> \
    --name "Crypt Ambush" \
    --difficulty "Media" \
    --slots '[{"characterId":"mon-skeleton-guard","count":3}]' \
    --json
  ```
- **Delete encounter**:
  ```bash
  npm run cli -- encounters delete <adventureId> <sceneId> <encounterId> --json
  ```

---

### Live Play Instances & Combat Tracker (`instances`)
- **List active instances**:
  ```bash
  npm run cli -- instances list [--status <active|paused|completed>] --json
  ```
- **Get instance details & timeline**:
  ```bash
  npm run cli -- instances get <instanceId> --json
  ```
- **Create session instance**:
  ```bash
  npm run cli -- instances create --adventure <adventureId> --name "Thursday Night Campaign" --party <partyId> --json
  ```
- **Transition scene**:
  ```bash
  npm run cli -- instances set-scene <instanceId> <sceneId> --json
  ```
- **Log timeline event**:
  ```bash
  npm run cli -- instances log <instanceId> \
    --category choice \
    --title "Bribed the Gate Guard" \
    --details "Paid 25gp to avoid raising the alarm" \
    --json
  ```
- **Update PC runtime status**:
  ```bash
  npm run cli -- instances pc-status <instanceId> <characterId> \
    --hp 12 \
    --temp-hp 5 \
    --condition "Avvelenato" \
    --inspiration true \
    --json
  ```
- **Combat management**:
  ```bash
  # Start combat encounter
  npm run cli -- instances combat start <instanceId> --title "Ambush in the Catacombs" --json

  # Advance initiative turn
  npm run cli -- instances combat next <instanceId> --json

  # End combat
  npm run cli -- instances combat end <instanceId> --json
  ```

---

## 3. Standard AI Agent Recipes

### Recipe A: Generating a New 3-Scene One-Shot Adventure
1. Check available PCs/NPCs/Monsters:
   `npm run cli -- characters list --json`
2. Create the adventure blueprint:
   `npm run cli -- stories create --title "Whispers of the Frost Peak" --type oneshot --level "Level 3" --json`
3. Add Scene 1, Scene 2, and Scene 3 with Homebrewery markdown and linked characters.
4. Run integrity check:
   `npm run cli -- db validate --json`

### Recipe B: Batch Importing Entities via JSON
Write an array or object to a file `payload.json`, then:
```bash
npm run cli -- characters create --name "Captain Roderick" --data @payload.json --json
```
