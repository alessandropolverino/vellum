import React, { useState } from 'react';
import {
  CharacterEntity,
  formatSignedBonus,
  getModValue,
  getProficiencyBonus,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import {
  STANDARD_RACES,
  STANDARD_CLASSES,
  applyStandardTemplate,
  formatPgLevel,
  calculateExpectedHp,
  calculateStandardHitDiceFormula,
  StandardRaceDef,
  StandardClassDef,
} from '../data/dnd5eRules';
import {
  Sparkles,
  Shield,
  Heart,
  Eye,
  Check,
  X,
  Compass,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface SupervisedPgCreateModalProps {
  isOpen: boolean;
  isBlueprintDefault: boolean;
  onClose: () => void;
  onConfirm: (createdChar: CharacterEntity) => void;
}

export const SupervisedPgCreateModal: React.FC<SupervisedPgCreateModalProps> = ({
  isOpen,
  isBlueprintDefault,
  onClose,
  onConfirm,
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

  if (!isOpen) return null;

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

  // Base abilities preview (standard array / default 10)
  const defaultAbilities = {
    str: 15 + (standardRace?.abilityBonuses.str || 0),
    dex: 14 + (standardRace?.abilityBonuses.dex || 0),
    con: 13 + (standardRace?.abilityBonuses.con || 0),
    int: 12 + (standardRace?.abilityBonuses.int || 0),
    wis: 10 + (standardRace?.abilityBonuses.wis || 0),
    cha: 8 + (standardRace?.abilityBonuses.cha || 0),
  };

  const expectedHp = calculateExpectedHp(effectiveHitDie, level, defaultAbilities.con);
  const hitDiceFormula = calculateStandardHitDiceFormula(level, effectiveHitDie, defaultAbilities.con);
  const pb = getProficiencyBonus({ levelOrCr: formatPgLevel(level, lang) });

  const handleCreate = () => {
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
      background: tr('Folk Hero', 'Eroe Popolare'),
      size: standardRace ? (lang === 'it' ? standardRace.size : standardRace.size) : tr('Medium', 'Media'),
      creatureType: isCustomRace
        ? tr(`Humanoid (${customRaceName || 'Custom'})`, `Umanoide (${customRaceName || 'Custom'})`)
        : lang === 'it'
        ? `Umanoide (${standardRace?.nameIt})`
        : `Humanoid (${standardRace?.nameEn})`,
      alignment: tr('Neutral Good', 'Neutrale Buono'),
      classOrArchetype: effectiveClassName,
      levelOrCr: formatPgLevel(level, lang),
      ac: 14,
      acNote: tr('(Leather armor or shield)', '(Armatura di cuoio o scudo)'),
      hpMax: expectedHp.avg,
      hitDiceFormula,
      speed: standardRace ? standardRace.speed : tr('30 ft.', '9m'),
      initiativeBonus: getModValue(defaultAbilities.dex),
      passivePerception: 10 + (standardRace?.defaultSkillProficiencies?.includes('perception') ? pb : 0),
      abilities: defaultAbilities,
      savingThrowProficiencies: standardClass
        ? { [standardClass.savingThrows[0]]: true, [standardClass.savingThrows[1]]: true }
        : {},
      skillProficiencies: standardRace?.defaultSkillProficiencies?.reduce(
        (acc, sk) => ({ ...acc, [sk]: 1 }),
        {}
      ) || {},
      senses: standardRace
        ? lang === 'it'
          ? standardRace.sensesIt
          : standardRace.sensesEn
        : tr('Normal vision', 'Vista normale'),
      languages: standardRace
        ? lang === 'it'
          ? standardRace.languagesIt
          : standardRace.languagesEn
        : tr('Common', 'Comune'),
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

    // Apply standard racial traits & class features with tagging if standard options selected
    const populated = applyStandardTemplate(initialBaseChar, {
      raceDef: isCustomRace ? undefined : standardRace,
      classDef: isCustomClass ? undefined : standardClass,
      level,
      lang,
    });

    onConfirm(populated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-header text-lg font-bold text-amber-300">
                {tr('Supervised PC Creation Wizard', 'Creazione Guidata e Supervisionata PG')}
              </h3>
              <p className="text-xs text-stone-400">
                {tr(
                  'Select Race, Class, and Level to automatically assemble standard 5e traits, HP formulas, and class features.',
                  'Seleziona Razza, Classe e Livello per configurare automaticamente tratti 5e ufficiali, formule PF e capacità di classe.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Top row: Name & Blueprint Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7">
              <label className="block text-stone-300 mb-1 font-semibold">
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
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 font-bold focus:border-amber-500 outline-none"
              />
            </div>

            <div className="sm:col-span-5 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-950 border border-stone-800 cursor-pointer hover:border-amber-500/40 transition">
                <input
                  type="checkbox"
                  checked={isBlueprint}
                  onChange={(e) => setIsBlueprint(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-amber-300">
                    {tr('Pre-Gen Blueprint', 'Blueprint Pre-Generato')}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {tr('Template reusable without player', 'Modello riutilizzabile dal DM')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {!isBlueprint && (
            <div>
              <label className="block text-stone-300 mb-1 font-semibold">
                {tr('Assigned Player Name', 'Nome del Giocatore Assegnato')}
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={tr('e.g. Marco, Elena...', 'es. Marco, Elena...')}
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Core Selection: Race, Class, Level */}
          <div className="p-4 rounded-xl bg-stone-950 border border-amber-500/30 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              {tr('D&D 5e Standard Combination (or Custom Homebrew)', 'Combinazione Standard D&D 5e (o Homebrew Personalizzato)')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Race */}
              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  1. {tr('Race / Species', 'Razza / Specie')}
                </label>
                <select
                  value={selectedRaceId}
                  onChange={(e) => setSelectedRaceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-semibold focus:border-amber-500 outline-none"
                >
                  <optgroup label={tr('Standard D&D 5e SRD Races', 'Razze Ufficiali D&D 5e')}>
                    {STANDARD_RACES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {lang === 'it' ? r.nameIt : r.nameEn}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={tr('Custom / Homebrew', 'Personalizzato / Homebrew')}>
                    <option value="custom">★ {tr('Custom Race / Homebrew...', 'Razza Personalizzata / Homebrew...')}</option>
                  </optgroup>
                </select>
                {isCustomRace && (
                  <input
                    type="text"
                    value={customRaceName}
                    onChange={(e) => setCustomRaceName(e.target.value)}
                    placeholder={tr('Enter custom race name...', 'Inserisci nome razza custom...')}
                    className="w-full mt-2 px-2.5 py-1.5 rounded bg-stone-900 border border-amber-500/50 text-stone-200 text-xs"
                  />
                )}
              </div>

              {/* Class */}
              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  2. {tr('Class', 'Classe')}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-semibold focus:border-amber-500 outline-none"
                >
                  <optgroup label={tr('Standard D&D 5e SRD Classes', 'Classi Ufficiali D&D 5e')}>
                    {STANDARD_CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'it' ? c.nameIt : c.nameEn} (d{c.hitDie})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={tr('Custom / Homebrew', 'Personalizzato / Homebrew')}>
                    <option value="custom">★ {tr('Custom Class / Homebrew...', 'Classe Personalizzata / Homebrew...')}</option>
                  </optgroup>
                </select>
                {isCustomClass && (
                  <div className="mt-2 space-y-1.5">
                    <input
                      type="text"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      placeholder={tr('Custom class name...', 'Nome classe custom...')}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-amber-500/50 text-stone-200 text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400">{tr('Hit Die:', 'Dado Vita:')}</span>
                      {[6, 8, 10, 12].map((die) => (
                        <button
                          key={die}
                          type="button"
                          onClick={() => setCustomHitDie(die)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            customHitDie === die
                              ? 'bg-amber-600 text-stone-950 border-amber-400'
                              : 'bg-stone-900 text-stone-300 border-stone-700'
                          }`}
                        >
                          d{die}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Level */}
              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  3. {tr('Starting Level', 'Livello Iniziale')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 font-bold text-amber-300 text-sm min-w-[3.5rem] text-center">
                    Lv {level}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                  <span>Lv 1 (Novice)</span>
                  <span>Lv 5 (Hero)</span>
                  <span>Lv 10</span>
                  <span>Lv 20 (Epic)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supervised Features Preview */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-500" />
                {tr(
                  'Supervised Attributes & Auto-Populated Features',
                  'Attributi Supervisionati & Capacità Pre-Popolate'
                )}
              </span>
              <span className="text-[10px] text-stone-400">
                {tr('Tagged with origin source: (Race) & (Class)', 'Etichettati con origine: (Razza) & (Classe)')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-300">
              <div className="p-2 rounded bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-500">{tr('Hit Die & Formula', 'Dado Vita & Formula')}</div>
                <div className="font-bold text-emerald-400 mt-0.5">{hitDiceFormula}</div>
              </div>
              <div className="p-2 rounded bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-500">{tr('Average Standard HP', 'PF Medi Standard')}</div>
                <div className="font-bold text-emerald-400 mt-0.5">
                  {expectedHp.avg} {tr('HP', 'PF')}
                </div>
              </div>
              <div className="p-2 rounded bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-500">{tr('Proficiency Bonus', 'Bonus Competenza')}</div>
                <div className="font-bold text-amber-300 mt-0.5">+{pb}</div>
              </div>
              <div className="p-2 rounded bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-500">{tr('Saving Throws', 'Tiri Salvezza')}</div>
                <div className="font-bold text-stone-200 mt-0.5">
                  {standardClass
                    ? `${standardClass.savingThrows[0].toUpperCase()}, ${standardClass.savingThrows[1].toUpperCase()}`
                    : tr('Configurable', 'Configurabile')}
                </div>
              </div>
            </div>

            {/* Features preview */}
            <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-stone-400">
                {tr('Automatic Traits & Features to be added:', 'Tratti & Capacità aggiunti automaticamente:')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {standardRace &&
                  standardRace.traits.map((t, idx) => (
                    <span
                      key={`race-${idx}`}
                      className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-200 text-[11px]"
                    >
                      {lang === 'it' ? t.nameIt : t.nameEn}
                    </span>
                  ))}
                {standardClass &&
                  standardClass.features
                    .filter((f) => f.level <= level)
                    .map((f, idx) => (
                      <span
                        key={`class-${idx}`}
                        className="px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 text-[11px]"
                      >
                        {lang === 'it' ? f.nameIt : f.nameEn}
                      </span>
                    ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
          <div className="text-[11px] text-stone-500">
            {tr(
              'You can freely customize every ability, skill, and feature after creation.',
              'Potrai personalizzare liberamente caratteristiche, abilità e capacità dopo la creazione.'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold hover:bg-stone-700 transition"
            >
              {tr('Cancel', 'Annulla')}
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1.5 shadow transition"
            >
              <Check className="w-4 h-4" />
              {tr('Create & Open Sheet', 'Crea & Apri Scheda')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
