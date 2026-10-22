import React, { useEffect, useState } from 'react';
import {
  ActiveCombatState,
  AdventureBlueprint,
  CharacterEntity,
  CombatParticipant,
  DND_CONDITIONS,
  EncounterPreset,
  PartyGroup,
  PlayInstance,
  SessionLogCategory,
  SessionLogEntry,
  SfxItem,
} from '../types/dnd';
import { HomebreweryRenderer } from './HomebreweryRenderer';
import { StatblockCard } from './StatblockCard';
import { soundboardEngine } from '../services/audioEngine';
import {
  Play,
  Square,
  Swords,
  Volume2,
  VolumeX,
  CheckCircle2,
  BookOpen,
  ScrollText,
  Users,
  Plus,
  Shield,
  Heart,
  Sparkles,
  ChevronRight,
  Dice5,
  FileDown,
  Copy,
  Check,
  Trash2,
  EyeOff,
  Eye,
  X,
  Flame,
} from 'lucide-react';

interface LiveSessionConsoleProps {
  instances: PlayInstance[];
  adventures: AdventureBlueprint[];
  characters: CharacterEntity[];
  parties: PartyGroup[];
  sfxCatalog: SfxItem[];
  activeInstanceId: string;
  onSelectInstance: (id: string) => void;
  onSaveInstance: (inst: PlayInstance) => void;
  onDeleteInstance: (id: string) => void;
  onOpenNewInstanceModal: (adventure?: AdventureBlueprint) => void;
}

const LOG_CATEGORY_META: Record<
  SessionLogCategory,
  { label: string; badgeClass: string }
> = {
  narrative: { label: 'Storia / Scena', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  choice: { label: 'Scelta Giocatori', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  combat: { label: 'Combattimento', badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40' },
  npc_interaction: { label: 'Ruolo / PNG', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  loot: { label: 'Tesoro / Ricompensa', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  dm_note: { label: 'Nota DM', badgeClass: 'bg-stone-700 text-stone-200 border-stone-600' },
};

export const LiveSessionConsole: React.FC<LiveSessionConsoleProps> = ({
  instances,
  adventures,
  characters,
  sfxCatalog,
  activeInstanceId,
  onSelectInstance,
  onSaveInstance,
  onDeleteInstance,
  onOpenNewInstanceModal,
}) => {
  const [, setAudioTick] = useState(0);
  const [centerTab, setCenterTab] = useState<'story' | 'combat'>('story');
  const [hideDmNotes, setHideDmNotes] = useState(false);
  const [inspectedChar, setInspectedChar] = useState<CharacterEntity | null>(null);

  // Step-by-step log composer state
  const [logCategory, setLogCategory] = useState<SessionLogCategory>('choice');
  const [logTitle, setLogTitle] = useState('');
  const [logDetails, setLogDetails] = useState('');

  // Ad-hoc combat modal / participant adder
  const [addCombatCharId, setAddCombatCharId] = useState<string>(
    characters.find((c) => c.kind === 'monster')?.id || characters[0]?.id || ''
  );
  const [addCombatCount, setAddCombatCount] = useState<number>(1);
  const [hpDeltaInputs, setHpDeltaInputs] = useState<Record<string, string>>({});

  // Recap generator modal
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [copiedRecap, setCopiedRecap] = useState(false);

  useEffect(() => {
    return soundboardEngine.subscribe(() => setAudioTick((t) => t + 1));
  }, []);

  const currentInstance =
    instances.find((i) => i.id === activeInstanceId) || instances[0];

  if (!currentInstance) {
    return (
      <div className="p-12 text-center bg-stone-900 rounded-2xl border border-stone-800 space-y-4">
        <h3 className="font-header text-2xl font-bold text-amber-400">
          Nessuna Istanza di Partita Attiva
        </h3>
        <p className="text-sm text-stone-400 max-w-lg mx-auto">
          Avvia una nuova istanza scegliendo una One-Shot o un capitolo di Campagna e associando il gruppo di giocatori.
        </p>
        <button
          onClick={() => onOpenNewInstanceModal()}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm"
        >
          + Avvia Nuova Istanza di Gioco
        </button>
      </div>
    );
  }

  const adventure =
    adventures.find((a) => a.id === currentInstance.adventureId) || adventures[0];

  const currentScene =
    adventure.scenes.find((s) => s.id === currentInstance.currentSceneId) ||
    adventure.scenes[0];

  const charMap = new Map(characters.map((c) => [c.id, c]));
  const sfxMap = new Map(sfxCatalog.map((s) => [s.id, s]));

  const updateInstance = (patch: Partial<PlayInstance>) => {
    onSaveInstance({
      ...currentInstance,
      ...patch,
      lastPlayedAt: new Date().toISOString(),
    });
  };

  const handleSelectScene = (sceneId: string) => {
    const visited = currentInstance.visitedSceneIds.includes(sceneId)
      ? currentInstance.visitedSceneIds
      : [...currentInstance.visitedSceneIds, sceneId];
    updateInstance({
      currentSceneId: sceneId,
      visitedSceneIds: visited,
    });
  };

  const appendLogEntry = (
    category: SessionLogCategory,
    title: string,
    details: string,
    pinnedForRecap = true
  ) => {
    const entry: SessionLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      sceneId: currentScene.id,
      sceneTitle: `${currentScene.code}: ${currentScene.title}`,
      category,
      title,
      details,
      pinnedForRecap,
    };
    updateInstance({
      timeline: [entry, ...currentInstance.timeline],
    });
  };

  const handleAddManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() && !logDetails.trim()) return;
    appendLogEntry(
      logCategory,
      logTitle.trim() || LOG_CATEGORY_META[logCategory].label,
      logDetails.trim()
    );
    setLogTitle('');
    setLogDetails('');
  };

  // ================= COMBAT ENGINE =================
  const rollD20 = (bonus: number) => Math.floor(Math.random() * 20) + 1 + bonus;

  const buildPartyCombatants = (): CombatParticipant[] => {
    return currentInstance.partyCharacterIds
      .map((pcId) => {
        const ch = charMap.get(pcId);
        if (!ch) return null;
        const runtime = currentInstance.pcStatus[pcId];
        return {
          id: `comb-pc-${ch.id}`,
          sourceCharacterId: ch.id,
          name: ch.name,
          kind: 'pc' as const,
          initiative: rollD20(ch.initiativeBonus),
          ac: ch.ac,
          hpCurrent: runtime ? runtime.hpCurrent : ch.hpMax,
          hpMax: ch.hpMax,
          tempHp: runtime ? runtime.tempHp : 0,
          conditions: runtime ? [...runtime.conditions] : [],
          isConcentrating: false,
          notes: ch.classOrArchetype || '',
        };
      })
      .filter(Boolean) as CombatParticipant[];
  };

  const startEncounterFromPreset = (preset: EncounterPreset) => {
    const partyParticipants = buildPartyCombatants();
    const monsterParticipants: CombatParticipant[] = [];

    preset.slots.forEach((slot) => {
      const monster = charMap.get(slot.characterId);
      if (!monster) return;
      for (let idx = 1; idx <= slot.count; idx++) {
        const suffix = slot.count > 1 ? ` #${idx}` : '';
        monsterParticipants.push({
          id: `comb-mon-${monster.id}-${Date.now()}-${idx}`,
          sourceCharacterId: monster.id,
          name: `${slot.customLabel || monster.name}${suffix}`,
          kind: monster.kind,
          initiative: rollD20(monster.initiativeBonus),
          ac: monster.ac,
          hpCurrent: monster.hpMax,
          hpMax: monster.hpMax,
          tempHp: 0,
          conditions: [],
          isConcentrating: false,
          notes: monster.levelOrCr,
        });
      }
    });

    const all = [...partyParticipants, ...monsterParticipants].sort(
      (a, b) => b.initiative - a.initiative
    );

    if (preset.autoSfxId) {
      const sfx = sfxMap.get(preset.autoSfxId);
      if (sfx) soundboardEngine.play(sfx);
    }

    const combatState: ActiveCombatState = {
      isActive: true,
      encounterTitle: preset.name,
      sceneId: currentScene.id,
      round: 1,
      turnIndex: 0,
      startedAt: new Date().toISOString(),
      participants: all,
      combatEvents: [`Round 1 iniziato: ${preset.name}`],
    };

    updateInstance({ activeCombat: combatState });
    setCenterTab('combat');
  };

  const startAdHocCombat = () => {
    const partyParticipants = buildPartyCombatants();
    const sorted = partyParticipants.sort((a, b) => b.initiative - a.initiative);
    const combatState: ActiveCombatState = {
      isActive: true,
      encounterTitle: `Scontro Imprevisto (${currentScene.code})`,
      sceneId: currentScene.id,
      round: 1,
      turnIndex: 0,
      startedAt: new Date().toISOString(),
      participants: sorted,
      combatEvents: [`Scontro improvviso avviato nella scena ${currentScene.title}`],
    };
    updateInstance({ activeCombat: combatState });
    setCenterTab('combat');
  };

  const updateCombat = (combatPatch: Partial<ActiveCombatState>) => {
    if (!currentInstance.activeCombat) return;
    updateInstance({
      activeCombat: {
        ...currentInstance.activeCombat,
        ...combatPatch,
      },
    });
  };

  const handleNextTurn = () => {
    const combat = currentInstance.activeCombat;
    if (!combat || combat.participants.length === 0) return;
    let nextIndex = combat.turnIndex + 1;
    let nextRound = combat.round;
    if (nextIndex >= combat.participants.length) {
      nextIndex = 0;
      nextRound += 1;
    }
    const activeChar = combat.participants[nextIndex];
    updateCombat({
      round: nextRound,
      turnIndex: nextIndex,
      combatEvents: [
        `Round ${nextRound} — Turno di ${activeChar.name}`,
        ...combat.combatEvents.slice(0, 25),
      ],
    });
  };

  const applyHpChange = (participantId: string, delta: number) => {
    const combat = currentInstance.activeCombat;
    if (!combat) return;
    const nextParticipants = combat.participants.map((p) => {
      if (p.id !== participantId) return p;
      let nextHp = p.hpCurrent;
      let nextTemp = p.tempHp;

      if (delta < 0) {
        let dmg = Math.abs(delta);
        if (nextTemp > 0) {
          const absorbed = Math.min(nextTemp, dmg);
          nextTemp -= absorbed;
          dmg -= absorbed;
        }
        nextHp = Math.max(0, nextHp - dmg);
      } else {
        nextHp = Math.min(p.hpMax, nextHp + delta);
      }

      return { ...p, hpCurrent: nextHp, tempHp: nextTemp };
    });

    updateCombat({ participants: nextParticipants });
  };

  const toggleParticipantCondition = (participantId: string, condition: string) => {
    const combat = currentInstance.activeCombat;
    if (!combat) return;
    const nextParticipants = combat.participants.map((p) => {
      if (p.id !== participantId) return p;
      const has = p.conditions.includes(condition);
      const nextConds = has
        ? p.conditions.filter((c) => c !== condition)
        : [...p.conditions, condition];
      return { ...p, conditions: nextConds };
    });
    updateCombat({ participants: nextParticipants });
  };

  const handleAddCreatureToActiveCombat = (char: CharacterEntity, count = 1) => {
    const combat = currentInstance.activeCombat;
    if (!combat) {
      startAdHocCombat();
      return;
    }
    const added: CombatParticipant[] = [];
    for (let i = 1; i <= count; i++) {
      const suffix = count > 1 ? ` #${i}` : '';
      added.push({
        id: `comb-${char.id}-${Date.now()}-${i}`,
        sourceCharacterId: char.id,
        name: `${char.name}${suffix}`,
        kind: char.kind,
        initiative: rollD20(char.initiativeBonus),
        ac: char.ac,
        hpCurrent: char.hpMax,
        hpMax: char.hpMax,
        tempHp: 0,
        conditions: [],
        isConcentrating: false,
        notes: char.levelOrCr,
      });
    }
    const merged = [...combat.participants, ...added].sort(
      (a, b) => b.initiative - a.initiative
    );
    updateCombat({
      participants: merged,
      combatEvents: [
        `Aggiunti allo scontro: ${count}× ${char.name}`,
        ...combat.combatEvents,
      ],
    });
    setCenterTab('combat');
  };

  const finishAndLogCombat = () => {
    const combat = currentInstance.activeCombat;
    if (!combat) return;

    // Sync PCs HP back to instance pcStatus
    const nextPcStatus = { ...currentInstance.pcStatus };
    combat.participants.forEach((p) => {
      if (p.kind === 'pc' && p.sourceCharacterId) {
        nextPcStatus[p.sourceCharacterId] = {
          characterId: p.sourceCharacterId,
          hpCurrent: p.hpCurrent,
          tempHp: p.tempHp,
          conditions: p.conditions,
          inspiration: nextPcStatus[p.sourceCharacterId]?.inspiration ?? false,
          sessionNotes: nextPcStatus[p.sourceCharacterId]?.sessionNotes ?? '',
        };
      }
    });

    const defeated = combat.participants
      .filter((p) => p.kind !== 'pc' && p.hpCurrent === 0)
      .map((p) => p.name);

    const logEntry: SessionLogEntry = {
      id: `log-combat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sceneId: currentScene.id,
      sceneTitle: `${currentScene.code}: ${currentScene.title}`,
      category: 'combat',
      title: ` Vittoria: ${combat.encounterTitle} (${combat.round} round)`,
      details:
        defeated.length > 0
          ? `Nemici sconfitti: ${defeated.join(', ')}. Stato PG sincronizzato.`
          : `Scontro concluso dopo ${combat.round} round.`,
      pinnedForRecap: true,
    };

    updateInstance({
      pcStatus: nextPcStatus,
      activeCombat: null,
      timeline: [logEntry, ...currentInstance.timeline],
    });
    setCenterTab('story');
  };

  // Scene-linked SFX items
  const sceneSfxItems = currentScene.linkedSfxIds
    .map((id) => sfxMap.get(id))
    .filter(Boolean) as SfxItem[];

  // Scene-linked NPCs/Monsters
  const sceneCharacters = currentScene.linkedCharacterIds
    .map((id) => charMap.get(id))
    .filter(Boolean) as CharacterEntity[];

  // Active turn combatant statblock
  const activeTurnParticipant =
    currentInstance.activeCombat?.participants[
      currentInstance.activeCombat.turnIndex
    ];
  const activeTurnCharEntity = activeTurnParticipant?.sourceCharacterId
    ? charMap.get(activeTurnParticipant.sourceCharacterId)
    : undefined;

  // Build Markdown Recap for this instance
  const generateMarkdownRecap = (): string => {
    const lines: string[] = [];
    lines.push(`# Riepilogo Partita: ${adventure.title}`);
    lines.push(`**Istanza / Sessione**: ${currentInstance.instanceName}`);
    lines.push(`**Gruppo**: ${currentInstance.groupName}`);
    lines.push(`**Scena Attuale**: ${currentScene.code} — ${currentScene.title}`);
    lines.push('');
    lines.push(`## Stato degli Eroi del Gruppo`);
    currentInstance.partyCharacterIds.forEach((pcId) => {
      const pc = charMap.get(pcId);
      const st = currentInstance.pcStatus[pcId];
      if (pc) {
        const hp = st ? st.hpCurrent : pc.hpMax;
        const conds = st?.conditions?.length ? ` [${st.conditions.join(', ')}]` : '';
        const notes = st?.sessionNotes ? ` — *${st.sessionNotes}*` : '';
        lines.push(`- **${pc.name}** (${pc.classOrArchetype}): PF ${hp}/${pc.hpMax}${conds}${notes}`);
      }
    });
    lines.push('');
    lines.push(`## Note per Capitolo / Scena`);
    adventure.scenes.forEach((sc) => {
      const note = currentInstance.sceneNotes[sc.id];
      const visited = currentInstance.visitedSceneIds.includes(sc.id);
      if (visited || note) {
        lines.push(`### ${sc.code}: ${sc.title} ${visited ? '✅' : ''}`);
        if (note) {
          lines.push(note);
        } else {
          lines.push(`*Nessuna nota specifica registrata.*`);
        }
        lines.push('');
      }
    });

    lines.push(`## Cronologia Passo-Passo degli Eventi`);
    const chronological = [...currentInstance.timeline].reverse();
    if (chronological.length === 0) {
      lines.push(`*Nessun evento registrato nella timeline.*`);
    } else {
      chronological.forEach((item, idx) => {
        const timeStr = new Date(item.timestamp).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(
          `${idx + 1}. **[${item.sceneTitle} - ${timeStr}] ${item.title}**: ${item.details}`
        );
      });
    }
    return lines.join('\n');
  };

  return (
    <div className="space-y-4">
      {/* Top Multi-Instance Bar */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Istanza Attiva
          </div>

          <select
            value={currentInstance.id}
            onChange={(e) => onSelectInstance(e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-amber-300 font-header font-bold text-sm"
          >
            {instances.map((inst) => {
              const adv = adventures.find((a) => a.id === inst.adventureId);
              return (
                <option key={inst.id} value={inst.id}>
                  {inst.instanceName} — [{adv?.title || 'Avventura'}] ({inst.groupName})
                </option>
              );
            })}
          </select>

          <button
            onClick={() => onOpenNewInstanceModal(adventure)}
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-amber-600 text-amber-300 hover:text-stone-950 text-xs font-bold transition flex items-center gap-1.5"
            title="Avvia la stessa avventura (o un'altra) per un altro gruppo di giocatori"
          >
            <Plus className="w-3.5 h-3.5" /> + Nuova Istanza Parallela
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setHideDmNotes((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
              hideDmNotes
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                : 'bg-stone-800 border-stone-700 text-stone-300'
            }`}
          >
            {hideDmNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hideDmNotes ? 'Vista Giocatori (Note DM Nascoste)' : 'Vista DM Completa'}
          </button>

          <button
            onClick={() => setShowRecapModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
          >
            <ScrollText className="w-4 h-4" /> Genera Riepilogo Partita
          </button>

          {instances.length > 1 && (
            <button
              onClick={() => onDeleteInstance(currentInstance.id)}
              title="Elimina questa istanza"
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-900/70 text-stone-400 hover:text-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Live DM Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (3 cols): Scene Progress + Contextual Scene Soundboard + Party Live Status */}
        <div className="lg:col-span-3 space-y-4">
          {/* 1. Scene Progression */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider">
                Capitoli / Scene ({adventure.title})
              </span>
            </div>

            <div className="space-y-1.5">
              {adventure.scenes.map((scene) => {
                const isCurrent = scene.id === currentScene.id;
                const isVisited = currentInstance.visitedSceneIds.includes(scene.id);
                const hasNote = Boolean(currentInstance.sceneNotes[scene.id]?.trim());
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleSelectScene(scene.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-950/50 border-amber-500 text-amber-200 shadow'
                        : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isVisited && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="text-[10px] font-bold uppercase text-amber-400">
                          {scene.code}
                        </span>
                        {hasNote && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            Nota
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs truncate mt-0.5">{scene.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Scene Quick SFX Soundboard ("A portata di mano") */}
          <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400" /> SFX di Scena ({currentScene.code})
              </span>
              {soundboardEngine.getActiveTrackIds().length > 0 && (
                <button
                  onClick={() => soundboardEngine.stopAll()}
                  className="text-[10px] px-2 py-0.5 rounded bg-red-900 text-amber-100 font-bold flex items-center gap-1"
                >
                  <VolumeX className="w-3 h-3" /> Stop
                </button>
              )}
            </div>

            {sceneSfxItems.length === 0 ? (
              <p className="text-xs text-stone-500 italic">
                Nessun SFX specifico assegnato a questa scena.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {sceneSfxItems.map((sfx) => {
                  const playing = soundboardEngine.isPlaying(sfx.id);
                  return (
                    <button
                      key={sfx.id}
                      onClick={() => soundboardEngine.toggle(sfx)}
                      className={`w-full px-3 py-2 rounded-lg border text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                        playing
                          ? 'bg-amber-600 text-stone-950 border-amber-400 shadow animate-pulse'
                          : 'bg-stone-950 hover:bg-stone-800 text-amber-200 border-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {playing ? (
                          <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        )}
                        <span className="truncate">{sfx.name}</span>
                      </div>
                      <span className="text-[10px] uppercase opacity-75 shrink-0">
                        {sfx.loop ? 'Loop' : 'SFX'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick dropdown for any other global SFX */}
            <div className="pt-2 border-t border-stone-800">
              <select
                defaultValue=""
                onChange={(e) => {
                  const sfx = sfxMap.get(e.target.value);
                  if (sfx) soundboardEngine.toggle(sfx);
                  e.target.value = '';
                }}
                className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-300 text-xs"
              >
                <option value="">+ Riproduci SFX Globale al volo...</option>
                {sfxCatalog.map((s) => (
                  <option key={s.id} value={s.id}>
                    🔊 {s.name} ({s.loop ? 'Loop' : 'One-Shot'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Party Runtime Tracker (Specific to THIS Instance!) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2.5">
            <div className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Gruppo: {currentInstance.groupName}
            </div>

            <div className="space-y-2">
              {currentInstance.partyCharacterIds.map((pcId) => {
                const pc = charMap.get(pcId);
                if (!pc) return null;
                const st = currentInstance.pcStatus[pcId] || {
                  characterId: pcId,
                  hpCurrent: pc.hpMax,
                  tempHp: 0,
                  conditions: [],
                  inspiration: false,
                  sessionNotes: '',
                };

                const updatePc = (patch: Partial<typeof st>) => {
                  updateInstance({
                    pcStatus: {
                      ...currentInstance.pcStatus,
                      [pcId]: { ...st, ...patch },
                    },
                  });
                };

                return (
                  <div
                    key={pcId}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setInspectedChar(pc)}
                        className="font-bold text-amber-300 hover:underline text-left"
                      >
                        {pc.name}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-300 text-[10px]">
                          CA {pc.ac}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 text-[10px]">
                          PP {pc.passivePerception}
                        </span>
                        <button
                          onClick={() => updatePc({ inspiration: !st.inspiration })}
                          title="Ispirazione Eroica"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            st.inspiration
                              ? 'bg-amber-500 text-stone-950 border-amber-400'
                              : 'bg-stone-900 text-stone-500 border-stone-800'
                          }`}
                        >
                          ★ Isp
                        </button>
                      </div>
                    </div>

                    {/* HP Bar & Quick Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold text-emerald-400">
                          {st.hpCurrent}/{pc.hpMax}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updatePc({ hpCurrent: Math.max(0, st.hpCurrent - 1) })
                          }
                          className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 font-bold"
                        >
                          -1
                        </button>
                        <button
                          onClick={() =>
                            updatePc({ hpCurrent: Math.max(0, st.hpCurrent - 5) })
                          }
                          className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 font-bold"
                        >
                          -5
                        </button>
                        <button
                          onClick={() =>
                            updatePc({ hpCurrent: Math.min(pc.hpMax, st.hpCurrent + 5) })
                          }
                          className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 font-bold"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={st.sessionNotes}
                      onChange={(e) => updatePc({ sessionNotes: e.target.value })}
                      placeholder="Nota rapida PG in questa istanza..."
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-300"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (6 cols): Interactive Homebrewery Page OR Combat Tracker */}
        <div className="lg:col-span-6 space-y-3">
          {/* Mode Switcher Bar */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCenterTab('story')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  centerTab === 'story'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Pagina Storia (Homebrewery)
              </button>

              <button
                onClick={() => setCenterTab('combat')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  centerTab === 'combat'
                    ? 'bg-red-700 text-amber-100 shadow'
                    : currentInstance.activeCombat
                    ? 'bg-red-950/80 text-red-300 border border-red-700 animate-pulse'
                    : 'bg-stone-950 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Swords className="w-4 h-4" />
                Combat Tracker
                {currentInstance.activeCombat && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-extrabold">
                    R{currentInstance.activeCombat.round}
                  </span>
                )}
              </button>
            </div>

            {!currentInstance.activeCombat && (
              <button
                onClick={startAdHocCombat}
                className="px-3 py-1.5 rounded-lg bg-red-900/70 hover:bg-red-800 text-amber-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" /> ⚔️ Avvia Combattimento Imprevisto
              </button>
            )}
          </div>

          {centerTab === 'story' ? (
            <div className="space-y-3">
              {/* Quick bar of NPCs present in the current scene */}
              {sceneCharacters.length > 0 && (
                <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3.5 py-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-stone-400 font-semibold">Schede della Scena:</span>
                  {sceneCharacters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setInspectedChar(ch)}
                      className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-amber-600/20 border border-stone-700 hover:border-amber-500 text-amber-200 font-semibold flex items-center gap-1.5 transition"
                    >
                      <span>{ch.name}</span>
                      <span className="text-[10px] text-stone-400">
                        (CA {ch.ac} • PF {ch.hpMax})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-[75vh] overflow-y-auto pr-1">
                <HomebreweryRenderer
                  markdown={currentScene.homebreweryMarkdown}
                  characters={characters}
                  sfxCatalog={sfxCatalog}
                  encounters={currentScene.encounters}
                  hideDmNotes={hideDmNotes}
                  onSelectCharacter={(ch) => setInspectedChar(ch)}
                  onStartEncounter={(enc) => startEncounterFromPreset(enc)}
                  onLogReadAloud={(excerpt) =>
                    appendLogEntry(
                      'narrative',
                      `Descrizione letta in ${currentScene.code}`,
                      excerpt
                    )
                  }
                />
              </div>
            </div>
          ) : (
            /* COMBAT TRACKER PANEL */
            <div className="bg-stone-900/95 border border-stone-800 rounded-xl p-4 space-y-4">
              {!currentInstance.activeCombat ? (
                <div className="text-center py-10 space-y-4">
                  <Swords className="w-10 h-10 text-red-500 mx-auto" />
                  <div>
                    <h3 className="font-header text-xl font-bold text-amber-400">
                      Nessun Combattimento in Corso
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                      Puoi avviare uno degli incontri previsti nella scena corrente oppure creare un combattimento al volo.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    {currentScene.encounters.map((enc) => (
                      <button
                        key={enc.id}
                        onClick={() => startEncounterFromPreset(enc)}
                        className="px-4 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-amber-100 font-bold text-xs flex items-center gap-2 shadow-lg"
                      >
                        <Swords className="w-4 h-4" /> Avvia: {enc.name} ({enc.difficulty})
                      </button>
                    ))}
                    <button
                      onClick={startAdHocCombat}
                      className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Inizia Scontro al Volo (Con il Party)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Active Combat Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-950/90 via-stone-900 to-stone-900 p-3.5 rounded-xl border border-red-800/50">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-red-300">
                        Round {currentInstance.activeCombat.round} • Turno{' '}
                        {currentInstance.activeCombat.turnIndex + 1} di{' '}
                        {currentInstance.activeCombat.participants.length}
                      </div>
                      <h3 className="font-header text-lg font-extrabold text-amber-300">
                        {currentInstance.activeCombat.encounterTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleNextTurn}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        Turno Successivo <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={finishAndLogCombat}
                        className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        🏁 Termina & Registra nel Diario
                      </button>
                    </div>
                  </div>

                  {/* Add Reinforcement / Creature on the fly */}
                  <div className="flex flex-wrap items-center gap-2 bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-xs">
                    <span className="font-semibold text-stone-400">Aggiungi al volo:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={addCombatCount}
                      onChange={(e) => setAddCombatCount(Math.max(1, Number(e.target.value)))}
                      className="w-14 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-center font-bold text-amber-300"
                    />
                    <select
                      value={addCombatCharId}
                      onChange={(e) => setAddCombatCharId(e.target.value)}
                      className="flex-1 px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    >
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.kind.toUpperCase()}] {c.name} ({c.levelOrCr} • CA {c.ac} • PF {c.hpMax})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const ch = charMap.get(addCombatCharId);
                        if (ch) handleAddCreatureToActiveCombat(ch, addCombatCount);
                      }}
                      className="px-3 py-1 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 font-bold"
                    >
                      + Schiera con Tiro Iniziativa
                    </button>
                  </div>

                  {/* Initiative List */}
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                    {currentInstance.activeCombat.participants.map((p, idx) => {
                      const isTurn = idx === currentInstance.activeCombat!.turnIndex;
                      const isDead = p.hpCurrent === 0;
                      const deltaVal = Number(hpDeltaInputs[p.id] || 5);
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition ${
                            isTurn
                              ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                              : isDead
                              ? 'bg-stone-950/40 border-stone-800/60 opacity-60'
                              : 'bg-stone-950 border-stone-800'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {/* Initiative Input */}
                              <div className="text-center">
                                <div className="text-[9px] uppercase text-stone-500 font-bold">
                                  Iniz
                                </div>
                                <input
                                  type="number"
                                  value={p.initiative}
                                  onChange={(e) => {
                                    const next = currentInstance.activeCombat!.participants
                                      .map((item) =>
                                        item.id === p.id
                                          ? { ...item, initiative: Number(e.target.value) }
                                          : item
                                      )
                                      .sort((a, b) => b.initiative - a.initiative);
                                    updateCombat({ participants: next });
                                  }}
                                  className="w-12 py-0.5 text-center rounded bg-stone-900 border border-stone-700 font-bold text-sm text-amber-300"
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  {isTurn && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 text-[10px] font-extrabold uppercase">
                                      Turno Attivo
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      const entity = p.sourceCharacterId
                                        ? charMap.get(p.sourceCharacterId)
                                        : undefined;
                                      if (entity) setInspectedChar(entity);
                                    }}
                                    className={`font-bold text-sm hover:underline ${
                                      isDead
                                        ? 'line-through text-stone-500'
                                        : p.kind === 'pc'
                                        ? 'text-amber-300'
                                        : 'text-red-300'
                                    }`}
                                  >
                                    {p.name}
                                  </button>
                                  <span className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 font-semibold">
                                    CA {p.ac}
                                  </span>
                                </div>
                                <div className="text-[11px] text-stone-400">{p.notes}</div>
                              </div>
                            </div>

                            {/* HP & Damage/Heal Controls */}
                            <div className="flex items-center gap-2">
                              <div className="text-right mr-1">
                                <div className="text-xs font-bold text-emerald-400">
                                  PF {p.hpCurrent} / {p.hpMax}
                                </div>
                                <div className="w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full ${
                                      p.hpCurrent / p.hpMax > 0.5
                                        ? 'bg-emerald-500'
                                        : p.hpCurrent / p.hpMax > 0.25
                                        ? 'bg-amber-500'
                                        : 'bg-red-600'
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (p.hpCurrent / p.hpMax) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <input
                                type="number"
                                min={1}
                                value={hpDeltaInputs[p.id] ?? '5'}
                                onChange={(e) =>
                                  setHpDeltaInputs({ ...hpDeltaInputs, [p.id]: e.target.value })
                                }
                                className="w-12 px-1.5 py-1 rounded bg-stone-900 border border-stone-700 text-center text-xs text-stone-200"
                              />
                              <button
                                onClick={() => applyHpChange(p.id, -deltaVal)}
                                className="px-2 py-1 rounded bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-bold"
                              >
                                Danno
                              </button>
                              <button
                                onClick={() => applyHpChange(p.id, deltaVal)}
                                className="px-2 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 text-xs font-bold"
                              >
                                Cura
                              </button>
                            </div>
                          </div>

                          {/* Conditions Bar */}
                          <div className="mt-2 pt-2 border-t border-stone-900 flex flex-wrap items-center gap-1.5">
                            {p.conditions.map((cond) => (
                              <button
                                key={cond}
                                onClick={() => toggleParticipantCondition(p.id, cond)}
                                className="px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/50 text-purple-200 text-[10px] font-semibold flex items-center gap-1"
                              >
                                {cond} ×
                              </button>
                            ))}
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                toggleParticipantCondition(p.id, e.target.value);
                                e.target.value = '';
                              }}
                              className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-stone-400"
                            >
                              <option value="">+ Condizione...</option>
                              {DND_CONDITIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Turn Statblock Reference */}
                  {activeTurnCharEntity && (
                    <div className="pt-2 border-t border-stone-800">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                        Scheda Rapida Combattente di Turno: {activeTurnCharEntity.name}
                      </div>
                      <StatblockCard character={activeTurnCharEntity} compact />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (3 cols): Scene Notes + Step-by-Step Timeline & Recap */}
        <div className="lg:col-span-3 space-y-4">
          {/* 1. Per-Scene Instance Notes */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <div className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider">
              Note DM Scena ({currentScene.code}) — Solo questa Istanza
            </div>
            <textarea
              rows={4}
              value={currentInstance.sceneNotes[currentScene.id] || ''}
              onChange={(e) =>
                updateInstance({
                  sceneNotes: {
                    ...currentInstance.sceneNotes,
                    [currentScene.id]: e.target.value,
                  },
                })
              }
              placeholder={`Appunta qui cosa ha fatto "${currentInstance.groupName}" in ${currentScene.title}...`}
              className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 2. Step-by-Step Session Log Composer */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-3">
            <div className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Diario Passo-Passo della Partita</span>
              <span className="text-[10px] text-stone-400 font-sans">
                {currentInstance.timeline.length} eventi
              </span>
            </div>

            <form onSubmit={handleAddManualLog} className="space-y-2 text-xs">
              <div className="flex gap-1.5">
                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value as SessionLogCategory)}
                  className="px-2 py-1.5 rounded bg-stone-950 border border-stone-800 text-amber-300 font-semibold"
                >
                  {(Object.keys(LOG_CATEGORY_META) as SessionLogCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {LOG_CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="Titolo passo / scelta..."
                  className="flex-1 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-100 font-semibold"
                />
              </div>
              <textarea
                rows={2}
                value={logDetails}
                onChange={(e) => setLogDetails(e.target.value)}
                placeholder="Dettaglio evento per il riepilogo della partita..."
                className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200"
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold transition cursor-pointer"
              >
                + Aggiungi Passo al Riepilogo
              </button>
            </form>

            {/* Timeline Feed */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 pt-2 border-t border-stone-800">
              {currentInstance.timeline.map((entry) => {
                const meta = LOG_CATEGORY_META[entry.category];
                return (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-lg bg-stone-950 border border-stone-800/90 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                        <span>{entry.sceneTitle.split(':')[0]}</span>
                        <button
                          onClick={() =>
                            updateInstance({
                              timeline: currentInstance.timeline.filter((t) => t.id !== entry.id),
                            })
                          }
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-stone-100">{entry.title}</div>
                    {entry.details && (
                      <p className="text-stone-400 leading-snug text-[11px]">{entry.details}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Character Inspector Modal */}
      {inspectedChar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setInspectedChar(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#58180D] text-amber-100 hover:bg-red-800 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <StatblockCard
              character={inspectedChar}
              onAddToCombat={(ch) => {
                handleAddCreatureToActiveCombat(ch, 1);
                setInspectedChar(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Markdown Recap Modal */}
      {showRecapModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-header text-xl font-bold text-amber-400 flex items-center gap-2">
                <ScrollText className="w-5 h-5" /> Riepilogo Passo-Passo della Partita
              </h3>
              <button
                onClick={() => setShowRecapModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Generato automaticamente dalle note di scena, dallo stato dei PG e dalla cronologia eventi dell’istanza{' '}
              <strong className="text-amber-300">{currentInstance.instanceName}</strong>.
            </p>
            <textarea
              readOnly
              rows={14}
              value={generateMarkdownRecap()}
              className="w-full p-3.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-xs text-stone-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(generateMarkdownRecap());
                  setCopiedRecap(true);
                  setTimeout(() => setCopiedRecap(false), 1800);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
              >
                {copiedRecap ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedRecap ? 'Riepilogo Copiato!' : 'Copia Riepilogo Markdown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
