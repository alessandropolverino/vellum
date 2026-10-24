import React, { useEffect, useRef, useState } from 'react';
import {
  AdventureBlueprint,
  AdventureScene,
  Campaign,
  CharacterEntity,
  EncounterPreset,
  SfxItem,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { HomebreweryRenderer } from './HomebreweryRenderer';
import { StatblockCard } from './StatblockCard';
import {
  BookOpen,
  Plus,
  Trash2,
  Columns,
  Eye,
  Edit3,
  Volume2,
  Swords,
  UserCheck,
  Table,
  FileText,
  Play,
  Layers,
  ChevronUp,
  ChevronDown,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface AdventureStudioViewProps {
  adventures: AdventureBlueprint[];
  campaigns: Campaign[];
  characters: CharacterEntity[];
  sfxCatalog: SfxItem[];
  selectedAdventureId: string;
  onSelectAdventure: (id: string) => void;
  onSaveAdventure: (adv: AdventureBlueprint) => void;
  onDeleteAdventure: (id: string) => void;
  onSaveCampaign: (camp: Campaign) => void;
  onLaunchInstanceModal: (adventure: AdventureBlueprint) => void;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedTime?: string;
  lastSaveInfo?: string;
}

export const AdventureStudioView: React.FC<AdventureStudioViewProps> = ({
  adventures,
  campaigns,
  characters,
  sfxCatalog,
  selectedAdventureId,
  onSelectAdventure,
  onSaveAdventure,
  onDeleteAdventure,
  onSaveCampaign,
  onLaunchInstanceModal,
  saveStatus = 'saved',
  lastSavedTime,
  lastSaveInfo,
}) => {
  const { tr } = useLanguage();
  const currentAdventure =
    adventures.find((a) => a.id === selectedAdventureId) || adventures[0];

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    currentAdventure?.scenes[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'editor'>('split');
  const [twoColumns, setTwoColumns] = useState(false);
  const [inspectedChar, setInspectedChar] = useState<CharacterEntity | null>(null);
  const [editingEncounter, setEditingEncounter] = useState<EncounterPreset | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampSetting, setNewCampSetting] = useState('Forgotten Realms');
  const [newCampDesc, setNewCampDesc] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveAdventure(currentAdventure);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAdventure, onSaveAdventure]);


  if (!currentAdventure) {
    return (
      <div className="p-10 text-center bg-stone-900 rounded-xl border border-stone-800">
        <p className="text-stone-400">{tr('No adventures found.', 'Nessuna avventura presente.')}</p>
      </div>
    );
  }

  const currentScene =
    currentAdventure.scenes.find((s) => s.id === selectedSceneId) ||
    currentAdventure.scenes[0];

  const updateAdventure = (patch: Partial<AdventureBlueprint>) => {
    onSaveAdventure({
      ...currentAdventure,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateScene = (scenePatch: Partial<AdventureScene>) => {
    if (!currentScene) return;
    const nextScenes = currentAdventure.scenes.map((s) =>
      s.id === currentScene.id ? { ...s, ...scenePatch } : s
    );
    updateAdventure({ scenes: nextScenes });
  };

  const insertSnippet = (snippet: string) => {
    if (!currentScene) return;
    const el = textareaRef.current;
    const currentText = currentScene.homebreweryMarkdown;
    if (!el) {
      updateScene({ homebreweryMarkdown: `${currentText}\n\n${snippet}` });
      return;
    }
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const nextText =
      currentText.slice(0, start) + snippet + currentText.slice(end);
    updateScene({ homebreweryMarkdown: nextText });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 20);
  };

  const handleAddScene = () => {
    const idx = currentAdventure.scenes.length + 1;
    const newScene: AdventureScene = {
      id: `scene-${Date.now()}`,
      code: tr(`Scene ${idx}`, `Scena ${idx}`),
      title: tr(`New Scene ${idx}`, `Nuova Scena ${idx}`),
      estimatedMinutes: 45,
      location: tr('Scene location', 'Luogo della scena'),
      summary: tr(
        'Short summary of what happens in this chapter.',
        'Breve descrizione di cosa accade in questo capitolo.'
      ),
      homebreweryMarkdown: tr(
        `# Scene ${idx}: Scene Title\n\n:::read-aloud\nDescribe what the players see, hear, and sense when they enter this scene.\n:::\n\n### Developing the Scene\nAdd details, NPCs, and ability checks.\n\n:::dm-note\nSecret notes for the Dungeon Master, check DCs, and hidden secrets.\n:::`,
        `# Scena ${idx}: Titolo della Scena\n\n:::read-aloud\nDescrivi qui cosa vedono, sentono e percepiscono i giocatori quando entrano nella scena.\n:::\n\n### Sviluppo dell'Azione\nAggiungi dettagli, PNG e prove di abilità.\n\n:::dm-note\nNote segrete per il Dungeon Master, CD delle prove e segreti nascosti.\n:::`
      ),
      linkedCharacterIds: [],
      linkedSfxIds: [],
      encounters: [],
    };
    updateAdventure({ scenes: [...currentAdventure.scenes, newScene] });
    setSelectedSceneId(newScene.id);
  };

  const handleMoveScene = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentAdventure.scenes.length) return;
    const copy = [...currentAdventure.scenes];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateAdventure({ scenes: copy });
  };

  const handleDeleteScene = (sceneId: string) => {
    if (currentAdventure.scenes.length <= 1) return;
    const next = currentAdventure.scenes.filter((s) => s.id !== sceneId);
    updateAdventure({ scenes: next });
    setSelectedSceneId(next[0].id);
  };

  const handleCreateAdventure = (type: 'oneshot' | 'campaign_module') => {
    const newAdv: AdventureBlueprint = {
      id: `adv-${Date.now()}`,
      title:
        type === 'oneshot'
          ? tr('New One-Shot Adventure', 'Nuova Avventura One-Shot')
          : tr('New Campaign Chapter', 'Nuovo Capitolo di Campagna'),
      subtitle: tr(
        'An adventure for 3–5 characters of levels 1–4',
        'Avventura per 3–5 personaggi di livello 1–4'
      ),
      type,
      campaignId: type === 'campaign_module' ? campaigns[0]?.id : undefined,
      episodeNumber: type === 'campaign_module' ? adventures.length + 1 : undefined,
      levelRange: tr('Level 3', 'Livello 3'),
      estimatedDuration: tr('3–4 hours', '3–4 ore'),
      authorOrNotes: '',
      tags: [type === 'oneshot' ? 'One-Shot' : tr('Campaign', 'Campagna')],
      updatedAt: new Date().toISOString(),
      scenes: [
        {
          id: `scene-${Date.now()}-1`,
          code: tr('Scene 1', 'Scena 1'),
          title: tr('Introduction & Adventure Hook', 'Introduzione & Gancio d’Avventura'),
          estimatedMinutes: 45,
          location: tr('Starting location', 'Luogo iniziale'),
          summary: tr('Beginning of the story.', 'Inizio della storia.'),
          homebreweryMarkdown: tr(
            `# Scene 1: Introduction\n\n:::read-aloud\nRead this box aloud to your players to set the mood of the scene.\n:::\n\n:::dm-note\nPlace secret DM-only information here.\n:::`,
            `# Scena 1: Introduzione\n\n:::read-aloud\nLeggi questo riquadro ai giocatori per introdurre l'atmosfera della scena.\n:::\n\n:::dm-note\nInserisci qui le informazioni riservate al DM.\n:::`
          ),
          linkedCharacterIds: [],
          linkedSfxIds: [],
          encounters: [],
        },
      ],
    };
    onSaveAdventure(newAdv);
    onSelectAdventure(newAdv.id);
    setSelectedSceneId(newAdv.scenes[0].id);
  };

  const toggleSceneSfx = (sfxId: string) => {
    if (!currentScene) return;
    const exists = currentScene.linkedSfxIds.includes(sfxId);
    const next = exists
      ? currentScene.linkedSfxIds.filter((id) => id !== sfxId)
      : [...currentScene.linkedSfxIds, sfxId];
    updateScene({ linkedSfxIds: next });
  };

  const toggleSceneChar = (charId: string) => {
    if (!currentScene) return;
    const exists = currentScene.linkedCharacterIds.includes(charId);
    const next = exists
      ? currentScene.linkedCharacterIds.filter((id) => id !== charId)
      : [...currentScene.linkedCharacterIds, charId];
    updateScene({ linkedCharacterIds: next });
  };

  const monstersAndNpcs = characters.filter((c) => c.kind !== 'pc');

  return (
    <div className="space-y-4">
      {/* Top Adventure Selector & Metadata Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <select
              value={currentAdventure.id}
              onChange={(e) => {
                const nextId = e.target.value;
                onSelectAdventure(nextId);
                const found = adventures.find((a) => a.id === nextId);
                if (found?.scenes[0]) setSelectedSceneId(found.scenes[0].id);
              }}
              className="px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-amber-300 font-header font-bold text-sm"
            >
              {adventures.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  [
                  {adv.type === 'oneshot'
                    ? 'ONE-SHOT'
                    : `${tr('CAMPAIGN', 'CAMPAGNA')} Ep.${adv.episodeNumber || 1}`}
                  ] {adv.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleCreateAdventure('oneshot')}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> {tr('+ New One-Shot', '+ Nuova One-Shot')}
            </button>
            <button
              onClick={() => handleCreateAdventure('campaign_module')}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-sky-300 text-xs font-bold flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />{' '}
              {tr('+ Campaign Chapter', '+ Capitolo Campagna')}
            </button>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800/70 hover:bg-stone-700 text-stone-300 text-xs"
            >
              {tr('+ New Parent Campaign', '+ Nuova Campagna Madre')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-save Status Badge & Manual Trigger */}
            <button
              type="button"
              onClick={() => onSaveAdventure(currentAdventure)}
              title={
                lastSaveInfo
                  ? `${lastSaveInfo} — ${tr('Click to save again (Ctrl+S)', 'Clicca per salvare nuovamente (Ctrl+S)')}`
                  : tr(
                      'All changes are automatically saved to disk. Click to save now (Ctrl+S).',
                      'Tutte le modifiche sono salvate automaticamente su disco. Clicca per salvare adesso (Ctrl+S).'
                    )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition select-none cursor-pointer ${
                saveStatus === 'saving'
                  ? 'bg-amber-950/60 border-amber-700/70 text-amber-300 animate-pulse'
                  : saveStatus === 'error'
                  ? 'bg-red-950/60 border-red-700/80 text-red-300 hover:bg-red-900/60'
                  : 'bg-stone-950 border-emerald-900/60 text-emerald-400 hover:bg-stone-900 hover:border-emerald-700/70'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>{tr('Saving...', 'Salvataggio in corso...')}</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>{tr('Save Error — Click to retry', 'Errore salvataggio — Clicca per riprovare')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {lastSavedTime
                      ? tr(`Saved (${lastSavedTime})`, `Salvato (${lastSavedTime})`)
                      : tr('Saved', 'Salvato')}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => onLaunchInstanceModal(currentAdventure)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              {tr(
                'Launch New Instance (Play with a Group)',
                'Avvia Nuova Istanza (Gioca con un Gruppo)'
              )}
            </button>
          </div>
        </div>

        {/* Editable Adventure Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t border-stone-800/80 text-xs">
          <div className="md:col-span-4">
            <label className="text-[10px] uppercase text-stone-400 font-bold">
              {tr('Story Title', 'Titolo Storia')}
            </label>
            <input
              type="text"
              value={currentAdventure.title}
              onChange={(e) => updateAdventure({ title: e.target.value })}
              className="w-full mt-0.5 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-100 font-bold"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-[10px] uppercase text-stone-400 font-bold">
              {tr('Subtitle', 'Sottotitolo')}
            </label>
            <input
              type="text"
              value={currentAdventure.subtitle}
              onChange={(e) => updateAdventure({ subtitle: e.target.value })}
              className="w-full mt-0.5 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-300"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase text-stone-400 font-bold">
              {tr('Type & Campaign', 'Tipo & Campagna')}
            </label>
            <select
              value={currentAdventure.campaignId || 'standalone'}
              onChange={(e) => {
                const val = e.target.value;
                updateAdventure({
                  type: val === 'standalone' ? 'oneshot' : 'campaign_module',
                  campaignId: val === 'standalone' ? undefined : val,
                });
              }}
              className="w-full mt-0.5 px-2 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200"
            >
              <option value="standalone">{tr('Standalone One-Shot', 'One-Shot Standalone')}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {tr('Campaign:', 'Campagna:')} {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase text-stone-400 font-bold">
              {tr('Recommended Level', 'Livello Consigliato')}
            </label>
            <input
              type="text"
              value={currentAdventure.levelRange}
              onChange={(e) => updateAdventure({ levelRange: e.target.value })}
              className="w-full mt-0.5 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200"
            />
          </div>
          <div className="md:col-span-1 flex items-end justify-end">
            {adventures.length > 1 && (
              <button
                onClick={() => onDeleteAdventure(currentAdventure.id)}
                title={tr('Delete this adventure', 'Elimina questa avventura')}
                className="p-2 rounded bg-stone-800 hover:bg-red-900/70 text-stone-400 hover:text-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left Scene Tree + Center/Right Editor & Homebrewery Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Structure (Scenes, Scene SFX, Scene NPCs, Scene Encounters) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Scene Tree */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-header text-sm font-bold text-amber-400 uppercase tracking-wider">
                {tr('Chapter / Scene Structure', 'Struttura Capitoli / Scene')}
              </span>
              <button
                onClick={handleAddScene}
                className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {tr('Scene', 'Scena')}
              </button>
            </div>

            <div className="space-y-1.5">
              {currentAdventure.scenes.map((scene, idx) => {
                const active = currentScene?.id === scene.id;
                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`cursor-pointer p-2.5 rounded-lg border transition flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-amber-950/40 border-amber-500/70 text-amber-200'
                        : 'bg-stone-950/70 border-stone-800/80 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-amber-500">
                        {scene.code} • {scene.estimatedMinutes} min
                      </div>
                      <div className="font-bold text-xs truncate">{scene.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
                        <span>🔊 {scene.linkedSfxIds.length} SFX</span>
                        <span>
                          ⚔️ {scene.encounters.length} {tr('Encounters', 'Incontri')}
                        </span>
                        <span>
                          👤 {scene.linkedCharacterIds.length} {tr('NPCs', 'PNG')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveScene(idx, -1)}
                        className="p-0.5 text-stone-500 hover:text-stone-200"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveScene(idx, 1)}
                        className="p-0.5 text-stone-500 hover:text-stone-200"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {currentAdventure.scenes.length > 1 && (
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-0.5 text-stone-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scene Quick-SFX Assignment */}
          {currentScene && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />{' '}
                {tr('SFX Assigned to This Scene', 'SFX Assegnati a Questa Scena')}
              </div>
              <p className="text-[11px] text-stone-400">
                {tr(
                  'Check the sound effects you want at your fingertips when running this scene:',
                  'Seleziona gli effetti che vuoi avere pronti a portata di mano quando giochi questa scena:'
                )}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-stone-950 p-2 rounded border border-stone-800">
                {sfxCatalog.map((sfx) => {
                  const checked = currentScene.linkedSfxIds.includes(sfx.id);
                  return (
                    <label
                      key={sfx.id}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-stone-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSceneSfx(sfx.id)}
                          className="accent-amber-500"
                        />
                        <span className={checked ? 'text-amber-200 font-semibold' : 'text-stone-400'}>
                          {sfx.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          insertSnippet(`@sfx[${sfx.id}] `);
                        }}
                        title={tr(
                          'Insert @sfx button into scene text',
                          'Inserisci pulsante @sfx nel testo della scena'
                        )}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 shrink-0"
                      >
                        {tr('+ Text', '+ Testo')}
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scene Encounters Preset Builder */}
          {currentScene && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />{' '}
                  {tr('Scene Encounters', 'Incontri della Scena')}
                </span>
                <button
                  onClick={() =>
                    setEditingEncounter({
                      id: `enc-${Date.now()}`,
                      name: tr('New Scene Encounter', 'Nuovo Incontro di Scena'),
                      difficulty: tr('Medium', 'Media') as EncounterPreset['difficulty'],
                      environment: currentScene.location,
                      description: tr(
                        'Describe the initial enemy deployment.',
                        'Descrivi lo schieramento iniziale dei nemici.'
                      ),
                      slots: monstersAndNpcs[0]
                        ? [{ characterId: monstersAndNpcs[0].id, count: 2 }]
                        : [],
                      autoSfxId: 'sfx-combat-drums',
                    })
                  }
                  className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-800 text-amber-100 font-bold text-[11px]"
                >
                  {tr('+ Encounter', '+ Incontro')}
                </button>
              </div>

              {currentScene.encounters.length === 0 ? (
                <p className="text-[11px] text-stone-500 italic">
                  {tr(
                    'No pre-planned encounters in this scene (you can still launch ad-hoc combat anytime during a session).',
                    'Nessun incontro pre-programmato in questa scena (puoi comunque avviare combattimenti al volo durante la sessione).'
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {currentScene.encounters.map((enc) => (
                    <div
                      key={enc.id}
                      className="p-2.5 rounded bg-stone-950 border border-stone-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-200">{enc.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-200">
                          {enc.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => insertSnippet(`\n@encounter[${enc.id}]\n`)}
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 text-[10px] font-semibold"
                        >
                          {tr('+ Insert in Page', '+ Inserisci nella Pagina')}
                        </button>
                        <button
                          onClick={() => setEditingEncounter(structuredClone(enc))}
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px]"
                        >
                          {tr('Edit', 'Modifica')}
                        </button>
                        <button
                          onClick={() =>
                            updateScene({
                              encounters: currentScene.encounters.filter((e) => e.id !== enc.id),
                            })
                          }
                          className="p-1 text-stone-500 hover:text-red-400 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scene Linked NPCs/Monsters */}
          {currentScene && (
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />{' '}
                {tr('Scene NPCs & Monsters', 'PNG & Mostri della Scena')}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-stone-950 p-2 rounded border border-stone-800">
                {monstersAndNpcs.map((ch) => {
                  const checked = currentScene.linkedCharacterIds.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-stone-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSceneChar(ch.id)}
                          className="accent-amber-500"
                        />
                        <span className={checked ? 'text-amber-200 font-semibold' : 'text-stone-400'}>
                          {ch.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          insertSnippet(`@npc[${ch.id}] `);
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 shrink-0"
                      >
                        + @npc
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 9 Columns: Homebrewery Editor & Live Preview */}
        {currentScene && (
          <div className="lg:col-span-9 space-y-3">
            {/* Scene Metadata & View Mode Switcher */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  type="text"
                  value={currentScene.code}
                  onChange={(e) => updateScene({ code: e.target.value })}
                  className="w-24 px-2 py-1 rounded bg-stone-950 border border-stone-800 text-amber-400 text-xs font-bold"
                />
                <input
                  type="text"
                  value={currentScene.title}
                  onChange={(e) => updateScene({ title: e.target.value })}
                  className="flex-1 min-w-[200px] px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-100 text-sm font-bold"
                />
                <input
                  type="text"
                  value={currentScene.location}
                  onChange={(e) => updateScene({ location: e.target.value })}
                  placeholder={tr('Location...', 'Luogo...')}
                  className="w-48 px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-300 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTwoColumns((v) => !v)}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 border transition ${
                    twoColumns
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                  title={tr(
                    'Toggle 2-column D&D rulebook layout',
                    'Attiva/Disattiva layout a 2 colonne stile manuale D&D'
                  )}
                >
                  <Columns className="w-3.5 h-3.5" /> {tr('2 Columns', '2 Colonne')}
                </button>

                <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
                  <button
                    onClick={() => setViewMode('editor')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                      viewMode === 'editor' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {tr('Source', 'Codice')}
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                      viewMode === 'split' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" /> Split Homebrewery
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                      viewMode === 'preview' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> {tr('Page Only', 'Solo Pagina')}
                  </button>
                </div>
              </div>
            </div>

            {/* Homebrewery Quick-Insert Toolbar */}
            {viewMode !== 'preview' && (
              <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-bold uppercase text-stone-400 mr-1">
                  {tr('D&D 5e Blocks:', 'Blocchi D&D 5e:')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      tr(
                        `\n:::read-aloud\nDescriptive text to read aloud to your players...\n:::\n`,
                        `\n:::read-aloud\nTesto descrittivo da leggere ad alta voce ai giocatori...\n:::\n`
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-200 font-semibold flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" /> {tr('+ Read-Aloud Box', '+ Box Read-Aloud')}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      tr(
                        `\n:::dm-note\n**Secret DM Note**: Behind-the-scenes info, Perception DCs, or tactics.\n:::\n`,
                        `\n:::dm-note\n**Nota Segreta DM**: Informazioni dietro le quinte, CD di Percezione o tattiche.\n:::\n`
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> {tr('+ DM Note Box', '+ Box Nota DM')}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      tr(
                        `\n| d6 | Event or Encounter | Effect |\n| :-: | :--- | :--- |\n| **1-3** | Guard patrol | 2x Skeletons |\n| **4-6** | Unnatural silence | Advantage on Stealth |\n`,
                        `\n| D6 | Evento o Incontro | Effetto |\n| :-: | :--- | :--- |\n| **1-3** | Pattuglia di guardia | 2x Scheletri |\n| **4-6** | Silenzio innaturale | Vantaggio a Furtività |\n`
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1"
                >
                  <Table className="w-3.5 h-3.5" /> {tr('+ 5e Table', '+ Tabella 5e')}
                </button>

                {/* Quick Insert @npc or @statblock */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    insertSnippet(e.target.value);
                    e.target.value = '';
                  }}
                  className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-amber-300"
                >
                  <option value="">
                    {tr('+ Insert NPC / Statblock...', '+ Inserisci PNG / Statblock...')}
                  </option>
                  {characters.map((c) => (
                    <React.Fragment key={c.id}>
                      <option value={`@npc[${c.id}] `}>
                        {tr('Inline Badge:', 'Badge Link:')} {c.name}
                      </option>
                      <option value={`\n@statblock[${c.id}]\n`}>
                        {tr('Full Statblock:', 'Statblock Completo:')} {c.name}
                      </option>
                    </React.Fragment>
                  ))}
                </select>

                {/* Quick Insert @sfx */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const sfxId = e.target.value;
                    if (!sfxId) return;
                    insertSnippet(`@sfx[${sfxId}] `);
                    if (!currentScene.linkedSfxIds.includes(sfxId)) {
                      toggleSceneSfx(sfxId);
                    }
                    e.target.value = '';
                  }}
                  className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-emerald-300"
                >
                  <option value="">
                    {tr('+ Insert @sfx Button...', '+ Inserisci Pulsante @sfx...')}
                  </option>
                  {sfxCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      🔊 {s.name} ({s.loop ? 'Loop' : 'SFX'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Editor & Preview Pane */}
            <div
              className={`grid gap-4 ${
                viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {viewMode !== 'preview' && (
                <div className="flex flex-col h-[72vh] bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                  <div className="px-3.5 py-2 bg-stone-900 border-b border-stone-800 text-[11px] font-mono text-stone-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>
                        {tr('Homebrewery Markdown Source', 'Sorgente Homebrewery Markdown')} (
                        {currentScene.code})
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          saveStatus === 'saving'
                            ? 'bg-amber-950/70 border border-amber-800/80 text-amber-300'
                            : saveStatus === 'error'
                            ? 'bg-red-950/70 border border-red-800/80 text-red-300'
                            : 'bg-emerald-950/50 border border-emerald-900/60 text-emerald-400'
                        }`}
                        title={
                          lastSaveInfo ||
                          tr(
                            'All changes automatically saved to disk',
                            'Tutte le modifiche sono salvate automaticamente su disco'
                          )
                        }
                      >
                        {saveStatus === 'saving' ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                            <span>{tr('Saving...', 'Salvataggio...')}</span>
                          </>
                        ) : saveStatus === 'error' ? (
                          <>
                            <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                            <span>{tr('Save error', 'Errore')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>
                              {lastSavedTime
                                ? tr(`Saved ${lastSavedTime}`, `Salvato ${lastSavedTime}`)
                                : tr('Saved', 'Salvato')}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <span>
                      {tr(
                        'Supports :::read-aloud, :::dm-note, @sfx[id], @npc[id], @encounter[id]',
                        'Supporta :::read-aloud, :::dm-note, @sfx[id], @npc[id], @encounter[id]'
                      )}
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={currentScene.homebreweryMarkdown}
                    onChange={(e) => updateScene({ homebreweryMarkdown: e.target.value })}
                    className="flex-1 w-full p-4 bg-stone-950 text-stone-100 font-mono text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              )}

              {viewMode !== 'editor' && (
                <div className="h-[72vh] overflow-y-auto pr-1">
                  <HomebreweryRenderer
                    markdown={currentScene.homebreweryMarkdown}
                    characters={characters}
                    sfxCatalog={sfxCatalog}
                    encounters={currentScene.encounters}
                    twoColumns={twoColumns}
                    onSelectCharacter={(ch) => setInspectedChar(ch)}
                    onStartEncounter={() => onLaunchInstanceModal(currentAdventure)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Character Quick Inspector Drawer/Modal */}
      {inspectedChar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setInspectedChar(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#58180D] text-amber-100 hover:bg-red-800 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <StatblockCard character={inspectedChar} />
          </div>
        </div>
      )}

      {/* Encounter Preset Builder Modal */}
      {editingEncounter && currentScene && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-header text-xl font-bold text-amber-400 flex items-center gap-2">
              <Swords className="w-5 h-5" />{' '}
              {tr('Configure Scene Encounter', 'Configura Incontro della Scena')}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Encounter Title', 'Titolo Incontro')}
                  </label>
                  <input
                    type="text"
                    value={editingEncounter.name}
                    onChange={(e) =>
                      setEditingEncounter({ ...editingEncounter, name: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Difficulty', 'Difficoltà')}
                  </label>
                  <select
                    value={editingEncounter.difficulty}
                    onChange={(e) =>
                      setEditingEncounter({
                        ...editingEncounter,
                        difficulty: e.target.value as EncounterPreset['difficulty'],
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-100"
                  >
                    <option value={tr('Easy', 'Facile')}>{tr('Easy', 'Facile')}</option>
                    <option value={tr('Medium', 'Media')}>{tr('Medium', 'Media')}</option>
                    <option value={tr('Hard', 'Difficile')}>{tr('Hard', 'Difficile')}</option>
                    <option value={tr('Deadly', 'Mortale')}>{tr('Deadly', 'Mortale')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Environment / Terrain', 'Ambiente / Terreno')}
                  </label>
                  <input
                    type="text"
                    value={editingEncounter.environment}
                    onChange={(e) =>
                      setEditingEncounter({ ...editingEncounter, environment: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Auto-Start SFX / Music (Optional)', 'SFX / Musica Auto-Avvio (Opzionale)')}
                  </label>
                  <select
                    value={editingEncounter.autoSfxId || ''}
                    onChange={(e) =>
                      setEditingEncounter({
                        ...editingEncounter,
                        autoSfxId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                  >
                    <option value="">{tr('No automatic audio', 'Nessun audio automatico')}</option>
                    {sfxCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Description & Initial Tactics', 'Descrizione & Tattica Iniziale')}
                </label>
                <input
                  type="text"
                  value={editingEncounter.description}
                  onChange={(e) =>
                    setEditingEncounter({ ...editingEncounter, description: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">
                    {tr('Creatures / Enemies in Encounter', 'Creature / Nemici nell’Incontro')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEncounter({
                        ...editingEncounter,
                        slots: [
                          ...editingEncounter.slots,
                          {
                            characterId: monstersAndNpcs[0]?.id || characters[0].id,
                            count: 1,
                          },
                        ],
                      })
                    }
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300"
                  >
                    {tr('+ Add Creature Group', '+ Aggiungi Gruppo Creature')}
                  </button>
                </div>

                {editingEncounter.slots.map((slot, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center gap-2 bg-stone-950 p-2 rounded border border-stone-800"
                  >
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={slot.count}
                      onChange={(e) => {
                        const next = [...editingEncounter.slots];
                        next[sIdx] = { ...slot, count: Math.max(1, Number(e.target.value)) };
                        setEditingEncounter({ ...editingEncounter, slots: next });
                      }}
                      className="w-16 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold text-center"
                    />
                    <select
                      value={slot.characterId}
                      onChange={(e) => {
                        const next = [...editingEncounter.slots];
                        next[sIdx] = { ...slot, characterId: e.target.value };
                        setEditingEncounter({ ...editingEncounter, slots: next });
                      }}
                      className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-100"
                    >
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.kind.toUpperCase()}] {c.name} ({c.levelOrCr} • {tr('AC', 'CA')}{' '}
                          {c.ac} • {tr('HP', 'PF')} {c.hpMax})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={slot.customLabel || ''}
                      onChange={(e) => {
                        const next = [...editingEncounter.slots];
                        next[sIdx] = { ...slot, customLabel: e.target.value };
                        setEditingEncounter({ ...editingEncounter, slots: next });
                      }}
                      placeholder={tr('Optional label', 'Etichetta opzionale')}
                      className="w-36 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editingEncounter.slots.filter((_, i) => i !== sIdx);
                        setEditingEncounter({ ...editingEncounter, slots: next });
                      }}
                      className="p-1 text-stone-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                onClick={() => setEditingEncounter(null)}
                className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 font-semibold"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={() => {
                  const exists = currentScene.encounters.some((e) => e.id === editingEncounter.id);
                  const nextEncs = exists
                    ? currentScene.encounters.map((e) =>
                        e.id === editingEncounter.id ? editingEncounter : e
                      )
                    : [...currentScene.encounters, editingEncounter];
                  const hasToken = currentScene.homebreweryMarkdown.includes(
                    `@encounter[${editingEncounter.id}]`
                  );
                  updateScene({
                    encounters: nextEncs,
                    homebreweryMarkdown: hasToken
                      ? currentScene.homebreweryMarkdown
                      : `${currentScene.homebreweryMarkdown}\n\n@encounter[${editingEncounter.id}]\n`,
                  });
                  setEditingEncounter(null);
                }}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
              >
                {tr('Save Encounter & Insert in Scene', 'Salva Incontro & Inserisci in Scena')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-header text-lg font-bold text-amber-400">
              {tr('Create New Sequential Campaign', 'Crea Nuova Campagna Sequenziale')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1">
                  {tr('Campaign Title', 'Titolo Campagna')}
                </label>
                <input
                  type="text"
                  value={newCampTitle}
                  onChange={(e) => setNewCampTitle(e.target.value)}
                  placeholder={tr('e.g. Tyranny of Dragons', 'es. La Tirannia dei Draghi')}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">
                  {tr('Setting', 'Ambientazione')}
                </label>
                <input
                  type="text"
                  value={newCampSetting}
                  onChange={(e) => setNewCampSetting(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">{tr('Synopsis', 'Sinossi')}</label>
                <textarea
                  rows={3}
                  value={newCampDesc}
                  onChange={(e) => setNewCampDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="px-3 py-1.5 rounded bg-stone-800 text-stone-300"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={() => {
                  if (!newCampTitle.trim()) return;
                  const camp: Campaign = {
                    id: `camp-${Date.now()}`,
                    title: newCampTitle.trim(),
                    setting: newCampSetting,
                    description: newCampDesc,
                    status: 'Active',
                    createdAt: new Date().toISOString(),
                  };
                  onSaveCampaign(camp);
                  updateAdventure({ type: 'campaign_module', campaignId: camp.id });
                  setNewCampTitle('');
                  setShowNewCampaignModal(false);
                }}
                className="px-4 py-1.5 rounded bg-amber-600 text-stone-950 font-bold"
              >
                {tr('Create Campaign', 'Crea Campagna')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
