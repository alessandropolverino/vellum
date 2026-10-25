import {
  formatMod,
  formatSignedBonus,
  getProficiencyBonus,
  type AbilityKey,
  type CharacterEntity,
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
  runtime: PcRuntimeStatus | undefined
) {
  return {
    type: 'sheet',
    c: {
      name: runtime?.customNameOverride || pc.name,
      player: runtime?.playerOverride || pc.playerOrRole,
      classOrArchetype: pc.classOrArchetype || '',
      levelOrCr: pc.levelOrCr,
      background: pc.background || '',
      alignment: pc.alignment,
      ac: pc.ac,
      acNote: pc.acNote || '',
      hpCurrent: runtime?.hpCurrent ?? pc.hpMax,
      hpMax: pc.hpMax,
      tempHp: runtime?.tempHp ?? 0,
      conditions: runtime?.conditions ?? [],
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
