import React, { useState } from 'react';
import {
  AbilityKey,
  CharacterEntity,
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
  getProficiencyBonus,
  getSavingThrowTotalBonus,
  getSkillTotalBonus,
  isPcBlueprint,
  resolveSavingThrowProficiencies,
  resolveSkillProficiencies,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { StatblockCard } from './StatblockCard';
import { ImageCropModal } from './ImageCropModal';
import {
  validatePgCombination,
  STANDARD_RACES,
  STANDARD_CLASSES,
  applyStandardTemplate,
  parsePgLevel,
} from '../data/dnd5eRules';
import { downloadOfficialCharacterPdf } from '../services/pdfExporter';
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

  const [editingChar, setEditingChar] = useState<CharacterEntity>(structuredClone(initialChar));
  const [masterOverrideAccepted, setMasterOverrideAccepted] = useState(false);
  const [showWarningConfirmation, setShowWarningConfirmation] = useState(false);
  const [showStatblockPreview, setShowStatblockPreview] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null);

  const isPc = editingChar.kind === 'pc';
  const isBlueprint = isPcBlueprint(editingChar);

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
    setEditingChar({
      ...editingChar,
      portraitUrl: croppedDataUrl,
      portraitOriginalUrl: pendingCropUrl || editingChar.portraitOriginalUrl || croppedDataUrl,
    });
    setCropModalOpen(false);
  };

  const handleCropCancel = () => {
    if (!editingChar.portraitUrl && pendingCropUrl) {
      setEditingChar({
        ...editingChar,
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

  const validation = validatePgCombination(editingChar, lang);
  const hasAdvisories = isPc && validation.advisories.length > 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1700px] mx-auto pb-20">
      {/* Sticky Top Header Navigation */}
      <div className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur border border-stone-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
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
            onClick={onCancel}
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

          {/* Section: General Info & Identity */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-4">
            <h3 className="font-header text-sm font-bold text-amber-400">
              {tr('General Info & Character Identity', 'Anagrafica & Identità del Personaggio')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Category', 'Categoria')}
                </label>
                <select
                  value={editingChar.kind}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, kind: e.target.value as EntityKind })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-semibold"
                >
                  <option value="pc">{tr('PC (Player / Pre-Gen)', 'PG (Giocatore / Pre-Gen)')}</option>
                  <option value="npc">{tr('NPC (Ally / NPC)', 'NPC (Alleato / PNG)')}</option>
                  <option value="monster">{tr('Monster / Boss', 'Mostro / Boss')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Full Name', 'Nome Completo')}
                </label>
                <input
                  type="text"
                  value={editingChar.name}
                  onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-bold text-sm"
                />
              </div>
            </div>

            {/* PC Blueprint Toggle */}
            {isPc && (
              <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingChar.isPreGenBlueprint)}
                    onChange={(e) =>
                      setEditingChar({
                        ...editingChar,
                        isPreGenBlueprint: e.target.checked,
                        playerOrRole: e.target.checked ? '' : editingChar.playerOrRole,
                      })
                    }
                    className="accent-amber-500 w-4 h-4"
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
              </div>
            )}

            {/* Portrait / Illustration */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <ImagePlus className="w-4 h-4" />
                  {tr(
                    'Portrait / Illustration (PC, NPC, Monster/Boss)',
                    'Immagine / Ritratto (PG, NPC, Mostro/Boss)'
                  )}
                </label>
                {editingChar.portraitUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingChar({
                        ...editingChar,
                        portraitUrl: undefined,
                        portraitOriginalUrl: undefined,
                      })
                    }
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
                <label className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold cursor-pointer border border-stone-700 text-xs transition">
                  {tr('Upload Image File...', 'Carica File Immagine...')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePortraitUpload}
                    className="hidden"
                  />
                </label>
                {editingChar.portraitUrl && (
                  <button
                    type="button"
                    onClick={handleOpenCropModal}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/40 text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>{tr('Adjust Framing / Crop', 'Regola Inquadratura')}</span>
                  </button>
                )}
                <input
                  type="text"
                  value={editingChar.portraitUrl || ''}
                  onChange={(e) =>
                    setEditingChar({
                      ...editingChar,
                      portraitUrl: e.target.value || undefined,
                      portraitOriginalUrl: e.target.value || undefined,
                    })
                  }
                  placeholder={tr(
                    'Or paste image URL / DataURL...',
                    'Oppure incolla URL immagine / DataURL...'
                  )}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs"
                />
              </div>
            </div>

            {/* Row: Player Name, Level/CR with Level Up Button, Background */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {isPc
                    ? tr('Player Name (Optional)', 'Nome Giocatore (Opzionale)')
                    : tr('Narrative Role / Title', 'Ruolo Narrativo / Titolo')}
                </label>
                <input
                  type="text"
                  value={editingChar.playerOrRole}
                  disabled={isPc && Boolean(editingChar.isPreGenBlueprint)}
                  placeholder={
                    isPc
                      ? tr('Unassigned (Pre-Gen)', 'Non assegnato (Pre-Gen)')
                      : ''
                  }
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, playerOrRole: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Level (PC) or CR', 'Livello (PG) o GS')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingChar.levelOrCr}
                    onChange={(e) => {
                      const updated = { ...editingChar, levelOrCr: e.target.value };
                      setEditingChar(syncSkillAndSaveStrings(updated));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 font-bold"
                  />
                  {isPc && (
                    <button
                      type="button"
                      onClick={() => onLevelUp(editingChar)}
                      className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-purple-100 text-xs font-bold flex items-center gap-1 shrink-0 transition shadow cursor-pointer"
                      title={tr('Level Up', 'Passaggio di Livello')}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tr('Level Up', 'Livello')}</span> ▲
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Background (5e)', 'Background (5e)')}
                </label>
                <input
                  type="text"
                  value={editingChar.background || ''}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, background: e.target.value })
                  }
                  placeholder={tr('e.g. Noble, Sage, Soldier', 'es. Nobile, Sapiente, Soldato')}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
            </div>

            {/* Row: Race, Class, Alignment (With clean non-overlapping preset dropdowns!) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Race / Species */}
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Race / Species', 'Razza / Specie')}
                </label>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <input
                    type="text"
                    value={editingChar.creatureType}
                    onChange={(e) =>
                      setEditingChar({ ...editingChar, creatureType: e.target.value })
                    }
                    placeholder={
                      isPc
                        ? tr('e.g. Elf, Human...', 'es. Elfo, Umano...')
                        : tr('e.g. Humanoid, Fiend', 'es. Umanoide, Immondo')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                  />
                  {isPc && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const r = STANDARD_RACES.find((rc) => rc.id === e.target.value);
                        if (r) {
                          const updated = applyStandardTemplate(editingChar, {
                            raceDef: r,
                            lang,
                          });
                          setEditingChar(syncSkillAndSaveStrings(updated));
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-stone-900 border border-amber-500/40 text-amber-300 text-xs shrink-0 cursor-pointer hover:border-amber-400"
                      title={tr('Apply 5e standard race traits & stats', 'Applica tratti e statistiche della razza standard 5e')}
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
              </div>

              {/* Class / Archetype */}
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Class / Archetype', 'Classe / Archetipo')}
                </label>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <input
                    type="text"
                    value={editingChar.classOrArchetype || ''}
                    onChange={(e) =>
                      setEditingChar({ ...editingChar, classOrArchetype: e.target.value })
                    }
                    placeholder={tr('e.g. Fighter, Wizard...', 'es. Guerriero, Mago...')}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                  />
                  {isPc && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const c = STANDARD_CLASSES.find((cl) => cl.id === e.target.value);
                        if (c) {
                          const lv = parsePgLevel(editingChar.levelOrCr);
                          const updated = applyStandardTemplate(editingChar, {
                            classDef: c,
                            level: lv,
                            lang,
                          });
                          setEditingChar(syncSkillAndSaveStrings(updated));
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-stone-900 border border-amber-500/40 text-amber-300 text-xs shrink-0 cursor-pointer hover:border-amber-400"
                      title={tr('Apply 5e standard class features & hit dice', 'Applica capacità di classe e dadi vita standard 5e')}
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
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Alignment', 'Allineamento')}
                </label>
                <input
                  type="text"
                  value={editingChar.alignment}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, alignment: e.target.value })
                  }
                  placeholder={tr('e.g. Lawful Good, Chaotic Neutral', 'es. Legale Buono, Caotico Neutrale')}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
            </div>
          </div>

          {/* Section: Combat Vitals */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-header text-sm font-bold text-amber-400">
              {tr('Combat Vitals', 'Parametri di Combattimento')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Armor Class', 'Classe Armat. (CA)')}
                </label>
                <input
                  type="number"
                  value={editingChar.ac}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, ac: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Max HP', 'PF Massimi')}
                </label>
                <input
                  type="number"
                  value={editingChar.hpMax}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, hpMax: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-emerald-400 font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Hit Dice Formula', 'Formula Dadi Vita')}
                </label>
                <input
                  type="text"
                  value={editingChar.hitDiceFormula}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, hitDiceFormula: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Initiative Bonus', 'Bonus Iniziativa')}
                </label>
                <input
                  type="number"
                  value={editingChar.initiativeBonus}
                  onChange={(e) =>
                    setEditingChar({
                      ...editingChar,
                      initiativeBonus: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-center"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Passive Perception', 'Percezione Passiva')}
                </label>
                <input
                  type="number"
                  value={editingChar.passivePerception}
                  onChange={(e) =>
                    setEditingChar({
                      ...editingChar,
                      passivePerception: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-center"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Speed', 'Velocità')}
                </label>
                <input
                  type="text"
                  value={editingChar.speed}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, speed: e.target.value })
                  }
                  placeholder={tr('30 ft.', '9m')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-center"
                />
              </div>
            </div>
          </div>

          {/* Section: 6 Ability Scores */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-header text-sm font-bold text-amber-400">
                {tr(
                  'D&D 5e Ability Scores',
                  'Caratteristiche D&D 5e'
                )}
              </h3>
              <span className="text-[11px] text-stone-400">
                {tr('Auto-calculates saving throws and all 18 skill bonuses', 'Aggiorna in automatico tutti i tiri salvezza e le 18 abilità')}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
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
                    value={editingChar.abilities[ab.key]}
                    onChange={(e) => updateAbility(ab.key, Number(e.target.value))}
                    className="w-full mt-1.5 text-center py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-bold text-base"
                  />
                  <div className="text-xs font-mono text-amber-300 font-semibold mt-1">
                    {formatMod(editingChar.abilities[ab.key])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Interactive Saving Throws & All 18 Skills Editor */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="font-header font-bold text-amber-400 text-sm">
                {tr(
                  `All 18 Skills & Saving Throws (Proficiency Bonus: +${getProficiencyBonus(
                    editingChar
                  )})`,
                  `Tutte le 18 Abilità & Tiri Salvezza (Bonus Competenza: +${getProficiencyBonus(
                    editingChar
                  )})`
                )}
              </span>
              <span className="text-[11px] text-stone-400">
                {tr(
                  'Click a skill to cycle: None (○) → Proficient (●) → Expertise (◆)',
                  'Clicca un’abilità per ciclare: Base (○) → Competenza (●) → Maestria (◆)'
                )}
              </span>
            </div>

            {/* 6 Saving Throws toggles */}
            <div>
              <div className="text-xs font-bold uppercase text-stone-400 mb-2">
                {tr('Saving Throws', 'Tiri Salvezza')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {DND_ABILITY_META.map((ab) => {
                  const { total, proficient } = getSavingThrowTotalBonus(
                    editingChar,
                    ab.key
                  );
                  return (
                    <button
                      key={ab.key}
                      type="button"
                      onClick={() => toggleSaveProficiency(ab.key)}
                      className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
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

            {/* 18 Skills interactive buttons */}
            <div>
              <div className="text-xs font-bold uppercase text-stone-400 mb-2">
                {tr('All 18 D&D 5e Skills', 'Tutte le 18 Abilità D&D 5e')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
                      className={`px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition cursor-pointer ${
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
                      <span className="font-mono font-bold ml-1">{formatSignedBonus(total)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Traits & Special Abilities */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-header font-bold text-amber-400 text-sm">
                {tr('Traits & Special Features', 'Tratti & Capacità Speciali')}
              </span>
              <button
                type="button"
                onClick={() => addListEntry('traits')}
                className="px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {tr('Add Trait', 'Aggiungi Tratto')}
              </button>
            </div>
            <div className="space-y-2.5">
              {editingChar.traits.map((t, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-2 items-start bg-stone-950 p-3 rounded-xl border border-stone-800"
                >
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => updateListEntry('traits', idx, { name: e.target.value })}
                    placeholder={tr('Trait name (e.g. (Elf) Darkvision)', 'Nome tratto (es. (Elfo) Scurovisione)')}
                    className="w-full sm:w-1/3 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-200 font-semibold text-xs"
                  />
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) =>
                      updateListEntry('traits', idx, { description: e.target.value })
                    }
                    placeholder={tr('Description of trait effect', 'Descrizione dell’effetto del tratto')}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeListEntry('traits', idx)}
                    className="p-1.5 text-stone-500 hover:text-red-400 transition cursor-pointer self-center"
                    title={tr('Delete trait', 'Elimina tratto')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Actions & Attacks */}
          <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-header font-bold text-amber-400 text-sm">
                {tr('Actions & Attacks', 'Azioni & Attacchi')}
              </span>
              <button
                type="button"
                onClick={() => addListEntry('actions')}
                className="px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {tr('Add Action', 'Aggiungi Azione')}
              </button>
            </div>
            <div className="space-y-2.5">
              {editingChar.actions.map((a, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-2 items-start bg-stone-950 p-3 rounded-xl border border-stone-800"
                >
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) => updateListEntry('actions', idx, { name: e.target.value })}
                    placeholder={tr('Action name (e.g. Longsword)', 'Nome azione (es. Spada Lunga)')}
                    className="w-full sm:w-1/3 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-200 font-semibold text-xs"
                  />
                  <input
                    type="text"
                    value={a.description}
                    onChange={(e) =>
                      updateListEntry('actions', idx, { description: e.target.value })
                    }
                    placeholder={tr(
                      'Attack / damage description (e.g. +5 to hit, 1d8+3 slashing)',
                      'Descrizione attacco / danno (es. +5 per colpire, 1d8+3 taglienti)'
                    )}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeListEntry('actions', idx)}
                    className="p-1.5 text-stone-500 hover:text-red-400 transition cursor-pointer self-center"
                    title={tr('Delete action', 'Elimina azione')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Spells & Lore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl space-y-2">
              <label className="block text-stone-400 font-semibold">
                {tr('Spells & Spell Slots Notes', 'Note Incantesimi & Slot')}
              </label>
              <textarea
                rows={3}
                value={editingChar.spellsNotes || ''}
                onChange={(e) =>
                  setEditingChar({ ...editingChar, spellsNotes: e.target.value })
                }
                placeholder={tr('e.g. Cantrips: Fire Bolt, Light. 1st Level (4 slots): Shield, Magic Missile...', 'es. Trucchetti: Dardo di Fuoco, Luce. 1° Livello (4 slot): Scudo, Dardo Incantato...')}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs"
              />
            </div>

            <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-2xl space-y-2">
              <label className="block text-stone-400 font-semibold">
                {tr('Backstory, Personality & Equipment', 'Biografia, Personalità & Equipaggiamento')}
              </label>
              <textarea
                rows={3}
                value={editingChar.biographyOrLore}
                onChange={(e) =>
                  setEditingChar({ ...editingChar, biographyOrLore: e.target.value })
                }
                placeholder={tr('Notes on background, equipment, magical items, personality traits...', 'Note su background, equipaggiamento, oggetti magici, legami e difetti...')}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs"
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onCancel}
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
