/**
 * Helpers for the `@type[ref]` notation used in scene text (`@npc[...]`, `@sfx[...]`, ...).
 * The story editor uses them to open a searchable picker while the caret is inside the brackets.
 */
import type { Asset, CharacterEntity, EncounterPreset, SfxItem } from '../types/dnd';
import { hasAllLabels } from './labels';

export type MentionKind = 'npc' | 'statblock' | 'sfx' | 'asset' | 'encounter';

export const MENTION_KINDS: readonly MentionKind[] = ['npc', 'statblock', 'sfx', 'asset', 'encounter'];

export interface MentionItem {
  kind: MentionKind;
  id: string;
  name: string;
  /** Short secondary text shown under the name (type, CR, category...). */
  detail: string;
  tags: string[];
  /** What goes between the brackets: the id, or the name for assets (readable in the source). */
  ref: string;
}

export interface OpenMention {
  kind: MentionKind;
  /** Index of the `@`. */
  start: number;
  /** Index right after the closing `]` when it exists, otherwise the caret. */
  end: number;
  /** Text typed between the brackets up to the caret. */
  query: string;
}

const OPEN_RE = /@(npc|statblock|sfx|asset|encounter)\[([^\]\n[]*)$/;

/** The `@type[` the caret is currently inside, if any. */
export function findOpenMention(text: string, caret: number): OpenMention | null {
  const before = text.slice(0, caret);
  const m = OPEN_RE.exec(before);
  if (!m) return null;
  const start = before.length - m[0].length;
  const rest = text.slice(caret);
  const close = /^[^\]\n[]*\]/.exec(rest);
  return {
    kind: m[1] as MentionKind,
    start,
    end: close ? caret + close[0].length : caret,
    query: m[2],
  };
}

/** Replace the open mention with a complete `@type[ref]` token; returns the new text and caret. */
export function applyMention(
  text: string,
  mention: Pick<OpenMention, 'kind' | 'start' | 'end'>,
  ref: string
): { text: string; caret: number } {
  const token = `@${mention.kind}[${ref}]`;
  return {
    text: text.slice(0, mention.start) + token + text.slice(mention.end),
    caret: mention.start + token.length,
  };
}

interface MentionSources {
  characters: readonly CharacterEntity[];
  sfxCatalog: readonly SfxItem[];
  assets: readonly Asset[];
  encounters: readonly EncounterPreset[];
}

const KIND_LABEL: Record<CharacterEntity['kind'], string> = { pc: 'PC', npc: 'NPC', monster: 'Monster' };

export function buildMentionItems(kind: MentionKind, src: MentionSources): MentionItem[] {
  switch (kind) {
    case 'npc':
    case 'statblock':
      return src.characters
        .filter((c) => !c.instanceOnlyId)
        .map((c) => ({
          kind,
          id: c.id,
          name: c.name,
          detail: `${KIND_LABEL[c.kind] ?? c.kind} · ${c.levelOrCr}`,
          tags: c.tags ?? [],
          ref: c.id,
        }));
    case 'sfx':
      return src.sfxCatalog.map((s) => ({
        kind,
        id: s.id,
        name: s.name,
        detail: `${s.category}${s.loop ? ' · loop' : ''}`,
        tags: s.tags ?? [],
        ref: s.id,
      }));
    case 'asset':
      return src.assets.map((a) => ({
        kind,
        id: a.id,
        name: a.name,
        detail: a.caption,
        tags: a.tags ?? [],
        ref: a.name,
      }));
    case 'encounter':
      return src.encounters.map((e) => ({
        kind,
        id: e.id,
        name: e.name,
        detail: `${e.difficulty} · ${e.slots.reduce((n, s) => n + s.count, 0)}`,
        tags: e.tags ?? [],
        ref: e.id,
      }));
  }
}

/** Text search (name, detail, labels, id) combined with a label filter (all selected labels). */
export function filterMentionItems(
  items: readonly MentionItem[],
  query: string,
  labels: readonly string[]
): MentionItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((it) => {
    if (!hasAllLabels(it.tags, labels)) return false;
    if (!q) return true;
    return (
      it.name.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      it.detail.toLowerCase().includes(q) ||
      it.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}
