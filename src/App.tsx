import React, { useEffect, useRef, useState } from 'react';
import {
  AdventureBlueprint,
  Campaign,
  CharacterEntity,
  DndDatabase,
  PartyGroup,
  PlayInstance,
  SfxItem,
} from './types/dnd';
import { SEED_DATABASE, getSeedDatabase } from './data/seedData';
import { storageRepository } from './services/storageRepository';
import { soundboardEngine } from './services/audioEngine';
import { useLanguage } from './i18n/LanguageContext';
import { DashboardView } from './components/DashboardView';
import { AdventureStudioView } from './components/AdventureStudioView';
import { LiveSessionConsole } from './components/LiveSessionConsole';
import { CharactersView } from './components/CharactersView';
import { SfxManagerView } from './components/SfxManagerView';
import { DataBackupModal } from './components/DataBackupModal';
import {
  BookOpen,
  Compass,
  Users,
  Volume2,
  VolumeX,
  Flame,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Dice5,
  Plus,
  X,
  RotateCcw,
  Globe,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'studio' | 'console' | 'characters' | 'sfx';

export const App: React.FC = () => {
  const { lang, setLang, tr } = useLanguage();
  const [db, setDb] = useState<DndDatabase>(SEED_DATABASE);
  const [storageSource, setStorageSource] = useState<string>('Loading...');
  const [lastSaveInfo, setLastSaveInfo] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const pendingSavesRef = useRef<number>(0);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(
    SEED_DATABASE.adventures[0]?.id || ''
  );
  const [activeInstanceId, setActiveInstanceId] = useState<string>(
    SEED_DATABASE.playInstances[0]?.id || ''
  );

  // New Instance Launcher Modal
  const [newInstanceAdventure, setNewInstanceAdventure] =
    useState<AdventureBlueprint | null>(null);
  const [newInstName, setNewInstName] = useState('');
  const [newInstPartyId, setNewInstPartyId] = useState('');

  // Quick Dice Roller in bottom bar
  const [diceResult, setDiceResult] = useState<string | null>(null);
  const [, setAudioTick] = useState(0);

  useEffect(() => {
    storageRepository.loadDatabase().then(({ db: loaded, source }) => {
      setDb(loaded);
      setStorageSource(source);
      if (loaded.lastSavedAt) {
        setLastSavedTime(new Date(loaded.lastSavedAt).toLocaleTimeString(lang === 'it' ? 'it-IT' : 'en-US'));
      }
      if (loaded.adventures[0]) setSelectedAdventureId(loaded.adventures[0].id);
      if (loaded.playInstances[0]) setActiveInstanceId(loaded.playInstances[0].id);
    });
  }, []);

  useEffect(() => {
    return soundboardEngine.subscribe(() => setAudioTick((t) => t + 1));
  }, []);

  const persistDb = (nextDb: DndDatabase) => {
    setDb(nextDb);
    setSaveStatus('saving');
    pendingSavesRef.current += 1;
    storageRepository.saveDatabase(nextDb).then((res) => {
      const adapterLabel =
        res.adapter === 'tauri-fs'
          ? 'Tauri FS'
          : res.adapter === 'local-disk-api'
          ? './data/dnd5e-db.json'
          : tr('Local Storage', 'Storage Locale');
      const timeLabel = new Date(res.savedAt).toLocaleTimeString(
        lang === 'it' ? 'it-IT' : 'en-US'
      );
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      if (pendingSavesRef.current === 0) {
        setSaveStatus('saved');
      }
      setLastSavedTime(timeLabel);
      setLastSaveInfo(
        `${tr('Saved to', 'Salvato su')} ${adapterLabel} (${timeLabel})`
      );
    }).catch((err) => {
      console.error('Failed to save database:', err);
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      setSaveStatus('error');
    });
  };

  // Upsert / Delete handlers
  const handleSaveAdventure = (adv: AdventureBlueprint) => {
    const exists = db.adventures.some((a) => a.id === adv.id);
    const nextAdventures = exists
      ? db.adventures.map((a) => (a.id === adv.id ? adv : a))
      : [...db.adventures, adv];
    persistDb({ ...db, adventures: nextAdventures });
  };

  const handleDeleteAdventure = (id: string) => {
    const nextAdventures = db.adventures.filter((a) => a.id !== id);
    persistDb({ ...db, adventures: nextAdventures });
    if (nextAdventures[0]) setSelectedAdventureId(nextAdventures[0].id);
  };

  const handleSaveCampaign = (camp: Campaign) => {
    const exists = db.campaigns.some((c) => c.id === camp.id);
    const nextCampaigns = exists
      ? db.campaigns.map((c) => (c.id === camp.id ? camp : c))
      : [...db.campaigns, camp];
    persistDb({ ...db, campaigns: nextCampaigns });
  };

  const handleSaveCharacter = (char: CharacterEntity) => {
    const exists = db.characters.some((c) => c.id === char.id);
    const nextChars = exists
      ? db.characters.map((c) => (c.id === char.id ? char : c))
      : [...db.characters, char];
    persistDb({ ...db, characters: nextChars });
  };

  const handleDeleteCharacter = (id: string) => {
    persistDb({
      ...db,
      characters: db.characters.filter((c) => c.id !== id),
    });
  };

  const handleSaveParty = (party: PartyGroup) => {
    const exists = db.parties.some((p) => p.id === party.id);
    const nextParties = exists
      ? db.parties.map((p) => (p.id === party.id ? party : p))
      : [...db.parties, party];
    persistDb({ ...db, parties: nextParties });
  };

  const handleDeleteParty = (id: string) => {
    persistDb({
      ...db,
      parties: db.parties.filter((p) => p.id !== id),
    });
  };

  const handleSaveSfx = (item: SfxItem) => {
    const exists = db.sfxCatalog.some((s) => s.id === item.id);
    const nextSfx = exists
      ? db.sfxCatalog.map((s) => (s.id === item.id ? item : s))
      : [...db.sfxCatalog, item];
    persistDb({ ...db, sfxCatalog: nextSfx });
  };

  const handleDeleteSfx = (id: string) => {
    soundboardEngine.stop(id);
    persistDb({
      ...db,
      sfxCatalog: db.sfxCatalog.filter((s) => s.id !== id),
    });
  };

  const handleSaveInstance = (inst: PlayInstance) => {
    const exists = db.playInstances.some((i) => i.id === inst.id);
    const nextInstances = exists
      ? db.playInstances.map((i) => (i.id === inst.id ? inst : i))
      : [inst, ...db.playInstances];
    persistDb({ ...db, playInstances: nextInstances });
  };

  const handleDeleteInstance = (id: string) => {
    const nextInstances = db.playInstances.filter((i) => i.id !== id);
    persistDb({ ...db, playInstances: nextInstances });
    if (nextInstances[0]) setActiveInstanceId(nextInstances[0].id);
  };

  const openLaunchInstanceModal = (adv?: AdventureBlueprint) => {
    const targetAdv = adv || db.adventures[0];
    if (!targetAdv) return;
    const defaultParty = db.parties[0];
    setNewInstanceAdventure(targetAdv);
    setNewInstPartyId(defaultParty?.id || '__custom_empty__');
    const countForAdv =
      db.playInstances.filter((i) => i.adventureId === targetAdv.id).length + 1;
    setNewInstName(
      `Run #${countForAdv} — ${defaultParty?.name || tr('Custom Group', 'Gruppo Personalizzato')}`
    );
  };

  const handleCreateNewInstance = () => {
    if (!newInstanceAdventure) return;
    const chosenParty =
      newInstPartyId === '__custom_empty__'
        ? undefined
        : db.parties.find((p) => p.id === newInstPartyId);
    const partyCharIds =
      newInstPartyId === '__custom_empty__'
        ? []
        : chosenParty?.memberCharacterIds ||
          db.characters.filter((c) => c.kind === 'pc' && !c.isPreGenBlueprint).map((c) => c.id);

    const pcStatus: PlayInstance['pcStatus'] = {};
    partyCharIds.forEach((pcId) => {
      const ch = db.characters.find((c) => c.id === pcId);
      if (ch) {
        pcStatus[pcId] = {
          characterId: pcId,
          hpCurrent: ch.hpMax,
          tempHp: 0,
          conditions: [],
          inspiration: false,
          sessionNotes: '',
        };
      }
    });

    const firstScene = newInstanceAdventure.scenes[0];
    const newInst: PlayInstance = {
      id: `inst-${Date.now()}`,
      adventureId: newInstanceAdventure.id,
      instanceName:
        newInstName.trim() ||
        `${tr('New Session', 'Nuova Sessione')} (${newInstanceAdventure.title})`,
      groupName: chosenParty?.name || tr('Custom Table Group', 'Tavolo Personalizzato'),
      partyCharacterIds: partyCharIds,
      status: 'active',
      sessionCount: 1,
      currentSceneId: firstScene?.id || '',
      visitedSceneIds: firstScene ? [firstScene.id] : [],
      sceneNotes: {},
      pcStatus,
      timeline: [
        {
          id: `log-init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          sceneId: firstScene?.id || '',
          sceneTitle: firstScene
            ? `${firstScene.code}: ${firstScene.title}`
            : tr('Start', 'Inizio'),
          category: 'narrative',
          title: tr('New Story Instance Started', 'Avvio Nuova Istanza della Storia'),
          details: tr(
            `Started adventure "${newInstanceAdventure.title}" with group "${
              chosenParty?.name || 'Custom Table Group'
            }".`,
            `Iniziata l’avventura "${newInstanceAdventure.title}" con il gruppo "${
              chosenParty?.name || 'Tavolo Personalizzato'
            }".`
          ),
          pinnedForRecap: true,
        },
      ],
      activeCombat: null,
      startedAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
    };

    handleSaveInstance(newInst);
    setActiveInstanceId(newInst.id);
    setNewInstanceAdventure(null);
    setActiveTab('console');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = storageRepository.importFromJsonString(String(reader.result));
        persistDb(imported);
      } catch (err: any) {
        alert(err?.message || tr('JSON import error', 'Errore importazione JSON'));
      }
    };
    reader.readAsText(file);
  };

  const handleSwitchLanguage = (nextLang: 'en' | 'it') => {
    setLang(nextLang);
    // If the currently loaded adventure is the unmodified demo adventure, switch seed language too
    const isUnmodifiedDemo =
      db.adventures.length === 2 &&
      db.adventures[0]?.id === 'adv-cripta-sussurrante' &&
      (db.adventures[0]?.title === 'The Secret of the Whispering Crypt' ||
        db.adventures[0]?.title === 'Il Segreto della Cripta Sussurrante');
    if (isUnmodifiedDemo) {
      persistDb(getSeedDatabase(nextLang));
    }
  };

  const rollQuickDie = (sides: number) => {
    const val = Math.floor(Math.random() * sides) + 1;
    setDiceResult(`d${sides} → ${val}`);
  };

  const activeTrackIds = soundboardEngine.getActiveTrackIds();

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur border-b border-stone-800 px-4 lg:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="cursor-pointer flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-[#58180D] flex items-center justify-center shadow-md border border-amber-400/40">
              <BookOpen className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="font-header text-lg font-extrabold tracking-wider text-amber-400 leading-none">
                VELLUM
              </div>
              <div className="text-[10px] text-stone-400 font-medium">
                {tr(
                  'D&D 5e Campaign, One-Shot & Multi-Instance Studio',
                  'Studio D&D 5e per Campagne, One-Shot & Multi-Istanza'
                )}
              </div>
            </div>
          </div>

          {/* Primary Module Tabs */}
          <nav className="flex flex-wrap items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <Compass className="w-4 h-4" />{' '}
              {tr('Dashboard & Instances', 'Dashboard & Istanze')}
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />{' '}
              {tr('Story Editor (Homebrewery)', 'Editor Storia (Homebrewery)')}
            </button>

            <button
              onClick={() => setActiveTab('console')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'console'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <Flame className="w-4 h-4" />{' '}
              {tr('Live Session Console', 'Console Partita Live')}
              <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-amber-300 text-[10px]">
                {db.playInstances.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('characters')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <Users className="w-4 h-4" />{' '}
              {tr('PCs, NPCs & Bestiary', 'PG, NPC & Bestiario')}
            </button>

            <button
              onClick={() => setActiveTab('sfx')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'sfx'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <Volume2 className="w-4 h-4" /> {tr('SFX Library', 'Libreria SFX')}
              {activeTrackIds.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </nav>

          {/* Language Switcher + Persistence & Import/Export */}
          <div className="flex items-center gap-2 text-xs">
            {/* Multi-language Toggle (EN / IT) */}
            <div
              className="flex items-center gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800"
              title={tr('UI Language (English / Italiano)', 'Lingua Interfaccia (English / Italiano)')}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400 ml-1" />
              <button
                onClick={() => handleSwitchLanguage('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  lang === 'en'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleSwitchLanguage('it')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  lang === 'it'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                IT
              </button>
            </div>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              title={`${lastSaveInfo || storageSource} — ${tr('Click to open Data & Backups', 'Clicca per aprire Gestione Dati & Backup')}`}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 text-[11px] transition cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lastSaveInfo || storageSource}</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              title={tr('Data Preservation & Backups Manager', 'Gestione Dati & Backup')}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              onClick={() => storageRepository.exportToJsonFile(db)}
              title={tr('Export full database to JSON', 'Esporta intero Database in JSON')}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              title={tr('Import database from JSON file', 'Importa Database da file JSON')}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              onClick={() => {
                if (
                  confirm(
                    tr(
                      'Restore initial demo data in the current language?',
                      'Vuoi ripristinare i dati demo iniziali nella lingua corrente?'
                    )
                  )
                ) {
                  persistDb(getSeedDatabase(lang));
                }
              }}
              title={tr('Restore initial demo data', 'Ripristina dati demo iniziali')}
              className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-amber-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-5">
        {activeTab === 'dashboard' && (
          <DashboardView
            campaigns={db.campaigns}
            adventures={db.adventures}
            instances={db.playInstances}
            characters={db.characters}
            parties={db.parties}
            sfxCatalog={db.sfxCatalog}
            onOpenAdventureInStudio={(advId) => {
              setSelectedAdventureId(advId);
              setActiveTab('studio');
            }}
            onOpenInstanceInConsole={(instId) => {
              setActiveInstanceId(instId);
              setActiveTab('console');
            }}
            onOpenNewInstanceModal={(adv) => openLaunchInstanceModal(adv)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'studio' && (
          <AdventureStudioView
            adventures={db.adventures}
            campaigns={db.campaigns}
            characters={db.characters}
            sfxCatalog={db.sfxCatalog}
            selectedAdventureId={selectedAdventureId}
            onSelectAdventure={setSelectedAdventureId}
            onSaveAdventure={handleSaveAdventure}
            onDeleteAdventure={handleDeleteAdventure}
            onSaveCampaign={handleSaveCampaign}
            onLaunchInstanceModal={(adv) => openLaunchInstanceModal(adv)}
            saveStatus={saveStatus}
            lastSavedTime={lastSavedTime}
            lastSaveInfo={lastSaveInfo}
          />
        )}

        {activeTab === 'console' && (
          <LiveSessionConsole
            instances={db.playInstances}
            adventures={db.adventures}
            characters={db.characters}
            parties={db.parties}
            sfxCatalog={db.sfxCatalog}
            activeInstanceId={activeInstanceId}
            onSelectInstance={setActiveInstanceId}
            onSaveInstance={handleSaveInstance}
            onSaveCharacter={handleSaveCharacter}
            onDeleteInstance={handleDeleteInstance}
            onOpenNewInstanceModal={(adv) => openLaunchInstanceModal(adv)}
          />
        )}

        {activeTab === 'characters' && (
          <CharactersView
            characters={db.characters}
            parties={db.parties}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onSaveParty={handleSaveParty}
            onDeleteParty={handleDeleteParty}
          />
        )}

        {activeTab === 'sfx' && (
          <SfxManagerView
            sfxCatalog={db.sfxCatalog}
            onSaveSfx={handleSaveSfx}
            onDeleteSfx={handleDeleteSfx}
          />
        )}
      </main>

      {/* Bottom Quick Dice & Active Audio Bar */}
      <footer className="sticky bottom-0 z-30 bg-stone-950/95 backdrop-blur border-t border-stone-800 px-4 lg:px-6 py-2">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Dice Roller */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-semibold flex items-center gap-1 mr-1">
              <Dice5 className="w-4 h-4 text-amber-500" />{' '}
              {tr('Quick Dice:', 'Dadi Rapidi:')}
            </span>
            {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
              <button
                key={sides}
                onClick={() => rollQuickDie(sides)}
                className="px-2 py-1 rounded bg-stone-900 hover:bg-amber-600 hover:text-stone-950 border border-stone-800 font-mono font-bold text-stone-200 transition cursor-pointer"
              >
                d{sides}
              </button>
            ))}
            {diceResult && (
              <span className="ml-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold">
                🎲 {diceResult}
              </span>
            )}
          </div>

          {/* Active Audio Tracks Pill Bar */}
          <div className="flex items-center gap-2">
            {activeTrackIds.length === 0 ? (
              <span className="text-stone-500 text-[11px]">
                {tr('No audio playing', 'Nessun audio in riproduzione')}
              </span>
            ) : (
              <>
                <span className="text-amber-400 font-bold text-[11px]">
                  {tr('Active Audio:', 'Audio Attivi:')}
                </span>
                {activeTrackIds.map((id) => {
                  const item = db.sfxCatalog.find((s) => s.id === id);
                  if (!item) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => soundboardEngine.stop(id)}
                      className="px-2.5 py-1 rounded-full bg-amber-600/20 border border-amber-500 text-amber-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" /> {item.name} ×
                    </button>
                  );
                })}
                <button
                  onClick={() => soundboardEngine.stopAll()}
                  className="px-2.5 py-1 rounded bg-red-900/80 hover:bg-red-800 text-red-100 text-[11px] font-bold flex items-center gap-1"
                >
                  <VolumeX className="w-3 h-3" /> {tr('Stop All', 'Stop Tutti')}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Modal: Launch New Play Instance for a Group */}
      {newInstanceAdventure && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-header text-xl font-bold text-amber-400">
                {tr('Launch New Play Instance', 'Avvia Nuova Istanza di Gioco')}
              </h3>
              <button
                onClick={() => setNewInstanceAdventure(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-stone-400 leading-relaxed">
              {tr(
                'You are creating a new independent instance for ',
                'Stai creando una nuova istanza indipendente per la storia '
              )}
              <strong className="text-amber-300">{newInstanceAdventure.title}</strong>.{' '}
              {tr(
                'All notes, choices, combat states, and PC hit points will be isolated for this group.',
                'Tutte le note, le scelte, i combattimenti e i PF dei PG saranno isolati per questo gruppo.'
              )}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Choose Adventure / Module', 'Scegli Avventura / Modulo')}
                </label>
                <select
                  value={newInstanceAdventure.id}
                  onChange={(e) => {
                    const found = db.adventures.find((a) => a.id === e.target.value);
                    if (found) setNewInstanceAdventure(found);
                  }}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                >
                  {db.adventures.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} (
                      {a.type === 'oneshot'
                        ? 'One-Shot'
                        : tr('Campaign Module', 'Modulo Campagna')}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr(
                    'Select Party Group (or Custom Table)',
                    'Seleziona il Gruppo (o Tavolo Personalizzato)'
                  )}
                </label>
                <select
                  value={newInstPartyId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setNewInstPartyId(pid);
                    const count =
                      db.playInstances.filter(
                        (i) => i.adventureId === newInstanceAdventure.id
                      ).length + 1;
                    if (pid === '__custom_empty__') {
                      setNewInstName(
                        `Run #${count} — ${tr('Custom Table', 'Tavolo Personalizzato')}`
                      );
                    } else {
                      const p = db.parties.find((x) => x.id === pid);
                      if (p) {
                        setNewInstName(`Run #${count} — ${p.name}`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-amber-300 font-bold"
                >
                  {db.parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.memberCharacterIds.length} {tr('PCs', 'PG')})
                    </option>
                  ))}
                  <option value="__custom_empty__">
                    {tr(
                      '✨ Custom / Empty Party (Add Pre-Gen Blueprints or Custom PCs in Console)',
                      '✨ Gruppo Vuoto / Personalizzato (Aggiungi Blueprint Pre-Gen o PG Custom in Console)'
                    )}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr(
                    'Instance / Session Identifier Name',
                    'Nome Identificativo dell’Istanza / Sessione'
                  )}
                </label>
                <input
                  type="text"
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder={tr(
                    'e.g. Friday Group - Session 1',
                    'es. Gruppo del Venerdì - Sessione 1'
                  )}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                onClick={() => setNewInstanceAdventure(null)}
                className="px-3 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={handleCreateNewInstance}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />{' '}
                {tr(
                  'Create Instance & Open DM Console',
                  'Crea Istanza & Apri Console DM'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Preservation & Backups Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        db={db}
        storageSource={storageSource}
        lastSaveInfo={lastSaveInfo}
        onDatabaseReplaced={(nextDb) => persistDb(nextDb)}
      />
    </div>
  );
};
