import React, { useState } from 'react';
import {
  AbilityKey,
  CharacterEntity,
  ClassResource,
  DND_ABILITY_META,
  DND_SKILLS,
  EntityKind,
  ProficiencyRank,
  SkillId,
  StatblockEntry,
  formatMod,
  formatProficientSavesSummary,
  formatProficientSkillsSummary,
  formatSignedBonus,
  getModValue,
  getProficiencyBonus,
  getSavingThrowTotalBonus,
  getSkillTotalBonus,
  isPcBlueprint,
  resolveSavingThrowProficiencies,
  resolveSkillProficiencies,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { useDialogs } from './ConfirmDialog';
import { StatblockCard } from './StatblockCard';
import { ImageCropModal } from './ImageCropModal';
import {
  validatePgCombination,
  STANDARD_RACES,
  STANDARD_CLASSES,
  applyStandardTemplate,
  parsePgLevel,
} from '../data/dnd5eRules';
import {
  ALIGNMENT_OPTIONS,
  BACKGROUND_OPTIONS,
  DAMAGE_PRESETS,
  LANGUAGE_PRESETS,
  SENSE_PRESETS,
  SIZE_OPTIONS,
  SPELLCASTING_ABILITIES,
  localizeSize,
} from '../data/sheetOptions';
import {
  ChipField,
  Field,
  ListEditor,
  NextButton,
  ReadOnlyStat,
  SHEET_TABS,
  SheetTabId,
  cardCls,
  cardTitleCls,
  inputCls,
  numCls,
  presetCls,
} from './sheetFields';
import { downloadOfficialCharacterPdf } from '../services/pdfExporter';
import { SPELL_LEVELS, newResourceId } from '../services/spellResources';
import {
  ArrowLeft,
  Check,
  FileDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  ImagePlus,
  Trash2,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Shield,
  Heart,
  Zap,
  Eye,
  Crop,
} from 'lucide-react';

interface FullPageCharacterEditorProps {
  character: CharacterEntity;
  onSave: (char: CharacterEntity) => void;
  onCancel: () => void;
  onLevelUp: (char: CharacterEntity) => void;
}

export const FullPageCharacterEditor: React.FC<FullPageCharacterEditorProps> = ({
  character: initialChar,
  onSave,
  onCancel,
  onLevelUp,
}) => {
  const { lang, tr } = useLanguage();

  const { ask } = useDialogs();
  const [editingChar, setEditingChar] = useState<CharacterEntity>(structuredClone(initialChar));
  const [masterOverrideAccepted, setMasterOverrideAccepted] = useState(false);
  const [showWarningConfirmation, setShowWarningConfirmation] = useState(false);
  const [showStatblockPreview, setShowStatblockPreview] = useState(true);
  const [tab, setTab] = useState<SheetTabId>('identity');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null);

  const isPc = editingChar.kind === 'pc';
  const isBlueprint = isPcBlueprint(editingChar);

  const patch = (changes: Partial<CharacterEntity>) =>
    setEditingChar((prev) => ({ ...prev, ...changes }));
  const apply = (next: CharacterEntity) => setEditingChar(syncSkillAndSaveStrings(next));

  const syncSkillAndSaveStrings = (nextChar: CharacterEntity): CharacterEntity => {
    const savesSummary = formatProficientSavesSummary(nextChar, lang);
    const skillsSummary = formatProficientSkillsSummary(nextChar, lang);
    const percBonus = getSkillTotalBonus(nextChar, 'perception').total;
    return {
      ...nextChar,
      savingThrows: savesSummary,
      skills: skillsSummary,
      passivePerception: 10 + percBonus,
    };
  };

  const updateAbility = (key: keyof CharacterEntity['abilities'], val: number) => {
    const updated: CharacterEntity = {
      ...editingChar,
      abilities: {
        ...editingChar.abilities,
        [key]: Math.max(1, Math.min(30, val || 10)),
      },
    };
    setEditingChar(syncSkillAndSaveStrings(updated));
  };

  const toggleSaveProficiency = (ability: AbilityKey) => {
    const current = resolveSavingThrowProficiencies(editingChar);
    const nextSaves = { ...current, [ability]: !current[ability] };
    const updated: CharacterEntity = {
      ...editingChar,
      savingThrowProficiencies: nextSaves,
    };
    setEditingChar(syncSkillAndSaveStrings(updated));
  };

  const cycleSkillProficiency = (skillId: SkillId) => {
    const current = resolveSkillProficiencies(editingChar);
    const nextRank = (((current[skillId] || 0) + 1) % 3) as ProficiencyRank;
    const nextSkills = { ...current, [skillId]: nextRank };
    const updated: CharacterEntity = {
      ...editingChar,
      skillProficiencies: nextSkills,
    };
    setEditingChar(syncSkillAndSaveStrings(updated));
  };

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPendingCropUrl(dataUrl);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenCropModal = () => {
    const src = editingChar.portraitOriginalUrl || editingChar.portraitUrl;
    if (!src) return;
    setPendingCropUrl(src);
    setCropModalOpen(true);
  };

  const handleCropConfirm = (croppedDataUrl: string) => {
    patch({
      portraitUrl: croppedDataUrl,
      portraitOriginalUrl: pendingCropUrl || editingChar.portraitOriginalUrl || croppedDataUrl,
    });
    setCropModalOpen(false);
  };

  const handleCropCancel = () => {
    if (!editingChar.portraitUrl && pendingCropUrl) {
      patch({
        portraitUrl: pendingCropUrl,
        portraitOriginalUrl: pendingCropUrl,
      });
    }
    setCropModalOpen(false);
  };

  const updateListEntry = (
    field: 'traits' | 'actions' | 'reactionsOrLegendary',
    index: number,
    patch: Partial<StatblockEntry>
  ) => {
    const current = [...(editingChar[field] || [])];
    current[index] = { ...current[index], ...patch };
    setEditingChar({ ...editingChar, [field]: current });
  };

  const addListEntry = (field: 'traits' | 'actions' | 'reactionsOrLegendary') => {
    const current = [...(editingChar[field] || [])];
    current.push({
      name: tr('New Feature / Action', 'Nuova Capacità / Azione'),
      description: tr(
        'Description of effect or attack roll.',
        'Descrizione dell’effetto o tiro per colpire.'
      ),
    });
    setEditingChar({ ...editingChar, [field]: current });
  };

  const removeListEntry = (field: 'traits' | 'actions' | 'reactionsOrLegendary', index: number) => {
    const current = [...(editingChar[field] || [])];
    current.splice(index, 1);
    setEditingChar({ ...editingChar, [field]: current });
  };

  const handleSaveClick = () => {
    const validation = validatePgCombination(editingChar, lang);
    if (isPc && validation.advisories.length > 0 && !masterOverrideAccepted) {
      setShowWarningConfirmation(true);
      return;
    }
    onSave(editingChar);
  };

  const isDirty = JSON.stringify(editingChar) !== JSON.stringify(initialChar);

  const handleCancel = async () => {
    if (!isDirty) {
      onCancel();
      return;
    }
    const choice = await ask({
      title: tr('Save your changes?', 'Salvare le modifiche?'),
      message: tr(
        'This sheet has unsaved changes. If you leave without saving, they will be lost.',
        'Questa scheda ha modifiche non salvate. Se esci senza salvare andranno perse.'
      ),
      confirmLabel: tr('Save', 'Salva'),
      secondaryLabel: tr('Discard', 'Scarta'),
      cancelLabel: tr('Keep editing', 'Continua a modificare'),
    });
    if (choice === 'confirm') handleSaveClick();
    else if (choice === 'secondary') onCancel();
  };

  const validation = validatePgCombination(editingChar, lang);
  const spellStats = editingChar.spellcastingAbility
    ? (() => {
        const mod = getModValue(editingChar.abilities[editingChar.spellcastingAbility]);
        const pb = getProficiencyBonus(editingChar);
        return { dc: 8 + pb + mod, attack: pb + mod };
      })()
    : null;
  const hasAdvisories = isPc && validation.advisories.length > 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1700px] mx-auto pb-20">
      {/* Sticky Top Header Navigation */}
      <div className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur border border-stone-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tr('Back to Repository', 'Torna al Repository')}</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-header text-lg sm:text-xl font-bold text-amber-300">
                {tr('D&D 5e Sheet Editor', 'Editor Scheda D&D 5e')} —{' '}
                <span className="text-white">{editingChar.name}</span>
              </h2>
              <span
                className={`text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                  isPc
                    ? isBlueprint
                      ? 'bg-purple-900/20 text-purple-300 border-purple-700/50'
                      : 'bg-amber-900/20 text-amber-300 border-amber-700/50'
                    : editingChar.kind === 'npc'
                    ? 'bg-sky-900/20 text-sky-300 border-sky-700/50'
                    : 'bg-red-900/20 text-red-300 border-red-700/50'
                }`}
              >
                {isPc
                  ? isBlueprint
                    ? tr('PC Blueprint / Pre-Gen', 'PG Blueprint / Pre-Gen')
                    : tr('Assigned PC', 'PG Giocante')
                  : editingChar.kind === 'npc'
                  ? 'NPC'
                  : tr('Monster / Boss', 'Mostro / Boss')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400 font-mono">
                {editingChar.levelOrCr}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {tr(
                'Full-screen character sheet: modify stats, 18 skills, saving throws, actions, and official rules alignment.',
                'Scheda a schermo intero: modifica caratteristiche, 18 abilità, tiri salvezza, azioni e conformità alle regole 5e.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPc && (
            <button
              type="button"
              onClick={() => onLevelUp(editingChar)}
              className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-purple-100 text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              {tr('Level Up', 'Passaggio di Livello')}
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadOfficialCharacterPdf(editingChar, lang)}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow"
          >
            <FileDown className="w-4 h-4" />
            {tr('Export Official 5e PDF', 'Esporta PDF Ufficiale 5e')}
          </button>

          <button
            type="button"
            onClick={() => setShowStatblockPreview((v) => !v)}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            title={tr('Toggle live statblock side panel', 'Mostra / Nascondi pannello anteprima statblock')}
          >
            {showStatblockPreview ? (
              <>
                <PanelRightClose className="w-4 h-4 text-stone-400" />
                <span className="hidden md:inline">{tr('Hide Preview', 'Nascondi Anteprima')}</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">{tr('Show Preview', 'Mostra Anteprima')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer transition"
          >
            {tr('Cancel', 'Annulla')}
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg transition"
          >
            <Check className="w-4 h-4" />
            {tr('Save Sheet', 'Salva Scheda')}
          </button>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Sticky Statblock (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Form: Takes 7 cols if preview is open, or 12 cols if collapsed */}
        <div
          className={`${
            showStatblockPreview ? 'xl:col-span-7' : 'xl:col-span-12'
          } space-y-5 text-xs`}
        >
          {/* Supervised Rules Advisory Banner for PCs */}
          {isPc && (
            <div
              className={`p-4 rounded-2xl border transition ${
                hasAdvisories
                  ? masterOverrideAccepted
                    ? 'bg-amber-950/20 border-amber-500/40 text-stone-300'
                    : 'bg-amber-950/40 border-amber-500 text-amber-200'
                  : 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {hasAdvisories ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-xs flex items-center gap-2 flex-wrap">
                      <span>
                        {hasAdvisories
                          ? tr(
                              `D&D 5e Rules Advisory (${validation.advisories.length} item${
                                validation.advisories.length > 1 ? 's' : ''
                              })`,
                              `Promemoria Regole D&D 5e (${validation.advisories.length} avvis${
                                validation.advisories.length > 1 ? 'i' : 'o'
                              })`
                            )
                          : tr(
                              'Standard D&D 5e Rules Validated',
                              'Regole Standard D&D 5e Validate'
                            )}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 font-normal">
                        {validation.standardClass
                          ? lang === 'it'
                            ? validation.standardClass.nameIt
                            : validation.standardClass.nameEn
                          : tr('Custom Class', 'Classe Custom')}{' '}
                        • Lv {validation.level}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                      {tr(
                        'The Dungeon Master is ALWAYS the final decision maker. You can align with standard 5e rules or continue anyway with custom homebrew values.',
                        'Il Dungeon Master è SEMPRE l’arbitro finale. Puoi allinearti alle regole 5e o continuare comunque con valori personalizzati homebrew.'
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action: Apply standard features & traits */}
                {(validation.standardRace || validation.standardClass) && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = applyStandardTemplate(editingChar, {
                        raceDef: validation.standardRace,
                        classDef: validation.standardClass,
                        level: validation.level,
                        lang,
                      });
                      setEditingChar(syncSkillAndSaveStrings(updated));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow"
                    title={tr(
                      'Add missing standard racial traits and class features tagged with (Race) & (Class)',
                      'Aggiungi i tratti di razza e capacità di classe standard etichettati con (Razza) & (Classe)'
                    )}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {tr('Apply Standard 5e Features', 'Applica Tratti Standard 5e')}
                  </button>
                )}
              </div>

              {/* Advisory items */}
              {hasAdvisories && (
                <div className="mt-3.5 space-y-2 border-t border-stone-800/80 pt-3 text-[11px]">
                  {validation.advisories.map((adv) => (
                    <div
                      key={adv.id}
                      className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-amber-300">
                          {lang === 'it' ? adv.titleIt : adv.titleEn}
                        </div>
                        <div className="text-stone-300">
                          {lang === 'it' ? adv.messageIt : adv.messageEn}
                        </div>
                      </div>
                      {adv.autoFix && (
                        <button
                          type="button"
                          onClick={() => {
                            if (adv.autoFix) {
                              const fixed = adv.autoFix(editingChar);
                              setEditingChar(syncSkillAndSaveStrings(fixed));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 hover:text-stone-950 border border-amber-500/50 text-amber-200 text-xs font-bold shrink-0 transition cursor-pointer"
                        >
                          {tr('Align with 5e Standard', 'Allinea a Standard')}
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Master Override / Continue Anyway Checkbox */}
                  <div className="flex flex-wrap items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-stone-300 text-xs">
                      <input
                        type="checkbox"
                        checked={masterOverrideAccepted}
                        onChange={(e) => setMasterOverrideAccepted(e.target.checked)}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-amber-400">
                        {tr(
                          'Master Decision: Continue anyway (Accept custom/homebrew values)',
                          'Decisione del Master: Continua comunque (Accetta valori custom/homebrew)'
                        )}
                      </span>
                    </label>
                    <span className="text-[10px] text-stone-500 italic">
                      {tr('Saves will not be blocked', 'Il salvataggio non verrà bloccato')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section tabs (mirrors the pages of the official sheet) */}
          <div
            role="tablist"
            className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-stone-900/80 border border-stone-800"
          >
            {SHEET_TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[7.5rem] px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tab === t.id
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span className="opacity-60 mr-1">{i + 1}.</span>
                {tr(t.en, t.it)}
              </button>
            ))}
          </div>

          {/* TAB 1: Identity */}
          {tab === 'identity' && (
            <div className={cardCls}>
              <h3 className={cardTitleCls}>{tr('Identity', 'Identità')}</h3>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4">
                <Field label={tr('Category', 'Categoria')}>
                  <select
                    value={editingChar.kind}
                    onChange={(e) => patch({ kind: e.target.value as EntityKind })}
                    className={`${inputCls} font-semibold`}
                  >
                    <option value="pc">{tr('PC (Player / Pre-Gen)', 'PG (Giocatore / Pre-Gen)')}</option>
                    <option value="npc">{tr('NPC (Ally / NPC)', 'NPC (Alleato / PNG)')}</option>
                    <option value="monster">{tr('Monster / Boss', 'Mostro / Boss')}</option>
                  </select>
                </Field>
                <Field label={tr('Full Name', 'Nome Completo')}>
                  <input
                    type="text"
                    value={editingChar.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    className={`${inputCls} font-bold text-sm`}
                  />
                </Field>
                <Field
                  label={
                    isPc
                      ? tr('Player Name (Optional)', 'Nome Giocatore (Opzionale)')
                      : tr('Narrative Role / Title', 'Ruolo Narrativo / Titolo')
                  }
                >
                  <input
                    type="text"
                    value={editingChar.playerOrRole}
                    disabled={isPc && Boolean(editingChar.isPreGenBlueprint)}
                    placeholder={isPc ? tr('Unassigned (Pre-Gen)', 'Non assegnato (Pre-Gen)') : ''}
                    onChange={(e) => patch({ playerOrRole: e.target.value })}
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </Field>
              </div>

              {isPc && (
                <label className="p-3.5 rounded-xl bg-stone-950 border border-amber-500/30 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingChar.isPreGenBlueprint)}
                    onChange={(e) =>
                      patch({
                        isPreGenBlueprint: e.target.checked,
                        playerOrRole: e.target.checked ? '' : editingChar.playerOrRole,
                      })
                    }
                    className="accent-amber-500 w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <div className="font-bold text-amber-300 text-xs">
                      {tr(
                        'Pre-Generated PC Blueprint (No player required)',
                        'PG Blueprint Pre-Generato (Senza giocatore obbligatorio)'
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {tr(
                        'Keep this sheet as a reusable template to print or assign across multiple one-shots and campaigns.',
                        'Mantieni questa scheda come modello riutilizzabile da stampare o assegnare in diverse one-shot e campagne.'
                      )}
                    </div>
                  </div>
                </label>
              )}

              <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-4">
                {/* Race / Species */}
                <Field label={tr('Race / Species', 'Razza / Specie')}>
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      type="text"
                      value={editingChar.creatureType}
                      onChange={(e) => patch({ creatureType: e.target.value })}
                      placeholder={
                        isPc
                          ? tr('e.g. Elf, Human...', 'es. Elfo, Umano...')
                          : tr('e.g. Humanoid, Fiend', 'es. Umanoide, Immondo')
                      }
                      className={`${inputCls} flex-1 min-w-[9rem]`}
                    />
                    {isPc && (
                      <select
                        value=""
                        onChange={(e) => {
                          const r = STANDARD_RACES.find((rc) => rc.id === e.target.value);
                          if (r) apply(applyStandardTemplate(editingChar, { raceDef: r, lang }));
                        }}
                        className={presetCls}
                        title={tr(
                          'Apply 5e standard race traits & stats',
                          'Applica tratti e statistiche della razza standard 5e'
                        )}
                      >
                        <option value="">{tr('5e Preset...', 'Preimpostati 5e...')}</option>
                        {STANDARD_RACES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {lang === 'it' ? r.nameIt : r.nameEn}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </Field>

                {/* Size */}
                <Field label={tr('Size', 'Taglia')}>
                  <select
                    value={localizeSize(editingChar.size, lang)}
                    onChange={(e) => patch({ size: e.target.value })}
                    className={inputCls}
                  >
                    {!SIZE_OPTIONS.some((s) => s[lang] === localizeSize(editingChar.size, lang)) && (
                      <option value={editingChar.size}>{editingChar.size}</option>
                    )}
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s.en} value={s[lang]}>
                        {s[lang]}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Class / Archetype */}
                <Field label={tr('Class / Archetype', 'Classe / Archetipo')}>
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      type="text"
                      value={editingChar.classOrArchetype || ''}
                      onChange={(e) => patch({ classOrArchetype: e.target.value })}
                      placeholder={tr('e.g. Fighter, Wizard...', 'es. Guerriero, Mago...')}
                      className={`${inputCls} flex-1 min-w-[9rem]`}
                    />
                    {isPc && (
                      <select
                        value=""
                        onChange={(e) => {
                          const c = STANDARD_CLASSES.find((cl) => cl.id === e.target.value);
                          if (c) {
                            apply(
                              applyStandardTemplate(editingChar, {
                                classDef: c,
                                level: parsePgLevel(editingChar.levelOrCr),
                                lang,
                              })
                            );
                          }
                        }}
                        className={presetCls}
                        title={tr(
                          'Apply 5e standard class features & hit dice',
                          'Applica capacità di classe e dadi vita standard 5e'
                        )}
                      >
                        <option value="">{tr('5e Preset...', 'Preimpostati 5e...')}</option>
                        {STANDARD_CLASSES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {lang === 'it' ? c.nameIt : c.nameEn}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </Field>

                {/* Level */}
                <Field label={tr('Level (PC) or CR', 'Livello (PG) o GS')}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingChar.levelOrCr}
                      onChange={(e) => apply({ ...editingChar, levelOrCr: e.target.value })}
                      className={`${inputCls} min-w-[7rem] font-bold`}
                    />
                    {isPc && (
                      <button
                        type="button"
                        onClick={() => onLevelUp(editingChar)}
                        className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-purple-100 text-xs font-bold flex items-center gap-1 shrink-0 transition shadow cursor-pointer"
                        title={tr('Level Up', 'Passaggio di Livello')}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        {tr('Level Up', 'Sali di livello')}
                      </button>
                    )}
                  </div>
                </Field>

                {/* Background */}
                <Field label={tr('Background', 'Background')}>
                  <input
                    type="text"
                    list="sheet-backgrounds"
                    value={editingChar.background || ''}
                    onChange={(e) => patch({ background: e.target.value })}
                    placeholder={tr('e.g. Noble, Sage, Soldier', 'es. Nobile, Sapiente, Soldato')}
                    className={inputCls}
                  />
                  <datalist id="sheet-backgrounds">
                    {BACKGROUND_OPTIONS.map((b) => (
                      <option key={b.en} value={b[lang]} />
                    ))}
                  </datalist>
                </Field>

                {/* Alignment */}
                <Field label={tr('Alignment', 'Allineamento')}>
                  <input
                    type="text"
                    list="sheet-alignments"
                    value={editingChar.alignment}
                    onChange={(e) => patch({ alignment: e.target.value })}
                    placeholder={tr('e.g. Lawful Good', 'es. Legale Buono')}
                    className={inputCls}
                  />
                  <datalist id="sheet-alignments">
                    {ALIGNMENT_OPTIONS.map((a) => (
                      <option key={a.en} value={a[lang]} />
                    ))}
                  </datalist>
                </Field>
              </div>

              {/* Portrait / Illustration */}
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <ImagePlus className="w-4 h-4" />
                    {tr('Portrait / Illustration', 'Immagine / Ritratto')}
                  </label>
                  {editingChar.portraitUrl && (
                    <button
                      type="button"
                      onClick={() => patch({ portraitUrl: undefined, portraitOriginalUrl: undefined })}
                      className="text-[11px] text-red-400 hover:underline cursor-pointer"
                    >
                      {tr('Remove Image', 'Rimuovi Immagine')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {editingChar.portraitUrl && (
                    <button
                      type="button"
                      onClick={handleOpenCropModal}
                      title={tr('Click to adjust framing / crop', 'Clicca per regolare l\'inquadratura / ritaglia')}
                      className="relative group cursor-pointer shrink-0"
                    >
                      <img
                        src={editingChar.portraitUrl}
                        alt="Portrait preview"
                        className="w-16 h-16 rounded-xl object-cover border border-amber-500/50"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-amber-300">
                        <Crop className="w-5 h-5 drop-shadow" />
                      </div>
                    </button>
                  )}
                  <label className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold cursor-pointer border border-stone-700 text-xs transition shrink-0">
                    {tr('Upload Image File...', 'Carica File Immagine...')}
                    <input type="file" accept="image/*" onChange={handlePortraitUpload} className="hidden" />
                  </label>
                  {editingChar.portraitUrl && (
                    <button
                      type="button"
                      onClick={handleOpenCropModal}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/40 text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>{tr('Adjust Framing / Crop', 'Regola Inquadratura')}</span>
                    </button>
                  )}
                  <input
                    type="text"
                    value={editingChar.portraitUrl || ''}
                    onChange={(e) =>
                      patch({
                        portraitUrl: e.target.value || undefined,
                        portraitOriginalUrl: e.target.value || undefined,
                      })
                    }
                    placeholder={tr('Or paste image URL / DataURL...', 'Oppure incolla URL immagine / DataURL...')}
                    className={`${inputCls} flex-1 min-w-[12rem]`}
                  />
                </div>
              </div>
              <NextButton onClick={() => setTab('abilities')} label={tr('Next: Abilities & Skills', 'Avanti: Caratteristiche & Abilità')} />
            </div>
          )}

          {/* TAB 2: Abilities, saves, skills */}
          {tab === 'abilities' && (
            <div className="space-y-5">
              <div className={cardCls}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={cardTitleCls}>{tr('Ability Scores', 'Caratteristiche')}</h3>
                  <span className="text-[11px] text-stone-400">
                    {tr(
                      'Auto-calculates saving throws and all 18 skill bonuses',
                      'Aggiorna in automatico tutti i tiri salvezza e le 18 abilità'
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3">
                  {DND_ABILITY_META.map((ab) => (
                    <div
                      key={ab.key}
                      className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-center shadow-inner"
                    >
                      <div className="text-xs font-extrabold text-amber-400 uppercase">
                        {lang === 'it' ? ab.shortIt : ab.shortEn}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={editingChar.abilities[ab.key]}
                        onChange={(e) => updateAbility(ab.key, Number(e.target.value))}
                        className="w-full min-w-[4rem] mt-1.5 text-center py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-bold text-base"
                      />
                      <div className="text-xs font-mono text-amber-300 font-semibold mt-1">
                        {formatMod(editingChar.abilities[ab.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardCls}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
                  <span className={cardTitleCls}>
                    {tr('Saving Throws & Skills', 'Tiri Salvezza & Abilità')} — {tr('Proficiency Bonus', 'Bonus Competenza')}{' '}
                    +{getProficiencyBonus(editingChar)}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {tr(
                      'Click to cycle: None (○) → Proficient (●) → Expertise (◆)',
                      'Clicca per ciclare: Base (○) → Competenza (●) → Maestria (◆)'
                    )}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase text-stone-400 mb-2">
                    {tr('Saving Throws', 'Tiri Salvezza')}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
                    {DND_ABILITY_META.map((ab) => {
                      const { total, proficient } = getSavingThrowTotalBonus(editingChar, ab.key);
                      return (
                        <button
                          key={ab.key}
                          type="button"
                          onClick={() => toggleSaveProficiency(ab.key)}
                          className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            proficient
                              ? 'bg-amber-600/20 border-amber-500 text-amber-200 font-bold shadow'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <span>
                            {proficient ? '● ' : '○ '}
                            {lang === 'it' ? ab.shortIt : ab.shortEn}
                          </span>
                          <span className="font-mono font-bold">{formatSignedBonus(total)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase text-stone-400 mb-2">
                    {tr('All 18 D&D 5e Skills', 'Tutte le 18 Abilità D&D 5e')}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
                    {DND_SKILLS.map((sk) => {
                      const { total, rank } = getSkillTotalBonus(editingChar, sk.id);
                      const abMeta = DND_ABILITY_META.find((a) => a.key === sk.ability)!;
                      const abShort = lang === 'it' ? abMeta.shortIt : abMeta.shortEn;
                      const icon = rank === 2 ? '◆' : rank === 1 ? '●' : '○';
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => cycleSkillProficiency(sk.id)}
                          className={`px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            rank === 2
                              ? 'bg-purple-600/25 border-purple-400 text-purple-200 font-bold shadow'
                              : rank === 1
                              ? 'bg-amber-600/20 border-amber-500 text-amber-200 font-bold shadow'
                              : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <span className="truncate">
                            <span className="mr-1.5">{icon}</span>
                            {lang === 'it' ? sk.labelIt : sk.labelEn}{' '}
                            <span className="text-[10px] opacity-60">({abShort})</span>
                          </span>
                          <span className="font-mono font-bold shrink-0">{formatSignedBonus(total)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <NextButton onClick={() => setTab('combat')} label={tr('Next: Combat', 'Avanti: Combattimento')} />
              </div>
            </div>
          )}

          {/* TAB 3: Combat */}
          {tab === 'combat' && (
            <div className="space-y-5">
              <div className={cardCls}>
                <h3 className={cardTitleCls}>{tr('Combat Vitals', 'Parametri di Combattimento')}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <Field label={tr('Armor Class', 'Classe Armatura')}>
                    <input
                      type="number"
                      value={editingChar.ac}
                      onChange={(e) => patch({ ac: Number(e.target.value) })}
                      className={`${numCls} text-amber-300 font-bold`}
                    />
                  </Field>
                  <Field label={tr('Max HP', 'PF Massimi')}>
                    <input
                      type="number"
                      value={editingChar.hpMax}
                      onChange={(e) => patch({ hpMax: Number(e.target.value) })}
                      className={`${numCls} text-emerald-400 font-bold`}
                    />
                  </Field>
                  <Field label={tr('Hit Dice', 'Dadi Vita')}>
                    <input
                      type="text"
                      value={editingChar.hitDiceFormula}
                      onChange={(e) => patch({ hitDiceFormula: e.target.value })}
                      className={`${numCls} font-mono`}
                    />
                  </Field>
                  <Field label={tr('Initiative Bonus', 'Bonus Iniziativa')}>
                    <input
                      type="number"
                      value={editingChar.initiativeBonus}
                      onChange={(e) => patch({ initiativeBonus: Number(e.target.value) })}
                      className={numCls}
                    />
                  </Field>
                  <Field label={tr('Passive Perception', 'Percezione Passiva')}>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={editingChar.passivePerception}
                        onChange={(e) => patch({ passivePerception: Number(e.target.value) })}
                        className={numCls}
                      />
                      <button
                        type="button"
                        onClick={() => apply(editingChar)}
                        title={tr('Recalculate from Wisdom and Perception', 'Ricalcola da Saggezza e Percezione')}
                        className="px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-sm cursor-pointer shrink-0"
                      >
                        ↻
                      </button>
                    </div>
                  </Field>
                  <Field label={tr('Speed', 'Velocità')}>
                    <input
                      type="text"
                      value={editingChar.speed}
                      onChange={(e) => patch({ speed: e.target.value })}
                      placeholder={tr('30 ft.', '9 m')}
                      className={numCls}
                    />
                  </Field>
                </div>
                <Field label={tr('Armor & shield note', 'Armatura e scudo')}>
                  <input
                    type="text"
                    value={editingChar.acNote || ''}
                    onChange={(e) => patch({ acNote: e.target.value })}
                    placeholder={tr('e.g. Chain mail, shield', 'es. Cotta di maglia, scudo')}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className={cardCls}>
                <ListEditor
                  title={tr('Actions & Attacks', 'Azioni & Attacchi')}
                  addLabel={tr('Add Action', 'Aggiungi Azione')}
                  nameHint={tr('Action name (e.g. Longsword)', 'Nome azione (es. Spada Lunga)')}
                  descHint={tr(
                    'Attack / damage description (e.g. +5 to hit, 1d8+3 slashing)',
                    'Descrizione attacco / danno (es. +5 per colpire, 1d8+3 taglienti)'
                  )}
                  items={editingChar.actions}
                  onChange={(idx, p) => updateListEntry('actions', idx, p)}
                  onAdd={() => addListEntry('actions')}
                  onRemove={(idx) => removeListEntry('actions', idx)}
                />
                {!isPc && (
                  <ListEditor
                    title={tr('Reactions & Legendary Actions', 'Reazioni & Azioni Leggendarie')}
                    addLabel={tr('Add Entry', 'Aggiungi Voce')}
                    nameHint={tr('Name', 'Nome')}
                    descHint={tr('Description', 'Descrizione')}
                    items={editingChar.reactionsOrLegendary || []}
                    onChange={(idx, p) => updateListEntry('reactionsOrLegendary', idx, p)}
                    onAdd={() => addListEntry('reactionsOrLegendary')}
                    onRemove={(idx) => removeListEntry('reactionsOrLegendary', idx)}
                  />
                )}
                <NextButton onClick={() => setTab('senses')} label={tr('Next: Senses & Proficiencies', 'Avanti: Sensi & Competenze')} />
              </div>
            </div>
          )}

          {/* TAB 4: Senses, languages, proficiencies, resistances */}
          {tab === 'senses' && (
            <div className={cardCls}>
              <h3 className={cardTitleCls}>{tr('Senses, Languages & Proficiencies', 'Sensi, Linguaggi & Competenze')}</h3>

              <ChipField
                label={tr('Senses', 'Sensi')}
                value={editingChar.senses || ''}
                placeholder={tr('e.g. Darkvision 60 ft.', 'es. Scurovisione 18 m')}
                presets={SENSE_PRESETS.map((s) => s[lang])}
                onChange={(v) => patch({ senses: v })}
              />
              <ChipField
                label={tr('Languages', 'Linguaggi')}
                value={editingChar.languages || ''}
                placeholder={tr('e.g. Common, Elvish', 'es. Comune, Elfico')}
                presets={LANGUAGE_PRESETS.map((l) => l[lang])}
                onChange={(v) => patch({ languages: v })}
              />
              <Field label={tr('Other proficiencies (armor, weapons, tools)', 'Altre competenze (armature, armi, strumenti)')}>
                <textarea
                  rows={2}
                  value={editingChar.otherProficiencies || ''}
                  onChange={(e) => patch({ otherProficiencies: e.target.value })}
                  placeholder={tr(
                    'e.g. Light armor, simple weapons, thieves’ tools',
                    'es. Armature leggere, armi semplici, arnesi da scasso'
                  )}
                  className={`${inputCls} resize-y min-h-[3.5rem]`}
                />
              </Field>
              <ChipField
                label={tr('Damage resistances', 'Resistenze ai danni')}
                value={editingChar.damageResistances || ''}
                placeholder={tr('e.g. Fire, Poison', 'es. Fuoco, Veleno')}
                presets={DAMAGE_PRESETS.map((d) => d[lang])}
                onChange={(v) => patch({ damageResistances: v })}
              />
              <ChipField
                label={tr('Damage immunities', 'Immunità ai danni')}
                value={editingChar.damageImmunities || ''}
                placeholder={tr('e.g. Poison', 'es. Veleno')}
                presets={DAMAGE_PRESETS.map((d) => d[lang])}
                onChange={(v) => patch({ damageImmunities: v })}
              />
              <Field label={tr('Condition immunities', 'Immunità alle condizioni')}>
                <input
                  type="text"
                  value={editingChar.conditionImmunities || ''}
                  onChange={(e) => patch({ conditionImmunities: e.target.value })}
                  placeholder={tr('e.g. Charmed, Frightened', 'es. Affascinato, Spaventato')}
                  className={inputCls}
                />
              </Field>
              <NextButton onClick={() => setTab('features')} label={tr('Next: Features & Spells', 'Avanti: Capacità & Incantesimi')} />
            </div>
          )}

          {/* TAB 5: Features and spells */}
          {tab === 'features' && (
            <div className="space-y-5">
              <div className={cardCls}>
                <ListEditor
                  title={tr('Traits & Special Features', 'Tratti & Capacità Speciali')}
                  addLabel={tr('Add Trait', 'Aggiungi Tratto')}
                  nameHint={tr('Trait name (e.g. (Elf) Darkvision)', 'Nome tratto (es. (Elfo) Scurovisione)')}
                  descHint={tr('Description of trait effect', 'Descrizione dell’effetto del tratto')}
                  items={editingChar.traits}
                  onChange={(idx, p) => updateListEntry('traits', idx, p)}
                  onAdd={() => addListEntry('traits')}
                  onRemove={(idx) => removeListEntry('traits', idx)}
                />
              </div>
              <div className={cardCls}>
                <h3 className={cardTitleCls}>{tr('Spell slots', 'Slot incantesimo')}</h3>
                <p className="text-xs text-stone-400 -mt-1">
                  {tr(
                    'Maximum slots per spell level. Leave at 0 for levels the character does not have; the live console and the phone track how many are spent.',
                    'Slot massimi per livello di incantesimo. Lascia 0 per i livelli che il personaggio non ha; la console live e il telefono tengono il conto di quelli usati.'
                  )}
                </p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-3">
                  {SPELL_LEVELS.map((level) => (
                    <Field key={level} label={tr(`Level ${level}`, `Livello ${level}`)}>
                      <input
                        type="number"
                        min={0}
                        max={9}
                        value={editingChar.spellSlots?.[level - 1] ?? 0}
                        onChange={(e) => {
                          const next = SPELL_LEVELS.map((l) => editingChar.spellSlots?.[l - 1] ?? 0);
                          next[level - 1] = Math.max(0, Math.min(9, Math.floor(Number(e.target.value) || 0)));
                          patch({ spellSlots: next.some((n) => n > 0) ? next : undefined });
                        }}
                        className={numCls}
                      />
                    </Field>
                  ))}
                </div>
              </div>
              <div className={cardCls}>
                <h3 className={cardTitleCls}>{tr('Class resources', 'Risorse di classe')}</h3>
                <p className="text-xs text-stone-400 -mt-1">
                  {tr(
                    'Limited pools such as ki, sorcery points, bardic inspiration or rage uses.',
                    'Riserve limitate come punti ki, punti stregoneria, ispirazione bardica o usi di ira.'
                  )}
                </p>
                <div className="space-y-2">
                  {(editingChar.classResources ?? []).map((res, idx) => {
                    const update = (changes: Partial<ClassResource>) =>
                      patch({
                        classResources: (editingChar.classResources ?? []).map((r, i) =>
                          i === idx ? { ...r, ...changes } : r
                        ),
                      });
                    return (
                      <div key={res.id} className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={res.name}
                          onChange={(e) => update({ name: e.target.value })}
                          placeholder={tr('Name (e.g. Ki points)', 'Nome (es. Punti ki)')}
                          aria-label={tr('Resource name', 'Nome risorsa')}
                          className={`${inputCls} flex-1 min-w-[10rem]`}
                        />
                        <input
                          type="number"
                          min={0}
                          value={res.max}
                          onChange={(e) =>
                            update({ max: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                          aria-label={tr('Maximum', 'Massimo')}
                          className={`${numCls} w-20`}
                        />
                        <select
                          value={res.recharge}
                          onChange={(e) => update({ recharge: e.target.value as ClassResource['recharge'] })}
                          aria-label={tr('Recharge', 'Ricarica')}
                          className={`${inputCls} w-40`}
                        >
                          <option value="long">{tr('Long rest', 'Riposo lungo')}</option>
                          <option value="short">{tr('Short rest', 'Riposo breve')}</option>
                          <option value="manual">{tr('Manual only', 'Solo manuale')}</option>
                        </select>
                        <button
                          onClick={() =>
                            patch({
                              classResources: (editingChar.classResources ?? []).filter((_, i) => i !== idx),
                            })
                          }
                          aria-label={tr('Remove resource', 'Rimuovi risorsa')}
                          className="px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-red-900/70 text-stone-300 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      const existing = editingChar.classResources ?? [];
                      const name = tr('New resource', 'Nuova risorsa');
                      patch({
                        classResources: [
                          ...existing,
                          { id: newResourceId(existing, name), name, max: 1, recharge: 'long' },
                        ],
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-medium"
                  >
                    + {tr('Add resource', 'Aggiungi risorsa')}
                  </button>
                </div>
              </div>
              <div className={cardCls}>
                <h3 className={cardTitleCls}>{tr('Spellcasting', 'Incantesimi')}</h3>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                  <Field label={tr('Spellcasting ability', 'Caratteristica da incantatore')}>
                    <select
                      value={editingChar.spellcastingAbility || ''}
                      onChange={(e) =>
                        patch({ spellcastingAbility: (e.target.value || undefined) as AbilityKey | undefined })
                      }
                      className={inputCls}
                    >
                      <option value="">{tr('None', 'Nessuna')}</option>
                      {SPELLCASTING_ABILITIES.map((k) => {
                        const meta = DND_ABILITY_META.find((a) => a.key === k)!;
                        return (
                          <option key={k} value={k}>
                            {lang === 'it' ? meta.shortIt : meta.shortEn}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  {spellStats && (
                    <>
                      <ReadOnlyStat label={tr('Spell save DC', 'CD incantesimi')} value={String(spellStats.dc)} />
                      <ReadOnlyStat label={tr('Spell attack bonus', 'Bonus attacco inc.')} value={formatSignedBonus(spellStats.attack)} />
                    </>
                  )}
                </div>
                <Field label={tr('Spells & Spell Slots Notes', 'Note Incantesimi & Slot')}>
                  <textarea
                    rows={5}
                    value={editingChar.spellsNotes || ''}
                    onChange={(e) => patch({ spellsNotes: e.target.value })}
                    placeholder={tr(
                      'e.g. Cantrips: Fire Bolt, Light. 1st Level (4 slots): Shield, Magic Missile...',
                      'es. Trucchetti: Dardo di Fuoco, Luce. 1° Livello (4 slot): Scudo, Dardo Incantato...'
                    )}
                    className={`${inputCls} resize-y min-h-[6rem]`}
                  />
                </Field>
                <NextButton onClick={() => setTab('story')} label={tr('Next: Gear & Story', 'Avanti: Equipaggiamento & Storia')} />
              </div>
            </div>
          )}

          {/* TAB 6: Gear and story */}
          {tab === 'story' && (
            <div className={cardCls}>
              <h3 className={cardTitleCls}>{tr('Equipment & Story', 'Equipaggiamento & Storia')}</h3>
              <Field label={tr('Equipment, treasure & coins', 'Equipaggiamento, tesoro e monete')}>
                <textarea
                  rows={4}
                  value={editingChar.equipment || ''}
                  onChange={(e) => patch({ equipment: e.target.value })}
                  placeholder={tr(
                    'e.g. Longsword, backpack, 50 ft. rope, 12 gp',
                    'es. Spada lunga, zaino, 15 m di corda, 12 mo'
                  )}
                  className={`${inputCls} resize-y min-h-[5rem]`}
                />
              </Field>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
                <Field label={tr('Personality traits', 'Tratti caratteriali')}>
                  <textarea rows={3} value={editingChar.personalityTraits || ''} onChange={(e) => patch({ personalityTraits: e.target.value })} className={`${inputCls} resize-y min-h-[4.5rem]`} />
                </Field>
                <Field label={tr('Ideals', 'Ideali')}>
                  <textarea rows={3} value={editingChar.ideals || ''} onChange={(e) => patch({ ideals: e.target.value })} className={`${inputCls} resize-y min-h-[4.5rem]`} />
                </Field>
                <Field label={tr('Bonds', 'Legami')}>
                  <textarea rows={3} value={editingChar.bonds || ''} onChange={(e) => patch({ bonds: e.target.value })} className={`${inputCls} resize-y min-h-[4.5rem]`} />
                </Field>
                <Field label={tr('Flaws', 'Difetti')}>
                  <textarea rows={3} value={editingChar.flaws || ''} onChange={(e) => patch({ flaws: e.target.value })} className={`${inputCls} resize-y min-h-[4.5rem]`} />
                </Field>
              </div>
              <Field label={tr('Backstory & notes', 'Biografia & note')}>
                <textarea
                  rows={6}
                  value={editingChar.biographyOrLore}
                  onChange={(e) => patch({ biographyOrLore: e.target.value })}
                  placeholder={tr('Backstory, allies, organizations, notes...', 'Biografia, alleati, organizzazioni, note...')}
                  className={`${inputCls} resize-y min-h-[8rem]`}
                />
              </Field>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs cursor-pointer transition"
            >
              {tr('Cancel', 'Annulla')}
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition"
            >
              <Check className="w-4 h-4" />
              {tr('Save Character Sheet', 'Salva Scheda Personaggio')}
            </button>
          </div>
        </div>

        {/* Right Sticky Statblock Live Preview: 5 cols */}
        {showStatblockPreview && (
          <div className="xl:col-span-5 sticky top-24 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400">
              <span className="uppercase tracking-wider">
                {tr('Live D&D 5e Statblock Preview', 'Anteprima Live Statblock D&D 5e')}
              </span>
              <span className="text-[10px] text-stone-500">
                {tr('Updates automatically as you edit', 'Si aggiorna in tempo reale')}
              </span>
            </div>
            <StatblockCard
              character={editingChar}
              onEditPortrait={editingChar.portraitUrl ? handleOpenCropModal : undefined}
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal when saving with unacknowledged 5e rules advisories */}
      {showWarningConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-header text-lg font-bold text-amber-300">
                  {tr('D&D 5e Rules Advisory Warning', 'Avviso di Conformità Regole D&D 5e')}
                </h3>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  {tr(
                    'This character has some attributes that differ from standard D&D 5e rules. As Dungeon Master, you are ALWAYS the final decision maker.',
                    'Questo personaggio presenta alcuni valori differenti dalle regole standard 5e. Come Dungeon Master, sei SEMPRE l’arbitro finale.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 space-y-1.5 max-h-48 overflow-y-auto">
              {validation.advisories.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{lang === 'it' ? a.titleIt : a.titleEn}: {lang === 'it' ? a.messageIt : a.messageEn}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowWarningConfirmation(false)}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                {tr('Go Back & Review', 'Torna Indietro & Rivedi')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarningConfirmation(false);
                  setMasterOverrideAccepted(true);
                  onSave(editingChar);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <Check className="w-4 h-4" />
                {tr(
                  'Master Decision: Save Anyway',
                  'Decisione del Master: Salva Comunque'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop & Framing Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageUrl={pendingCropUrl || ''}
        characterName={editingChar.name}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
};
