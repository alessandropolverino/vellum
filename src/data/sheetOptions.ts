import type { AbilityKey } from '../types/dnd';

type Lang = 'en' | 'it';

export const SIZE_OPTIONS = [
  { en: 'Tiny', it: 'Minuscola' },
  { en: 'Small', it: 'Piccola' },
  { en: 'Medium', it: 'Media' },
  { en: 'Large', it: 'Grande' },
  { en: 'Huge', it: 'Enorme' },
  { en: 'Gargantuan', it: 'Mastodontica' },
] as const;

/** Maps a stored size (either language) to the option name in `lang`; unknown values are kept as typed. */
export function localizeSize(value: string | undefined, lang: Lang): string {
  const v = (value || '').trim().toLowerCase();
  const hit = SIZE_OPTIONS.find((s) => s.en.toLowerCase() === v || s.it.toLowerCase() === v);
  return hit ? hit[lang] : value || SIZE_OPTIONS[2][lang];
}

export const ALIGNMENT_OPTIONS = [
  { en: 'Lawful Good', it: 'Legale Buono' },
  { en: 'Neutral Good', it: 'Neutrale Buono' },
  { en: 'Chaotic Good', it: 'Caotico Buono' },
  { en: 'Lawful Neutral', it: 'Legale Neutrale' },
  { en: 'True Neutral', it: 'Neutrale' },
  { en: 'Chaotic Neutral', it: 'Caotico Neutrale' },
  { en: 'Lawful Evil', it: 'Legale Malvagio' },
  { en: 'Neutral Evil', it: 'Neutrale Malvagio' },
  { en: 'Chaotic Evil', it: 'Caotico Malvagio' },
] as const;

export const BACKGROUND_OPTIONS = [
  { en: 'Acolyte', it: 'Accolito' },
  { en: 'Charlatan', it: 'Ciarlatano' },
  { en: 'Criminal', it: 'Criminale' },
  { en: 'Entertainer', it: 'Intrattenitore' },
  { en: 'Folk Hero', it: 'Eroe Popolare' },
  { en: 'Guild Artisan', it: 'Artigiano di Gilda' },
  { en: 'Hermit', it: 'Eremita' },
  { en: 'Noble', it: 'Nobile' },
  { en: 'Outlander', it: 'Straniero' },
  { en: 'Sage', it: 'Sapiente' },
  { en: 'Sailor', it: 'Marinaio' },
  { en: 'Soldier', it: 'Soldato' },
  { en: 'Urchin', it: 'Monello' },
] as const;

export const SENSE_PRESETS = [
  { en: 'Darkvision 60 ft.', it: 'Scurovisione 18 m' },
  { en: 'Darkvision 120 ft.', it: 'Scurovisione 36 m' },
  { en: 'Blindsight 30 ft.', it: 'Vista cieca 9 m' },
  { en: 'Tremorsense 60 ft.', it: 'Percezione tellurica 18 m' },
  { en: 'Truesight 60 ft.', it: 'Vista pura 18 m' },
] as const;

export const LANGUAGE_PRESETS = [
  { en: 'Common', it: 'Comune' },
  { en: 'Dwarvish', it: 'Nanico' },
  { en: 'Elvish', it: 'Elfico' },
  { en: 'Giant', it: 'Gigante' },
  { en: 'Gnomish', it: 'Gnomesco' },
  { en: 'Goblin', it: 'Goblin' },
  { en: 'Halfling', it: 'Halfling' },
  { en: 'Orc', it: 'Orchesco' },
  { en: 'Abyssal', it: 'Abissale' },
  { en: 'Celestial', it: 'Celestiale' },
  { en: 'Draconic', it: 'Draconico' },
  { en: 'Infernal', it: 'Infernale' },
  { en: 'Primordial', it: 'Primordiale' },
  { en: 'Sylvan', it: 'Silvano' },
  { en: 'Undercommon', it: 'Sottocomune' },
  { en: 'Thieves’ Cant', it: 'Gergo dei Ladri' },
] as const;

export const DAMAGE_PRESETS = [
  { en: 'Fire', it: 'Fuoco' },
  { en: 'Cold', it: 'Freddo' },
  { en: 'Lightning', it: 'Fulmine' },
  { en: 'Poison', it: 'Veleno' },
  { en: 'Necrotic', it: 'Necrotico' },
  { en: 'Radiant', it: 'Radioso' },
  { en: 'Psychic', it: 'Psichico' },
] as const;

export const SPELLCASTING_ABILITIES: AbilityKey[] = ['int', 'wis', 'cha'];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const splitList = (csv: string | undefined): string[] =>
  (csv || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

export const listHas = (csv: string | undefined, item: string): boolean =>
  splitList(csv).some((s) => s.toLowerCase() === item.toLowerCase());

/** Adds `item` to a comma separated list, or removes it when already present. */
export function toggleListItem(csv: string | undefined, item: string): string {
  const items = splitList(csv);
  const idx = items.findIndex((s) => s.toLowerCase() === item.toLowerCase());
  if (idx >= 0) items.splice(idx, 1);
  else items.push(item);
  return items.join(', ');
}

/** Rolls 4d6 and drops the lowest die. */
export function roll4d6DropLowest(): number {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}
