export type EntityKind = 'pc' | 'npc' | 'monster';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

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
  playerOrRole: string; // Player name for PCs, or narrative role ("Innkeeper", "Final Boss") for NPCs/Monsters
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
  senses?: string;
  languages?: string;
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
