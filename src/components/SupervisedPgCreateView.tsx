import React, { useEffect, useState } from 'react';
import {
  AbilityKey,
  CharacterEntity,
  DND_ABILITY_META,
  DND_SKILLS,
  SkillId,
  formatProficientSavesSummary,
  formatProficientSkillsSummary,
  formatSignedBonus,
  getModValue,
  getProficiencyBonus,
  getSkillTotalBonus,
} from '../types/dnd';
import {
  ALIGNMENT_OPTIONS,
  BACKGROUND_OPTIONS,
  LANGUAGE_PRESETS,
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  SENSE_PRESETS,
  SIZE_OPTIONS,
  STANDARD_ARRAY,
  localizeSize,
  roll4d6DropLowest,
} from '../data/sheetOptions';
import { ChipField, Field, cardCls, inputCls, numCls } from './sheetFields';
import { useLanguage } from '../i18n/LanguageContext';
import {
  STANDARD_RACES,
  STANDARD_CLASSES,
  applyStandardTemplate,
  formatPgLevel,
  calculateExpectedHp,
  calculateStandardHitDiceFormula,
} from '../data/dnd5eRules';
import {
  Sparkles,
  Shield,
  Heart,
  Eye,
  Check,
  X,
  Compass,
  Info,
  ArrowLeft,
  Edit3,
  Save,
  Dices,
} from 'lucide-react';

const SkillPicker: React.FC<{
  options: readonly SkillId[];
  selected: SkillId[];
  max: number;
  onToggle: (id: SkillId) => void;
  lang: 'en' | 'it';
}> = ({ options, selected, max, onToggle, lang }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
    {options.map((id) => {
      const sk = DND_SKILLS.find((d) => d.id === id)!;
      const on = selected.includes(id);
      const locked = !on && selected.length >= max;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onToggle(id)}
          disabled={locked}
          className={`px-3 py-2 rounded-xl border text-xs text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            on
              ? 'bg-amber-600/20 border-amber-500 text-amber-200 font-bold'
              : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
          }`}
        >
          {on ? '● ' : '○ '}
          {lang === 'it' ? sk.labelIt : sk.labelEn}
        </button>
      );
    })}
  </div>
);

interface SupervisedPgCreateViewProps {
  isBlueprintDefault: boolean;
  onCancel: () => void;
  onSaveDirect: (char: CharacterEntity) => void;
  onProceedToEditor: (char: CharacterEntity) => void;
}

export const SupervisedPgCreateView: React.FC<SupervisedPgCreateViewProps> = ({
  isBlueprintDefault,
  onCancel,
  onSaveDirect,
  onProceedToEditor,
}) => {
  const { lang, tr } = useLanguage();

  const [name, setName] = useState('');
  const [isBlueprint, setIsBlueprint] = useState(isBlueprintDefault);
  const [playerName, setPlayerName] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState<string>('human');
  const [customRaceName, setCustomRaceName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('fighter');
  const [customClassName, setCustomClassName] = useState('');
  const [customHitDie, setCustomHitDie] = useState<number>(8);
  const [level, setLevel] = useState<number>(1);
  const [step, setStep] = useState<number>(1);
  const [method, setMethod] = useState<'standard' | 'pointbuy' | 'roll' | 'manual'>('standard');
  const [baseScores, setBaseScores] = useState<Record<AbilityKey, number>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });
  const [background, setBackground] = useState('');
  const [alignmentIdx, setAlignmentIdx] = useState(1);
  const [classSkills, setClassSkills] = useState<SkillId[]>([]);
  const [bgSkills, setBgSkills] = useState<SkillId[]>([]);
  const [size, setSize] = useState<string | null>(null);
  const [speed, setSpeed] = useState<string | null>(null);
  const [senses, setSenses] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string | null>(null);
  const [equipment, setEquipment] = useState('');

  // Race / class changes reset the choices that depend on them.
  useEffect(() => {
    setSize(null);
    setSpeed(null);
    setSenses(null);
    setLanguages(null);
  }, [selectedRaceId]);
  useEffect(() => setClassSkills([]), [selectedClassId]);

  const standardRace = STANDARD_RACES.find((r) => r.id === selectedRaceId);
  const isCustomRace = selectedRaceId === 'custom';

  const standardClass = STANDARD_CLASSES.find((c) => c.id === selectedClassId);
  const isCustomClass = selectedClassId === 'custom';

  const effectiveHitDie = isCustomClass ? customHitDie : standardClass?.hitDie || 8;
  const effectiveRaceName = isCustomRace
    ? customRaceName.trim() || tr('Custom Race', 'Razza Personalizzata')
    : lang === 'it'
    ? standardRace?.nameIt || ''
    : standardRace?.nameEn || '';

  const effectiveClassName = isCustomClass
    ? customClassName.trim() || tr('Custom Class', 'Classe Personalizzata')
    : lang === 'it'
    ? standardClass?.nameIt || ''
    : standardClass?.nameEn || '';

  const defaultAbilities = Object.fromEntries(
    (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((k) => [
      k,
      baseScores[k] + (standardRace?.abilityBonuses[k] || 0),
    ])
  ) as Record<AbilityKey, number>;

  const effSize = size ?? localizeSize(standardRace?.size, lang);
  const effSpeed = speed ?? (standardRace ? standardRace.speed : tr('30 ft.', '9m'));
  const effSenses =
    senses ??
    (standardRace ? (lang === 'it' ? standardRace.sensesIt : standardRace.sensesEn) : tr('Normal vision', 'Vista normale'));
  const effLanguages =
    languages ??
    (standardRace ? (lang === 'it' ? standardRace.languagesIt : standardRace.languagesEn) : tr('Common', 'Comune'));

  const pointsLeft =
    POINT_BUY_BUDGET - Object.values(baseScores).reduce((sum, v) => sum + (POINT_BUY_COST[v] ?? 0), 0);

  const chooseMethod = (m: typeof method) => {
    setMethod(m);
    if (m === 'standard') setBaseScores({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
    else if (m === 'pointbuy') setBaseScores({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
    else if (m === 'roll')
      setBaseScores({
        str: roll4d6DropLowest(),
        dex: roll4d6DropLowest(),
        con: roll4d6DropLowest(),
        int: roll4d6DropLowest(),
        wis: roll4d6DropLowest(),
        cha: roll4d6DropLowest(),
      });
  };

  // Picking an array value swaps it with the ability that currently holds it.
  const assignStandard = (key: AbilityKey, value: number) =>
    setBaseScores((cur) => {
      const other = (Object.keys(cur) as AbilityKey[]).find((k) => k !== key && cur[k] === value);
      return other ? { ...cur, [key]: value, [other]: cur[key] } : { ...cur, [key]: value };
    });

  const stepPointBuy = (key: AbilityKey, delta: number) =>
    setBaseScores((cur) => {
      const next = cur[key] + delta;
      if (next < 8 || next > 15) return cur;
      const extra = POINT_BUY_COST[next] - POINT_BUY_COST[cur[key]];
      if (extra > pointsLeft) return cur;
      return { ...cur, [key]: next };
    });

  // Highest scores to the class's primary abilities, then CON/DEX/WIS and the rest.
  const suggestForClass = () => {
    if (!standardClass || method === 'pointbuy') return;
    const order = [
      ...standardClass.primaryAbilities,
      ...(['con', 'dex', 'wis', 'str', 'cha', 'int'] as AbilityKey[]),
    ].filter((k, i, arr) => arr.indexOf(k) === i);
    const values = [...(method === 'standard' ? STANDARD_ARRAY : Object.values(baseScores))].sort((x, y) => y - x);
    setBaseScores(Object.fromEntries(order.map((k, i) => [k, values[i]])) as Record<AbilityKey, number>);
  };

  const toggleSkill = (current: SkillId[], set: (v: SkillId[]) => void, id: SkillId, max: number) => {
    if (current.includes(id)) set(current.filter((x) => x !== id));
    else if (current.length < max) set([...current, id]);
  };

  const expectedHp = calculateExpectedHp(effectiveHitDie, level, defaultAbilities.con);
  const hitDiceFormula = calculateStandardHitDiceFormula(level, effectiveHitDie, defaultAbilities.con);
  const pb = getProficiencyBonus({ levelOrCr: formatPgLevel(level, lang) });

  const buildCharacterEntity = (): CharacterEntity => {
    const finalName =
      name.trim() ||
      (isBlueprint
        ? `${effectiveRaceName} ${effectiveClassName} (${tr('Blueprint', 'Blueprint')})`
        : `${tr('New Hero', 'Nuovo Eroe')} (${effectiveClassName})`);

    const initialBaseChar: CharacterEntity = {
      id: `pc-${Date.now()}`,
      kind: 'pc',
      name: finalName,
      playerOrRole: isBlueprint
        ? ''
        : playerName.trim()
        ? `${tr('Player:', 'Giocatore:')} ${playerName.trim()}`
        : tr('Player: ...', 'Giocatore: ...'),
      isPreGenBlueprint: isBlueprint,
      background: background.trim() || undefined,
      size: effSize,
      creatureType: isCustomRace
        ? tr(`Humanoid (${customRaceName || 'Custom'})`, `Umanoide (${customRaceName || 'Custom'})`)
        : lang === 'it'
        ? `Umanoide (${standardRace?.nameIt})`
        : `Humanoid (${standardRace?.nameEn})`,
      alignment: ALIGNMENT_OPTIONS[alignmentIdx][lang],
      classOrArchetype: effectiveClassName,
      levelOrCr: formatPgLevel(level, lang),
      ac: 10 + getModValue(defaultAbilities.dex),
      acNote: tr('Unarmored (adjust to your armor)', 'Senza armatura (adatta alla tua armatura)'),
      hpMax: expectedHp.avg,
      hitDiceFormula,
      speed: effSpeed,
      initiativeBonus: getModValue(defaultAbilities.dex),
      passivePerception: 10,
      abilities: defaultAbilities,
      savingThrowProficiencies: standardClass
        ? { [standardClass.savingThrows[0]]: true, [standardClass.savingThrows[1]]: true }
        : {},
      skillProficiencies: [
        ...(standardRace?.defaultSkillProficiencies || []),
        ...classSkills,
        ...bgSkills,
      ].reduce((acc, sk) => ({ ...acc, [sk]: 1 }), {} as Partial<Record<SkillId, 1>>),
      senses: effSenses,
      languages: effLanguages,
      equipment: equipment.trim() || undefined,
      traits: [],
      actions: [
        {
          name: tr('Standard Weapon Attack', 'Attacco con Arma'),
          description: tr(
            `Melee or Ranged Weapon Attack: +${pb + 2} to hit. Hit: 1d8 + 2 damage.`,
            `Attacco con arma da mischia o a distanza: +${pb + 2} a colpire. Colpito: 1d8 + 2 danni.`
          ),
          attackBonus: pb + 2,
          damageFormula: '1d8+2',
        },
      ],
      reactionsOrLegendary: [],
      spellsNotes: '',
      biographyOrLore: '',
      tags: isBlueprint
        ? [tr('Pre-Gen Blueprint', 'Blueprint Pre-Gen'), effectiveClassName]
        : [tr('Active PC', 'PG Attivo'), effectiveClassName],
    };

    const templated = applyStandardTemplate(initialBaseChar, {
      raceDef: isCustomRace ? undefined : standardRace,
      classDef: isCustomClass ? undefined : standardClass,
      level,
      lang,
    });
    // The template re-applies race defaults: keep the user's size, speed, senses and languages.
    const finalChar: CharacterEntity = {
      ...templated,
      size: effSize,
      speed: effSpeed,
      senses: effSenses,
      languages: effLanguages,
    };
    return {
      ...finalChar,
      savingThrows: formatProficientSavesSummary(finalChar, lang),
      skills: formatProficientSkillsSummary(finalChar, lang),
      passivePerception: 10 + getSkillTotalBonus(finalChar, 'perception').total,
    };
  };

  const handleSaveDirect = () => {
    const character = buildCharacterEntity();
    onSaveDirect(character);
  };

  const handleProceedToEditor = () => {
    const character = buildCharacterEntity();
    onProceedToEditor(character);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-16">
      {/* Top Navigation Bar */}
      <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tr('Back to Repository', 'Torna al Repository')}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="font-header text-xl md:text-2xl font-bold text-amber-300">
                {tr('Supervised PC Creation', 'Creazione Guidata e Supervisionata PG')}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/40 font-bold uppercase">
                {isBlueprint
                  ? tr('Pre-Gen Blueprint', 'Blueprint Pre-Gen')
                  : tr('Assigned Player PC', 'PG Giocatore')}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {tr(
                'Full-screen creation wizard: select official D&D 5e Race, Class, and Level to auto-assemble standard traits and features.',
                'Creazione a schermo intero: seleziona Razza, Classe e Livello ufficiali D&D 5e per pre-configurare tratti e capacità con regole validate.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition cursor-pointer"
          >
            {tr('Cancel', 'Annulla')}
          </button>
          <button
            type="button"
            onClick={handleSaveDirect}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
          >
            <Save className="w-4 h-4" />
            {tr('Save Direct to Repository', 'Salva Subito Scheda')}
          </button>
          <button
            type="button"
            onClick={handleProceedToEditor}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg"
          >
            <Edit3 className="w-4 h-4" />
            {tr('Customize in Full Editor →', 'Personalizza nell’Editor Completo →')}
          </button>
        </div>
      </div>

      {/* Step bar */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-stone-900/80 border border-stone-800">
        {[
          tr('Identity', 'Identità'),
          tr('Race & Class', 'Razza & Classe'),
          tr('Abilities', 'Caratteristiche'),
          tr('Skills', 'Abilità'),
          tr('Details', 'Dettagli'),
        ].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`flex-1 min-w-[8rem] px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              step === i + 1 ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span className="opacity-60 mr-1">{i + 1}.</span>
            {label}
          </button>
        ))}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Configuration): 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          {step === 1 && (
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-header text-base font-bold text-amber-400 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              {tr('1. Character Identity & Assignment', '1. Identità del Personaggio & Assegnazione')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-1">
                <label className="block text-stone-300 font-semibold text-xs">
                  {tr('Character Name (Optional)', 'Nome del Personaggio (Opzionale)')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    isBlueprint
                      ? tr('e.g. Valeros the Brave (Fighter Blueprint)', 'es. Valeros il Coraggioso (Blueprint Guerriero)')
                      : tr('e.g. Alex / Thorin', 'es. Alessandro / Thorin')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-bold focus:border-amber-500 outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-5 flex flex-col justify-end">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer hover:border-amber-500/40 transition">
                  <input
                    type="checkbox"
                    checked={isBlueprint}
                    onChange={(e) => setIsBlueprint(e.target.checked)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-amber-300 text-xs">
                      {tr('Pre-Gen Blueprint', 'Blueprint Pre-Generato')}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {tr('Reusable template for the DM', 'Modello riutilizzabile dal DM')}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {!isBlueprint && (
              <div className="space-y-1">
                <label className="block text-stone-300 font-semibold text-xs">
                  {tr('Assigned Player Name', 'Nome del Giocatore Assegnato')}
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={tr('e.g. Marco, Elena...', 'es. Marco, Elena...')}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 outline-none focus:border-amber-500 text-xs"
                />
              </div>
            )}
          </div>
          )}

          {step === 2 && (
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-5">
            <h3 className="font-header text-base font-bold text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {tr('2. Standard D&D 5e Combination', '2. Combinazione Standard D&D 5e')}
            </h3>

            {/* Race Selection */}
            <div className="space-y-2">
              <label className="block text-stone-300 font-semibold text-xs">
                {tr('Race / Species', 'Razza / Specie')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {STANDARD_RACES.map((r) => {
                  const selected = selectedRaceId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRaceId(r.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[64px] ${
                        selected
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="font-bold text-xs">
                        {lang === 'it' ? r.nameIt : r.nameEn}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {r.speed} • {r.size}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedRaceId('custom')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[64px] ${
                    isCustomRace
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="font-bold text-xs text-amber-400">
                    ★ {tr('Custom / Homebrew', 'Personalizzata')}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {tr('Freeform', 'Libero')}
                  </span>
                </button>
              </div>

              {isCustomRace && (
                <div className="mt-2 p-3 rounded-xl bg-stone-950 border border-amber-500/40">
                  <label className="block text-stone-400 mb-1 text-[11px]">
                    {tr('Enter Custom Race Name:', 'Nome Razza Personalizzata:')}
                  </label>
                  <input
                    type="text"
                    value={customRaceName}
                    onChange={(e) => setCustomRaceName(e.target.value)}
                    placeholder={tr('e.g. Tabaxi, Aasimar, Homebrew species...', 'es. Tabaxi, Aasimar, Specie Homebrew...')}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Class Selection */}
            <div className="space-y-2">
              <label className="block text-stone-300 font-semibold text-xs">
                {tr('Class / Archetype', 'Classe / Archetipo')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {STANDARD_CLASSES.map((c) => {
                  const selected = selectedClassId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClassId(c.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[64px] ${
                        selected
                          ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="font-bold text-xs">
                        {lang === 'it' ? c.nameIt : c.nameEn}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        d{c.hitDie} • TS: {c.savingThrows[0].toUpperCase()}/{c.savingThrows[1].toUpperCase()}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedClassId('custom')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[64px] ${
                    isCustomClass
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="font-bold text-xs text-amber-400">
                    ★ {tr('Custom / Homebrew', 'Personalizzata')}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    d{customHitDie} • {tr('Custom', 'Custom')}
                  </span>
                </button>
              </div>

              {isCustomClass && (
                <div className="mt-2 p-3 rounded-xl bg-stone-950 border border-amber-500/40 space-y-2">
                  <div>
                    <label className="block text-stone-400 mb-1 text-[11px]">
                      {tr('Enter Custom Class Name:', 'Nome Classe Personalizzata:')}
                    </label>
                    <input
                      type="text"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      placeholder={tr('e.g. Blood Hunter, Artificer...', 'es. Blood Hunter, Artefice...')}
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-stone-400 font-semibold">
                      {tr('Hit Die:', 'Dado Vita:')}
                    </span>
                    {[6, 8, 10, 12].map((die) => (
                      <button
                        key={die}
                        type="button"
                        onClick={() => setCustomHitDie(die)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                          customHitDie === die
                            ? 'bg-amber-600 text-stone-950 border-amber-400'
                            : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600'
                        }`}
                      >
                        d{die}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Level Slider */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="flex items-center justify-between">
                <label className="block text-stone-300 font-semibold text-xs">
                  {tr('3. Starting Level', '3. Livello Iniziale')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">
                    {level <= 4
                      ? tr('Tier 1: Local Hero', 'Tier 1: Eroe Locale')
                      : level <= 10
                      ? tr('Tier 2: Realm Hero', 'Tier 2: Eroe del Regno')
                      : level <= 16
                      ? tr('Tier 3: Master of the Realm', 'Tier 3: Maestro del Regno')
                      : tr('Tier 4: Epic Legend', 'Tier 4: Leggenda Epica')}
                  </span>
                  <span className="px-3.5 py-1 rounded-xl bg-amber-600/20 border border-amber-500/50 text-amber-300 font-extrabold text-sm min-w-[4rem] text-center">
                    Lv {level}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-stone-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-semibold">
                <span>Lv 1 (Novice)</span>
                <span>Lv 5 (Hero)</span>
                <span>Lv 11 (Master)</span>
                <span>Lv 17 (Legend)</span>
                <span>Lv 20 (Epic)</span>
              </div>
            </div>
          </div>
          )}

          {/* Step 3: Ability scores */}
          {step === 3 && (
            <div className={cardCls}>
              <h3 className="font-header text-base font-bold text-amber-400">
                {tr('3. Ability Scores', '3. Caratteristiche')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['standard', tr('Standard Array', 'Array Standard')],
                    ['pointbuy', tr('Point Buy (27)', 'Point Buy (27)')],
                    ['roll', tr('Roll 4d6 (drop lowest)', 'Tira 4d6 (scarta il più basso)')],
                    ['manual', tr('Manual', 'Manuale')],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => chooseMethod(id)}
                    className={`min-w-[9rem] px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      method === id
                        ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                {method === 'pointbuy' && (
                  <span className={`font-bold ${pointsLeft < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {tr(`Points left: ${pointsLeft}`, `Punti rimasti: ${pointsLeft}`)}
                  </span>
                )}
                {method === 'roll' && (
                  <button
                    type="button"
                    onClick={() => chooseMethod('roll')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    {tr('Roll all again', 'Ritira tutto')}
                  </button>
                )}
                {standardClass && (
                  <button
                    type="button"
                    onClick={suggestForClass}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                  >
                    {tr('Suggest best placement for this class', 'Suggerisci la disposizione migliore per la classe')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                {DND_ABILITY_META.map((ab) => {
                  const racial = standardRace?.abilityBonuses[ab.key] || 0;
                  const isPrimary = standardClass?.primaryAbilities.includes(ab.key);
                  return (
                    <div
                      key={ab.key}
                      className={`p-3 rounded-xl bg-stone-950 border text-center space-y-1.5 ${
                        isPrimary ? 'border-amber-500/60' : 'border-stone-800'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-amber-400 uppercase">
                        {lang === 'it' ? ab.shortIt : ab.shortEn}
                        {isPrimary && <span className="ml-1 text-[9px] text-amber-300">★</span>}
                      </div>

                      {method === 'standard' ? (
                        <select
                          value={baseScores[ab.key]}
                          onChange={(e) => assignStandard(ab.key, Number(e.target.value))}
                          className={`${numCls} text-base font-bold`}
                        >
                          {STANDARD_ARRAY.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ) : method === 'pointbuy' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => stepPointBuy(ab.key, -1)}
                            className="w-8 h-8 shrink-0 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-base font-bold text-stone-100">{baseScores[ab.key]}</span>
                          <button
                            type="button"
                            onClick={() => stepPointBuy(ab.key, 1)}
                            className="w-8 h-8 shrink-0 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={3}
                            max={20}
                            value={baseScores[ab.key]}
                            onChange={(e) =>
                              setBaseScores((s) => ({
                                ...s,
                                [ab.key]: Math.max(3, Math.min(20, Number(e.target.value) || 10)),
                              }))
                            }
                            className={`${numCls} text-base font-bold`}
                          />
                          {method === 'roll' && (
                            <button
                              type="button"
                              onClick={() => setBaseScores((s) => ({ ...s, [ab.key]: roll4d6DropLowest() }))}
                              title={tr('Reroll this score', 'Ritira questo valore')}
                              className="w-8 h-8 shrink-0 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 cursor-pointer"
                            >
                              <Dices className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="text-[11px] text-stone-400">
                        {racial ? `${baseScores[ab.key]} ${racial > 0 ? '+' : ''}${racial} = ` : ''}
                        <span className="font-bold text-stone-200">{defaultAbilities[ab.key]}</span>{' '}
                        <span className="text-amber-300 font-mono">({formatSignedBonus(getModValue(defaultAbilities[ab.key]))})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500">
                {tr(
                  '★ marks the primary abilities of the chosen class. Racial bonuses are added automatically.',
                  '★ indica le caratteristiche principali della classe scelta. I bonus razziali sono aggiunti in automatico.'
                )}
              </p>
            </div>
          )}

          {/* Step 4: Skills & background */}
          {step === 4 && (
            <div className={cardCls}>
              <h3 className="font-header text-base font-bold text-amber-400">
                {tr('4. Background & Skills', '4. Background & Abilità')}
              </h3>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4">
                <Field label={tr('Background', 'Background')}>
                  <input
                    type="text"
                    list="wizard-backgrounds"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder={tr('e.g. Soldier', 'es. Soldato')}
                    className={inputCls}
                  />
                  <datalist id="wizard-backgrounds">
                    {BACKGROUND_OPTIONS.map((b) => (
                      <option key={b.en} value={b[lang]} />
                    ))}
                  </datalist>
                </Field>
                <Field label={tr('Alignment', 'Allineamento')}>
                  <select value={alignmentIdx} onChange={(e) => setAlignmentIdx(Number(e.target.value))} className={inputCls}>
                    {ALIGNMENT_OPTIONS.map((a, i) => (
                      <option key={a.en} value={i}>
                        {a[lang]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {standardClass && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-300">
                      {tr('Class skills', 'Abilità di classe')}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        classSkills.length === standardClass.skillCount ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {classSkills.length}/{standardClass.skillCount}
                    </span>
                  </div>
                  <SkillPicker
                    options={standardClass.skillChoices}
                    selected={classSkills}
                    max={standardClass.skillCount}
                    onToggle={(id) => toggleSkill(classSkills, setClassSkills, id, standardClass.skillCount)}
                    lang={lang}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-300">
                    {tr('Background skills (pick 2)', 'Abilità del background (scegline 2)')}
                  </span>
                  <span className={`text-[11px] font-bold ${bgSkills.length === 2 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {bgSkills.length}/2
                  </span>
                </div>
                <SkillPicker
                  options={DND_SKILLS.map((s) => s.id)}
                  selected={bgSkills}
                  max={2}
                  onToggle={(id) => toggleSkill(bgSkills, setBgSkills, id, 2)}
                  lang={lang}
                />
              </div>
              {isCustomClass && (
                <p className="text-[11px] text-stone-500">
                  {tr(
                    'Custom class: set its skills and saving throws in the full editor.',
                    'Classe personalizzata: imposta abilità e tiri salvezza nell’editor completo.'
                  )}
                </p>
              )}
            </div>
          )}

          {/* Step 5: Details */}
          {step === 5 && (
            <div className={cardCls}>
              <h3 className="font-header text-base font-bold text-amber-400">
                {tr('5. Details & Equipment', '5. Dettagli & Equipaggiamento')}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
                <Field label={tr('Size', 'Taglia')}>
                  <select value={effSize} onChange={(e) => setSize(e.target.value)} className={inputCls}>
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s.en} value={s[lang]}>
                        {s[lang]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tr('Speed', 'Velocità')}>
                  <input type="text" value={effSpeed} onChange={(e) => setSpeed(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <ChipField
                label={tr('Senses', 'Sensi')}
                value={effSenses}
                presets={SENSE_PRESETS.map((s) => s[lang])}
                onChange={setSenses}
              />
              <ChipField
                label={tr('Languages', 'Linguaggi')}
                value={effLanguages}
                presets={LANGUAGE_PRESETS.map((l) => l[lang])}
                onChange={setLanguages}
              />
              <Field label={tr('Equipment', 'Equipaggiamento')}>
                <textarea
                  rows={3}
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder={tr('e.g. Longsword, chain mail, backpack, 10 gp', 'es. Spada lunga, cotta di maglia, zaino, 10 mo')}
                  className={`${inputCls} resize-y min-h-[4.5rem]`}
                />
              </Field>
              <p className="text-[11px] text-stone-500">
                {tr(
                  'You can refine everything else (armor class, attacks, spells, story) in the full editor.',
                  'Tutto il resto (classe armatura, attacchi, incantesimi, storia) lo rifinisci nell’editor completo.'
                )}
              </p>
            </div>
          )}

          {/* Step navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="min-w-[8rem] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              ← {tr('Back', 'Indietro')}
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="min-w-[8rem] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-extrabold cursor-pointer"
              >
                {tr('Next', 'Avanti')} →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceedToEditor}
                className="min-w-[10rem] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-extrabold cursor-pointer"
              >
                {tr('Finish in full editor', 'Concludi nell’editor completo')} →
              </button>
            )}
          </div>
        </div>

        {/* Right Column (Live Attributes & Traits Preview): 5 cols */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="font-header font-bold text-amber-400 text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500" />
                {tr('Supervised Attributes Preview', 'Anteprima Valori Supervisionati')}
              </span>
              <span className="text-[10px] text-stone-400">
                {tr('Auto-populated from 5e SRD', 'Pre-calcolati da 5e SRD')}
              </span>
            </div>

            {/* Core Vitals Grid */}
            <div className="grid grid-cols-2 gap-3 text-stone-200">
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">{tr('Hit Die & Formula', 'Dado Vita & Formula')}</div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">{hitDiceFormula}</div>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">{tr('Standard Average HP', 'PF Medi Standard')}</div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">
                  {expectedHp.avg} {tr('HP', 'PF')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">{tr('Proficiency Bonus', 'Bonus Competenza')}</div>
                <div className="font-bold text-amber-300 text-sm mt-0.5">+{pb}</div>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">{tr('Proficient Saves', 'Tiri Salvezza')}</div>
                <div className="font-bold text-stone-200 text-sm mt-0.5">
                  {standardClass
                    ? `${standardClass.savingThrows[0].toUpperCase()}, ${standardClass.savingThrows[1].toUpperCase()}`
                    : tr('Custom', 'Custom')}
                </div>
              </div>
            </div>

            {/* Senses and Languages */}
            <div className="space-y-1.5 p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">{tr('Senses:', 'Sensi:')}</span>
                <span className="font-semibold text-stone-200 text-right">{effSenses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{tr('Languages:', 'Linguaggi:')}</span>
                <span className="font-semibold text-stone-200 text-right">{effLanguages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{tr('Speed & Size:', 'Velocità & Taglia:')}</span>
                <span className="font-semibold text-stone-200">
                  {effSpeed} • {effSize}
                </span>
              </div>
            </div>

            {/* Estimated Ability Scores */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-stone-400">
                {tr('Initial Ability Scores (Standard Array + Racial Bonuses):', 'Caratteristiche Iniziali (Array Standard + Bonus Razziali):')}
              </div>
              <div className="grid grid-cols-6 gap-1.5 text-center">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => {
                  const score = defaultAbilities[ab];
                  const mod = getModValue(score);
                  return (
                    <div key={ab} className="bg-stone-950 p-2 rounded-xl border border-stone-800">
                      <div className="text-[10px] uppercase font-bold text-amber-400">{ab}</div>
                      <div className="font-bold text-stone-100 text-xs mt-0.5">{score}</div>
                      <div className="text-[10px] text-stone-400">{formatSignedBonus(mod)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tagged Features List */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                <span>{tr('Automatic Traits & Features:', 'Tratti & Capacità Automatici:')}</span>
                <span className="text-[10px] text-stone-500">
                  {tr('Tagged with origin (Race) / (Class)', 'Etichettati con (Razza) / (Classe)')}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {standardRace?.traits.map((t, idx) => (
                  <div key={`race-trait-${idx}`} className="p-2 rounded-lg bg-stone-950 border border-purple-500/30">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/40 border border-purple-500/40">
                        {lang === 'it' ? standardRace.nameIt : standardRace.nameEn}
                      </span>
                      <span>{lang === 'it' ? t.nameIt : t.nameEn}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                      {lang === 'it' ? t.descIt : t.descEn}
                    </p>
                  </div>
                ))}

                {standardClass?.features
                  .filter((f) => f.level <= level)
                  .map((f, idx) => (
                    <div key={`class-feat-${idx}`} className="p-2 rounded-lg bg-stone-950 border border-amber-500/30">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/40 border border-amber-500/40">
                          {lang === 'it' ? standardClass.nameIt : standardClass.nameEn} (Lv {f.level})
                        </span>
                        <span>{lang === 'it' ? f.nameIt : f.nameEn}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                        {lang === 'it' ? f.descIt : f.descEn}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Bottom Actions inside Card */}
            <div className="pt-3 border-t border-stone-800 space-y-2">
              <button
                type="button"
                onClick={handleProceedToEditor}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                {tr('Proceed to Full Sheet Editor', 'Procedi all’Editor Completo')}
              </button>
              <button
                type="button"
                onClick={handleSaveDirect}
                className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {tr('Save Now Without Extra Editing', 'Salva Subito Senza Ulteriori Modifiche')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
