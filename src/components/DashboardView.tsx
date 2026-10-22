import React from 'react';
import {
  AdventureBlueprint,
  Campaign,
  CharacterEntity,
  PartyGroup,
  PlayInstance,
  SfxItem,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BookOpen,
  Play,
  Plus,
  Users,
  Volume2,
  Swords,
  Layers,
  Edit3,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  campaigns: Campaign[];
  adventures: AdventureBlueprint[];
  instances: PlayInstance[];
  characters: CharacterEntity[];
  parties: PartyGroup[];
  sfxCatalog: SfxItem[];
  onOpenAdventureInStudio: (adventureId: string) => void;
  onOpenInstanceInConsole: (instanceId: string) => void;
  onOpenNewInstanceModal: (adventure?: AdventureBlueprint) => void;
  onNavigateTab: (tab: 'studio' | 'console' | 'characters' | 'sfx') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  campaigns,
  adventures,
  instances,
  characters,
  parties,
  sfxCatalog,
  onOpenAdventureInStudio,
  onOpenInstanceInConsole,
  onOpenNewInstanceModal,
  onNavigateTab,
}) => {
  const { tr } = useLanguage();
  const pcsCount = characters.filter((c) => c.kind === 'pc').length;
  const npcsCount = characters.filter((c) => c.kind === 'npc').length;
  const monstersCount = characters.filter((c) => c.kind === 'monster').length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-stone-900 via-[#2a120a] to-stone-950 p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> D&D 5e Campaign & One-Shot Studio
          </div>
          <h1 className="font-header text-2xl md:text-3xl font-extrabold text-amber-400">
            {tr(
              'Write Like an Official Sourcebook. Run Across Infinite Groups.',
              'Scrivi come un Manuale Ufficiale. Gioca su Infiniti Gruppi.'
            )}
          </h1>
          <p className="text-sm text-stone-300 leading-relaxed">
            {tr(
              'Typeset your stories in Homebrewery 5e style, link PCs, NPCs, Monsters, and SFX to each scene, and launch parallel Play Instances of the same adventure while keeping combat, hit points, and step-by-step notes isolated.',
              'Impagina le tue storie in stile Homebrewery 5e, collega PG, NPC, Mostri e SFX per ogni scena e avvia più Istanze parallele della stessa avventura mantenendo separati combattimenti, punti ferita e note passo-passo.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('studio')}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />{' '}
            {tr('Write / Typeset Story', 'Scrivi / Impagina Storia')}
          </button>
          <button
            onClick={() => onOpenNewInstanceModal(adventures[0])}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />{' '}
            {tr('+ New Instance for a Group', '+ Nuova Istanza per un Gruppo')}
          </button>
        </div>
      </div>

      {/* Repository Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('studio')}
          className="cursor-pointer bg-stone-900/90 hover:border-amber-500/50 border border-stone-800 rounded-xl p-4 transition"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {tr('Stories & Modules', 'Storie & Moduli')}
            </span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl font-header font-extrabold text-stone-100 mt-2">
            {adventures.length} {tr('Adventures', 'Avventure')}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {campaigns.length} {tr('Campaigns', 'Campagne')} •{' '}
            {adventures.reduce((acc, a) => acc + a.scenes.length, 0)}{' '}
            {tr('Total scenes', 'Scene totali')}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('console')}
          className="cursor-pointer bg-stone-900/90 hover:border-amber-500/50 border border-stone-800 rounded-xl p-4 transition"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {tr('Active Instances / Groups', 'Istanze / Gruppi Attivi')}
            </span>
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-2xl font-header font-extrabold text-stone-100 mt-2">
            {instances.length} {tr('Sessions', 'Sessioni')}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {tr(
              `Isolated state per group (${parties.length} saved Parties)`,
              `Stato indipendente per ogni gruppo (${parties.length} Party salvati)`
            )}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('characters')}
          className="cursor-pointer bg-stone-900/90 hover:border-amber-500/50 border border-stone-800 rounded-xl p-4 transition"
        >
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {tr('5e Sheet Repository', 'Repository Schede 5e')}
            </span>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-2xl font-header font-extrabold text-stone-100 mt-2">
            {characters.length} {tr('Entities', 'Entità')}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {pcsCount} {tr('PCs', 'PG')} • {npcsCount} NPCs • {monstersCount}{' '}
            {tr('Monsters/Bosses', 'Mostri/Boss')}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('sfx')}
          className="cursor-pointer bg-stone-900/90 hover:border-amber-500/50 border border-stone-800 rounded-xl p-4 transition"
        >
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Soundboard & SFX
            </span>
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="text-2xl font-header font-extrabold text-stone-100 mt-2">
            {sfxCatalog.length} {tr('Audio Tracks', 'Tracce Audio')}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {sfxCatalog.filter((s) => s.loop).length} {tr('Ambience Loops', 'Loop Ambience')} •{' '}
            {sfxCatalog.filter((s) => !s.loop).length} {tr('One-Shot SFX', 'Effetti One-Shot')}
          </div>
        </div>
      </div>

      {/* Main Split: Adventures & Multi-Instance Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Adventures (One-Shots & Sequential Campaign Modules) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-header text-xl font-bold text-amber-400 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />{' '}
              {tr(
                'Adventures (One-Shots & Campaign Chapters)',
                'Avventure (One-Shot & Capitoli Campagna)'
              )}
            </h2>
          </div>

          <div className="space-y-4">
            {adventures.map((adv) => {
              const advInstances = instances.filter((i) => i.adventureId === adv.id);
              const camp = campaigns.find((c) => c.id === adv.campaignId);
              const totalEncounters = adv.scenes.reduce(
                (sum, s) => sum + s.encounters.length,
                0
              );
              const totalSfx = new Set(adv.scenes.flatMap((s) => s.linkedSfxIds)).size;

              return (
                <div
                  key={adv.id}
                  className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 hover:border-stone-700 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            adv.type === 'oneshot'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                          }`}
                        >
                          {adv.type === 'oneshot'
                            ? tr('Replayable One-Shot', 'One-Shot Rigiocabile')
                            : tr(
                                `Campaign Module (Ep. ${adv.episodeNumber || 1})`,
                                `Modulo Campagna (Ep. ${adv.episodeNumber || 1})`
                              )}
                        </span>
                        {camp && (
                          <span className="text-xs text-stone-400 font-semibold">
                            • {camp.title}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold">
                          {adv.levelRange}
                        </span>
                      </div>

                      <h3 className="font-header text-xl font-bold text-stone-100 mt-1.5">
                        {adv.title}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">{adv.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenAdventureInStudio(adv.id)}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {tr('Edit / Typeset', 'Impagina / Modifica')}
                      </button>
                      <button
                        onClick={() => onOpenNewInstanceModal(adv)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {tr('New Instance', 'Nuova Istanza')}
                      </button>
                    </div>
                  </div>

                  {/* Scene chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {adv.scenes.map((sc) => (
                      <span
                        key={sc.id}
                        className="px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-300"
                      >
                        <strong className="text-amber-400">{sc.code}:</strong> {sc.title}
                      </span>
                    ))}
                  </div>

                  {/* Adventure Footer Stats & Active Instances on this Blueprint */}
                  <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                    <div className="flex items-center gap-4">
                      <span>
                        📑 {adv.scenes.length} {tr('Scenes', 'Scene')}
                      </span>
                      <span>
                        ⚔️ {totalEncounters} {tr('Encounters', 'Incontri')}
                      </span>
                      <span>
                        🔊 {totalSfx} {tr('Linked SFX', 'SFX associati')}
                      </span>
                    </div>
                    <div className="text-amber-300 font-semibold">
                      {advInstances.length}{' '}
                      {tr('active instances on this story', 'Istanze attive su questa storia')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Multi-Instance Live Sessions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-header text-xl font-bold text-amber-400 flex items-center gap-2">
              <Layers className="w-5 h-5" />{' '}
              {tr('Parallel Play Instances (Per Group)', 'Istanze di Gioco Parallele (Per Gruppo)')}
            </h2>
          </div>

          <div className="space-y-3">
            {instances.map((inst) => {
              const adv = adventures.find((a) => a.id === inst.adventureId);
              const currentSc = adv?.scenes.find((s) => s.id === inst.currentSceneId);
              return (
                <div
                  key={inst.id}
                  className="bg-stone-900/95 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-4 space-y-3 transition shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {adv?.title || tr('Adventure', 'Avventura')}
                      </span>
                      <h3 className="font-header text-base font-bold text-amber-300 mt-1">
                        {inst.instanceName}
                      </h3>
                      <p className="text-xs text-stone-400">{inst.groupName}</p>
                    </div>

                    <button
                      onClick={() => onOpenInstanceInConsole(inst.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />{' '}
                      {tr('Open Session', 'Entra in Sessione')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-stone-500 font-bold">
                        {tr('Current Scene', 'Punto della Storia')}
                      </div>
                      <div className="font-semibold text-stone-200 truncate">
                        {currentSc ? `${currentSc.code}: ${currentSc.title}` : tr('Start', 'Inizio')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-stone-500 font-bold">
                        {tr('Progress & Timeline', 'Progresso & Diario')}
                      </div>
                      <div className="font-semibold text-stone-200">
                        {inst.visitedSceneIds.length}/{adv?.scenes.length || 1}{' '}
                        {tr('Scenes', 'Scene')} • {inst.timeline.length}{' '}
                        {tr('Notes', 'Note')}
                      </div>
                    </div>
                  </div>

                  {inst.activeCombat && (
                    <div className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/50 text-red-200 text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5" />{' '}
                        {tr('Active combat:', 'Combattimento salvato:')}{' '}
                        {inst.activeCombat.encounterTitle}
                      </span>
                      <span>Round {inst.activeCombat.round}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
