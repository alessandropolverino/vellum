import {
  AdventureBlueprint,
  AdventureScene,
  Campaign,
  CharacterEntity,
  DndDatabase,
  PartyGroup,
  PlayInstance,
  SfxItem,
} from '../types/dnd';

export const CURRENT_SCHEMA_VERSION = 1;

export interface MigrationResult {
  db: DndDatabase;
  migrated: boolean;
  oldVersion: number;
  newVersion: number;
}

/**
 * Defensive normalizer: guarantees that any loaded JSON (even from an older version,
 * partial export, or legacy state) conforms strictly to DndDatabase structure with
 * no undefined arrays or missing mandatory fields.
 */
export function normalizeDatabase(raw: unknown): DndDatabase {
  const candidate = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const version = typeof candidate.version === 'number' && candidate.version > 0
    ? candidate.version
    : 1;

  const lastSavedAt = typeof candidate.lastSavedAt === 'string' && candidate.lastSavedAt
    ? candidate.lastSavedAt
    : new Date().toISOString();

  const campaigns: Campaign[] = Array.isArray(candidate.campaigns)
    ? candidate.campaigns.map((c: any) => ({
        id: String(c?.id || `camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        title: String(c?.title || 'Untitled Campaign'),
        setting: String(c?.setting || 'Forgotten Realms'),
        description: String(c?.description || ''),
        status: (['Active', 'Prep', 'Completed', 'In Corso', 'In Preparazione', 'Conclusa'].includes(c?.status)
          ? c.status
          : 'Active') as Campaign['status'],
        createdAt: String(c?.createdAt || new Date().toISOString().slice(0, 10)),
      }))
    : [];

  const adventures: AdventureBlueprint[] = Array.isArray(candidate.adventures)
    ? candidate.adventures.map((a: any) => ({
        id: String(a?.id || `adv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        title: String(a?.title || 'Untitled Adventure'),
        subtitle: String(a?.subtitle || ''),
        type: (a?.type === 'campaign_module' ? 'campaign_module' : 'oneshot') as AdventureBlueprint['type'],
        campaignId: a?.campaignId ? String(a.campaignId) : undefined,
        episodeNumber: typeof a?.episodeNumber === 'number' ? a.episodeNumber : undefined,
        levelRange: String(a?.levelRange || 'Levels 1–5'),
        estimatedDuration: String(a?.estimatedDuration || '3–4 hours'),
        authorOrNotes: String(a?.authorOrNotes || ''),
        tags: Array.isArray(a?.tags) ? a.tags.map(String) : [],
        defaultPartyIds: Array.isArray(a?.defaultPartyIds) ? a.defaultPartyIds.map(String) : undefined,
        scenes: Array.isArray(a?.scenes)
          ? a.scenes.map((s: any, idx: number): AdventureScene => ({
              id: String(s?.id || `scene-${Date.now()}-${idx}`),
              code: String(s?.code || `Act I - Scene ${idx + 1}`),
              title: String(s?.title || `Scene ${idx + 1}`),
              estimatedMinutes: Number(s?.estimatedMinutes) || 45,
              location: String(s?.location || ''),
              summary: String(s?.summary || ''),
              homebreweryMarkdown: String(s?.homebreweryMarkdown || ''),
              linkedCharacterIds: Array.isArray(s?.linkedCharacterIds) ? s.linkedCharacterIds.map(String) : [],
              linkedSfxIds: Array.isArray(s?.linkedSfxIds) ? s.linkedSfxIds.map(String) : [],
              encounters: Array.isArray(s?.encounters) ? s.encounters : [],
            }))
          : [],
        updatedAt: String(a?.updatedAt || new Date().toISOString().slice(0, 10)),
      }))
    : [];

  const characters: CharacterEntity[] = Array.isArray(candidate.characters)
    ? candidate.characters.map((ch: any): CharacterEntity => ({
        id: String(ch?.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        kind: (ch?.kind === 'npc' || ch?.kind === 'monster' ? ch.kind : 'pc') as CharacterEntity['kind'],
        name: String(ch?.name || 'Unnamed Character'),
        playerOrRole: String(ch?.playerOrRole || ''),
        isPreGenBlueprint: Boolean(ch?.isPreGenBlueprint),
        sourceBlueprintId: ch?.sourceBlueprintId ? String(ch.sourceBlueprintId) : undefined,
        instanceOnlyId: ch?.instanceOnlyId ? String(ch.instanceOnlyId) : undefined,
        portraitUrl: typeof ch?.portraitUrl === 'string' ? ch.portraitUrl : undefined,
        background: ch?.background ? String(ch.background) : undefined,
        proficiencyBonus: typeof ch?.proficiencyBonus === 'number' ? ch.proficiencyBonus : undefined,
        savingThrowProficiencies: typeof ch?.savingThrowProficiencies === 'object' && ch?.savingThrowProficiencies
          ? ch.savingThrowProficiencies
          : {},
        skillProficiencies: typeof ch?.skillProficiencies === 'object' && ch?.skillProficiencies
          ? ch.skillProficiencies
          : {},
        size: String(ch?.size || 'Medium'),
        creatureType: String(ch?.creatureType || 'Humanoid'),
        alignment: String(ch?.alignment || 'Neutral'),
        classOrArchetype: ch?.classOrArchetype ? String(ch.classOrArchetype) : undefined,
        levelOrCr: String(ch?.levelOrCr || 'Level 1'),
        ac: Number(ch?.ac) || 10,
        acNote: ch?.acNote ? String(ch.acNote) : undefined,
        hpMax: Number(ch?.hpMax) || 10,
        hitDiceFormula: String(ch?.hitDiceFormula || '1d8'),
        speed: String(ch?.speed || '30 ft.'),
        initiativeBonus: Number(ch?.initiativeBonus) || 0,
        passivePerception: Number(ch?.passivePerception) || 10,
        abilities: {
          str: Number(ch?.abilities?.str) || 10,
          dex: Number(ch?.abilities?.dex) || 10,
          con: Number(ch?.abilities?.con) || 10,
          int: Number(ch?.abilities?.int) || 10,
          wis: Number(ch?.abilities?.wis) || 10,
          cha: Number(ch?.abilities?.cha) || 10,
        },
        savingThrows: ch?.savingThrows ? String(ch.savingThrows) : undefined,
        skills: ch?.skills ? String(ch.skills) : undefined,
        damageResistances: ch?.damageResistances ? String(ch.damageResistances) : undefined,
        senses: ch?.senses ? String(ch.senses) : undefined,
        languages: ch?.languages ? String(ch.languages) : undefined,
        traits: Array.isArray(ch?.traits) ? ch.traits : [],
        actions: Array.isArray(ch?.actions) ? ch.actions : [],
        reactionsOrLegendary: Array.isArray(ch?.reactionsOrLegendary) ? ch.reactionsOrLegendary : undefined,
        spellsNotes: ch?.spellsNotes ? String(ch.spellsNotes) : undefined,
        biographyOrLore: String(ch?.biographyOrLore || ''),
        tags: Array.isArray(ch?.tags) ? ch.tags.map(String) : [],
        accentColor: ch?.accentColor ? String(ch.accentColor) : undefined,
      }))
    : [];

  const parties: PartyGroup[] = Array.isArray(candidate.parties)
    ? candidate.parties.map((p: any): PartyGroup => ({
        id: String(p?.id || `party-${Date.now()}`),
        name: String(p?.name || 'Adventuring Party'),
        description: String(p?.description || ''),
        memberCharacterIds: Array.isArray(p?.memberCharacterIds)
          ? p.memberCharacterIds.map(String)
          : [],
      }))
    : [];

  const sfxCatalog: SfxItem[] = Array.isArray(candidate.sfxCatalog)
    ? candidate.sfxCatalog.map((s: any): SfxItem => ({
        id: String(s?.id || `sfx-${Date.now()}`),
        name: String(s?.name || s?.title || 'SFX Item'),
        category: s?.category || 'ambience',
        description: String(s?.description || ''),
        loop: Boolean(s?.loop),
        defaultVolume: typeof s?.defaultVolume === 'number' ? s.defaultVolume : 0.6,
        synthPreset: s?.synthPreset || 'tavern_hearth',
        customAudioUrl: typeof s?.customAudioUrl === 'string' ? s.customAudioUrl : undefined,
        iconName: String(s?.iconName || 'Volume2'),
        color: String(s?.color || 'amber'),
        tags: Array.isArray(s?.tags) ? s.tags.map(String) : [],
      }))
    : [];

  const playInstances: PlayInstance[] = Array.isArray(candidate.playInstances)
    ? candidate.playInstances.map((inst: any): PlayInstance => ({
        id: String(inst?.id || `inst-${Date.now()}`),
        adventureId: String(inst?.adventureId || ''),
        instanceName: String(inst?.instanceName || 'Session Run'),
        groupName: String(inst?.groupName || 'Party'),
        partyCharacterIds: Array.isArray(inst?.partyCharacterIds)
          ? inst.partyCharacterIds.map(String)
          : [],
        status: (inst?.status === 'completed' || inst?.status === 'paused' ? inst.status : 'active') as PlayInstance['status'],
        sessionCount: Number(inst?.sessionCount) || 1,
        currentSceneId: String(inst?.currentSceneId || ''),
        visitedSceneIds: Array.isArray(inst?.visitedSceneIds)
          ? inst.visitedSceneIds.map(String)
          : [],
        sceneNotes: typeof inst?.sceneNotes === 'object' && inst?.sceneNotes ? inst.sceneNotes : {},
        pcStatus: typeof inst?.pcStatus === 'object' && inst?.pcStatus ? inst.pcStatus : {},
        timeline: Array.isArray(inst?.timeline) ? inst.timeline : [],
        activeCombat: inst?.activeCombat || null,
        startedAt: String(inst?.startedAt || new Date().toISOString()),
        lastPlayedAt: String(inst?.lastPlayedAt || new Date().toISOString()),
      }))
    : [];

  return {
    version,
    lastSavedAt,
    campaigns,
    adventures,
    characters,
    parties,
    sfxCatalog,
    playInstances,
  };
}

/**
 * Migration runner: upgrades database from older version schemas to CURRENT_SCHEMA_VERSION
 */
export function migrateDatabase(raw: unknown): MigrationResult {
  const normalized = normalizeDatabase(raw);
  const oldVersion = normalized.version;
  let current = normalized;
  let migrated = false;

  // In the future:
  // if (current.version === 1) {
  //   current = migrateV1ToV2(current);
  //   migrated = true;
  // }

  if (current.version < CURRENT_SCHEMA_VERSION) {
    current = {
      ...current,
      version: CURRENT_SCHEMA_VERSION,
    };
    migrated = true;
  }

  return {
    db: current,
    migrated,
    oldVersion,
    newVersion: current.version,
  };
}

/**
 * Non-destructive merge of official/seed content:
 * Adds newly released official 5e adventures, pre-gen blueprints, or SFX
 * without overwriting custom user campaigns, characters, or session logs.
 */
export function mergeSeedContent(
  currentDb: DndDatabase,
  seedDb: DndDatabase,
  options: {
    addMissingAdventures?: boolean;
    addMissingPreGens?: boolean;
    addMissingSfx?: boolean;
  } = { addMissingAdventures: true, addMissingPreGens: true, addMissingSfx: true }
): {
  db: DndDatabase;
  addedAdventures: number;
  addedCharacters: number;
  addedSfx: number;
} {
  let addedAdventures = 0;
  let addedCharacters = 0;
  let addedSfx = 0;

  const nextAdventures = [...currentDb.adventures];
  if (options.addMissingAdventures) {
    for (const seedAdv of seedDb.adventures) {
      if (!nextAdventures.some((a) => a.id === seedAdv.id)) {
        nextAdventures.push(seedAdv);
        addedAdventures++;
      }
    }
  }

  const nextCharacters = [...currentDb.characters];
  if (options.addMissingPreGens) {
    for (const seedChar of seedDb.characters) {
      if (!nextCharacters.some((c) => c.id === seedChar.id)) {
        nextCharacters.push(seedChar);
        addedCharacters++;
      }
    }
  }

  const nextSfx = [...currentDb.sfxCatalog];
  if (options.addMissingSfx) {
    for (const seedItem of seedDb.sfxCatalog) {
      if (!nextSfx.some((s) => s.id === seedItem.id)) {
        nextSfx.push(seedItem);
        addedSfx++;
      }
    }
  }

  return {
    db: {
      ...currentDb,
      adventures: nextAdventures,
      characters: nextCharacters,
      sfxCatalog: nextSfx,
      lastSavedAt: new Date().toISOString(),
    },
    addedAdventures,
    addedCharacters,
    addedSfx,
  };
}
