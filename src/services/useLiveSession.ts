import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  buildCombatPayload,
  buildPlayerSheet,
  buildShownPayload,
  type PlayerRosterEntry,
} from './liveSheet';
import { portraitVersion, shrinkPortrait } from './livePortraits';
import type { CharacterEntity, PlayInstance } from '../types/dnd';

export interface ClaimInfo {
  characterId: string;
  nickname: string;
}

export interface LiveInfo {
  running: boolean;
  token: string;
  port: number;
  lanUrl: string | null;
  tunnelUrl: string | null;
  clients: number;
  claimed: ClaimInfo[];
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
  characters: CharacterEntity[],
  /** Called when a player picks a character with a nickname that the instance doesn't have yet. */
  onNickname?: (instance: PlayInstance, characterId: string, nickname: string) => void
) {
  const desktop = isDesktopApp();
  const [info, setInfo] = useState<LiveInfo | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>('idle');
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [clients, setClients] = useState(0);
  const [claimed, setClaimed] = useState<ClaimInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  const sentPayloads = useRef<Map<string, string>>(new Map());
  const portraitSources = useRef<Map<string, string>>(new Map());
  const iconVersions = useRef<Map<string, string>>(new Map());
  const instanceRef = useRef(instance);
  const onNicknameRef = useRef(onNickname);
  instanceRef.current = instance;
  onNicknameRef.current = onNickname;

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
      listen<ClaimInfo[]>('live://claims', (e) => setClaimed(e.payload)),
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

  // A player's nickname becomes the player name of the character they picked.
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst || !onNicknameRef.current) return;
    for (const claim of claimed) {
      if (!claim.nickname || !inst.partyCharacterIds.includes(claim.characterId)) continue;
      if (inst.pcStatus[claim.characterId]?.playerOverride === claim.nickname) continue;
      onNicknameRef.current(inst, claim.characterId, claim.nickname);
      break; // the save re-renders; remaining claims are handled on the next pass
    }
  }, [claimed, instance]);

  // Keep every phone in sync: roster, own sheets, combat order and what the DM is showing.
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
    const combat = instance.activeCombat?.isActive ? instance.activeCombat : null;
    const shown = shownId ? charMap.get(shownId) ?? null : null;
    let cancelled = false;

    // Downscales and uploads a portrait once per image; returns its version, or null if none.
    const ensureIcon = async (id: string, storeAs: string, size: number) => {
      const src = charMap.get(id)?.portraitUrl;
      if (!src || !src.startsWith('data:image/')) return null;
      const key = `${storeAs}:${size}`;
      if (portraitSources.current.get(key) !== src) {
        const small = await shrinkPortrait(src, size);
        if (!small) return null;
        await invoke('live_set_portrait', { characterId: storeAs, dataUrl: small });
        portraitSources.current.set(key, src);
        iconVersions.current.set(key, portraitVersion(small));
      }
      return iconVersions.current.get(key) ?? null;
    };
    const push = async (kind: string, payload: string, send: () => Promise<unknown>) => {
      if (sentPayloads.current.get(kind) === payload) return;
      await send();
      sentPayloads.current.set(kind, payload);
    };

    (async () => {
      try {
        await invoke('live_set_roster', { entries: roster });

        const icons = new Map<string, string>();
        const wanted = new Set<string>(pcs.map((p) => p.id));
        combat?.participants.forEach((p) => p.sourceCharacterId && wanted.add(p.sourceCharacterId));
        for (const id of wanted) {
          const v = await ensureIcon(id, id, 128);
          if (v) icons.set(id, v);
          if (cancelled) return;
        }

        for (const pc of pcs) {
          const fighting = combat?.participants.find(
            (p) => p.kind === 'pc' && p.sourceCharacterId === pc.id
          );
          const payload = JSON.stringify(
            buildPlayerSheet(pc, instance.pcStatus[pc.id], icons.get(pc.id) ?? null, fighting)
          );
          await push(`view:${pc.id}`, payload, () =>
            invoke('live_set_view', { characterId: pc.id, payload })
          );
          if (cancelled) return;
        }

        const combatPayload = JSON.stringify(buildCombatPayload(combat, icons));
        await push('combat', combatPayload, () =>
          invoke('live_set_shared', { kind: 'combat', payload: combatPayload })
        );

        const shownIcon = shown ? await ensureIcon(shown.id, 'shown', 480) : null;
        const shownPayload = JSON.stringify(buildShownPayload(shown, shownIcon));
        await push('shown', shownPayload, () =>
          invoke('live_set_shared', { kind: 'shown', payload: shownPayload })
        );
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [desktop, info, instance, characters, shownId]);

  const start = useCallback(async (useTunnel: boolean) => {
    setBusy(true);
    setError(null);
    setTunnelError(null);
    setTunnelUrl(null);
    setTunnelStatus(useTunnel ? 'starting' : 'idle');
    sentPayloads.current.clear();
    portraitSources.current.clear();
    iconVersions.current.clear();
    setShownId(null);
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
      sentPayloads.current.clear();
      portraitSources.current.clear();
      iconVersions.current.clear();
      setShownId(null);
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
    shownId,
    show: setShownId,
    start,
    stop,
    release,
  };
}

export type LiveSessionApi = ReturnType<typeof useLiveSession>;
