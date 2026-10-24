import { DndDatabase } from '../types/dnd';
import { getBuiltInSfxCatalog } from './sfxCatalog';

// A fresh install starts empty: only the built-in sound library is provided.
function buildSeedDatabase(lang: 'en' | 'it'): DndDatabase {
  return {
    version: 1,
    lastSavedAt: new Date().toISOString(),
    campaigns: [],
    characters: [],
    parties: [],
    sfxCatalog: getBuiltInSfxCatalog(lang),
    adventures: [],
    playInstances: [],
  };
}

export const SEED_DATABASE_EN: DndDatabase = buildSeedDatabase('en');
export const SEED_DATABASE_IT: DndDatabase = buildSeedDatabase('it');

export const SEED_DATABASE: DndDatabase = SEED_DATABASE_EN;

export function getSeedDatabase(lang: 'en' | 'it'): DndDatabase {
  return buildSeedDatabase(lang);
}
