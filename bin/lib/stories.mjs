import crypto from 'node:crypto';
import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, success, error, warn, info, c } from './output.mjs';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

export function handleStories(action, positionals, options) {
  const { db, dbPath } = loadDb(options);

  // If action is "scene", delegate to scene sub-router
  if (action === 'scene') {
    return handleScenes(positionals[0], positionals.slice(1), options, db);
  }

  switch (action) {
    case 'list':
      return listStories(db, options);
    case 'get':
      return getStory(positionals[0], db, options);
    case 'create':
      return createStory(positionals, options, db);
    case 'update':
      return updateStory(positionals[0], options, db);
    case 'delete':
      return deleteStory(positionals[0], options, db);
    default:
      if (!action || action === 'help') {
        printStoriesHelp();
        return;
      }
      error(`Unknown stories action '${action}'. Run 'vellum stories --help' for usage.`);
  }
}

function listStories(db, options) {
  let list = db.adventures;

  if (options.campaign) {
    list = list.filter((a) => a.campaignId === options.campaign);
  }
  if (options.type) {
    list = list.filter((a) => a.type === options.type);
  }
  if (options.tag) {
    const tag = String(options.tag).toLowerCase();
    list = list.filter((a) => a.tags?.some((t) => t.toLowerCase() === tag));
  }
  if (options.search) {
    const q = String(options.search).toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nAdventures / Stories (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 20, color: (s) => c.cyan(s) },
      { key: 'type', label: 'Type', maxWidth: 16, color: (s) => (s === 'oneshot' ? c.green(s) : c.magenta(s)) },
      { key: 'title', label: 'Title', maxWidth: 30, color: (s) => c.bold(s) },
      { key: 'levelRange', label: 'Level', maxWidth: 12 },
      { key: 'scenesCount', label: 'Scenes', maxWidth: 8 },
      { key: 'campaignId', label: 'Campaign', maxWidth: 18, color: (s) => c.dim(s) },
    ],
    list.map((a) => ({
      ...a,
      scenesCount: a.scenes?.length || 0,
      campaignId: a.campaignId || '—',
    }))
  );
  console.log('');
}

function getStory(id, db, options) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum stories get <id>".');
  }

  const adv = db.adventures.find((a) => a.id === id || a.title.toLowerCase() === id.toLowerCase());
  if (!adv) {
    error(`Adventure with ID or title "${id}" not found.`);
  }

  if (options.json) {
    printJson(adv);
    return;
  }

  if (options.markdown) {
    console.log(`# ${adv.title}\n`);
    if (adv.subtitle) console.log(`> *${adv.subtitle}*\n`);
    console.log(`- **Type:** ${adv.type}`);
    console.log(`- **Level:** ${adv.levelRange}`);
    console.log(`- **Estimated Duration:** ${adv.estimatedDuration}`);
    if (adv.authorOrNotes) console.log(`- **Notes:** ${adv.authorOrNotes}`);
    console.log('\n---\n');

    for (const sc of adv.scenes || []) {
      console.log(`## ${sc.code ? `${sc.code}: ` : ''}${sc.title}\n`);
      if (sc.location) console.log(`*Location:* ${sc.location}\n`);
      if (sc.summary) console.log(`*Summary:* ${sc.summary}\n`);
      if (sc.homebreweryMarkdown) {
        console.log(sc.homebreweryMarkdown);
        console.log('\n');
      }
      console.log('---\n');
    }
    return;
  }

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` STORY / ADVENTURE: ${adv.title}`)));
  if (adv.subtitle) console.log(c.italic(` ${adv.subtitle}`));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}        ${adv.id}`);
  console.log(` ${c.bold('Type:')}      ${adv.type}`);
  console.log(` ${c.bold('Campaign:')}  ${adv.campaignId || 'None'}`);
  console.log(` ${c.bold('Level:')}     ${adv.levelRange || 'Any'}`);
  console.log(` ${c.bold('Duration:')}  ${adv.estimatedDuration || 'N/A'}`);
  console.log(` ${c.bold('Tags:')}      ${adv.tags?.join(', ') || 'none'}`);
  console.log(` ${c.bold('Updated:')}   ${adv.updatedAt || 'N/A'}`);
  console.log(c.yellow('─'.repeat(60)));

  console.log(c.bold(` Scenes (${adv.scenes?.length || 0}):`));
  if (adv.scenes && adv.scenes.length > 0) {
    printTable(
      [
        { key: 'code', label: 'Code', maxWidth: 14, color: (s) => c.dim(s) },
        { key: 'id', label: 'Scene ID', maxWidth: 20, color: (s) => c.cyan(s) },
        { key: 'title', label: 'Title', maxWidth: 28, color: (s) => c.bold(s) },
        { key: 'location', label: 'Location', maxWidth: 18 },
        { key: 'minutes', label: 'Mins', maxWidth: 6 },
      ],
      adv.scenes.map((s) => ({
        ...s,
        minutes: s.estimatedMinutes || '—',
      }))
    );
  } else {
    console.log(c.dim('  (No scenes in this adventure)'));
  }
  console.log(c.yellow('═'.repeat(60)));
}

function createStory(positionals, options, db) {
  let blueprint = {};

  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON passed to --data: ${err.message}`);
    }
  }

  const title = options.title || positionals[0] || blueprint.title;
  if (!title) {
    error('Missing required argument: --title <title>');
  }

  const id =
    options.id ||
    blueprint.id ||
    `adv-${slugify(title)}-${crypto.randomBytes(3).toString('hex')}`;

  if (db.adventures.some((a) => a.id === id)) {
    error(`An adventure with ID "${id}" already exists.`);
  }

  const newAdv = {
    id,
    title,
    subtitle: options.subtitle || blueprint.subtitle || '',
    type: options.type || blueprint.type || 'oneshot',
    campaignId: options.campaign || blueprint.campaignId || undefined,
    episodeNumber: options.episode ? Number(options.episode) : blueprint.episodeNumber,
    levelRange: options.level || options.levelRange || blueprint.levelRange || 'Level 1-3',
    estimatedDuration: options.duration || blueprint.estimatedDuration || '2-4 hours',
    authorOrNotes: options.author || options.notes || blueprint.authorOrNotes || '',
    tags: options.tags
      ? String(options.tags).split(',').map((t) => t.trim())
      : blueprint.tags || [],
    defaultPartyIds: blueprint.defaultPartyIds || [],
    scenes: blueprint.scenes || [],
    updatedAt: new Date().toISOString(),
  };

  db.adventures.push(newAdv);
  saveDb(db, options);

  if (options.json) {
    printJson(newAdv);
  } else {
    success(`Adventure "${newAdv.title}" created successfully with ID "${newAdv.id}".`, options);
  }
}

function updateStory(id, options, db) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum stories update <id> [options]".');
  }

  const adv = db.adventures.find((a) => a.id === id);
  if (!adv) {
    error(`Adventure with ID "${id}" not found.`);
  }

  let patch = {};
  if (options.data) {
    try {
      patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON passed to --data: ${err.message}`);
    }
  }

  if (options.title) adv.title = options.title;
  if (options.subtitle !== undefined) adv.subtitle = options.subtitle;
  if (options.type) adv.type = options.type;
  if (options.campaign !== undefined) adv.campaignId = options.campaign;
  if (options.episode !== undefined) adv.episodeNumber = Number(options.episode);
  if (options.level) adv.levelRange = options.level;
  if (options.duration) adv.estimatedDuration = options.duration;
  if (options.author !== undefined) adv.authorOrNotes = options.author;
  if (options.tags) {
    adv.tags = String(options.tags).split(',').map((t) => t.trim());
  }

  Object.assign(adv, patch);
  adv.updatedAt = new Date().toISOString();

  saveDb(db, options);

  if (options.json) {
    printJson(adv);
  } else {
    success(`Adventure "${adv.title}" (${adv.id}) updated successfully.`, options);
  }
}

function deleteStory(id, options, db) {
  if (!id) {
    error('Missing required argument: <id>. Run "vellum stories delete <id>".');
  }

  const index = db.adventures.findIndex((a) => a.id === id);
  if (index === -1) {
    error(`Adventure with ID "${id}" not found.`);
  }

  const adv = db.adventures[index];

  // Check if instances reference this story
  const linkedInstances = db.playInstances.filter((p) => p.adventureId === id);
  if (linkedInstances.length > 0 && !options.force) {
    error(
      `Cannot delete adventure "${id}": ${linkedInstances.length} active/saved play instance(s) reference it. Use --force to delete anyway.`
    );
  }

  db.adventures.splice(index, 1);
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, title: adv.title });
  } else {
    success(`Adventure "${adv.title}" (${id}) deleted successfully.`, options);
  }
}

// ================= SCENES =================

function handleScenes(sceneAction, positionals, options, db) {
  switch (sceneAction) {
    case 'list': {
      const advId = positionals[0];
      if (!advId) error('Usage: vellum stories scene list <adventureId>');
      const adv = db.adventures.find((a) => a.id === advId);
      if (!adv) error(`Adventure "${advId}" not found.`);
      if (options.json) {
        printJson(adv.scenes || []);
      } else {
        console.log(c.bold(`\nScenes for "${adv.title}" (${adv.scenes?.length || 0}):\n`));
        printTable(
          [
            { key: 'code', label: 'Code', maxWidth: 14, color: (s) => c.dim(s) },
            { key: 'id', label: 'Scene ID', maxWidth: 20, color: (s) => c.cyan(s) },
            { key: 'title', label: 'Title', maxWidth: 30, color: (s) => c.bold(s) },
            { key: 'location', label: 'Location', maxWidth: 20 },
            { key: 'minutes', label: 'Mins', maxWidth: 6 },
          ],
          (adv.scenes || []).map((s) => ({
            ...s,
            minutes: s.estimatedMinutes || '—',
          }))
        );
      }
      return;
    }
    case 'get': {
      const [advId, sceneId] = positionals;
      if (!advId || !sceneId) error('Usage: vellum stories scene get <adventureId> <sceneId>');
      const adv = db.adventures.find((a) => a.id === advId);
      if (!adv) error(`Adventure "${advId}" not found.`);
      const scene = adv.scenes?.find((s) => s.id === sceneId);
      if (!scene) error(`Scene "${sceneId}" not found in adventure "${advId}".`);

      if (options.json) {
        printJson(scene);
      } else {
        console.log(c.bold(`\nScene: ${scene.code ? `${scene.code} — ` : ''}${scene.title}`));
        console.log(`ID: ${scene.id} | Location: ${scene.location || 'N/A'} | Duration: ${scene.estimatedMinutes || 0}m`);
        console.log(`Summary: ${scene.summary || 'None'}`);
        if (scene.homebreweryMarkdown) {
          console.log('\n--- Homebrewery Markdown ---');
          console.log(scene.homebreweryMarkdown);
        }
      }
      return;
    }
    case 'add': {
      const advId = positionals[0];
      if (!advId) error('Usage: vellum stories scene add <adventureId> --title <title> [options]');
      const adv = db.adventures.find((a) => a.id === advId);
      if (!adv) error(`Adventure "${advId}" not found.`);

      let patch = {};
      if (options.data) {
        try {
          patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
        } catch (err) {
          error(`Invalid JSON in --data: ${err.message}`);
        }
      }

      const title = options.title || patch.title;
      if (!title) error('Missing required flag: --title <title>');

      const sceneId =
        options.id ||
        patch.id ||
        `scene-${slugify(title)}-${crypto.randomBytes(2).toString('hex')}`;

      const newScene = {
        id: sceneId,
        code: options.code || patch.code || `Scene ${(adv.scenes?.length || 0) + 1}`,
        title,
        estimatedMinutes: options.minutes ? Number(options.minutes) : patch.estimatedMinutes || 30,
        location: options.location || patch.location || '',
        summary: options.summary || patch.summary || '',
        homebreweryMarkdown: options.markdown || patch.homebreweryMarkdown || '',
        linkedCharacterIds: options.characters
          ? String(options.characters).split(',').map((c) => c.trim())
          : patch.linkedCharacterIds || [],
        linkedSfxIds: options.sfx
          ? String(options.sfx).split(',').map((s) => s.trim())
          : patch.linkedSfxIds || [],
        encounters: patch.encounters || [],
      };

      if (!adv.scenes) adv.scenes = [];
      adv.scenes.push(newScene);
      adv.updatedAt = new Date().toISOString();
      saveDb(db, options);

      if (options.json) {
        printJson(newScene);
      } else {
        success(`Scene "${newScene.title}" (${newScene.id}) added to "${adv.title}".`, options);
      }
      return;
    }
    case 'update': {
      const [advId, sceneId] = positionals;
      if (!advId || !sceneId) error('Usage: vellum stories scene update <adventureId> <sceneId> [options]');
      const adv = db.adventures.find((a) => a.id === advId);
      if (!adv) error(`Adventure "${advId}" not found.`);
      const scene = adv.scenes?.find((s) => s.id === sceneId);
      if (!scene) error(`Scene "${sceneId}" not found.`);

      let patch = {};
      if (options.data) {
        try {
          patch = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
        } catch (err) {
          error(`Invalid JSON in --data: ${err.message}`);
        }
      }

      if (options.title) scene.title = options.title;
      if (options.code !== undefined) scene.code = options.code;
      if (options.location !== undefined) scene.location = options.location;
      if (options.summary !== undefined) scene.summary = options.summary;
      if (options.minutes !== undefined) scene.estimatedMinutes = Number(options.minutes);
      if (options.markdown !== undefined) scene.homebreweryMarkdown = options.markdown;
      if (options.characters) {
        scene.linkedCharacterIds = String(options.characters).split(',').map((c) => c.trim());
      }
      if (options.sfx) {
        scene.linkedSfxIds = String(options.sfx).split(',').map((s) => s.trim());
      }

      Object.assign(scene, patch);
      adv.updatedAt = new Date().toISOString();
      saveDb(db, options);

      if (options.json) {
        printJson(scene);
      } else {
        success(`Scene "${scene.title}" (${scene.id}) updated.`, options);
      }
      return;
    }
    case 'delete': {
      const [advId, sceneId] = positionals;
      if (!advId || !sceneId) error('Usage: vellum stories scene delete <adventureId> <sceneId>');
      const adv = db.adventures.find((a) => a.id === advId);
      if (!adv) error(`Adventure "${advId}" not found.`);
      const idx = adv.scenes?.findIndex((s) => s.id === sceneId);
      if (idx === -1 || idx === undefined) error(`Scene "${sceneId}" not found.`);

      const deleted = adv.scenes.splice(idx, 1)[0];
      adv.updatedAt = new Date().toISOString();
      saveDb(db, options);

      if (options.json) {
        printJson({ deleted: true, sceneId, adventureId: advId });
      } else {
        success(`Scene "${deleted.title}" deleted from "${adv.title}".`, options);
      }
      return;
    }
    default:
      error(`Unknown scene action '${sceneAction}'. Use list, get, add, update, delete.`);
  }
}

function printStoriesHelp() {
  console.log(`
${c.bold('vellum stories')} — Manage adventures, one-shots, and story scenes

${c.bold('USAGE:')}
  vellum stories list [options]
  vellum stories get <id> [--json] [--markdown]
  vellum stories create --title <title> [options]
  vellum stories update <id> [options]
  vellum stories delete <id> [--force]

  vellum stories scene list <adventureId>
  vellum stories scene get <adventureId> <sceneId>
  vellum stories scene add <adventureId> --title <title> [options]
  vellum stories scene update <adventureId> <sceneId> [options]
  vellum stories scene delete <adventureId> <sceneId>

${c.bold('OPTIONS:')}
  --campaign <id>           Filter by campaign ID
  --type <type>             Filter/Set type: 'oneshot' or 'campaign_module'
  --level <range>           Level range, e.g. "Level 3-5"
  --duration <time>         Estimated duration, e.g. "3-4 hours"
  --tags <tag1,tag2>        Comma-separated tags
  --data <json|@file>       JSON string or @file path to merge
  --markdown <text|@file>   Homebrewery markdown (for scenes)
  --json                    Machine-readable JSON output
`);
}
