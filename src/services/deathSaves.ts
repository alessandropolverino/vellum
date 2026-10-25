import type { DeathSaves } from '../types/dnd';

/** D&D 5e death saving throw rules, kept free of UI so they are easy to reason about and test. */

export type DeathState = 'conscious' | 'dying' | 'stable' | 'dead';

export type DeathSaveOutcome = 'revived' | 'success' | 'failure' | 'double-failure';

const MAX = 3;

export const EMPTY_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

const clamp = (n: number) => Math.max(0, Math.min(MAX, n));

/** State of a player character who is at 0 HP (never 'conscious'). */
export function deathStateAtZero(saves: DeathSaves | undefined): Exclude<DeathState, 'conscious'> {
  const s = saves ?? EMPTY_DEATH_SAVES;
  if (s.failures >= MAX) return 'dead';
  if (s.stable || s.successes >= MAX) return 'stable';
  return 'dying';
}

/** State of a player character given its hit points and tally. */
export function deathStateOf(hpCurrent: number, saves: DeathSaves | undefined): DeathState {
  return hpCurrent > 0 ? 'conscious' : deathStateAtZero(saves);
}

/**
 * Applies one death saving throw (the d20 result, no modifier).
 * 20 revives with 1 HP, 10+ is a success, 2-9 a failure, 1 counts as two failures.
 */
export function applyDeathSave(
  saves: DeathSaves | undefined,
  roll: number
): { saves: DeathSaves | undefined; outcome: DeathSaveOutcome } {
  const s = saves ?? EMPTY_DEATH_SAVES;
  if (roll >= 20) return { saves: undefined, outcome: 'revived' };
  if (roll <= 1) {
    return { saves: { successes: s.successes, failures: clamp(s.failures + 2) }, outcome: 'double-failure' };
  }
  if (roll >= 10) {
    const successes = clamp(s.successes + 1);
    return { saves: { successes, failures: s.failures, stable: successes >= MAX || s.stable }, outcome: 'success' };
  }
  return { saves: { successes: s.successes, failures: clamp(s.failures + 1), stable: s.stable }, outcome: 'failure' };
}

/**
 * Damage taken at 0 HP is a failed death save (two if it was a critical hit). Damage also
 * ends stability: the creature is dying again and its successes start over.
 */
export function damageAtZero(saves: DeathSaves | undefined, critical = false): DeathSaves {
  const s = saves ?? EMPTY_DEATH_SAVES;
  return { successes: s.stable ? 0 : s.successes, failures: clamp(s.failures + (critical ? 2 : 1)) };
}

/** Massive damage: what is left after reaching 0 HP is at least the character's HP maximum. */
export function isInstantDeath(overflow: number, hpMax: number): boolean {
  return hpMax > 0 && overflow >= hpMax;
}

export const DEAD_SAVES: DeathSaves = { successes: 0, failures: MAX };
