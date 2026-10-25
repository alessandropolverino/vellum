import type { CharacterEntity, ClassResource, PcRuntimeStatus } from '../types/dnd';

/**
 * Spell slot and class resource bookkeeping. A character defines the maximums (slots per spell
 * level, named resources such as ki or sorcery points); the instance only records how many
 * have been spent, so editing a maximum never leaves the tally inconsistent.
 */

export const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface SlotState {
  level: number;
  max: number;
  used: number;
}

export interface ResourceState {
  id: string;
  name: string;
  max: number;
  used: number;
  recharge: ClassResource['recharge'];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const slotMax = (pc: Pick<CharacterEntity, 'spellSlots'>, level: number): number =>
  Math.max(0, Math.floor(pc.spellSlots?.[level - 1] ?? 0));

/** Slot levels the character actually has, with how many are spent. */
export function slotStates(
  pc: Pick<CharacterEntity, 'spellSlots'>,
  runtime: Pick<PcRuntimeStatus, 'slotsUsed'> | undefined
): SlotState[] {
  return SPELL_LEVELS.map((level) => {
    const max = slotMax(pc, level);
    return { level, max, used: clamp(runtime?.slotsUsed?.[level - 1] ?? 0, 0, max) };
  }).filter((s) => s.max > 0);
}

export function resourceStates(
  pc: Pick<CharacterEntity, 'classResources'>,
  runtime: Pick<PcRuntimeStatus, 'resourcesUsed'> | undefined
): ResourceState[] {
  return (pc.classResources ?? [])
    .filter((r) => r.max > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      max: r.max,
      used: clamp(runtime?.resourcesUsed?.[r.id] ?? 0, 0, r.max),
      recharge: r.recharge,
    }));
}

export const hasMagic = (pc: Pick<CharacterEntity, 'spellSlots' | 'classResources'>): boolean =>
  slotStates(pc, undefined).length > 0 || resourceStates(pc, undefined).length > 0;

/** Spend (delta > 0) or recover (delta < 0) slots of one level. Returns the new used array. */
export function changeSlots(
  pc: Pick<CharacterEntity, 'spellSlots'>,
  runtime: Pick<PcRuntimeStatus, 'slotsUsed'> | undefined,
  level: number,
  delta: number
): number[] {
  const next = SPELL_LEVELS.map((l) => runtime?.slotsUsed?.[l - 1] ?? 0);
  if (level >= 1 && level <= 9) {
    const max = slotMax(pc, level);
    next[level - 1] = clamp(next[level - 1] + Math.trunc(delta), 0, max);
  }
  return next;
}

export function changeResource(
  pc: Pick<CharacterEntity, 'classResources'>,
  runtime: Pick<PcRuntimeStatus, 'resourcesUsed'> | undefined,
  id: string,
  delta: number
): Record<string, number> {
  const next = { ...(runtime?.resourcesUsed ?? {}) };
  const res = pc.classResources?.find((r) => r.id === id);
  if (res) next[id] = clamp((next[id] ?? 0) + Math.trunc(delta), 0, res.max);
  return next;
}

/**
 * What a rest gives back. A long rest restores every slot and every resource that recharges on
 * rests; a short rest only restores short-rest resources. "manual" resources never refill on
 * their own. Hit points are deliberately left to the DM.
 */
export function rest(
  pc: Pick<CharacterEntity, 'spellSlots' | 'classResources'>,
  runtime: Pick<PcRuntimeStatus, 'slotsUsed' | 'resourcesUsed'> | undefined,
  kind: 'short' | 'long'
): { slotsUsed: number[]; resourcesUsed: Record<string, number> } {
  const slotsUsed =
    kind === 'long' ? SPELL_LEVELS.map(() => 0) : SPELL_LEVELS.map((l) => runtime?.slotsUsed?.[l - 1] ?? 0);
  const resourcesUsed = { ...(runtime?.resourcesUsed ?? {}) };
  for (const r of pc.classResources ?? []) {
    if (r.recharge === 'short' || (kind === 'long' && r.recharge === 'long')) delete resourcesUsed[r.id];
  }
  return { slotsUsed, resourcesUsed };
}

/** Stable id for a new resource, unique within the character. */
export function newResourceId(existing: ClassResource[], name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'resource';
  let id = base;
  let n = 2;
  while (existing.some((r) => r.id === id)) id = `${base}-${n++}`;
  return id;
}
