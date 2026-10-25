import { deathStateAtZero } from './deathSaves';
import {
  formatMod,
  formatSignedBonus,
  getProficiencyBonus,
  type AbilityKey,
  type ActiveCombatState,
  type CharacterEntity,
  type CombatParticipant,
  type PcRuntimeStatus,
} from '../types/dnd';

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export interface PlayerRosterEntry {
  id: string;
  name: string;
  subtitle: string;
}

/**
 * Builds the read-only sheet a player sees on their phone. This is the single place that
 * decides what leaves the DM's machine: it only ever contains the player's own character,
 * never other characters, monsters or DM notes (`runtime.sessionNotes` is deliberately left out).
 */
export function buildPlayerSheet(
  pc: CharacterEntity,
  runtime: PcRuntimeStatus | undefined,
  iconVersion: string | null,
  /** This character's entry in the running combat, if any: it holds the live hit points. */
  fighting?: CombatParticipant
) {
  const hpCurrent = fighting ? fighting.hpCurrent : runtime?.hpCurrent ?? pc.hpMax;
  const saves = fighting?.deathSaves;
  return {
    type: 'sheet',
    c: {
      id: pc.id,
      icon: iconVersion,
      name: runtime?.customNameOverride || pc.name,
      player: runtime?.playerOverride || pc.playerOrRole,
      classOrArchetype: pc.classOrArchetype || '',
      levelOrCr: pc.levelOrCr,
      background: pc.background || '',
      alignment: pc.alignment,
      ac: pc.ac,
      acNote: pc.acNote || '',
      hpCurrent,
      hpMax: pc.hpMax,
      tempHp: fighting ? fighting.tempHp : runtime?.tempHp ?? 0,
      conditions: fighting ? fighting.conditions : runtime?.conditions ?? [],
      // Only the character's own tally: at 0 HP during a fight they are dying, stable or dead.
      death:
        fighting && hpCurrent === 0
          ? {
              state: deathStateAtZero(saves),
              successes: saves?.successes ?? 0,
              failures: saves?.failures ?? 0,
            }
          : null,
      inspiration: runtime?.inspiration ?? false,
      speed: pc.speed,
      initiative: formatSignedBonus(pc.initiativeBonus),
      passivePerception: pc.passivePerception,
      proficiencyBonus: formatSignedBonus(getProficiencyBonus(pc)),
      abilities: ABILITY_KEYS.map((key) => ({
        key,
        score: pc.abilities[key],
        mod: formatMod(pc.abilities[key]),
      })),
      savingThrows: pc.savingThrows || '',
      skills: pc.skills || '',
      languages: pc.languages || '',
      senses: pc.senses || '',
      otherProficiencies: pc.otherProficiencies || '',
      equipment: pc.equipment || '',
      spellsNotes: pc.spellsNotes || '',
      traits: pc.traits,
      actions: pc.actions,
      personality: {
        traits: pc.personalityTraits || '',
        ideals: pc.ideals || '',
        bonds: pc.bonds || '',
        flaws: pc.flaws || '',
      },
      biography: pc.biographyOrLore || '',
    },
  };
}

/** What a player may know about an enemy's health: a word, never numbers. */
export type EnemyStatus = 'unhurt' | 'wounded' | 'bloodied' | 'down';

export function enemyStatus(p: Pick<CombatParticipant, 'hpCurrent' | 'hpMax'>): EnemyStatus {
  if (p.hpMax <= 0) return 'unhurt';
  if (p.hpCurrent <= 0) return 'down';
  if (p.hpCurrent * 2 <= p.hpMax) return 'bloodied';
  if (p.hpCurrent < p.hpMax) return 'wounded';
  return 'unhurt';
}

/** Allies at 0 HP show as down (or dead); anyone else shows nothing. No numbers. */
function fallenAlly(p: CombatParticipant): 'down' | 'dead' | null {
  if (p.hpCurrent > 0) return null;
  return deathStateAtZero(p.deathSaves) === 'dead' ? 'dead' : 'down';
}

/**
 * Combat order for every phone. Player characters carry only their character id (their own HP
 * comes with their sheet); monsters and NPCs carry a health word. No hit points, AC, notes or
 * conditions of other participants are ever included.
 */
export function buildCombatPayload(
  combat: ActiveCombatState | null | undefined,
  iconVersions: Map<string, string>
) {
  if (!combat || !combat.isActive) return { type: 'combat', active: false };
  return {
    type: 'combat',
    active: true,
    title: combat.encounterTitle,
    round: combat.round,
    turn: combat.turnIndex,
    participants: combat.participants.map((p) => {
      const isPc = p.kind === 'pc';
      const iconKey = p.sourceCharacterId;
      return {
        id: p.id,
        name: p.name,
        kind: isPc ? 'pc' : 'foe',
        initiative: p.initiative,
        characterId: isPc ? p.sourceCharacterId || null : null,
        status: isPc ? fallenAlly(p) : enemyStatus(p),
        iconId: iconKey && iconVersions.has(iconKey) ? iconKey : null,
        icon: iconKey ? iconVersions.get(iconKey) ?? null : null,
      };
    }),
  };
}

/**
 * A character the DM shows to the table. Only the name, a short role line and the portrait are
 * shared; statblocks, lore and notes stay on the DM's machine.
 */
export function buildShownPayload(
  character: CharacterEntity | null,
  iconVersion: string | null
) {
  if (!character) return { type: 'shown', item: null };
  const subtitle =
    character.kind === 'pc'
      ? [character.classOrArchetype, character.levelOrCr].filter(Boolean).join(' · ')
      : character.playerOrRole || character.creatureType;
  return {
    type: 'shown',
    item: { title: character.name, subtitle, icon: iconVersion },
  };
}
