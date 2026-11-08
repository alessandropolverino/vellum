import React, { useEffect, useRef, useState } from 'react';
import {
  AdventureBlueprint,
  AdventureScene,
  Asset,
  Campaign,
  CharacterEntity,
  EncounterPreset,
  SfxItem,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { useConfirmDelete } from './ConfirmDialog';
import { HomebreweryRenderer } from './HomebreweryRenderer';
import { StatblockCard } from './StatblockCard';
import { LabelChips, LabelEditor, LabelOption } from './Labels';
import { MentionBrowser, MentionPopup } from './MentionPicker';
import { collectLabels } from '../services/labels';
import {
  MentionItem,
  MentionKind,
  applyMention,
  buildMentionItems,
  filterMentionItems,
  findOpenMention,
} from '../services/mentions';
import { AssetPreviewCard } from './ShareToPlayersPanel';
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
  Image as ImageIcon,
} from 'lucide-react';

type DockTab = 'sfx' | 'npc' | 'asset' | 'encounter';
interface SlashEntry {
  id: string;
  label: string;
  snippet?: string;
  kind?: MentionKind;
}

interface AdventureStudioViewProps {
  adventures: AdventureBlueprint[];
  campaigns: Campaign[];
  characters: CharacterEntity[];
  sfxCatalog: SfxItem[];
  assets: Asset[];
  labelOptions?: LabelOption[];
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
  assets,
  labelOptions = [],
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
  const confirmDelete = useConfirmDelete();
  const currentAdventure =
    adventures.find((a) => a.id === selectedAdventureId) || adventures[0];

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    currentAdventure?.scenes[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'editor'>('split');
  const [twoColumns, setTwoColumns] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [dockTab, setDockTab] = useState<DockTab>('sfx');
  const [sceneOnly, setSceneOnly] = useState(false);
  const [caret, setCaret] = useState(-1);
  const [pickIdx, setPickIdx] = useState(0);
  const [slash, setSlash] = useState<{ start: number } | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [mentionLabels, setMentionLabels] = useState<string[]>([]);
  const [inspectedChar, setInspectedChar] = useState<CharacterEntity | null>(null);
  const [inspectedAsset, setInspectedAsset] = useState<Asset | null>(null);
  const [editingEncounter, setEditingEncounter] = useState<EncounterPreset | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampSetting, setNewCampSetting] = useState('Forgotten Realms');
  const [newCampDesc, setNewCampDesc] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCaret(-1);
    setSlash(null);
    setDismissedAt(null);
    setMentionLabels([]);
  }, [selectedSceneId]);

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentAdventure) onSaveAdventure(currentAdventure);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAdventure, onSaveAdventure]);


  if (!currentAdventure) {
    return (
      <div className="rounded-xl border border-dashed border-stone-800 p-10 text-center space-y-3">
        <div className="font-header text-lg font-bold text-stone-200">
          {tr('Write your first story', 'Scrivi la tua prima storia')}
        </div>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          {tr(
            'Stories are written in Homebrewery style, scene by scene, and can be played with any group.',
            'Le storie si scrivono in stile Homebrewery, scena per scena, e si possono giocare con qualsiasi gruppo.'
          )}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleCreateAdventure('oneshot')}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {tr('New one-shot', 'Nuova one-shot')}
          </button>
          <button
            onClick={() => handleCreateAdventure('campaign_module')}
            className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4" /> {tr('New campaign chapter', 'Nuovo capitolo di campagna')}
          </button>
        </div>
      </div>
    );
  }

  const currentScene =
    currentAdventure.scenes.find((s) => s.id === selectedSceneId) ||
    currentAdventure.scenes[0];

  const saveBadge = (
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
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition select-none cursor-pointer hover:bg-stone-900 ${
        saveStatus === 'error' ? 'text-red-300' : 'text-stone-400'
      }`}
    >
      {saveStatus === 'saving' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{tr('Saving…', 'Salvataggio…')}</span>
        </>
      ) : saveStatus === 'error' ? (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{tr('Save error — retry', 'Errore — riprova')}</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {lastSavedTime ? tr(`Saved ${lastSavedTime}`, `Salvato ${lastSavedTime}`) : tr('Saved', 'Salvato')}
          </span>
        </>
      )}
    </button>
  );

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

  const insertSnippet = (snippet: string, patch: Partial<AdventureScene> = {}) => {
    if (!currentScene) return;
    const el = textareaRef.current;
    const currentText = currentScene.homebreweryMarkdown;
    if (!el) {
      updateScene({ homebreweryMarkdown: `${currentText}\n\n${snippet}`, ...patch });
      return;
    }
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const nextText =
      currentText.slice(0, start) + snippet + currentText.slice(end);
    updateScene({ homebreweryMarkdown: nextText, ...patch });
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

  const snippets = {
    readAloud: tr(
      `\n:::read-aloud\nDescriptive text to read aloud to your players...\n:::\n`,
      `\n:::read-aloud\nTesto descrittivo da leggere ad alta voce ai giocatori...\n:::\n`
    ),
    dmNote: tr(
      `\n:::dm-note\n**Secret DM Note**: Behind-the-scenes info, Perception DCs, or tactics.\n:::\n`,
      `\n:::dm-note\n**Nota Segreta DM**: Informazioni dietro le quinte, CD di Percezione o tattiche.\n:::\n`
    ),
    table: tr(
      `\n| d6 | Event or Encounter | Effect |\n| :-: | :--- | :--- |\n| **1-3** | Guard patrol | 2x Skeletons |\n| **4-6** | Unnatural silence | Advantage on Stealth |\n`,
      `\n| D6 | Evento o Incontro | Effetto |\n| :-: | :--- | :--- |\n| **1-3** | Pattuglia di guardia | 2x Scheletri |\n| **4-6** | Silenzio innaturale | Vantaggio a Furtività |\n`
    ),
  };

  // --- @type[...] picker and "/" menu -------------------------------------------------------
  const sceneText = currentScene?.homebreweryMarkdown ?? '';
  const mentionSources = {
    characters,
    sfxCatalog,
    assets,
    encounters: currentScene?.encounters ?? [],
  };
  const openMention = caret >= 0 ? findOpenMention(sceneText, caret) : null;
  const activeMention = openMention && openMention.start !== dismissedAt ? openMention : null;
  const mentionItems = activeMention ? buildMentionItems(activeMention.kind, mentionSources) : [];
  const mentionShown = activeMention
    ? filterMentionItems(mentionItems, activeMention.query, mentionLabels)
    : [];

  const slashEntries: SlashEntry[] = [
    { id: 'read-aloud', label: tr('Read-aloud box', 'Box Read-Aloud'), snippet: snippets.readAloud },
    { id: 'dm-note', label: tr('DM note box', 'Box Nota DM'), snippet: snippets.dmNote },
    { id: 'table', label: tr('5e table', 'Tabella 5e'), snippet: snippets.table },
    { id: 'npc', label: tr('NPC / monster…', 'PNG / mostro…'), kind: 'npc' },
    { id: 'statblock', label: tr('Full statblock…', 'Statblock completo…'), kind: 'statblock' },
    { id: 'sfx', label: tr('Sound button…', 'Pulsante suono…'), kind: 'sfx' },
    { id: 'asset', label: tr('Asset image…', 'Immagine asset…'), kind: 'asset' },
    { id: 'encounter', label: tr('Encounter…', 'Incontro…'), kind: 'encounter' },
  ];
  const slashValid =
    slash !== null &&
    caret > slash.start &&
    sceneText[slash.start] === '/' &&
    !/\s/.test(sceneText.slice(slash.start + 1, caret));
  const slashQuery = slashValid ? sceneText.slice(slash.start + 1, caret).toLowerCase() : '';
  const slashShown = slashValid
    ? slashEntries.filter((e) => e.label.toLowerCase().includes(slashQuery) || e.id.includes(slashQuery))
    : [];

  const focusAt = (pos: number) =>
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    }, 20);

  const writeText = (text: string, pos: number, patch: Partial<AdventureScene> = {}) => {
    updateScene({ homebreweryMarkdown: text, ...patch });
    setCaret(pos);
    setPickIdx(0);
    focusAt(pos);
  };

  const pinSfxPatch = (item: MentionItem): Partial<AdventureScene> =>
    item.kind === 'sfx' && currentScene && !currentScene.linkedSfxIds.includes(item.id)
      ? { linkedSfxIds: [...currentScene.linkedSfxIds, item.id] }
      : {};

  const pickMention = (item: MentionItem) => {
    if (!activeMention) return;
    const r = applyMention(sceneText, activeMention, item.ref);
    writeText(r.text, r.caret, pinSfxPatch(item));
    setMentionLabels([]);
  };

  /** Insert from the dock: at the caret, with the same token the picker would write. */
  const insertMention = (item: MentionItem) => {
    const block = item.kind === 'statblock' || item.kind === 'encounter';
    insertSnippet(block ? `\n@${item.kind}[${item.ref}]\n` : `@${item.kind}[${item.ref}] `, pinSfxPatch(item));
  };

  const applySlash = (entry: SlashEntry) => {
    if (!slash) return;
    const start = slash.start;
    const before = sceneText.slice(0, start);
    const after = sceneText.slice(caret);
    setSlash(null);
    if (entry.snippet) {
      writeText(before + entry.snippet + after, start + entry.snippet.length);
    } else if (entry.kind) {
      // Leave the caret inside the brackets so the picker opens right away.
      writeText(`${before}@${entry.kind}[]${after}`, start + entry.kind.length + 2);
    }
  };

  const openSlashMenu = () => {
    const el = textareaRef.current;
    if (!el || !currentScene) return;
    const pos = el.selectionStart ?? sceneText.length;
    const end = el.selectionEnd ?? pos;
    updateScene({ homebreweryMarkdown: `${sceneText.slice(0, pos)}/${sceneText.slice(end)}` });
    setSlash({ start: pos });
    setCaret(pos + 1);
    setPickIdx(0);
    focusAt(pos + 1);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    updateScene({ homebreweryMarkdown: value });
    setCaret(pos);
    setPickIdx(0);
    const typedSlash =
      (e.nativeEvent as InputEvent).inputType === 'insertText' &&
      value[pos - 1] === '/' &&
      (pos === 1 || value[pos - 2] === '\n');
    if (typedSlash) setSlash({ start: pos - 1 });
    if (mentionLabels.length > 0 && !findOpenMention(value, pos)) setMentionLabels([]);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const count = activeMention ? mentionShown.length : slashValid ? slashShown.length : -1;
    if (count < 0) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (activeMention) setDismissedAt(activeMention.start);
      else setSlash(null);
      return;
    }
    if (count === 0) return;
    const idx = Math.min(pickIdx, count - 1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPickIdx(Math.min(idx + 1, count - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPickIdx(Math.max(idx - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (activeMention) pickMention(mentionShown[idx]);
      else applySlash(slashShown[idx]);
    }
  };

  // --- Resource dock ------------------------------------------------------------------------
  const dockTabs = [
    ['sfx', tr('Sounds', 'Suoni'), Volume2],
    ['npc', tr('NPCs', 'PNG'), UserCheck],
    ['asset', tr('Assets', 'Asset'), ImageIcon],
    ['encounter', tr('Encounters', 'Incontri'), Swords],
  ] as const;
  const isPinned = (it: MentionItem) =>
    !!currentScene &&
    (it.kind === 'sfx'
      ? currentScene.linkedSfxIds.includes(it.id)
      : currentScene.linkedCharacterIds.includes(it.id));
  const allDockItems = buildMentionItems(dockTab, mentionSources);
  const dockItems =
    sceneOnly && (dockTab === 'sfx' || dockTab === 'npc') ? allDockItems.filter(isPinned) : allDockItems;
  const dockChips =
    dockTab === 'sfx' || dockTab === 'npc'
      ? allDockItems.filter(isPinned)
      : dockTab === 'encounter'
        ? allDockItems
        : [];

  const startNewEncounter = () => {
    if (!currentScene) return;
    setEditingEncounter({
      id: `enc-${Date.now()}`,
      name: tr('New Scene Encounter', 'Nuovo Incontro di Scena'),
      difficulty: tr('Medium', 'Media') as EncounterPreset['difficulty'],
      environment: currentScene.location,
      description: tr('Describe the initial enemy deployment.', 'Descrivi lo schieramento iniziale dei nemici.'),
      slots: monstersAndNpcs[0] ? [{ characterId: monstersAndNpcs[0].id, count: 2 }] : [],
      autoSfxId: 'sfx-combat-drums',
    });
  };

  return (
    <div className="space-y-4">
      {/* Adventure bar: picker, one New menu, details on demand */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentAdventure.id}
              onChange={(e) => {
                const nextId = e.target.value;
                onSelectAdventure(nextId);
                const found = adventures.find((a) => a.id === nextId);
                if (found?.scenes[0]) setSelectedSceneId(found.scenes[0].id);
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 font-header font-bold text-sm"
            >
              {adventures.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <button
                onClick={() => setNewMenuOpen((o) => !o)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {tr('New', 'Nuova')} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {newMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNewMenuOpen(false)} />
                  <div className="absolute left-0 mt-1 z-40 w-56 rounded-xl border border-stone-700 bg-stone-900 shadow-xl py-1 text-xs">
                    {(
                      [
                        [tr('One-shot', 'One-shot'), () => handleCreateAdventure('oneshot')],
                        [tr('Campaign chapter', 'Capitolo di campagna'), () => handleCreateAdventure('campaign_module')],
                        [tr('Parent campaign', 'Campagna madre'), () => setShowNewCampaignModal(true)],
                      ] as const
                    ).map(([label, action]) => (
                      <button
                        key={label}
                        onClick={() => {
                          setNewMenuOpen(false);
                          action();
                        }}
                        className="w-full px-3 py-2 text-left text-stone-200 hover:bg-stone-800 cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowDetails((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                showDetails ? 'bg-stone-800 text-amber-300' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              {tr('Details', 'Dettagli')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {saveBadge}
            <button
              onClick={async () => {
                if (await confirmDelete(tr(`the adventure “${currentAdventure.title}”`, `l’avventura “${currentAdventure.title}”`), tr('All its scenes, blocks and encounters will be lost. This cannot be undone.', 'Tutte le sue scene, blocchi e incontri andranno persi. Non si può annullare.'))) onDeleteAdventure(currentAdventure.id);
              }}
              title={tr('Delete this adventure', 'Elimina questa avventura')}
              className="p-2 rounded-lg hover:bg-stone-900 text-stone-500 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onLaunchInstanceModal(currentAdventure)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> {tr('Play with a group', 'Gioca con un gruppo')}
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 text-xs">
            <div className="md:col-span-5">
              <label className="text-[11px] text-stone-500">
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
              <label className="text-[11px] text-stone-500">
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
              <label className="text-[11px] text-stone-500">
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
              <label className="text-[11px] text-stone-500">
                {tr('Recommended Level', 'Livello Consigliato')}
              </label>
              <input
                type="text"
                value={currentAdventure.levelRange}
                onChange={(e) => updateAdventure({ levelRange: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200"
              />
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Main studio: scene rail | editor + preview | resource dock */}
      {currentScene && (
        <div className="flex gap-3 h-[calc(100vh-11rem)] min-h-[32rem]">
          {/* Scene rail: numbers only, expands on hover */}
          <div className="relative w-14 shrink-0">
            <div className="absolute inset-y-0 left-0 z-30 w-14 hover:w-72 transition-[width] duration-150 overflow-hidden rounded-xl border border-stone-800 bg-stone-900 shadow-xl p-1.5 flex flex-col gap-1">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1">
                {currentAdventure.scenes.map((scene, idx) => {
                  const active = currentScene.id === scene.id;
                  return (
                    <div
                      key={scene.id}
                      onClick={() => setSelectedSceneId(scene.id)}
                      title={scene.title}
                      className={`cursor-pointer flex items-center gap-2 p-1 rounded-lg border transition ${
                        active
                          ? 'bg-stone-800 border-amber-500/60'
                          : 'border-transparent hover:bg-stone-800/70'
                      }`}
                    >
                      <div
                        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          active ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-amber-300'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-stone-500 whitespace-nowrap">
                          {scene.code} • {scene.estimatedMinutes} min • {scene.linkedSfxIds.length} SFX •{' '}
                          {scene.encounters.length} {tr('enc.', 'inc.')}
                        </div>
                        <div className="font-bold text-xs truncate text-stone-100">{scene.title}</div>
                      </div>
                      <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveScene(idx, -1)}
                          className="p-1 text-stone-500 hover:text-stone-200"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveScene(idx, 1)}
                          className="p-1 text-stone-500 hover:text-stone-200"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {currentAdventure.scenes.length > 1 && (
                          <button
                            onClick={async () => {
                              if (
                                await confirmDelete(
                                  tr(`the scene “${scene.title}”`, `la scena “${scene.title}”`),
                                  tr(
                                    'Its text, encounters and sounds will be lost.',
                                    'Testo, incontri e suoni andranno persi.'
                                  )
                                )
                              )
                                handleDeleteScene(scene.id);
                            }}
                            className="p-1 text-stone-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleAddScene}
                title={tr('Add scene', 'Aggiungi scena')}
                className="flex items-center gap-2 p-1 rounded-lg text-stone-300 hover:bg-stone-800 whitespace-nowrap"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg border border-dashed border-stone-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </span>
                <span className="text-xs">{tr('New scene', 'Nuova scena')}</span>
              </button>
            </div>
          </div>

          {/* Editor column */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Scene header and view switcher */}
            <div className="flex flex-wrap items-center gap-2">
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
                className="flex-1 min-w-[12rem] px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-100 text-sm font-bold"
              />
              <input
                type="text"
                value={currentScene.location}
                onChange={(e) => updateScene({ location: e.target.value })}
                placeholder={tr('Location...', 'Luogo...')}
                className="w-40 px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-stone-300 text-xs"
              />
              <button
                onClick={() => setTwoColumns((v) => !v)}
                className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 border transition ${
                  twoColumns
                    ? 'bg-stone-800 border-stone-600 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}
                title={tr(
                  'Toggle 2-column D&D rulebook layout',
                  'Attiva/Disattiva layout a 2 colonne stile manuale D&D'
                )}
              >
                <Columns className="w-3.5 h-3.5" /> {tr('2 cols', '2 col.')}
              </button>
              <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
                {(
                  [
                    ['editor', <Edit3 key="e" className="w-3.5 h-3.5" />, tr('Source', 'Codice')],
                    ['split', <Columns key="s" className="w-3.5 h-3.5" />, 'Split'],
                    ['preview', <Eye key="p" className="w-3.5 h-3.5" />, tr('Page', 'Pagina')],
                  ] as const
                ).map(([mode, icon, label]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 ${
                      viewMode === mode ? 'bg-stone-800 text-amber-300 font-semibold' : 'text-stone-400'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor & preview */}
            <div
              className={`flex-1 min-h-0 grid gap-3 ${
                viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {viewMode !== 'preview' && (
                <div className="relative min-h-0 flex flex-col bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                  {/* Floating insert bar */}
                  <div className="absolute right-3 top-2 z-10 flex items-center gap-1 rounded-lg border border-amber-500/30 bg-stone-900/95 p-1 shadow-lg opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => insertSnippet(snippets.readAloud)}
                      title={tr('Read-aloud box', 'Box Read-Aloud')}
                      className="p-1.5 rounded hover:bg-stone-800 text-stone-300"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet(snippets.dmNote)}
                      title={tr('DM note box', 'Box Nota DM')}
                      className="p-1.5 rounded hover:bg-stone-800 text-stone-300"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet(snippets.table)}
                      title={tr('5e table', 'Tabella 5e')}
                      className="p-1.5 rounded hover:bg-stone-800 text-stone-300"
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={openSlashMenu}
                      title={tr('Insert… (or type / at the start of a line)', 'Inserisci… (o scrivi / a inizio riga)')}
                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold"
                    >
                      / {tr('Insert', 'Inserisci')}
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={currentScene.homebreweryMarkdown}
                    onChange={handleEditorChange}
                    onKeyDown={handleEditorKeyDown}
                    onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                    onClick={(e) => setCaret(e.currentTarget.selectionStart)}
                    onBlur={() => setCaret(-1)}
                    placeholder={tr(
                      'Write here… type / at the start of a line to insert, or @npc[ to pick a character.',
                      'Scrivi qui… digita / a inizio riga per inserire, o @npc[ per scegliere un personaggio.'
                    )}
                    className="flex-1 w-full px-4 pt-12 pb-4 bg-stone-950 text-stone-100 font-mono text-xs leading-relaxed focus:outline-none resize-none"
                  />

                  {activeMention && (
                    <MentionPopup
                      kind={activeMention.kind}
                      items={mentionItems}
                      query={activeMention.query}
                      activeIndex={Math.min(pickIdx, Math.max(mentionShown.length - 1, 0))}
                      labels={mentionLabels}
                      onToggleLabel={(l) =>
                        setMentionLabels((cur) =>
                          cur.some((x) => x.toLowerCase() === l.toLowerCase())
                            ? cur.filter((x) => x.toLowerCase() !== l.toLowerCase())
                            : [...cur, l]
                        )
                      }
                      onPick={pickMention}
                    />
                  )}

                  {!activeMention && slashValid && (
                    <div
                      className="absolute left-3 bottom-3 z-20 w-72 rounded-xl border border-amber-500/40 bg-stone-900 shadow-2xl text-xs p-1"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {slashShown.length === 0 && (
                        <div className="px-2 py-2 text-stone-500">{tr('Nothing matches.', 'Nessun risultato.')}</div>
                      )}
                      {slashShown.map((entry, i) => (
                        <div
                          key={entry.id}
                          onClick={() => applySlash(entry)}
                          className={`px-2.5 py-1.5 rounded cursor-pointer text-stone-200 ${
                            i === Math.min(pickIdx, slashShown.length - 1) ? 'bg-stone-700/80' : 'hover:bg-stone-800'
                          }`}
                        >
                          {entry.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {viewMode !== 'editor' && (
                <div className="min-h-0 overflow-y-auto pr-1">
                  <HomebreweryRenderer
                    markdown={currentScene.homebreweryMarkdown}
                    characters={characters}
                    sfxCatalog={sfxCatalog}
                    assets={assets}
                    onSelectAsset={(a) => setInspectedAsset(a)}
                    encounters={currentScene.encounters}
                    twoColumns={twoColumns}
                    onSelectCharacter={(ch) => setInspectedChar(ch)}
                    onStartEncounter={() => onLaunchInstanceModal(currentAdventure)}
                  />
                </div>
              )}
            </div>

            {/* Resource dock */}
            <div
              className={`shrink-0 rounded-xl border border-stone-800 bg-stone-900/90 flex flex-col text-xs ${
                dockOpen ? 'h-72' : ''
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="font-header text-xs font-bold text-amber-400 uppercase tracking-wider shrink-0">
                  {tr('Resources', 'Risorse')}
                </span>
                {dockTabs.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setDockTab(id)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition ${
                      dockTab === id
                        ? 'bg-stone-800 text-amber-300 font-semibold'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
                {!dockOpen && (
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                    <span className="text-stone-600 shrink-0">{tr('insert:', 'inserisci:')}</span>
                    {dockChips.length === 0 ? (
                      <span className="text-stone-600 truncate">
                        {tr(
                          'nothing pinned to this scene — expand to search',
                          'niente di fissato in questa scena — espandi per cercare'
                        )}
                      </span>
                    ) : (
                      dockChips.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => insertMention(it)}
                          className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800 hover:border-amber-500/60 text-stone-300 whitespace-nowrap truncate max-w-[10rem] cursor-pointer"
                        >
                          {it.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button
                  onClick={() => setDockOpen((v) => !v)}
                  className="ml-auto px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  {dockOpen ? tr('Collapse', 'Comprimi') : tr('Search & expand', 'Cerca ed espandi')}
                </button>
              </div>
              {dockOpen && (
                <div className="flex-1 min-h-0 px-3 pb-3">
                  <MentionBrowser
                    key={dockTab}
                    items={dockItems}
                    labelOptions={collectLabels(dockItems)}
                    onPick={insertMention}
                    toolbarExtra={
                      dockTab === 'encounter' ? (
                        <button
                          onClick={startNewEncounter}
                          className="px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-amber-100 font-bold"
                        >
                          {tr('+ Encounter', '+ Incontro')}
                        </button>
                      ) : dockTab === 'asset' ? null : (
                        <label className="flex items-center gap-1.5 text-stone-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sceneOnly}
                            onChange={(e) => setSceneOnly(e.target.checked)}
                            className="accent-amber-500"
                          />
                          {tr('This scene only', 'Solo questa scena')}
                        </label>
                      )
                    }
                    rowExtra={(it) =>
                      dockTab === 'encounter' ? (
                        <>
                          <button
                            onClick={() => {
                              const enc = currentScene.encounters.find((e) => e.id === it.id);
                              if (enc) setEditingEncounter(structuredClone(enc));
                            }}
                            className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px]"
                          >
                            {tr('Edit', 'Modifica')}
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirmDelete(tr(`the encounter “${it.name}”`, `l’incontro “${it.name}”`)))
                                updateScene({
                                  encounters: currentScene.encounters.filter((e) => e.id !== it.id),
                                });
                            }}
                            className="p-1 text-stone-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : dockTab === 'asset' ? null : (
                        <>
                          {dockTab === 'npc' && (
                            <button
                              onClick={() => insertSnippet(`\n@statblock[${it.id}]\n`)}
                              title={tr('Insert the full statblock', 'Inserisci lo statblock completo')}
                              className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 text-[10px]"
                            >
                              Statblock
                            </button>
                          )}
                          <label
                            className="flex items-center gap-1 text-[10px] text-stone-400 cursor-pointer"
                            title={tr('Pin to this scene', 'Fissa in questa scena')}
                          >
                            <input
                              type="checkbox"
                              checked={isPinned(it)}
                              onChange={() => (dockTab === 'sfx' ? toggleSceneSfx(it.id) : toggleSceneChar(it.id))}
                              className="accent-amber-500"
                            />
                            {tr('scene', 'scena')}
                          </label>
                        </>
                      )
                    }
                    emptyText={
                      dockTab === 'encounter'
                        ? tr(
                            'No pre-planned encounters in this scene (you can still launch ad-hoc combat anytime during a session).',
                            'Nessun incontro pre-programmato in questa scena (puoi comunque avviare combattimenti al volo durante la sessione).'
                          )
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {inspectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setInspectedAsset(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#58180D] text-amber-100 hover:bg-red-800 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <AssetPreviewCard asset={inspectedAsset} />
          </div>
        </div>
      )}

      {/* Encounter Preset Builder Modal */}
      {editingEncounter && currentScene && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl text-xs">
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

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Labels', 'Etichette')}
                </label>
                <LabelEditor
                  value={editingEncounter.tags ?? []}
                  suggestions={labelOptions}
                  onChange={(tags) => setEditingEncounter({ ...editingEncounter, tags })}
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
                    className="flex flex-wrap items-center gap-2 bg-stone-950 p-2 rounded border border-stone-800"
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
                      className="w-16 shrink-0 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold text-center"
                    />
                    <select
                      value={slot.characterId}
                      onChange={(e) => {
                        const next = [...editingEncounter.slots];
                        next[sIdx] = { ...slot, characterId: e.target.value };
                        setEditingEncounter({ ...editingEncounter, slots: next });
                      }}
                      className="flex-1 min-w-0 basis-48 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-100 truncate"
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
                      className="w-36 min-w-0 flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300"
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
                className="px-4 py-1.5 rounded bg-stone-800 text-amber-300 font-semibold"
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
