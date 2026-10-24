import crypto from 'node:crypto';
import { loadDb, saveDb } from './db.mjs';
import { printJson, printTable, success, error, c } from './output.mjs';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
}

export function handleInstances(action, positionals, options) {
  const { db } = loadDb(options);

  if (action === 'combat') {
    return handleCombat(positionals[0], positionals.slice(1), options, db);
  }

  switch (action) {
    case 'list':
      return listInstances(db, options);
    case 'get':
      return getInstance(positionals[0], db, options);
    case 'create':
      return createInstance(positionals, options, db);
    case 'set-scene':
      return setInstanceScene(positionals[0], positionals[1], options, db);
    case 'log':
      return logTimelineEvent(positionals[0], options, db);
    case 'pc-status':
      return updatePcStatus(positionals[0], positionals[1], options, db);
    case 'delete':
      return deleteInstance(positionals[0], options, db);
    default:
      if (!action || action === 'help') {
        printInstancesHelp();
        return;
      }
      error(`Unknown instances action '${action}'. Run 'vellum instances --help' for usage.`);
  }
}

function listInstances(db, options) {
  let list = db.playInstances;

  if (options.adventure) {
    list = list.filter((p) => p.adventureId === options.adventure);
  }
  if (options.status) {
    const s = String(options.status).toLowerCase();
    list = list.filter((p) => p.status.toLowerCase() === s);
  }

  if (options.json) {
    printJson(list);
    return;
  }

  console.log(c.bold(`\nPlay Instances / Active Sessions (${list.length}):\n`));
  printTable(
    [
      { key: 'id', label: 'ID', maxWidth: 18, color: (s) => c.cyan(s) },
      { key: 'instanceName', label: 'Session / Group Name', maxWidth: 28, color: (s) => c.bold(s) },
      { key: 'adventureTitle', label: 'Adventure', maxWidth: 22 },
      {
        key: 'status',
        label: 'Status',
        maxWidth: 10,
        color: (s) => (s === 'active' ? c.green(s) : s === 'paused' ? c.yellow(s) : c.dim(s)),
      },
      { key: 'sessionCount', label: 'Sessions', maxWidth: 8 },
      { key: 'currentSceneId', label: 'Current Scene', maxWidth: 18, color: (s) => c.dim(s) },
    ],
    list.map((inst) => {
      const adv = db.adventures.find((a) => a.id === inst.adventureId);
      return {
        ...inst,
        adventureTitle: adv?.title || inst.adventureId,
      };
    })
  );
  console.log('');
}

function getInstance(id, db, options) {
  if (!id) error('Usage: vellum instances get <id>');
  const inst = db.playInstances.find((p) => p.id === id);
  if (!inst) error(`Play instance "${id}" not found.`);

  if (options.json) {
    printJson(inst);
    return;
  }

  const adv = db.adventures.find((a) => a.id === inst.adventureId);
  const currentScene = adv?.scenes?.find((s) => s.id === inst.currentSceneId);

  console.log(c.yellow('═'.repeat(60)));
  console.log(c.bold(c.cyan(` PLAY INSTANCE: ${inst.instanceName}`)));
  console.log(c.yellow('─'.repeat(60)));
  console.log(` ${c.bold('ID:')}            ${inst.id}`);
  console.log(` ${c.bold('Adventure:')}     ${adv?.title || inst.adventureId}`);
  console.log(` ${c.bold('Status:')}        ${inst.status} (Session #${inst.sessionCount})`);
  console.log(` ${c.bold('Current Scene:')} ${currentScene ? `${currentScene.title} (${currentScene.id})` : inst.currentSceneId || 'None'}`);
  console.log(` ${c.bold('Last Played:')}   ${inst.lastPlayedAt}`);
  console.log(c.yellow('─'.repeat(60)));

  console.log(c.bold(' PC Runtime Status:'));
  for (const cid of inst.partyCharacterIds || []) {
    const char = db.characters.find((c) => c.id === cid);
    const st = inst.pcStatus?.[cid];
    const name = char ? char.name : cid;
    const hp = st ? `${st.hpCurrent}/${char?.hpMax || '?'}` : `${char?.hpMax || '?'}/${char?.hpMax || '?'}`;
    const insp = st?.inspiration ? c.yellow(' [Inspiration]') : '';
    const cond = st?.conditions?.length ? ` Cond: ${st.conditions.join(', ')}` : '';
    console.log(`  - ${c.bold(name)}: HP ${hp}${insp}${cond}`);
  }

  if (options.timeline || !options.json) {
    console.log(c.yellow('─'.repeat(60)));
    console.log(c.bold(` Timeline / Session Log (${inst.timeline?.length || 0} events):`));
    for (const event of (inst.timeline || []).slice(-10)) {
      console.log(`  [${c.dim(event.timestamp.slice(11, 19))}] ${c.bold(event.title)} (${c.cyan(event.category)}) - ${event.details}`);
    }
  }
  console.log(c.yellow('═'.repeat(60)));
}

function createInstance(positionals, options, db) {
  let blueprint = {};
  if (options.data) {
    try {
      blueprint = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
    } catch (err) {
      error(`Invalid JSON in --data: ${err.message}`);
    }
  }

  const adventureId = options.adventure || blueprint.adventureId;
  if (!adventureId) error('Missing required flag: --adventure <adventureId>');

  const adv = db.adventures.find((a) => a.id === adventureId);
  if (!adv) error(`Adventure "${adventureId}" not found.`);

  const name = options.name || positionals[0] || blueprint.instanceName || `Session ${adv.title}`;
  const id = options.id || blueprint.id || `inst-${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;

  let partyCharacterIds = [];
  if (options.party) {
    const party = db.parties.find((p) => p.id === options.party);
    if (party) partyCharacterIds = [...party.memberCharacterIds];
  } else if (options.members) {
    partyCharacterIds = String(options.members).split(',').map((m) => m.trim());
  } else if (blueprint.partyCharacterIds) {
    partyCharacterIds = blueprint.partyCharacterIds;
  }

  const initialSceneId = adv.scenes?.[0]?.id || '';
  const now = new Date().toISOString();

  const pcStatus = {};
  for (const cid of partyCharacterIds) {
    const char = db.characters.find((c) => c.id === cid);
    pcStatus[cid] = {
      characterId: cid,
      hpCurrent: char ? char.hpMax : 10,
      tempHp: 0,
      conditions: [],
      inspiration: false,
      sessionNotes: '',
    };
  }

  const newInstance = {
    id,
    adventureId,
    instanceName: name,
    groupName: options.group || blueprint.groupName || name,
    partyCharacterIds,
    status: 'active',
    sessionCount: 1,
    currentSceneId: initialSceneId,
    visitedSceneIds: initialSceneId ? [initialSceneId] : [],
    sceneNotes: {},
    pcStatus,
    timeline: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        sceneId: initialSceneId,
        sceneTitle: adv.scenes?.[0]?.title || 'Prologue',
        category: 'narrative',
        title: 'Campaign Session Launched',
        details: `Adventure started with ${partyCharacterIds.length} PCs.`,
        pinnedForRecap: true,
      },
    ],
    activeCombat: null,
    startedAt: now,
    lastPlayedAt: now,
  };

  db.playInstances.push(newInstance);
  saveDb(db, options);

  if (options.json) {
    printJson(newInstance);
  } else {
    success(`Play instance "${newInstance.instanceName}" (${newInstance.id}) created.`, options);
  }
}

function setInstanceScene(instanceId, sceneId, options, db) {
  if (!instanceId || !sceneId) error('Usage: vellum instances set-scene <instanceId> <sceneId>');
  const inst = db.playInstances.find((p) => p.id === instanceId);
  if (!inst) error(`Instance "${instanceId}" not found.`);

  const adv = db.adventures.find((a) => a.id === inst.adventureId);
  const scene = adv?.scenes?.find((s) => s.id === sceneId);

  inst.currentSceneId = sceneId;
  if (!inst.visitedSceneIds.includes(sceneId)) {
    inst.visitedSceneIds.push(sceneId);
  }
  inst.lastPlayedAt = new Date().toISOString();

  inst.timeline.push({
    id: `log-${Date.now()}`,
    timestamp: inst.lastPlayedAt,
    sceneId,
    sceneTitle: scene ? scene.title : sceneId,
    category: 'narrative',
    title: `Entered Scene: ${scene ? scene.title : sceneId}`,
    details: scene?.summary || 'Scene transition',
    pinnedForRecap: false,
  });

  saveDb(db, options);

  if (options.json) {
    printJson(inst);
  } else {
    success(`Instance "${inst.instanceName}" moved to scene "${scene ? scene.title : sceneId}".`, options);
  }
}

function logTimelineEvent(instanceId, options, db) {
  if (!instanceId) error('Usage: vellum instances log <instanceId> --title <title> [options]');
  const inst = db.playInstances.find((p) => p.id === instanceId);
  if (!inst) error(`Instance "${instanceId}" not found.`);

  const title = options.title;
  if (!title) error('Missing required flag: --title <title>');

  const category = options.category || 'narrative'; // narrative, choice, combat, loot, npc_interaction, dm_note
  const details = options.details || options.desc || '';
  const now = new Date().toISOString();

  const entry = {
    id: `log-${Date.now()}`,
    timestamp: now,
    sceneId: inst.currentSceneId || '',
    sceneTitle: 'Current Scene',
    category,
    title,
    details,
    pinnedForRecap: Boolean(options.pinned),
  };

  inst.timeline.push(entry);
  inst.lastPlayedAt = now;
  saveDb(db, options);

  if (options.json) {
    printJson(entry);
  } else {
    success(`Timeline event logged: "${title}" (${category}).`, options);
  }
}

function updatePcStatus(instanceId, charId, options, db) {
  if (!instanceId || !charId) error('Usage: vellum instances pc-status <instanceId> <characterId> [options]');
  const inst = db.playInstances.find((p) => p.id === instanceId);
  if (!inst) error(`Instance "${instanceId}" not found.`);

  if (!inst.pcStatus) inst.pcStatus = {};
  if (!inst.pcStatus[charId]) {
    const char = db.characters.find((c) => c.id === charId);
    inst.pcStatus[charId] = {
      characterId: charId,
      hpCurrent: char ? char.hpMax : 10,
      tempHp: 0,
      conditions: [],
      inspiration: false,
      sessionNotes: '',
    };
  }

  const st = inst.pcStatus[charId];
  if (options.hp !== undefined) st.hpCurrent = Number(options.hp);
  if (options.tempHp !== undefined) st.tempHp = Number(options.tempHp);
  if (options.inspiration !== undefined) st.inspiration = options.inspiration === 'true' || options.inspiration === true;
  if (options.notes !== undefined) st.sessionNotes = options.notes;

  if (options.condition) {
    const cond = String(options.condition);
    if (cond.startsWith('remove:')) {
      const toRemove = cond.slice(7);
      st.conditions = st.conditions.filter((c) => c.toLowerCase() !== toRemove.toLowerCase());
    } else {
      const toAdd = cond.startsWith('add:') ? cond.slice(4) : cond;
      if (!st.conditions.includes(toAdd)) {
        st.conditions.push(toAdd);
      }
    }
  }

  inst.lastPlayedAt = new Date().toISOString();
  saveDb(db, options);

  if (options.json) {
    printJson(st);
  } else {
    success(`Updated status for "${charId}" in instance "${inst.instanceName}": HP ${st.hpCurrent}, Cond: [${st.conditions.join(', ')}].`, options);
  }
}

function deleteInstance(id, options, db) {
  if (!id) error('Usage: vellum instances delete <id>');
  const idx = db.playInstances.findIndex((p) => p.id === id);
  if (idx === -1) error(`Instance "${id}" not found.`);

  const inst = db.playInstances.splice(idx, 1)[0];
  saveDb(db, options);

  if (options.json) {
    printJson({ deleted: true, id, name: inst.instanceName });
  } else {
    success(`Play instance "${inst.instanceName}" (${id}) deleted.`, options);
  }
}

// Combat handler
function handleCombat(cmd, positionals, options, db) {
  const instanceId = positionals[0];
  if (!instanceId) error('Usage: vellum instances combat <start|next|end> <instanceId>');
  const inst = db.playInstances.find((p) => p.id === instanceId);
  if (!inst) error(`Instance "${instanceId}" not found.`);

  if (cmd === 'start') {
    const title = options.title || 'Combat Encounter';
    const participants = [];

    // Add PCs
    for (const cid of inst.partyCharacterIds || []) {
      const char = db.characters.find((c) => c.id === cid);
      if (char) {
        participants.push({
          id: `combat-${cid}`,
          sourceCharacterId: cid,
          name: char.name,
          kind: 'pc',
          initiative: Math.floor(Math.random() * 20) + 1 + (char.initiativeBonus || 0),
          ac: char.ac,
          hpCurrent: inst.pcStatus?.[cid]?.hpCurrent ?? char.hpMax,
          hpMax: char.hpMax,
          tempHp: inst.pcStatus?.[cid]?.tempHp ?? 0,
          conditions: [...(inst.pcStatus?.[cid]?.conditions || [])],
          isConcentrating: false,
          notes: '',
        });
      }
    }

    participants.sort((a, b) => b.initiative - a.initiative);

    inst.activeCombat = {
      isActive: true,
      encounterTitle: title,
      sceneId: inst.currentSceneId,
      round: 1,
      turnIndex: 0,
      startedAt: new Date().toISOString(),
      participants,
      combatEvents: [`Combat "${title}" started with ${participants.length} combatant(s).`],
    };

    saveDb(db, options);

    if (options.json) {
      printJson(inst.activeCombat);
    } else {
      success(`Combat "${title}" initiated. Round 1, Turn: ${participants[0]?.name || 'None'}.`, options);
    }
  } else if (cmd === 'next') {
    if (!inst.activeCombat || !inst.activeCombat.isActive) {
      error(`No active combat in instance "${instanceId}".`);
    }

    const cbt = inst.activeCombat;
    cbt.turnIndex++;
    if (cbt.turnIndex >= cbt.participants.length) {
      cbt.turnIndex = 0;
      cbt.round++;
    }

    const currentTurn = cbt.participants[cbt.turnIndex];
    cbt.combatEvents.push(`Round ${cbt.round}: Turn of ${currentTurn?.name}`);
    saveDb(db, options);

    if (options.json) {
      printJson({ round: cbt.round, turnIndex: cbt.turnIndex, current: currentTurn });
    } else {
      success(`Advanced to Round ${cbt.round}, Turn of ${currentTurn?.name}.`, options);
    }
  } else if (cmd === 'end') {
    if (!inst.activeCombat) {
      info(`No active combat in instance "${instanceId}".`);
      return;
    }

    inst.activeCombat.isActive = false;
    saveDb(db, options);

    if (options.json) {
      printJson({ combatEnded: true });
    } else {
      success(`Combat ended in instance "${inst.instanceName}".`, options);
    }
  } else {
    error(`Unknown combat command '${cmd}'. Use start, next, or end.`);
  }
}

function printInstancesHelp() {
  console.log(`
${c.bold('vellum instances')} — Manage active campaigns, play instances, and combat sessions

${c.bold('USAGE:')}
  vellum instances list [options]
  vellum instances get <id> [--json] [--timeline]
  vellum instances create --adventure <advId> [options]
  vellum instances set-scene <instanceId> <sceneId>
  vellum instances log <instanceId> --title <title> [options]
  vellum instances pc-status <instanceId> <characterId> [options]
  vellum instances combat start <instanceId> [--title <title>]
  vellum instances combat next <instanceId>
  vellum instances combat end <instanceId>
  vellum instances delete <id>

${c.bold('OPTIONS:')}
  --adventure <id>          Target adventure ID
  --name <name>             Session group / instance name
  --party <partyId>         Party ID to populate PCs
  --members <id1,id2>       Comma-separated PC character IDs
  --title <title>           Title for log entry or combat
  --category <cat>          Log category: narrative, choice, combat, loot, npc_interaction, dm_note
  --details <text>          Details of the timeline log
  --hp <number>             Current HP for pc-status
  --condition <cond>        e.g. "Avvelenato" or "remove:Avvelenato"
  --json                    Machine-readable JSON output
`);
}
