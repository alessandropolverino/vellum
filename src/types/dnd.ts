export type EntityKind = 'pc' | 'npc' | 'monster';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type SkillId =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival';

/** 0 = Not Proficient, 1 = Proficient (+PB), 2 = Expertise (+2*PB) */
export type ProficiencyRank = 0 | 1 | 2;

export interface SkillDefinition {
  id: SkillId;
  ability: AbilityKey;
  labelEn: string;
  labelIt: string;
}

export const DND_SKILLS: readonly SkillDefinition[] = [
  { id: 'acrobatics', ability: 'dex', labelEn: 'Acrobatics', labelIt: 'Acrobazia' },
  { id: 'animal_handling', ability: 'wis', labelEn: 'Animal Handling', labelIt: 'Addestrare Animali' },
  { id: 'arcana', ability: 'int', labelEn: 'Arcana', labelIt: 'Arcano' },
  { id: 'athletics', ability: 'str', labelEn: 'Athletics', labelIt: 'Atletica' },
  { id: 'deception', ability: 'cha', labelEn: 'Deception', labelIt: 'Inganno' },
  { id: 'history', ability: 'int', labelEn: 'History', labelIt: 'Storia' },
  { id: 'insight', ability: 'wis', labelEn: 'Insight', labelIt: 'Intuizione' },
  { id: 'intimidation', ability: 'cha', labelEn: 'Intimidation', labelIt: 'Intimidire' },
  { id: 'investigation', ability: 'int', labelEn: 'Investigation', labelIt: 'Indagare' },
  { id: 'medicine', ability: 'wis', labelEn: 'Medicine', labelIt: 'Medicina' },
  { id: 'nature', ability: 'int', labelEn: 'Nature', labelIt: 'Natura' },
  { id: 'perception', ability: 'wis', labelEn: 'Perception', labelIt: 'Percezione' },
  { id: 'performance', ability: 'cha', labelEn: 'Performance', labelIt: 'Intrattenere' },
  { id: 'persuasion', ability: 'cha', labelEn: 'Persuasion', labelIt: 'Persuasione' },
  { id: 'religion', ability: 'int', labelEn: 'Religion', labelIt: 'Religione' },
  { id: 'sleight_of_hand', ability: 'dex', labelEn: 'Sleight of Hand', labelIt: 'Rapidità di Mano' },
  { id: 'stealth', ability: 'dex', labelEn: 'Stealth', labelIt: 'Furtività' },
  { id: 'survival', ability: 'wis', labelEn: 'Survival', labelIt: 'Sopravvivenza' },
] as const;

export const DND_ABILITY_META: readonly {
  key: AbilityKey;
  shortEn: string;
  shortIt: string;
  fullEn: string;
  fullIt: string;
}[] = [
  { key: 'str', shortEn: 'STR', shortIt: 'FOR', fullEn: 'Strength', fullIt: 'Forza' },
  { key: 'dex', shortEn: 'DEX', shortIt: 'DES', fullEn: 'Dexterity', fullIt: 'Destrezza' },
  { key: 'con', shortEn: 'CON', shortIt: 'COS', fullEn: 'Constitution', fullIt: 'Costituzione' },
  { key: 'int', shortEn: 'INT', shortIt: 'INT', fullEn: 'Intelligence', fullIt: 'Intelligenza' },
  { key: 'wis', shortEn: 'WIS', shortIt: 'SAG', fullEn: 'Wisdom', fullIt: 'Saggezza' },
  { key: 'cha', shortEn: 'CHA', shortIt: 'CAR', fullEn: 'Charisma', fullIt: 'Carisma' },
] as const;

export interface StatblockEntry {
  name: string;
  description: string;
  attackBonus?: number;
  damageFormula?: string;
}

export interface CharacterEntity {
  id: string;
  kind: EntityKind;
  name: string;
  playerOrRole: string; // Player name for PCs (can be empty if pre-gen blueprint), or narrative role ("Innkeeper", "Final Boss") for NPCs/Monsters
  isPreGenBlueprint?: boolean; // True when DM creates a reusable PC archetype/pre-gen not yet assigned to a specific player
  sourceBlueprintId?: string; // If this PC was instantiated from a pre-gen blueprint, stores the blueprint ID
  instanceOnlyId?: string; // If this PC was created strictly for a single PlayInstance without cluttering the global blueprint list
  portraitUrl?: string; // DataURL or image URL for PC, NPC, or Monster/Boss portrait
  background?: string; // D&D 5e Background (e.g. "Noble", "Sage", "Outlander")
  proficiencyBonus?: number; // Explicit override; otherwise auto-derived from levelOrCr
  savingThrowProficiencies?: Partial<Record<AbilityKey, boolean>>;
  skillProficiencies?: Partial<Record<SkillId, ProficiencyRank>>;
  size: string; // e.g. "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan" (or localized equivalent)
  creatureType: string; // e.g. "Humanoid (Elf)", "Undead", "Dragon", "Aberration"
  alignment: string;
  classOrArchetype?: string;
  levelOrCr: string; // e.g. "Level 4" for PCs or "CR 2 (450 XP)" for Monsters/NPCs
  ac: number;
  acNote?: string; // e.g. "(Studded leather, shield)"
  hpMax: number;
  hitDiceFormula: string; // e.g. "6d8 + 12"
  speed: string; // e.g. "30 ft., fly 60 ft."
  initiativeBonus: number;
  passivePerception: number;
  abilities: AbilityScores;
  savingThrows?: string;
  skills?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  senses?: string;
  languages?: string;
  otherProficiencies?: string; // Armor, weapons and tools (official sheet "Other Proficiencies")
  spellcastingAbility?: AbilityKey;
  equipment?: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  traits: StatblockEntry[];
  actions: StatblockEntry[];
  reactionsOrLegendary?: StatblockEntry[];
  spellsNotes?: string;
  biographyOrLore: string;
  tags: string[];
  accentColor?: string;
}

export interface PartyGroup {
  id: string;
  name: string;
  description: string;
  memberCharacterIds: string[];
}

export type SfxCategory =
  | 'ambience'
  | 'combat_music'
  | 'sfx_environment'
  | 'sfx_creature'
  | 'sfx_magic'
  | 'sfx_ui';

export type SynthPresetId =
  | 'tavern_hearth'
  | 'dungeon_wind'
  | 'rain_storm'
  | 'thunder_clap'
  | 'creaking_door'
  | 'sword_clash'
  | 'dragon_roar'
  | 'arcane_blast'
  | 'healing_chime'
  | 'trap_trigger'
  | 'war_horn'
  | 'combat_drums'
  | 'crypt_whispers'
  | 'dice_roll';

export interface SfxItem {
  id: string;
  name: string;
  category: SfxCategory;
  description: string;
  loop: boolean;
  defaultVolume: number; // 0.0 - 1.0
  synthPreset: SynthPresetId;
  customAudioUrl?: string; // URL / DataURL or local file path uploaded by user
  iconName: string;
  color: string;
  tags: string[];
}

export interface EncounterSlot {
  characterId: string;
  count: number;
  customLabel?: string;
  notes?: string;
}

export type EncounterDifficulty =
  | 'Easy'
  | 'Medium'
  | 'Hard'
  | 'Deadly'
  | 'Facile'
  | 'Media'
  | 'Difficile'
  | 'Mortale';

export interface EncounterPreset {
  id: string;
  name: string;
  difficulty: EncounterDifficulty;
  environment: string;
  description: string;
  slots: EncounterSlot[];
  autoSfxId?: string;
}

export interface AdventureScene {
  id: string;
  code: string; // e.g. "Act I - Scene 1"
  title: string;
  estimatedMinutes: number;
  location: string;
  summary: string;
  homebreweryMarkdown: string;
  linkedCharacterIds: string[]; // NPCs or Monsters featured in this scene
  linkedSfxIds: string[]; // SFX specifically assigned to this scene for quick access
  encounters: EncounterPreset[];
}

export interface Campaign {
  id: string;
  title: string;
  setting: string;
  description: string;
  status: 'Active' | 'Prep' | 'Completed' | 'In Corso' | 'In Preparazione' | 'Conclusa';
  createdAt: string;
}

export interface AdventureBlueprint {
  id: string;
  title: string;
  subtitle: string;
  type: 'oneshot' | 'campaign_module';
  campaignId?: string;
  episodeNumber?: number;
  levelRange: string;
  estimatedDuration: string;
  authorOrNotes: string;
  tags: string[];
  defaultPartyIds?: string[];
  scenes: AdventureScene[];
  updatedAt: string;
}

export type SessionLogCategory =
  | 'narrative'
  | 'choice'
  | 'combat'
  | 'loot'
  | 'npc_interaction'
  | 'dm_note';

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  sceneId: string;
  sceneTitle: string;
  category: SessionLogCategory;
  title: string;
  details: string;
  pinnedForRecap: boolean;
}

export interface CombatParticipant {
  id: string;
  sourceCharacterId?: string;
  name: string;
  kind: EntityKind;
  initiative: number;
  ac: number;
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  conditions: string[];
  isConcentrating: boolean;
  notes: string;
}

export interface ActiveCombatState {
  isActive: boolean;
  encounterTitle: string;
  sceneId?: string;
  round: number;
  turnIndex: number;
  startedAt: string;
  participants: CombatParticipant[];
  combatEvents: string[];
}

export interface PcRuntimeStatus {
  characterId: string;
  playerOverride?: string; // Player assigned in this specific session/instance (allows playing a Pre-Gen Blueprint without mutating it)
  customNameOverride?: string; // Optional custom hero name in this instance
  hpCurrent: number;
  tempHp: number;
  conditions: string[];
  inspiration: boolean;
  sessionNotes: string;
}

export interface PlayInstance {
  id: string;
  adventureId: string;
  instanceName: string; // e.g. "Thursday Group - The Silver Ravens"
  groupName: string;
  partyCharacterIds: string[]; // PCs playing in this instance
  status: 'active' | 'paused' | 'completed';
  sessionCount: number;
  currentSceneId: string;
  visitedSceneIds: string[];
  sceneNotes: Record<string, string>; // Per-scene DM notes isolated to this instance
  pcStatus: Record<string, PcRuntimeStatus>;
  timeline: SessionLogEntry[];
  activeCombat: ActiveCombatState | null;
  startedAt: string;
  lastPlayedAt: string;
}

export interface DndDatabase {
  version: number;
  lastSavedAt: string;
  campaigns: Campaign[];
  adventures: AdventureBlueprint[];
  characters: CharacterEntity[];
  parties: PartyGroup[];
  sfxCatalog: SfxItem[];
  playInstances: PlayInstance[];
}

export const DND_CONDITIONS_EN = [
  'Blinded',
  'Charmed',
  'Grappled',
  'Deafened',
  'Poisoned',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Prone',
  'Frightened',
  'Stunned',
  'Restrained',
  'Unconscious',
  'Concentrating',
  'Blessed',
] as const;

export const DND_CONDITIONS_IT = [
  'Accecato',
  'Affascinato',
  'Afferrato',
  'Assordato',
  'Avvelenato',
  'Incapacitato',
  'Invisibile',
  'Paralizzato',
  'Pietrificato',
  'Prono',
  'Spaventato',
  'Stordito',
  'Trattenuto',
  'Privo di sensi',
  'Concentrazione',
  'Benedetto',
] as const;

export const DND_CONDITIONS = DND_CONDITIONS_EN;

export function getDndConditions(lang: 'en' | 'it'): readonly string[] {
  return lang === 'it' ? DND_CONDITIONS_IT : DND_CONDITIONS_EN;
}

export function formatMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getModValue(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatSignedBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * Derive D&D 5e Proficiency Bonus (+2 to +9) from `levelOrCr` or explicit override.
 */
export function getProficiencyBonus(char: Pick<CharacterEntity, 'levelOrCr' | 'proficiencyBonus'>): number {
  if (typeof char.proficiencyBonus === 'number' && char.proficiencyBonus >= 2) {
    return char.proficiencyBonus;
  }
  const text = (char.levelOrCr || '').toLowerCase();
  const match = text.match(/(\d+)/);
  if (!match) return 2;
  const num = parseInt(match[1], 10);
  if (isNaN(num) || num <= 4) return 2;
  if (num <= 8) return 3;
  if (num <= 12) return 4;
  if (num <= 16) return 5;
  if (num <= 20) return 6;
  if (num <= 24) return 7;
  if (num <= 28) return 8;
  return 9;
}

/**
 * Resolves saving throw proficiencies from either structured `savingThrowProficiencies`
 * or legacy free-text `savingThrows` string (e.g., "WIS +3, CHA +5" or "SAG +3, CAR +5").
 */
export function resolveSavingThrowProficiencies(
  char: Pick<CharacterEntity, 'savingThrowProficiencies' | 'savingThrows'>
): Record<AbilityKey, boolean> {
  const result: Record<AbilityKey, boolean> = {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false,
  };
  if (char.savingThrowProficiencies) {
    for (const k of Object.keys(result) as AbilityKey[]) {
      if (char.savingThrowProficiencies[k]) result[k] = true;
    }
    return result;
  }
  const raw = (char.savingThrows || '').toUpperCase();
  if (/\b(STR|FOR|STRENGTH|FORZA)\b/.test(raw)) result.str = true;
  if (/\b(DEX|DES|DEXTERITY|DESTREZZA)\b/.test(raw)) result.dex = true;
  if (/\b(CON|COS|CONSTITUTION|COSTITUZIONE)\b/.test(raw)) result.con = true;
  if (/\b(INT|INTELLIGENCE|INTELLIGENZA)\b/.test(raw)) result.int = true;
  if (/\b(WIS|SAG|WISDOM|SAGGEZZA)\b/.test(raw)) result.wis = true;
  if (/\b(CHA|CAR|CHARISMA|CARISMA)\b/.test(raw)) result.cha = true;
  return result;
}

/**
 * Resolves all 18 D&D 5e skill proficiency ranks (0 = none, 1 = proficient, 2 = expertise)
 * from structured `skillProficiencies` or legacy `skills` string.
 */
export function resolveSkillProficiencies(
  char: Pick<CharacterEntity, 'skillProficiencies' | 'skills' | 'abilities' | 'levelOrCr' | 'proficiencyBonus'>
): Record<SkillId, ProficiencyRank> {
  const result = {} as Record<SkillId, ProficiencyRank>;
  for (const s of DND_SKILLS) {
    result[s.id] = 0;
  }
  if (char.skillProficiencies) {
    for (const s of DND_SKILLS) {
      const rank = char.skillProficiencies[s.id];
      if (rank === 1 || rank === 2) result[s.id] = rank;
    }
    return result;
  }
  const raw = (char.skills || '').toLowerCase();
  if (!raw.trim()) return result;

  const pb = getProficiencyBonus(char);
  for (const s of DND_SKILLS) {
    const names = [s.labelEn.toLowerCase(), s.labelIt.toLowerCase()];
    for (const name of names) {
      const idx = raw.indexOf(name);
      if (idx !== -1) {
        const after = raw.slice(idx + name.length, idx + name.length + 10);
        const bonusMatch = after.match(/([+-]?\d+)/);
        const abilityMod = getModValue(char.abilities[s.ability]);
        if (bonusMatch) {
          const listedBonus = parseInt(bonusMatch[1], 10);
          if (listedBonus >= abilityMod + pb * 2) {
            result[s.id] = 2;
          } else {
            result[s.id] = 1;
          }
        } else {
          result[s.id] = 1;
        }
        break;
      }
    }
  }
  return result;
}

/**
 * Computes total bonus for a single D&D 5e skill.
 */
export function getSkillTotalBonus(
  char: Pick<CharacterEntity, 'abilities' | 'levelOrCr' | 'proficiencyBonus' | 'skillProficiencies' | 'skills'>,
  skillId: SkillId
): { total: number; rank: ProficiencyRank; ability: AbilityKey } {
  const def = DND_SKILLS.find((s) => s.id === skillId)!;
  const ranks = resolveSkillProficiencies(char);
  const rank = ranks[skillId] || 0;
  const pb = getProficiencyBonus(char);
  const mod = getModValue(char.abilities[def.ability]);
  return {
    total: mod + rank * pb,
    rank,
    ability: def.ability,
  };
}

/**
 * Computes total bonus for a single D&D 5e saving throw.
 */
export function getSavingThrowTotalBonus(
  char: Pick<CharacterEntity, 'abilities' | 'levelOrCr' | 'proficiencyBonus' | 'savingThrowProficiencies' | 'savingThrows'>,
  ability: AbilityKey
): { total: number; proficient: boolean } {
  const profs = resolveSavingThrowProficiencies(char);
  const proficient = profs[ability] || false;
  const pb = getProficiencyBonus(char);
  const mod = getModValue(char.abilities[ability]);
  return {
    total: mod + (proficient ? pb : 0),
    proficient,
  };
}

/**
 * Formats proficient saving throws and skills back into summary strings for compact statblock lines.
 */
export function formatProficientSavesSummary(
  char: Pick<CharacterEntity, 'abilities' | 'levelOrCr' | 'proficiencyBonus' | 'savingThrowProficiencies' | 'savingThrows'>,
  lang: 'en' | 'it'
): string {
  const parts: string[] = [];
  for (const ab of DND_ABILITY_META) {
    const { total, proficient } = getSavingThrowTotalBonus(char, ab.key);
    if (proficient) {
      parts.push(`${lang === 'it' ? ab.shortIt : ab.shortEn} ${formatSignedBonus(total)}`);
    }
  }
  return parts.join(', ');
}

export function formatProficientSkillsSummary(
  char: Pick<CharacterEntity, 'abilities' | 'levelOrCr' | 'proficiencyBonus' | 'skillProficiencies' | 'skills'>,
  lang: 'en' | 'it'
): string {
  const parts: string[] = [];
  for (const sk of DND_SKILLS) {
    const { total, rank } = getSkillTotalBonus(char, sk.id);
    if (rank > 0) {
      const label = lang === 'it' ? sk.labelIt : sk.labelEn;
      parts.push(`${label} ${formatSignedBonus(total)}${rank === 2 ? ' (★★)' : ''}`);
    }
  }
  return parts.join(', ');
}

/**
 * Checks whether a PC is currently an unassigned Pre-Gen / Blueprint.
 */
export function isPcBlueprint(char: CharacterEntity): boolean {
  if (char.kind !== 'pc') return false;
  if (char.isPreGenBlueprint === true) return true;
  if (char.isPreGenBlueprint === false) return false;
  const role = (char.playerOrRole || '').trim().toLowerCase();
  return (
    !role ||
    role === 'player: ...' ||
    role === 'giocatore: ...' ||
    role.includes('blueprint') ||
    role.includes('pre-gen') ||
    role.includes('pregenerato') ||
    role.includes('non assegnato') ||
    role.includes('unassigned')
  );
}
