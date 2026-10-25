import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Wifi, Globe, Copy, Check, Square, Play, X, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface LiveInfo {
  running: boolean;
  token: string;
  port: number;
  lanUrl: string | null;
  tunnelUrl: string | null;
  clients: number;
}

type TunnelStatus = 'idle' | 'starting' | 'ready' | 'error';

interface TunnelEvent {
  status: 'starting' | 'ready' | 'error';
  url: string | null;
  error: string | null;
}

interface LiveJoinModalProps {
  onClose: () => void;
}

const isTauri = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

/** The tunnel URL is the root; the player route lives under /join/<token>. */
const joinUrlFor = (base: string, token: string) => `${base.replace(/\/$/, '')}/join/${token}`;

export const LiveJoinModal: React.FC<LiveJoinModalProps> = ({ onClose }) => {
  const { tr } = useLanguage();
  const [info, setInfo] = useState<LiveInfo | null>(null);
  const [useTunnel, setUseTunnel] = useState(true);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>('idle');
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [clients, setClients] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const desktop = isTauri();

  useEffect(() => {
    if (!desktop) return;
    invoke<LiveInfo | null>('live_status')
      .then((cur) => {
        if (cur) {
          setInfo(cur);
          setClients(cur.clients);
          if (cur.tunnelUrl) {
            setTunnelUrl(cur.tunnelUrl);
            setTunnelStatus('ready');
          }
        }
      })
      .catch(() => {});
    const offs: Array<Promise<() => void>> = [
      listen<number>('live://clients', (e) => setClients(e.payload)),
      listen<TunnelEvent>('live://tunnel', (e) => {
        setTunnelStatus(e.payload.status);
        setTunnelUrl(e.payload.url);
        setTunnelError(e.payload.error);
      }),
    ];
    return () => {
      offs.forEach((p) => p.then((off) => off()));
    };
  }, [desktop]);

  // Prefer the internet URL once the tunnel is up; fall back to the LAN address.
  const joinUrl = info
    ? tunnelUrl
      ? joinUrlFor(tunnelUrl, info.token)
      : info.lanUrl
    : null;

  useEffect(() => {
    if (!joinUrl) {
      setQr('');
      return;
    }
    QRCode.toDataURL(joinUrl, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [joinUrl]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTunnelError(null);
    setTunnelUrl(null);
    setTunnelStatus(useTunnel ? 'starting' : 'idle');
    try {
      setInfo(await invoke<LiveInfo>('live_start', { useTunnel }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [useTunnel]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await invoke('live_stop');
      setInfo(null);
      setClients(0);
      setTunnelUrl(null);
      setTunnelStatus('idle');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

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
