import React, { useState } from 'react';
import {
  CharacterEntity,
  DND_ABILITY_META,
  DND_SKILLS,
  formatMod,
  formatProficientSavesSummary,
  formatProficientSkillsSummary,
  formatSignedBonus,
  getProficiencyBonus,
  getSavingThrowTotalBonus,
  getSkillTotalBonus,
  isPcBlueprint,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { downloadOfficialCharacterPdf } from '../services/pdfExporter';
import {
  Shield,
  Heart,
  Zap,
  Eye,
  Swords,
  FileDown,
  UserPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StatblockCardProps {
  character: CharacterEntity;
  compact?: boolean;
  onEdit?: (char: CharacterEntity) => void;
  onAddToCombat?: (char: CharacterEntity) => void;
  onCreatePcInstance?: (blueprint: CharacterEntity) => void;
  runtimeOverrides?: {
    playerOverride?: string;
    customNameOverride?: string;
    hpCurrent?: number;
    tempHp?: number;
    inspiration?: boolean;
    sessionNotes?: string;
  };
}

export const StatblockCard: React.FC<StatblockCardProps> = ({
  character,
  compact = false,
  onEdit,
  onAddToCombat,
  onCreatePcInstance,
  runtimeOverrides,
}) => {
  const { lang, tr } = useLanguage();
  const isPc = character.kind === 'pc';
  const isBlueprint = isPcBlueprint(character);
  const isBoss = character.tags.some((t) => t.toLowerCase().includes('boss'));
  const [showAllSkills, setShowAllSkills] = useState(isPc && !compact);
  const [exportingPdf, setExportingPdf] = useState(false);

  const pb = getProficiencyBonus(character);
  const savesSummary = character.savingThrows || formatProficientSavesSummary(character, lang);
  const skillsSummary = character.skills || formatProficientSkillsSummary(character, lang);

  const displayPlayerOrRole = runtimeOverrides?.playerOverride
    ? `${tr('Player:', 'Giocatore:')} ${runtimeOverrides.playerOverride}`
    : isPc && isBlueprint
    ? tr('Pre-Gen Blueprint (Unassigned — Reusable)', 'Blueprint Pre-Gen (Non assegnato — Riutilizzabile)')
    : character.playerOrRole;

  const handleExportPdf = async (mode?: 'pc_sheet' | 'statblock') => {
    try {
      setExportingPdf(true);
      await downloadOfficialCharacterPdf(character, lang, mode, runtimeOverrides);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="dnd-statblock relative rounded-sm border-2 border-[#58180D]/80 bg-[#fdf5e0] text-[#2b170e] shadow-xl overflow-hidden font-serif">
      {/* Top decorative D&D orange-gold bar */}
      <div className="h-2 bg-gradient-to-r from-[#58180D] via-[#c9ad6a] to-[#58180D] border-b border-[#58180D]" />

      <div className={compact ? 'p-3.5' : 'p-5'}>
        {/* Header with optional Portrait */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            {character.portraitUrl && (
              <div className="shrink-0">
                <img
                  src={character.portraitUrl}
                  alt={character.name}
                  className={`${
                    compact ? 'w-14 h-14' : 'w-20 h-20'
                  } rounded-lg object-cover border-2 border-[#58180D] shadow-md bg-[#efe0bb]`}
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-header text-xl md:text-2xl font-extrabold tracking-wide text-[#58180D] uppercase leading-tight">
                  {runtimeOverrides?.customNameOverride || character.name}
                </h3>
                <span
                  className={`text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isPc
                      ? isBlueprint
                        ? 'bg-purple-900/15 text-purple-900 border-purple-700/40'
                        : 'bg-amber-800/15 text-amber-900 border-amber-700/40'
                      : character.kind === 'npc'
                      ? 'bg-sky-900/15 text-sky-900 border-sky-700/40'
                      : isBoss
                      ? 'bg-red-900/20 text-red-900 border-red-800/50'
                      : 'bg-stone-800/15 text-stone-800 border-stone-600/40'
                  }`}
                >
                  {isPc
                    ? isBlueprint
                      ? tr('PC Blueprint / Pre-Gen', 'PG Blueprint / Pre-Gen')
                      : character.instanceOnlyId
                      ? tr('Session-Only PC', 'PG Solo Sessione')
                      : tr('Assigned PC', 'PG Giocante')
                    : character.kind === 'npc'
                    ? 'NPC'
                    : isBoss
                    ? 'Boss'
                    : tr('Monster', 'Mostro')}
                </span>
                {character.sourceBlueprintId && (
                  <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-[#58180D]/10 text-[#58180D]">
                    {tr('From Blueprint', 'Da Blueprint')}
                  </span>
                )}
              </div>

              <p className="italic text-sm text-[#4a2b1d] mt-0.5">
                {character.size} {character.creatureType}, {character.alignment}
                {character.classOrArchetype ? ` — ${character.classOrArchetype}` : ''}
                {character.background ? ` (${character.background})` : ''}
              </p>

              <p className="text-xs font-sans font-semibold text-[#58180D]/80 mt-0.5">
                {displayPlayerOrRole} • <span className="font-bold">{character.levelOrCr}</span> •{' '}
                <span>
                  {tr('Prof. Bonus', 'Bonus Comp.')} {formatSignedBonus(pb)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 font-sans">
            <button
              onClick={() => handleExportPdf(isPc ? 'pc_sheet' : 'statblock')}
              disabled={exportingPdf}
              title={
                isPc
                  ? tr(
                      'Export Official D&D 5e Character Sheet PDF (Pre-filled & Editable)',
                      'Esporta Scheda Personaggio Ufficiale D&D 5e in PDF (Compilata e Modificabile)'
                    )
                  : tr(
                      'Export Official D&D 5e Statblock PDF',
                      'Esporta Statblock Ufficiale D&D 5e in PDF'
                    )
              }
              className="px-2.5 py-1 text-xs font-bold rounded bg-[#58180D] text-amber-100 hover:bg-[#7a2213] transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {exportingPdf
                ? tr('Generating PDF...', 'Creazione PDF...')
                : isPc
                ? tr('Official 5e PDF Sheet', 'PDF Scheda Ufficiale 5e')
                : tr('Official 5e PDF', 'PDF Ufficiale 5e')}
            </button>

            {isPc && !compact && (
              <button
                onClick={() => handleExportPdf('statblock')}
                disabled={exportingPdf}
                title={tr('Export compact Statblock PDF', 'Esporta PDF formato Statblock compatto')}
                className="px-2 py-1 text-[11px] font-semibold rounded border border-[#58180D]/40 text-[#58180D] hover:bg-[#58180D]/10 transition cursor-pointer"
              >
                PDF Statblock
              </button>
            )}

            {isPc && onCreatePcInstance && (
              <button
                onClick={() => onCreatePcInstance(character)}
                title={tr(
                  'Create an assigned player instance from this PC Blueprint',
                  'Crea un’istanza assegnata a un giocatore partendo da questo Blueprint PG'
                )}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-700 text-white hover:bg-amber-800 transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {tr('Instantiate for Player', 'Crea Istanza Giocatore')}
              </button>
            )}

            {onAddToCombat && (
              <button
                onClick={() => onAddToCombat(character)}
                title={tr('Add to active combat', 'Aggiungi al Combattimento attivo')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-red-900 text-amber-100 hover:bg-red-800 transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                {tr('To Combat', 'In Combat')}
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(character)}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-[#58180D]/40 text-[#58180D] hover:bg-[#58180D]/10 transition cursor-pointer"
              >
                {tr('Edit', 'Modifica')}
              </button>
            )}
          </div>
        </div>

        {/* Tapered Crimson Rule */}
        <div className="my-2.5 h-[3px] bg-gradient-to-r from-[#58180D] via-[#9e2a18] to-transparent" />

        {/* Core Vitals (AC, HP, Speed, Initiative, Passive Perception) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm my-2 bg-[#f4e6c3]/80 p-2.5 rounded border border-[#58180D]/20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#58180D] shrink-0" />
            <div>
              <div className="text-[11px] font-sans uppercase font-bold text-[#58180D]/80">
                {tr('Armor Class', 'Classe Armatura')}
              </div>
              <div className="font-bold text-[#58180D]">
                {character.ac} <span className="font-normal text-xs">{character.acNote}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-700 shrink-0" />
            <div>
              <div className="text-[11px] font-sans uppercase font-bold text-[#58180D]/80">
                {tr('Hit Points', 'Punti Ferita')}
              </div>
              <div className="font-bold text-[#58180D]">
                {runtimeOverrides?.hpCurrent !== undefined
                  ? `${runtimeOverrides.hpCurrent}/${character.hpMax}`
                  : character.hpMax}{' '}
                <span className="font-normal text-xs">({character.hitDiceFormula})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <div className="text-[11px] font-sans uppercase font-bold text-[#58180D]/80">
                {tr('Init & Speed', 'Iniziativa & Vel.')}
              </div>
              <div className="font-bold text-[#58180D]">
                {character.initiativeBonus >= 0 ? `+${character.initiativeBonus}` : character.initiativeBonus}{' '}
                <span className="font-normal text-xs">• {character.speed}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-800 shrink-0" />
            <div>
              <div className="text-[11px] font-sans uppercase font-bold text-[#58180D]/80">
                {tr('Passive Perc.', 'Percezione Pass.')}
              </div>
              <div className="font-bold text-[#58180D]">{character.passivePerception}</div>
            </div>
          </div>
        </div>

        {/* Tapered Crimson Rule */}
        <div className="my-2.5 h-[3px] bg-gradient-to-r from-[#58180D] via-[#9e2a18] to-transparent" />

        {/* 6 Ability Scores */}
        <div className="grid grid-cols-6 gap-1 text-center py-1">
          {DND_ABILITY_META.map((ab) => {
            const score = character.abilities[ab.key];
            const label = lang === 'it' ? ab.shortIt : ab.shortEn;
            return (
              <div
                key={ab.key}
                className="bg-[#efe0bb]/70 rounded px-1 py-1.5 border border-[#58180D]/15"
              >
                <div className="font-header font-bold text-xs text-[#58180D]">{label}</div>
                <div className="text-sm font-bold text-[#2b170e]">
                  {score}{' '}
                  <span className="text-xs font-normal text-[#58180D]">({formatMod(score)})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tapered Crimson Rule */}
        <div className="my-2.5 h-[3px] bg-gradient-to-r from-[#58180D] via-[#9e2a18] to-transparent" />

        {/* Complete 6 Saving Throws & All 18 Skills Panel */}
        <div className="my-2 bg-[#f4e6c3]/75 rounded border border-[#58180D]/25 p-2.5 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#58180D] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {tr(
                'All 18 D&D 5e Skills & Saving Throws',
                'Valori Completi delle 18 Abilità & Tiri Salvezza'
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowAllSkills((v) => !v)}
              className="text-[11px] font-bold text-[#58180D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showAllSkills ? (
                <>
                  {tr('Hide full table', 'Comprimi tabella')} <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  {tr('Show all 18 skills', 'Mostra tutte le 18 abilità')}{' '}
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {showAllSkills && (
            <div className="mt-2.5 space-y-2.5">
              {/* 6 Saving Throws Grid */}
              <div>
                <div className="text-[10px] font-bold uppercase text-[#58180D]/80 mb-1">
                  {tr('Saving Throws', 'Tiri Salvezza')}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DND_ABILITY_META.map((ab) => {
                    const { total, proficient } = getSavingThrowTotalBonus(character, ab.key);
                    return (
                      <div
                        key={ab.key}
                        className={`px-2 py-1 rounded border text-xs flex items-center justify-between ${
                          proficient
                            ? 'bg-[#58180D]/15 border-[#58180D]/50 font-bold text-[#2b170e]'
                            : 'bg-[#fdf5e0]/80 border-[#58180D]/15 text-[#4a2b1d]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span className="text-[10px]">{proficient ? '●' : '○'}</span>
                          <span>{lang === 'it' ? ab.shortIt : ab.shortEn}</span>
                        </span>
                        <span className="font-mono">{formatSignedBonus(total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 18 Skills Grid */}
              <div>
                <div className="text-[10px] font-bold uppercase text-[#58180D]/80 mb-1">
                  {tr(
                    'Skills (● Proficient, ◆ Expertise)',
                    'Abilità (● Competenza, ◆ Maestria)'
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DND_SKILLS.map((sk) => {
                    const { total, rank } = getSkillTotalBonus(character, sk.id);
                    const abMeta = DND_ABILITY_META.find((a) => a.key === sk.ability)!;
                    const abShort = lang === 'it' ? abMeta.shortIt : abMeta.shortEn;
                    const marker = rank === 2 ? '◆' : rank === 1 ? '●' : '○';
                    return (
                      <div
                        key={sk.id}
                        className={`px-2 py-1 rounded border text-xs flex items-center justify-between ${
                          rank > 0
                            ? 'bg-[#58180D]/15 border-[#58180D]/50 font-bold text-[#2b170e]'
                            : 'bg-[#fdf5e0]/80 border-[#58180D]/15 text-[#4a2b1d]'
                        }`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span className="text-[#58180D] text-[10px]">{marker}</span>
                          <span className="truncate">
                            {lang === 'it' ? sk.labelIt : sk.labelEn}
                          </span>
                          <span className="text-[9px] opacity-70">({abShort})</span>
                        </span>
                        <span className="font-mono ml-1 shrink-0">
                          {formatSignedBonus(total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Attributes */}
        <div className="space-y-1 text-sm leading-snug text-[#3d170b]">
          {savesSummary && (
            <p>
              <strong className="text-[#58180D]">
                {tr('Proficient Saving Throws:', 'Tiri Salvezza con Competenza:')}
              </strong>{' '}
              {savesSummary}
            </p>
          )}
          {skillsSummary && (
            <p>
              <strong className="text-[#58180D]">
                {tr('Proficient Skills:', 'Abilità con Competenza:')}
              </strong>{' '}
              {skillsSummary}
            </p>
          )}
          {character.damageResistances && (
            <p>
              <strong className="text-[#58180D]">
                {tr('Resistances / Immunities:', 'Resistenze / Immunità:')}
              </strong>{' '}
              {character.damageResistances}
            </p>
          )}
          {character.senses && (
            <p>
              <strong className="text-[#58180D]">{tr('Senses:', 'Sensi:')}</strong> {character.senses}
            </p>
          )}
          {character.languages && (
            <p>
              <strong className="text-[#58180D]">{tr('Languages:', 'Linguaggi:')}</strong>{' '}
              {character.languages}
            </p>
          )}
        </div>

        {/* Traits */}
        {character.traits.length > 0 && (
          <>
            <div className="my-2.5 h-[2px] bg-[#58180D]/40" />
            <div className="space-y-2 text-sm">
              {character.traits.map((t, i) => (
                <p key={i} className="leading-relaxed">
                  <strong className="italic font-bold text-[#58180D]">{t.name}.</strong>{' '}
                  {t.description}
                </p>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        {character.actions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-header text-base font-bold text-[#58180D] uppercase border-b border-[#58180D] pb-0.5 mb-2">
              {tr('Actions', 'Azioni')}
            </h4>
            <div className="space-y-2 text-sm">
              {character.actions.map((act, i) => (
                <p key={i} className="leading-relaxed">
                  <strong className="italic font-bold text-[#58180D]">{act.name}.</strong>{' '}
                  {act.description}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Legendary / Reactions */}
        {character.reactionsOrLegendary && character.reactionsOrLegendary.length > 0 && (
          <div className="mt-4">
            <h4 className="font-header text-base font-bold text-[#58180D] uppercase border-b border-[#58180D] pb-0.5 mb-2">
              {tr('Reactions & Legendary Actions', 'Reazioni & Azioni Leggendarie')}
            </h4>
            <div className="space-y-2 text-sm">
              {character.reactionsOrLegendary.map((leg, i) => (
                <p key={i} className="leading-relaxed">
                  <strong className="italic font-bold text-[#58180D]">{leg.name}.</strong>{' '}
                  {leg.description}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Spells & Lore */}
        {!compact && (character.spellsNotes || character.biographyOrLore) && (
          <div className="mt-4 pt-3 border-t border-[#58180D]/25 space-y-2 text-xs text-[#4a2b1d]">
            {character.spellsNotes && (
              <p className="bg-amber-900/10 p-2 rounded border border-amber-900/20">
                <strong className="text-[#58180D] font-bold">
                  ✦ {tr('Spells / Gameplay Notes:', 'Incantesimi / Note di Gioco:')}
                </strong>{' '}
                {character.spellsNotes}
              </p>
            )}
            {character.biographyOrLore && (
              <p className="italic">
                <strong className="not-italic text-[#58180D]">
                  {tr('Notes & Background:', 'Note & Background:')}
                </strong>{' '}
                {character.biographyOrLore}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom decorative D&D bar */}
      <div className="h-2 bg-gradient-to-r from-[#58180D] via-[#c9ad6a] to-[#58180D] border-t border-[#58180D]" />
    </div>
  );
};
