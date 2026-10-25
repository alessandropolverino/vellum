import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { buildPlayerSheet, type PlayerRosterEntry } from './liveSheet';
import type { CharacterEntity, PlayInstance } from '../types/dnd';

export interface LiveInfo {
  running: boolean;
  token: string;
  port: number;
  lanUrl: string | null;
  tunnelUrl: string | null;
  clients: number;
  claimed: string[];
}

export type TunnelStatus = 'idle' | 'starting' | 'ready' | 'error';

interface TunnelEvent {
  status: 'starting' | 'ready' | 'error';
  url: string | null;
  error: string | null;
}

export const isDesktopApp = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

/** The tunnel URL is the root; the player route lives under /join/<token>. */
export const joinUrlFor = (base: string, token: string) =>
  `${base.replace(/\/$/, '')}/join/${token}`;

/**
 * Owns the live-session lifecycle (server, tunnel, claims) and keeps the phones in sync
 * with the active play instance. It stays mounted with the Live Console so the session
 * survives opening and closing the QR modal.
 */
export function useLiveSession(
  instance: PlayInstance | undefined,
  characters: CharacterEntity[]
) {
  const desktop = isDesktopApp();
  const [info, setInfo] = useState<LiveInfo | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>('idle');
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [clients, setClients] = useState(0);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sentViews = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!desktop) return;
    invoke<LiveInfo | null>('live_status')
      .then((cur) => {
        if (!cur) return;
        setInfo(cur);
        setClients(cur.clients);
        setClaimed(cur.claimed);
        if (cur.tunnelUrl) {
          setTunnelUrl(cur.tunnelUrl);
          setTunnelStatus('ready');
        }
      })
      .catch(() => {});
    const offs: Array<Promise<() => void>> = [
      listen<number>('live://clients', (e) => setClients(e.payload)),
      listen<string[]>('live://claims', (e) => setClaimed(e.payload)),
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

  // Push the roster and each player's sheet whenever the instance or characters change.
  useEffect(() => {
    if (!desktop || !info || !instance) return;
    const charMap = new Map(characters.map((c) => [c.id, c]));
    const pcs = instance.partyCharacterIds
      .map((id) => charMap.get(id))
      .filter((c): c is CharacterEntity => Boolean(c));
    const roster: PlayerRosterEntry[] = pcs.map((pc) => ({
      id: pc.id,
      name: instance.pcStatus[pc.id]?.customNameOverride || pc.name,
      subtitle: [pc.classOrArchetype, pc.levelOrCr].filter(Boolean).join(' · '),
    }));
    let cancelled = false;
    (async () => {
      try {
        await invoke('live_set_roster', { entries: roster });
        for (const pc of pcs) {
          if (cancelled) return;
          const payload = JSON.stringify(
            buildPlayerSheet(pc, instance.pcStatus[pc.id])
          );
          if (sentViews.current.get(pc.id) === payload) continue;
          await invoke('live_set_view', { characterId: pc.id, payload });
          sentViews.current.set(pc.id, payload);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [desktop, info, instance, characters]);

  const start = useCallback(async (useTunnel: boolean) => {
    setBusy(true);
    setError(null);
    setTunnelError(null);
    setTunnelUrl(null);
    setTunnelStatus(useTunnel ? 'starting' : 'idle');
    sentViews.current.clear();
    try {
      const started = await invoke<LiveInfo>('live_start', { useTunnel });
      setInfo(started);
      setClaimed(started.claimed);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await invoke('live_stop');
      setInfo(null);
      setClients(0);
      setClaimed([]);
      setTunnelUrl(null);
      setTunnelStatus('idle');
      sentViews.current.clear();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const release = useCallback(async (characterId: string) => {
    try {
      await invoke('live_release', { characterId });
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const joinUrl = info
    ? tunnelUrl
      ? joinUrlFor(tunnelUrl, info.token)
      : info.lanUrl
    : null;

  return {
    desktop,
    info,
    joinUrl,
    tunnelStatus,
    tunnelUrl,
    tunnelError,
    clients,
    claimed,
    error,
    busy,
    start,
    stop,
    release,
  };
}

export type LiveSessionApi = ReturnType<typeof useLiveSession>;
