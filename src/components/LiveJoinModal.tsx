import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Wifi, Globe, Copy, Check, Square, Play, X, Users, Presentation } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { LiveSessionApi } from '../services/useLiveSession';

interface LiveJoinModalProps {
  live: LiveSessionApi;
  /** Characters players can pick on their phones (the active instance's party). */
  players: { id: string; name: string }[];
  /** Characters the DM can show to the table (name and portrait only are shared). */
  showable: { id: string; name: string; kind: 'pc' | 'npc' | 'monster' }[];
  onClose: () => void;
}

export const LiveJoinModal: React.FC<LiveJoinModalProps> = ({ live, players, showable, onClose }) => {
  const { tr } = useLanguage();
  const { desktop, info, joinUrl, tunnelStatus, tunnelUrl, tunnelError, clients, claimed, error, busy } = live;
  const [useTunnel, setUseTunnel] = useState(true);
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pickShow, setPickShow] = useState('');
  const shownChar = showable.find((c) => c.id === live.shownId);

  useEffect(() => {
    if (!joinUrl) {
      setQr('');
      return;
    }
    QRCode.toDataURL(joinUrl, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [joinUrl]);

  const start = () => live.start(useTunnel);
  const stop = () => live.stop();

  const copy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-amber-300 text-lg">
            {tr('Player access (QR)', 'Accesso giocatori (QR)')}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-800 text-stone-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!desktop && (
          <p className="text-sm text-stone-400">
            {tr(
              'Live sessions are only available in the desktop app.',
              'Le sessioni live sono disponibili solo nell’app desktop.'
            )}
          </p>
        )}

        {desktop && !info && (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={useTunnel}
                onChange={(e) => setUseTunnel(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {tr('Allow access from the internet', 'Consenti accesso da internet')}
                </span>
                <span className="text-stone-400 text-xs block">
                  {tr(
                    'Uses a free Cloudflare tunnel, no account needed. Players can join from any network.',
                    'Usa un tunnel Cloudflare gratuito, senza account. I giocatori possono unirsi da qualsiasi rete.'
                  )}
                </span>
              </span>
            </label>
            <button
              onClick={start}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {tr('Start live session', 'Avvia sessione live')}
            </button>
          </div>
        )}

        {info && (
          <div className="space-y-3">
            <div className="flex justify-center">
              {qr ? (
                <img src={qr} alt="QR" className="w-64 h-64 rounded-lg bg-white p-2" />
              ) : (
                <div className="w-64 h-64 rounded-lg bg-stone-800 flex items-center justify-center text-sm text-stone-400">
                  {tr('Generating link…', 'Creazione link…')}
                </div>
              )}
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-stone-300">
                {tunnelUrl ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Wifi className="w-3.5 h-3.5 text-amber-400" />}
                {tunnelUrl
                  ? tr('Internet link (any network)', 'Link internet (qualsiasi rete)')
                  : tr('Local network link (same Wi-Fi only)', 'Link rete locale (solo stessa Wi-Fi)')}
              </div>
              {useTunnel && tunnelStatus === 'starting' && !tunnelUrl && (
                <div className="text-amber-300">
                  {tr('Starting the tunnel… the QR will update.', 'Avvio del tunnel… il QR si aggiornerà.')}
                </div>
              )}
              {tunnelStatus === 'error' && (
                <div className="text-red-300">
                  {tr('Tunnel unavailable: showing the local link.', 'Tunnel non disponibile: mostro il link locale.')}{' '}
                  {tunnelError}
                </div>
              )}
            </div>

            {joinUrl && (
              <button
                onClick={copy}
                className="w-full px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono flex items-center gap-2"
              >
                <span className="truncate flex-1 text-left">{joinUrl}</span>
                {copied ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            <div className="space-y-1">
              <div className="text-xs font-semibold text-stone-400">
                {tr('Characters', 'Personaggi')}
              </div>
              {players.length === 0 && (
                <div className="text-xs text-stone-500">
                  {tr('Add player characters to this instance first.', 'Aggiungi prima dei PG a questa istanza.')}
                </div>
              )}
              {players.map((p) => {
                const claim = claimed.find((c) => c.characterId === p.id);
                const taken = Boolean(claim);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5">
                    <span className="truncate text-stone-200">{p.name}</span>
                    {taken ? (
                      <button
                        onClick={() => live.release(p.id)}
                        className="shrink-0 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200"
                        title={tr('Free this character so another phone can pick it', 'Libera il personaggio per farlo scegliere a un altro telefono')}
                      >
                        {claim?.nickname ? `${claim.nickname} · ` : ''}
                        {tr('Release', 'Libera')}
                      </button>
                    ) : (
                      <span className="shrink-0 text-stone-500">{tr('Free', 'Libero')}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
                <Presentation className="w-3.5 h-3.5" />
                {tr('Show to players', 'Mostra ai giocatori')}
              </div>
              {shownChar ? (
                <div className="flex items-center justify-between gap-2 text-xs bg-stone-950 border border-amber-700/50 rounded-lg px-2 py-1.5">
                  <span className="truncate text-amber-200">
                    {tr('Showing', 'In mostra')}: {shownChar.name}
                  </span>
                  <button
                    onClick={() => live.show(null)}
                    className="shrink-0 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
                  >
                    {tr('Stop', 'Nascondi')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={pickShow}
                    onChange={(e) => setPickShow(e.target.value)}
                    className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-200"
                  >
                    <option value="">{tr('Choose a character…', 'Scegli un personaggio…')}</option>
                    {(['pc', 'npc', 'monster'] as const).map((kind) => (
                      <optgroup
                        key={kind}
                        label={
                          kind === 'pc'
                            ? tr('Player characters', 'Personaggi giocanti')
                            : kind === 'npc'
                              ? 'NPC'
                              : tr('Monsters', 'Mostri')
                        }
                      >
                        {showable
                          .filter((c) => c.kind === kind)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (pickShow) live.show(pickShow);
                    }}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
                  >
                    {tr('Show', 'Mostra')}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-stone-200">
                <Users className="w-4 h-4" />
                {tr(`${clients} connected`, `${clients} connessi`)}
              </span>
              <button
                onClick={stop}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-red-900/70 hover:bg-red-800 text-amber-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {tr('Stop session', 'Chiudi sessione')}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </div>
  );
};
