import React, { useState } from 'react';
import {
  AbilityKey,
  CharacterEntity,
  DND_ABILITY_META,
  formatSignedBonus,
  getModValue,
  getProficiencyBonus,
  isPcBlueprint,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import {
  calculateLevelUpPlan,
  formatPgLevel,
  parsePgLevel,
  findStandardClass,
  calculateStandardHitDiceFormula,
} from '../data/dnd5eRules';
import {
  TrendingUp,
  Sparkles,
  Shield,
  Heart,
  Dices,
  Check,
  X,
  AlertCircle,
  Copy,
  Save,
  Plus,
  Minus,
} from 'lucide-react';

interface LevelUpModalProps {
  isOpen: boolean;
  character: CharacterEntity;
  onClose: () => void;
  onSave: (updatedChar: CharacterEntity, saveMode: 'update' | 'new_blueprint') => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  character,
  onClose,
  onSave,
}) => {
  const { lang, tr } = useLanguage();

  const currentLevel = parsePgLevel(character.levelOrCr);
  const [targetLevel, setTargetLevel] = useState<number>(Math.min(20, currentLevel + 1));
  const [hpMode, setHpMode] = useState<'average' | 'roll' | 'custom'>('average');
  const [rolledAddHp, setRolledAddHp] = useState<number | null>(null);
  const [customHpInput, setCustomHpInput] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [abilityIncreases, setAbilityIncreases] = useState<Record<AbilityKey, number>>({
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  });

  const isBlueprint = isPcBlueprint(character);
  const [newBlueprintName, setNewBlueprintName] = useState<string>(
    `${character.name} (${formatPgLevel(Math.min(20, currentLevel + 1), lang)})`
  );

  if (!isOpen) return null;

  const plan = calculateLevelUpPlan(character, targetLevel, lang);
  const levelsGained = Math.max(0, targetLevel - currentLevel);

  // Roll HP simulation
  const handleRollHp = () => {
    let totalRoll = 0;
    const conMod = getModValue(character.abilities.con);
    for (let i = 0; i < levelsGained; i++) {
      const roll = Math.floor(Math.random() * plan.hitDie) + 1;
      const gain = Math.max(1, roll + conMod);
      totalRoll += gain;
    }
    setRolledAddHp(totalRoll);
    setHpMode('roll');
  };

  // Determine final HP gain
  let finalHpGain = plan.hpDeltaAverage;
  if (hpMode === 'roll' && rolledAddHp !== null) {
    finalHpGain = rolledAddHp;
  } else if (hpMode === 'custom') {
    finalHpGain = customHpInput;
  }

  const finalHpMax = Math.max(1, character.hpMax + finalHpGain);
  const finalHitDiceFormula = calculateStandardHitDiceFormula(
    targetLevel,
    plan.hitDie,
    character.abilities.con + abilityIncreases.con
  );

  // Pending checklist choices count
  const pendingChoicesCount = plan.checklist.filter((item) => item.requiresMasterOrPlayerChoice).length;

  const handleApplyLevelUp = (mode: 'update' | 'new_blueprint') => {
    // Clone character
    const updated: CharacterEntity = structuredClone(character);

    // Update level
    updated.levelOrCr = formatPgLevel(targetLevel, lang);

    // Update HP & hit dice
    updated.hpMax = finalHpMax;
    updated.hitDiceFormula = finalHitDiceFormula;

    // Apply ability increases
    for (const ab of DND_ABILITY_META) {
      const inc = abilityIncreases[ab.key] || 0;
      if (inc !== 0) {
        updated.abilities[ab.key] = Math.min(30, updated.abilities[ab.key] + inc);
      }
    }

    // Add selected new features
    const existingTraitNames = new Set(updated.traits.map((t) => t.name.toLowerCase()));
    for (const feat of plan.newFeatures) {
      const isSelected = selectedFeatures[feat.name] !== false; // default true
      if (isSelected && !existingTraitNames.has(feat.name.toLowerCase())) {
        updated.traits.push(feat);
      }
    }

    // If new blueprint mode, assign new ID and custom name
    if (mode === 'new_blueprint') {
      updated.id = `pc-bp-${Date.now()}`;
      updated.name =
        newBlueprintName.trim() || `${character.name} (${formatPgLevel(targetLevel, lang)})`;
      updated.isPreGenBlueprint = true;
      updated.sourceBlueprintId = character.id;
      if (!updated.tags.includes(tr('Pre-Gen Blueprint', 'Blueprint Pre-Gen'))) {
        updated.tags.push(tr('Pre-Gen Blueprint', 'Blueprint Pre-Gen'));
      }
    }

    onSave(updated, mode);
    onClose();
  };

  const totalPointsAllocated = Object.values(abilityIncreases).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-500/50 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-header text-xl font-bold text-amber-300">
                  {tr('Level-Up Wizard', 'Procedura Guidata Passaggio di Livello')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold">
                  {character.name}
                </span>
                {isBlueprint && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-300 font-bold">
                    {tr('Blueprint / Template', 'Blueprint / Modello')}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {tr(
                  'Advance player character level with supervised HP calculation, feature acquisition, and choice reminders.',
                  'Aumenta il livello del personaggio con calcolo supervisionato dei PF, acquisizione capacità e promemoria scelte.'
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Level Progression Bar */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                {tr('Level Advancement', 'Avanzamento di Livello')}
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 font-bold text-stone-300 text-sm">
                  {tr('Current:', 'Attuale:')} Lv {currentLevel}
                </span>
                <span className="text-amber-500 font-bold text-lg">➔</span>
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 font-extrabold text-amber-300 text-base">
                  {tr('Target:', 'Obiettivo:')} Lv {targetLevel}
                </span>
                <span className="text-xs text-stone-400">
                  (+{levelsGained} {levelsGained === 1 ? tr('level', 'livello') : tr('levels', 'livelli')})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={targetLevel <= currentLevel + 1}
                onClick={() => {
                  const next = Math.max(currentLevel + 1, targetLevel - 1);
                  setTargetLevel(next);
                  setNewBlueprintName(`${character.name} (${formatPgLevel(next, lang)})`);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold disabled:opacity-40"
              >
                -1
              </button>
              <button
                type="button"
                disabled={targetLevel >= 20}
                onClick={() => {
                  const next = Math.min(20, targetLevel + 1);
                  setTargetLevel(next);
                  setNewBlueprintName(`${character.name} (${formatPgLevel(next, lang)})`);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> +1 {tr('Level', 'Livello')}
              </button>
              <button
                type="button"
                disabled={targetLevel >= 19}
                onClick={() => {
                  const next = Math.min(20, targetLevel + 2);
                  setTargetLevel(next);
                  setNewBlueprintName(`${character.name} (${formatPgLevel(next, lang)})`);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-purple-100 font-bold flex items-center gap-1 shadow"
              >
                +2 {tr('Levels', 'Livelli')}
              </button>
            </div>
          </div>

          {/* Pending Choices Notification Banner */}
          {pendingChoicesCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
              <div className="relative mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>
                    {tr(
                      `Action Checklist: ${pendingChoicesCount} pending decision(s) for the Master or Player`,
                      `Promemoria Scelte: ${pendingChoicesCount} decisione/i richiesta/e per Master o Giocatore`
                    )}
                  </span>
                </div>
                <div className="space-y-1 text-stone-300">
                  {plan.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-[11px]">
                      <span className="text-amber-400 font-bold">●</span>
                      <span className="font-semibold">{lang === 'it' ? item.titleIt : item.titleEn}:</span>
                      <span className="text-stone-400">{lang === 'it' ? item.descIt : item.descEn}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Core Changes Grid: HP Growth & Proficiency Scaling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HP Growth */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <Heart className="w-4 h-4" />
                  {tr('Hit Points & Hit Dice Growth', 'Crescita Punti Ferita & Dadi Vita')}
                </span>
                <span className="text-[10px] text-stone-400">
                  d{plan.hitDie} {tr('per level', 'per livello')} + CON ({formatSignedBonus(plan.conMod)})
                </span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHpMode('average')}
                  className={`p-2 rounded-lg border text-center transition ${
                    hpMode === 'average'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-[10px]">{tr('Standard Average', 'Media Standard')}</div>
                  <div className="text-sm font-extrabold text-emerald-300 mt-0.5">
                    +{plan.hpDeltaAverage} HP
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleRollHp}
                  className={`p-2 rounded-lg border text-center transition ${
                    hpMode === 'roll'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-[10px] flex items-center justify-center gap-1">
                    <Dices className="w-3 h-3" /> {tr('Roll Hit Die', 'Tira Dado Vita')}
                  </div>
                  <div className="text-sm font-extrabold text-amber-300 mt-0.5">
                    {rolledAddHp !== null ? `+${rolledAddHp} HP` : tr('Click to roll', 'Clicca per tirare')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHpMode('custom')}
                  className={`p-2 rounded-lg border text-center transition ${
                    hpMode === 'custom'
                      ? 'bg-sky-950/60 border-sky-500 text-sky-200 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-[10px]">{tr('Manual / Custom', 'Manuale / Custom')}</div>
                  <input
                    type="number"
                    value={customHpInput}
                    onChange={(e) => {
                      setCustomHpInput(Number(e.target.value));
                      setHpMode('custom');
                    }}
                    className="w-full text-center text-sm font-bold bg-transparent text-sky-300 outline-none"
                    placeholder="+0"
                  />
                </button>
              </div>

              {/* Summary line */}
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400">{tr('Resulting Max HP:', 'Nuovi PF Massimi:')}</span>
                  <div className="font-extrabold text-emerald-300 text-base">
                    {character.hpMax} ➔ {finalHpMax} {tr('HP', 'PF')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400">{tr('Hit Dice Formula:', 'Formula Dadi Vita:')}</span>
                  <div className="font-mono text-stone-200 font-semibold">{finalHitDiceFormula}</div>
                </div>
              </div>
            </div>

            {/* Proficiency Bonus & Scaling */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3 flex flex-col justify-between">
              <div>
                <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Shield className="w-4 h-4" />
                  {tr('Proficiency Bonus Scaling', 'Progressione Bonus di Competenza')}
                </span>
                <p className="text-[11px] text-stone-400 mt-1">
                  {tr(
                    'Proficiency bonus increases at 5th, 9th, 13th, and 17th character levels.',
                    'Il bonus di competenza aumenta ai livelli 5, 9, 13 e 17 del personaggio.'
                  )}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-400">{tr('Proficiency Bonus', 'Bonus di Competenza')}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-stone-300">+{plan.currentPb}</span>
                    <span className="text-amber-500 font-bold">➔</span>
                    <span
                      className={`text-base font-extrabold ${
                        plan.pbIncreased ? 'text-amber-300' : 'text-stone-300'
                      }`}
                    >
                      +{plan.newPb}
                    </span>
                  </div>
                </div>

                {plan.pbIncreased ? (
                  <div className="text-right">
                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40">
                      ★ {tr('Increased at Level', 'Aumentato al Livello')} {targetLevel}!
                    </span>
                    <div className="text-[10px] text-stone-400 mt-1">
                      {tr('All 18 skills & saves scale', 'Tutte le 18 abilità & TS scalano')}
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-stone-500">
                    {tr('Next PB increase at Lv 5/9/13/17', 'Prossimo aumento PB al Lv 5/9/13/17')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ability Score Improvements (ASI) adjustment section if crossing ASI levels */}
          {plan.checklist.some((item) => item.type === 'asi') && (
            <div className="p-4 rounded-xl bg-stone-950 border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {tr(
                    'Ability Score Improvement (ASI) / Feat Allocation',
                    'Aumento Punteggi di Caratteristica (ASI) / Talento'
                  )}
                </span>
                <span className="text-[10px] text-stone-400">
                  {tr(
                    'Standard: +2 to one score OR +1 to two scores (allocated so far: ',
                    'Standard: +2 a una caratteristica OPPURE +1 a due caratteristiche (assegnati finora: '
                  )}
                  <strong className="text-amber-300">+{totalPointsAllocated}</strong>)
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DND_ABILITY_META.map((ab) => {
                  const currentScore = character.abilities[ab.key];
                  const add = abilityIncreases[ab.key] || 0;
                  const newScore = currentScore + add;
                  return (
                    <div
                      key={ab.key}
                      className="bg-stone-900 p-2 rounded-lg border border-stone-800 text-center space-y-1"
                    >
                      <div className="text-[10px] font-bold text-amber-400">
                        {lang === 'it' ? ab.shortIt : ab.shortEn}
                      </div>
                      <div className="text-sm font-extrabold text-stone-100">
                        {newScore} <span className="text-[10px] text-stone-400">({formatSignedBonus(getModValue(newScore))})</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={add <= 0}
                          onClick={() =>
                            setAbilityIncreases({
                              ...abilityIncreases,
                              [ab.key]: Math.max(0, add - 1),
                            })
                          }
                          className="w-5 h-5 rounded bg-stone-800 text-stone-300 font-bold flex items-center justify-center hover:bg-stone-700 disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-purple-300 min-w-[14px]">
                          {add > 0 ? `+${add}` : '0'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAbilityIncreases({
                              ...abilityIncreases,
                              [ab.key]: add + 1,
                            })
                          }
                          className="w-5 h-5 rounded bg-stone-800 text-stone-300 font-bold flex items-center justify-center hover:bg-stone-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Features Unlocked List */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs">
                {tr(
                  `New Class Features Unlocked (${plan.newFeatures.length})`,
                  `Nuove Capacità di Classe Sbloccate (${plan.newFeatures.length})`
                )}
              </span>
              <span className="text-[10px] text-stone-400">
                {tr(
                  'Select features to append to character traits (tagged with class origin)',
                  'Seleziona le capacità da aggiungere ai tratti (etichettate con origine di classe)'
                )}
              </span>
            </div>

            {plan.newFeatures.length === 0 ? (
              <div className="text-stone-500 italic py-2 text-center">
                {tr(
                  'No new official class features defined for this specific level jump.',
                  'Nessuna nuova capacità di classe standard per questo salto di livello.'
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {plan.newFeatures.map((feat) => {
                  const checked = selectedFeatures[feat.name] !== false;
                  return (
                    <label
                      key={feat.name}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/40 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedFeatures({
                            ...selectedFeatures,
                            [feat.name]: e.target.checked,
                          })
                        }
                        className="accent-amber-500 mt-0.5 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-amber-300">{feat.name}</div>
                        <div className="text-stone-300 text-[11px] leading-relaxed">
                          {feat.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blueprint Name Input if Saving as New Blueprint */}
          {isBlueprint && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
              <label className="block text-purple-300 font-bold text-xs">
                {tr('Name for New Leveled Blueprint (when using "Save as New"):', 'Nome del Nuovo Blueprint Aumentato (se salvi come nuovo):')}
              </label>
              <input
                type="text"
                value={newBlueprintName}
                onChange={(e) => setNewBlueprintName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-purple-700/60 text-stone-100 font-bold outline-none"
              />
              <p className="text-[11px] text-stone-400">
                {tr(
                  'Example: Keeps your original Level 3 blueprint intact in the repository, and creates a separate Level 5 template.',
                  'Esempio: Mantiene intatto il tuo blueprint di Livello 3 nel repository e crea un modello separato di Livello 5.'
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold hover:bg-stone-700 transition"
          >
            {tr('Cancel', 'Annulla')}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {isBlueprint ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyLevelUp('update')}
                  className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4 text-stone-400" />
                  {tr('Update Existing Blueprint', 'Aggiorna Blueprint Esistente')}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyLevelUp('new_blueprint')}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition"
                >
                  <Copy className="w-4 h-4" />
                  {tr('Save as New Leveled Blueprint', 'Salva come Nuovo Blueprint')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyLevelUp('new_blueprint')}
                  className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-semibold text-xs flex items-center gap-1.5 transition"
                  title={tr('Clone as a milestone copy', 'Clona come copia di traguardo')}
                >
                  <Copy className="w-4 h-4 text-stone-400" />
                  {tr('Save Milestone Copy', 'Salva Copia Traguardo')}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyLevelUp('update')}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition"
                >
                  <Check className="w-4 h-4" />
                  {tr('Confirm Level-Up', 'Conferma Passaggio di Livello')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
