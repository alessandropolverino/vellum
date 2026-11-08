import React, { useState } from 'react';
import { Presentation, Square, Users, QrCode } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { LiveSessionApi } from '../services/useLiveSession';
import type { ShareRef } from '../services/liveSheet';
import type { Asset } from '../types/dnd';

interface ShareToPlayersPanelProps {
  live: LiveSessionApi;
  /** The stored entity this panel shares (a character/NPC/monster or an asset). */
  target: ShareRef;
  /** Names of the party's characters, used to label connected players. */
  characterNames: Record<string, string>;
  /** Opens the QR / join dialog when no live session is running yet. */
  onOpenLive: () => void;
}

/**
 * Entity-based "show to players" control, placed next to the stat block / asset modal.
 * Only stored entities can be shown; the DM picks everyone or some of the connected players.
 */
export const ShareToPlayersPanel: React.FC<ShareToPlayersPanelProps> = ({
  live,
  target,
  characterNames,
  onOpenLive,
}) => {
  const { tr } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const running = Boolean(live.info);
  const players = live.claimed;
  const share = live.share;
  const showingThis = share?.ref.kind === target.kind && share.ref.id === target.id;

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const chosen = selected.filter((id) => players.some((p) => p.characterId === id));

  return (
    <aside className="w-full lg:w-72 shrink-0 rounded-xl border border-stone-700 bg-stone-900/95 p-4 space-y-3 text-stone-200 shadow-2xl">
      <h4 className="flex items-center gap-2 text-sm font-bold text-amber-300">
        <Presentation className="w-4 h-4" />
        {tr('Show to players', 'Mostra ai giocatori')}
      </h4>

      {!live.desktop ? (
        <p className="text-xs text-stone-400">
          {tr(
            'Showing content to players needs the desktop app.',
            "Mostrare contenuti ai giocatori richiede l'app desktop."
          )}
        </p>
      ) : !running ? (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">
            {tr(
              'No live session is running. Start one so players can connect from their phones.',
              'Nessuna sessione live attiva. Avviala per far collegare i giocatori dal telefono.'
            )}
          </p>
          <button
            onClick={onOpenLive}
            className="w-full px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            {tr('Open player link (QR)', 'Apri link giocatori (QR)')}
          </button>
        </div>
      ) : (
        <>
          {showingThis && share && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-700/50 bg-stone-950 px-2 py-1.5 text-xs">
              <span className="text-amber-200">
                {share.targets === null
                  ? tr('Showing to everyone', 'In mostra a tutti')
                  : tr(
                      `Showing to ${share.targets.length} player(s)`,
                      `In mostra a ${share.targets.length} giocatore/i`
                    )}
              </span>
              <button
                onClick={() => live.stopShowing()}
                className="shrink-0 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-current" />
                {tr('Stop', 'Nascondi')}
              </button>
            </div>
          )}
          {!showingThis && share && (
            <p className="text-[11px] text-stone-500">
              {tr(
                'Something else is being shown; showing this replaces it.',
                "Qualcos'altro è in mostra; mostrare questo lo sostituisce."
              )}
            </p>
          )}

          <button
            onClick={() => live.show(target, null)}
            className="w-full px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
          >
            {tr('Show to everyone', 'Mostra a tutti')}
          </button>

          <div className="space-y-1.5 border-t border-stone-800 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
              <Users className="w-3.5 h-3.5" />
              {tr('Only to selected players', 'Solo ai giocatori selezionati')}
            </div>
            {players.length === 0 ? (
              <p className="text-xs text-stone-500">
                {tr('No players connected yet.', 'Nessun giocatore connesso.')}
              </p>
            ) : (
              <ul className="space-y-1">
                {players.map((p) => (
                  <li key={p.characterId}>
                    <label className="flex items-center gap-2 rounded-lg bg-stone-950 border border-stone-800 px-2 py-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.characterId)}
                        onChange={() => toggle(p.characterId)}
                      />
                      <span className="truncate">
                        {p.nickname || tr('Player', 'Giocatore')}
                        <span className="text-stone-500">
                          {' · '}
                          {characterNames[p.characterId] ?? p.characterId}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <button
              disabled={chosen.length === 0}
              onClick={() => live.show(target, chosen)}
              className="w-full px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-bold disabled:opacity-40"
            >
              {tr('Show to selected', 'Mostra ai selezionati')}
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

/** Parchment-style preview of an asset (image and caption), matching the stat block look. */
export const AssetPreviewCard: React.FC<{ asset: Asset }> = ({ asset }) => (
  <div className="relative rounded-sm border-2 border-[#58180D]/80 bg-[#fdf5e0] text-[#2b170e] shadow-xl overflow-hidden font-serif">
    <div className="h-2 bg-gradient-to-r from-[#58180D] via-[#c9ad6a] to-[#58180D] border-b border-[#58180D]" />
    <div className="p-5 space-y-3">
      <h3 className="font-header text-xl md:text-2xl font-extrabold tracking-wide text-[#58180D] uppercase break-words pr-10">
        {asset.name}
      </h3>
      {asset.imageUrl && (
        <img
          src={asset.imageUrl}
          alt={asset.caption || asset.name}
          className="w-full max-h-[60vh] object-contain rounded border border-[#58180D]/30 bg-black/5"
        />
      )}
      {asset.caption && <p className="italic text-sm">{asset.caption}</p>}
    </div>
  </div>
);
