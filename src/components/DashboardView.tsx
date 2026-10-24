import React from 'react';
import { AdventureBlueprint, Campaign, PlayInstance } from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { Edit3, Play, Plus, Swords } from 'lucide-react';

interface DashboardViewProps {
  campaigns: Campaign[];
  adventures: AdventureBlueprint[];
  instances: PlayInstance[];
  onOpenAdventureInStudio: (adventureId: string) => void;
  onOpenInstanceInConsole: (instanceId: string) => void;
  onOpenNewInstanceModal: (adventure?: AdventureBlueprint) => void;
  onNavigateTab: (tab: 'studio' | 'console' | 'characters' | 'sfx') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  campaigns,
  adventures,
  instances,
  onOpenAdventureInStudio,
  onOpenInstanceInConsole,
  onOpenNewInstanceModal,
  onNavigateTab,
}) => {
  const { tr } = useLanguage();

  const lastPlayed = [...instances].sort((a, b) =>
    String(b.lastPlayedAt || '').localeCompare(String(a.lastPlayedAt || ''))
  )[0];
  const resumeAdventure = lastPlayed
    ? adventures.find((a) => a.id === lastPlayed.adventureId)
    : undefined;
  const resumeScene = resumeAdventure?.scenes.find((s) => s.id === lastPlayed?.currentSceneId);

  const primaryButton =
    'px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-2 transition cursor-pointer';
  const secondaryButton =
    'px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Resume the last session, or invite the first steps */}
      {lastPlayed ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-stone-500">{tr('Continue playing', 'Riprendi a giocare')}</div>
            <div className="font-header text-lg font-bold text-stone-100 truncate">
              {lastPlayed.instanceName}
            </div>
            <div className="text-xs text-stone-400 truncate">
              {resumeAdventure?.title}
              {resumeScene ? ` — ${resumeScene.code}: ${resumeScene.title}` : ''}
            </div>
          </div>
          <button onClick={() => onOpenInstanceInConsole(lastPlayed.id)} className={primaryButton}>
            <Play className="w-4 h-4 fill-current" /> {tr('Open session', 'Entra in sessione')}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center space-y-3">
          <div className="font-header text-lg font-bold text-stone-200">
            {tr('Start your first adventure', 'Inizia la tua prima avventura')}
          </div>
          <p className="text-sm text-stone-400 max-w-md mx-auto">
            {tr(
              'Write a story in the editor, create your characters, then launch a session for your group.',
              'Scrivi una storia nell’editor, crea i tuoi personaggi, poi avvia una sessione per il tuo gruppo.'
            )}
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={() => onNavigateTab('studio')} className={primaryButton}>
              <Edit3 className="w-4 h-4" /> {tr('Write a story', 'Scrivi una storia')}
            </button>
            <button
              onClick={() => onNavigateTab('characters')}
              className={`${secondaryButton} py-2`}
            >
              {tr('Create characters', 'Crea personaggi')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adventures */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-header text-base font-bold text-stone-200">
              {tr('Adventures', 'Avventure')}
            </h2>
            {adventures.length > 0 && (
              <button onClick={() => onNavigateTab('studio')} className={secondaryButton}>
                <Plus className="w-3.5 h-3.5" /> {tr('New', 'Nuova')}
              </button>
            )}
          </div>

          {adventures.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">
              {tr('No adventures yet.', 'Ancora nessuna avventura.')}
            </p>
          ) : (
            <ul className="divide-y divide-stone-800/70 border border-stone-800 rounded-xl overflow-hidden">
              {adventures.map((adv) => {
                const camp = campaigns.find((c) => c.id === adv.campaignId);
                const runs = instances.filter((i) => i.adventureId === adv.id).length;
                return (
                  <li
                    key={adv.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-stone-900/40"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-stone-100 truncate">{adv.title}</div>
                      <div className="text-xs text-stone-500 truncate">
                        {[
                          adv.type === 'oneshot'
                            ? 'One-Shot'
                            : tr(`Campaign Ep. ${adv.episodeNumber || 1}`, `Campagna Ep. ${adv.episodeNumber || 1}`),
                          camp?.title,
                          adv.levelRange,
                          `${adv.scenes.length} ${tr('scenes', 'scene')}`,
                          runs > 0 ? `${runs} ${tr('sessions', 'sessioni')}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onOpenAdventureInStudio(adv.id)}
                        className={secondaryButton}
                        title={tr('Edit story', 'Modifica storia')}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {tr('Edit', 'Modifica')}
                      </button>
                      <button
                        onClick={() => onOpenNewInstanceModal(adv)}
                        className={secondaryButton}
                        title={tr('New session for a group', 'Nuova sessione per un gruppo')}
                      >
                        <Play className="w-3.5 h-3.5" /> {tr('Play', 'Gioca')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sessions */}
        <section className="space-y-2">
          <h2 className="font-header text-base font-bold text-stone-200">
            {tr('Sessions', 'Sessioni')}
          </h2>

          {instances.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">
              {tr('No sessions yet.', 'Ancora nessuna sessione.')}
            </p>
          ) : (
            <ul className="divide-y divide-stone-800/70 border border-stone-800 rounded-xl overflow-hidden">
              {instances.map((inst) => {
                const adv = adventures.find((a) => a.id === inst.adventureId);
                const scene = adv?.scenes.find((s) => s.id === inst.currentSceneId);
                return (
                  <li
                    key={inst.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-stone-900/40"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-stone-100 truncate">
                        {inst.instanceName}
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {[
                          adv?.title,
                          scene ? `${scene.code}: ${scene.title}` : tr('Start', 'Inizio'),
                          `${inst.visitedSceneIds.length}/${adv?.scenes.length || 1} ${tr('scenes', 'scene')}`,
                        ].join(' · ')}
                      </div>
                      {inst.activeCombat && (
                        <div className="mt-1 text-xs text-red-300 flex items-center gap-1">
                          <Swords className="w-3 h-3" /> {inst.activeCombat.encounterTitle} · Round{' '}
                          {inst.activeCombat.round}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenInstanceInConsole(inst.id)}
                      className={`${secondaryButton} shrink-0`}
                    >
                      <Play className="w-3.5 h-3.5" /> {tr('Open', 'Apri')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
