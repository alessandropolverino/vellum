#!/usr/bin/env node

import { parseArgs } from './lib/args.mjs';
import { printMainHelp, printAgentGuide } from './lib/help.mjs';
import { handleStories } from './lib/stories.mjs';
import { handleCharacters } from './lib/characters.mjs';
import { handleCampaigns } from './lib/campaigns.mjs';
import { handleParties } from './lib/parties.mjs';
import { handleEncounters } from './lib/encounters.mjs';
import { handleInstances } from './lib/instances.mjs';
import { handleSfx } from './lib/sfx.mjs';
import { handleDb } from './lib/dbCmd.mjs';
import { error } from './lib/output.mjs';

const VERSION = '0.1.0';

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2));

  if (options.version || options.v) {
    console.log(`vellum v${VERSION}`);
    process.exit(0);
  }

  const rootCommand = positionals[0]?.toLowerCase();
  const subCommand = positionals[1]?.toLowerCase();
  const remainingArgs = positionals.slice(2);

  if (!rootCommand || rootCommand === 'help') {
    if (subCommand === 'agent' || subCommand === 'ai') {
      printAgentGuide();
      return;
    }
    printMainHelp();
    return;
  }

  if (options.help && positionals.length === 1) {
    // e.g. "vellum stories --help" -> forward to command handler with action='help'
  }

  switch (rootCommand) {
    case 'stories':
    case 'adventures':
    case 'story':
    case 'adv':
      return handleStories(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'characters':
    case 'pgs':
    case 'chars':
    case 'pg':
    case 'char':
    case 'monsters':
      return handleCharacters(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'campaigns':
    case 'campaign':
    case 'camp':
      return handleCampaigns(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'parties':
    case 'party':
      return handleParties(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'encounters':
    case 'encounter':
    case 'enc':
      return handleEncounters(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'instances':
    case 'instance':
    case 'sessions':
    case 'session':
      return handleInstances(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'sfx':
    case 'sound':
    case 'sounds':
      return handleSfx(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'db':
    case 'database':
      return handleDb(options.help && !subCommand ? 'help' : subCommand, remainingArgs, options);

    case 'agent-guide':
    case 'agent':
    case 'guide':
      printAgentGuide();
      return;

    default:
      error(`Unknown command '${rootCommand}'. Run 'vellum --help' for a list of valid commands.`);
  }
}

main().catch((err) => {
  error(err.message);
});
