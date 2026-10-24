import { c } from './output.mjs';

export function printMainHelp() {
  console.log(`
${c.bold(c.yellow('  ██╗   ██╗███████╗██╗     ██╗     ██╗   ██╗███╗   ███╗'))}
${c.bold(c.yellow('  ██║   ██║██╔════╝██║     ██║     ██║   ██║████╗ ████║'))}
${c.bold(c.yellow('  ██║   ██║█████╗  ██║     ██║     ██║   ██║██╔████╔██║'))}
${c.bold(c.yellow('  ╚██╗ ██╔╝██╔══╝  ██║     ██║     ██║   ██║██║╚██╔╝██║'))}
${c.bold(c.yellow('   ╚████╔╝ ███████╗███████╗███████╗╚██████╔╝██║ ╚═╝ ██║'))}
${c.bold(c.yellow('    ╚═══╝  ╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝'))}
  ${c.dim('D&D 5e Campaign, One-Shot & Entity Engine CLI for Humans & AI Agents')}

${c.bold('USAGE:')}
  ${c.cyan('vellum')} <command> [subcommand] [arguments] [options]
  ${c.cyan('npm run cli --')} <command> [subcommand] [arguments] [options]

${c.bold('COMMANDS:')}
  ${c.bold('stories')}       (alias: adventures) Manage adventures, one-shots, and scenes
  ${c.bold('characters')}    (alias: pgs, chars) Manage PCs, NPCs, Monsters, and statblocks
  ${c.bold('campaigns')}     Manage campaign settings and overarching arcs
  ${c.bold('parties')}       Manage player parties and character rosters
  ${c.bold('encounters')}    Manage battle encounters attached to scenes
  ${c.bold('instances')}     Manage live play sessions, timeline logs, and combat
  ${c.bold('sfx')}           Inspect ambient tracks and synth audio presets
  ${c.bold('db')}            Database statistics, integrity validation, backup, import/export
  ${c.bold('agent-guide')}   Print specialized protocol & instructions for AI Agents

${c.bold('GLOBAL OPTIONS:')}
  ${c.cyan('--json, -j')}         Output strict machine-readable JSON (ideal for AI parsing)
  ${c.cyan('--db, -d <path>')}    Path to database JSON file (default: data/dnd5e-db.json)
  ${c.cyan('--silent, -q')}       Suppress non-essential messages
  ${c.cyan('--help, -h')}         Show help for any command or subcommand

${c.bold('AI AGENT TIP:')}
  Run ${c.cyan('vellum agent-guide')} to see standard patterns for creating adventures,
  inspecting statblocks, and executing batch operations via JSON and @filepath syntax.
`);
}

export function printAgentGuide() {
  console.log(`
${c.bold(c.cyan('════════════════════════════════════════════════════════════════════════════'))}
${c.bold(c.yellow('  VELLUM CLI — AI AGENT PROTOCOL & USAGE GUIDE'))}
${c.bold(c.cyan('════════════════════════════════════════════════════════════════════════════'))}

This CLI is purpose-built to allow autonomous AI agents (Claude, Gemini, Codex,
Antigravity, Cursor, etc.) to perform reliable CRUD operations on D&D 5e entities.

${c.bold('1. STRICT JSON OUTPUT MODE (--json):')}
   Always append ${c.cyan('--json')} to your commands when invoking the CLI from a tool.
   This guarantees pure, predictable, machine-parseable JSON output without ANSI codes.

   ${c.dim('Example:')}
   vellum characters list --kind pc --json
   vellum stories get adv-cripte --json

${c.bold('2. PASSING COMPLEX DATA (@file and Inline JSON):')}
   Every create/update command accepts a ${c.cyan('--data')} option. You can pass:
   - An inline JSON string: ${c.dim('--data \'{"hpMax": 45, "ac": 16}\'')}
   - A file reference via @:  ${c.dim('--data @/path/to/payload.json')}
   - A markdown file reference: ${c.dim('--markdown @/path/to/scene.md')}
   - Standard input: ${c.dim('--data -')}

${c.bold('3. ID CONVENTIONS:')}
   - Adventure:  ${c.cyan('adv-<slug>-<rand>')} (e.g. adv-the-sunken-tomb-8f12)
   - Scene:      ${c.cyan('scene-<slug>-<rand>')} (e.g. scene-the-gatehouse-4b)
   - Character:  ${c.cyan('pc-<slug>')} / ${c.cyan('npc-<slug>')} / ${c.cyan('mon-<slug>')}
   - Campaign:   ${c.cyan('camp-<slug>')}
   - Party:      ${c.cyan('party-<slug>')}
   - Instance:   ${c.cyan('inst-<slug>')}

${c.bold('4. TYPICAL AGENT WORKFLOWS:')}

   ${c.bold('A. Creating a Complete One-Shot Adventure:')}
   1. Create the adventure blueprint:
      ${c.dim('vellum stories create --title "The Sunken Citadel" --type oneshot --level "Level 3" --json')}
   2. Add scenes with Homebrewery markdown:
      ${c.dim('vellum stories scene add adv-the-sunken-citadel --title "The Entrance" --code "Scene 1" --markdown @scene1.md --json')}
   3. Verify database integrity:
      ${c.dim('vellum db validate --json')}

   ${c.bold('B. Creating a Player Character (PG) or Monster:')}
   ${c.dim('vellum characters create --name "Valerius" --kind pc --class "Wizard (Evocation)" --level "Level 4" --hp 26 --ac 12 --abilities 8,14,14,18,12,10 --json')}
   ${c.dim('vellum characters action add pc-valerius --name "Fireball" --desc "8d6 fire damage in 20ft radius" --damage "8d6" --json')}
   3. Level-up PC (in-place or save as new blueprint):
      ${c.dim('vellum characters level-up pc-valerius --to-level 5 --save-as-new --name "Valerius (Level 5)" --json')}

   ${c.bold('C. Session Tracking in a Live Game:')}
   1. Advance scene:
      ${c.dim('vellum instances set-scene inst-123 scene-dungeon-hall --json')}
   2. Log milestone or choice:
      ${c.dim('vellum instances log inst-123 --category choice --title "Spared Goblin Chief" --details "Negotiated passage" --json')}
   3. Update PC damage:
      ${c.dim('vellum instances pc-status inst-123 pc-tharion --hp 14 --condition "Avvelenato" --json')}

${c.bold(c.cyan('════════════════════════════════════════════════════════════════════════════'))}
`);
}
