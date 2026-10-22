import React, { useState } from 'react';
import {
  AbilityKey,
  CharacterEntity,
  DND_ABILITY_META,
  DND_SKILLS,
  EntityKind,
  PartyGroup,
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
import { SupervisedPgCreateModal } from './SupervisedPgCreateModal';
import { LevelUpModal } from './LevelUpModal';
import {
  validatePgCombination,
  STANDARD_RACES,
  STANDARD_CLASSES,
  findStandardRace,
  findStandardClass,
  applyStandardTemplate,
  parsePgLevel,
} from '../data/dnd5eRules';
import { downloadOfficialCharacterPdf } from '../services/pdfExporter';
import {
  Users,
  UserPlus,
  Search,
  Skull,
  UserCheck,
  Trash2,
  Copy,
  Check,
  FolderPlus,
  FileDown,
  ImagePlus,
  Sparkles,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

interface CharactersViewProps {
  characters: CharacterEntity[];
  parties: PartyGroup[];
  onSaveCharacter: (char: CharacterEntity) => void;
  onDeleteCharacter: (id: string) => void;
  onSaveParty: (party: PartyGroup) => void;
  onDeleteParty: (id: string) => void;
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  characters,
  parties,
  onSaveCharacter,
  onDeleteCharacter,
  onSaveParty,
  onDeleteParty,
}) => {
  const { lang, tr } = useLanguage();
  const [filterKind, setFilterKind] = useState<
    'all' | 'pc' | 'pc_blueprints' | 'npc' | 'monster' | 'parties'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id || '');
  const [editingChar, setEditingChar] = useState<CharacterEntity | null>(null);
  const [editingParty, setEditingParty] = useState<PartyGroup | null>(null);

  // Supervised creation & level-up states
  const [showSupervisedCreate, setShowSupervisedCreate] = useState<{
    isOpen: boolean;
    isBlueprint: boolean;
  } | null>(null);
  const [levelUpTargetChar, setLevelUpTargetChar] = useState<CharacterEntity | null>(null);
  const [masterOverrideAccepted, setMasterOverrideAccepted] = useState(false);
  const [showWarningConfirmation, setShowWarningConfirmation] = useState(false);

  // Modal to instantiate an assigned Player Character from a Pre-Gen Blueprint
  const [instantiatingBlueprint, setInstantiatingBlueprint] = useState<CharacterEntity | null>(
    null
  );
  const [instPlayerName, setInstPlayerName] = useState('');
  const [instCustomCharName, setInstCustomCharName] = useState('');
  const [instTargetPartyId, setInstTargetPartyId] = useState('');

  // Exclude session-only PCs unless viewing all or specifically searching
  const visibleCharacters = characters.filter((c) => !c.instanceOnlyId);

  const filteredCharacters = visibleCharacters.filter((c) => {
    if (filterKind === 'pc') {
      if (c.kind !== 'pc') return false;
    } else if (filterKind === 'pc_blueprints') {
      if (c.kind !== 'pc' || !isPcBlueprint(c)) return false;
    } else if (filterKind === 'npc' || filterKind === 'monster') {
      if (c.kind !== filterKind) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.playerOrRole.toLowerCase().includes(q) ||
      c.creatureType.toLowerCase().includes(q) ||
      (c.classOrArchetype || '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const selectedCharacter =
    visibleCharacters.find((c) => c.id === selectedId) ||
    filteredCharacters[0] ||
    visibleCharacters[0];

  const handleCreateNew = (kind: EntityKind, asPreGenBlueprint = false) => {
    if (kind === 'pc') {
      setShowSupervisedCreate({ isOpen: true, isBlueprint: asPreGenBlueprint });
      return;
    }
    const isNpc = kind === 'npc';
    const newChar: CharacterEntity = {
      id: `${kind}-${Date.now()}`,
      kind,
      name: isNpc
        ? tr('New Notable NPC', 'Nuovo PNG Importante')
        : tr('New Creature / Monster', 'Nuova Creatura / Mostro'),
      playerOrRole: isNpc
        ? tr('NPC — Ally / Contact', 'NPC — Alleato / Contatto')
        : tr('Dungeon Monster', 'Mostro Dungeon'),
      background: undefined,
      size: tr('Medium', 'Media'),
      creatureType: isNpc ? tr('Humanoid', 'Umanoide') : tr('Monstrosity', 'Mostruosità'),
      alignment: tr('Neutral', 'Neutrale'),
      classOrArchetype: '',
      levelOrCr: tr('CR 1 (200 XP)', 'GS 1 (200 PE)'),
      ac: 13,
      acNote: '',
      hpMax: 22,
      hitDiceFormula: '4d8 + 4',
      speed: tr('30 ft.', '9m'),
      initiativeBonus: 1,
      passivePerception: 11,
      abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 12, cha: 10 },
      savingThrowProficiencies: {},
      skillProficiencies: {},
      savingThrows: '',
      skills: '',
      senses: tr('Passive Perception 11', 'Percezione passiva 11'),
      languages: tr('Common', 'Comune'),
      traits: [],
      actions: [
        {
          name: tr('Melee Strike', 'Attacco in Mischia'),
          description: tr(
            'Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d6 + 2 damage.',
            'Attacco con arma da mischia: +4 a colpire, portata 1,5m. Colpito: 1d6 + 2 danni.'
          ),
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
      ],
      reactionsOrLegendary: [],
      spellsNotes: '',
      biographyOrLore: '',
      tags: [tr('New', 'Nuovo')],
    };
    setEditingChar(newChar);
  };

  const openInstantiateModal = (blueprint: CharacterEntity) => {
    setInstantiatingBlueprint(blueprint);
    setInstPlayerName('');
    setInstCustomCharName(blueprint.name);
    setInstTargetPartyId(parties[0]?.id || '');
  };

  const handleConfirmInstantiate = () => {
    if (!instantiatingBlueprint) return;
    const playerLabel = instPlayerName.trim()
      ? `${tr('Player:', 'Giocatore:')} ${instPlayerName.trim()}`
      : tr('Assigned Player', 'Giocatore Assegnato');
    const instanceChar: CharacterEntity = {
      ...structuredClone(instantiatingBlueprint),
      id: `pc-inst-${Date.now()}`,
      name: instCustomCharName.trim() || instantiatingBlueprint.name,
      playerOrRole: playerLabel,
      isPreGenBlueprint: false,
      sourceBlueprintId: instantiatingBlueprint.id,
      tags: [
        ...instantiatingBlueprint.tags.filter(
          (t) => !t.toLowerCase().includes('blueprint') && !t.toLowerCase().includes('pre-gen')
        ),
        instPlayerName.trim() || tr('Assigned', 'Assegnato'),
      ],
    };

    onSaveCharacter(instanceChar);
    if (instTargetPartyId) {
      const targetParty = parties.find((p) => p.id === instTargetPartyId);
      if (targetParty && !targetParty.memberCharacterIds.includes(instanceChar.id)) {
        onSaveParty({
          ...targetParty,
          memberCharacterIds: [...targetParty.memberCharacterIds, instanceChar.id],
        });
      }
    }
    setSelectedId(instanceChar.id);
    setInstantiatingBlueprint(null);
  };

  const handleDuplicate = (char: CharacterEntity) => {
    const copy: CharacterEntity = {
      ...structuredClone(char),
      id: `${char.kind}-${Date.now()}`,
      name: `${char.name} (${tr('Copy', 'Copia')})`,
    };
    onSaveCharacter(copy);
    setSelectedId(copy.id);
  };

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
    if (!editingChar) return;
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
    if (!editingChar) return;
    const current = resolveSavingThrowProficiencies(editingChar);
    const nextSaves = { ...current, [ability]: !current[ability] };
    const updated: CharacterEntity = {
      ...editingChar,
      savingThrowProficiencies: nextSaves,
    };
    setEditingChar(syncSkillAndSaveStrings(updated));
  };

  const cycleSkillProficiency = (skillId: SkillId) => {
    if (!editingChar) return;
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
    if (!file || !editingChar) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditingChar({ ...editingChar, portraitUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const updateListEntry = (
    field: 'traits' | 'actions' | 'reactionsOrLegendary',
    index: number,
    patch: Partial<StatblockEntry>
  ) => {
    if (!editingChar) return;
    const current = [...(editingChar[field] || [])];
    current[index] = { ...current[index], ...patch };
    setEditingChar({ ...editingChar, [field]: current });
  };

  const addListEntry = (field: 'traits' | 'actions' | 'reactionsOrLegendary') => {
    if (!editingChar) return;
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
    if (!editingChar) return;
    const current = [...(editingChar[field] || [])];
    current.splice(index, 1);
    setEditingChar({ ...editingChar, [field]: current });
  };

  const pcsOnly = visibleCharacters.filter((c) => c.kind === 'pc');
  const blueprintsCount = pcsOnly.filter((c) => isPcBlueprint(c)).length;

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 p-4 rounded-xl">
        <div>
          <h2 className="font-header text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            {tr(
              'Global Repository: PCs (Blueprints & Assigned), NPCs, Bestiary & Parties',
              'Repository Globale: PG (Blueprint & Giocatori), NPC, Bestiario & Gruppi'
            )}
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {tr(
              'Create reusable Pre-Gen PC Blueprints (no player required) or assigned PCs, complete with all 18 skills, portraits, and Official D&D 5e PDF export.',
              'Crea PG Blueprint pre-generati riutilizzabili dal Master (senza giocatore obbligatorio) o PG assegnati, con tutte le 18 abilità, ritratti ed esportazione PDF ufficiale D&D 5e.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCreateNew('pc', true)}
            className="px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            title={tr(
              'Create an unassigned PC Blueprint that you can print or instantiate across different campaigns and one-shots',
              'Crea un PG Blueprint non assegnato che puoi stampare o istanziare per diversi giocatori, campagne o one-shot'
            )}
          >
            <Sparkles className="w-4 h-4" />{' '}
            {tr('+ New PC Blueprint (Pre-Gen)', '+ Nuovo PG Blueprint (Pre-Gen)')}
          </button>
          <button
            onClick={() => handleCreateNew('pc', false)}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> {tr('+ New Player PC', '+ Nuovo PG Giocatore')}
          </button>
          <button
            onClick={() => handleCreateNew('npc')}
            className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <UserCheck className="w-4 h-4" /> {tr('+ New NPC', '+ Nuovo NPC')}
          </button>
          <button
            onClick={() => handleCreateNew('monster')}
            className="px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-amber-100 font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <Skull className="w-4 h-4" /> {tr('+ New Monster/Boss', '+ Nuovo Mostro/Boss')}
          </button>
          <button
            onClick={() =>
              setEditingParty({
                id: `party-${Date.now()}`,
                name: tr('New Adventuring Party', 'Nuovo Gruppo di Gioco'),
                description: tr(
                  'PC roster for sessions or one-shots.',
                  'Formazione di PG per sessioni o one-shot.'
                ),
                memberCharacterIds: pcsOnly.slice(0, 3).map((p) => p.id),
              })
            }
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> {tr('+ New Party Group', '+ Nuovo Gruppo (Party)')}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-900 p-1 rounded-lg border border-stone-800">
          {(
            [
              ['all', `${tr('All', 'Tutti')} (${visibleCharacters.length})`],
              ['pc', `${tr('All PCs', 'Tutti i PG')} (${pcsOnly.length})`],
              [
                'pc_blueprints',
                `${tr('PC Blueprints / Pre-Gens', 'PG Blueprint / Pre-Gen')} (${blueprintsCount})`,
              ],
              ['npc', `NPC (${visibleCharacters.filter((c) => c.kind === 'npc').length})`],
              [
                'monster',
                `${tr('Monsters & Bosses', 'Mostri & Boss')} (${
                  visibleCharacters.filter((c) => c.kind === 'monster').length
                })`,
              ],
              ['parties', `${tr('Parties / Groups', 'Gruppi / Party')} (${parties.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterKind(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                filterKind === key
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr(
              'Search by name, class, CR, tag...',
              'Cerca per nome, classe, GS, tag...'
            )}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Parties Management View */}
      {filterKind === 'parties' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parties.map((party) => {
            const members = party.memberCharacterIds
              .map((id) => characters.find((c) => c.id === id))
              .filter(Boolean) as CharacterEntity[];
            return (
              <div
                key={party.id}
                className="bg-stone-900/90 border border-stone-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-header text-lg font-bold text-amber-400">{party.name}</h3>
                      <p className="text-xs text-stone-400 mt-1">{party.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingParty(structuredClone(party))}
                        className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-amber-300 font-semibold"
                      >
                        {tr('Edit', 'Modifica')}
                      </button>
                      <button
                        onClick={() => onDeleteParty(party.id)}
                        className="p-1.5 rounded bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      {tr(
                        `Party Members (${members.length} PCs)`,
                        `Membri del Gruppo (${members.length} PG)`
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {m.portraitUrl && (
                              <img
                                src={m.portraitUrl}
                                alt={m.name}
                                className="w-8 h-8 rounded object-cover border border-amber-500/40 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-amber-200 truncate">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-stone-400 truncate">
                                {m.classOrArchetype} • {m.levelOrCr}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs font-mono text-stone-300 shrink-0">
                            <div>
                              {tr('AC', 'CA')} {m.ac}
                            </div>
                            <div className="text-emerald-400">
                              {tr('HP', 'PF')} {m.hpMax}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 border-t border-stone-800 pt-2">
                  {tr('Party Template ID:', 'ID Template Gruppo:')} <code>{party.id}</code> —{' '}
                  {tr(
                    'Can be linked to any new Play Instance.',
                    'Associabile a qualsiasi nuova Istanza di Gioco.'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Main Master-Detail Split for Characters */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Left List */}
          <div className="lg:col-span-5 space-y-2.5 overflow-y-auto max-h-[72vh] pr-1">
            {filteredCharacters.map((c) => {
              const active = selectedCharacter?.id === c.id;
              const isBlueprint = isPcBlueprint(c);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-amber-950/30 border-amber-500/70 shadow-md'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {c.portraitUrl ? (
                      <img
                        src={c.portraitUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-lg object-cover border border-amber-500/40 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-header font-bold text-sm shrink-0 border ${
                          c.kind === 'pc'
                            ? isBlueprint
                              ? 'bg-purple-950/60 text-purple-300 border-purple-700/50'
                              : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                            : c.kind === 'npc'
                            ? 'bg-sky-950/60 text-sky-300 border-sky-700/50'
                            : 'bg-red-950/60 text-red-300 border-red-700/50'
                        }`}
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-stone-100 truncate">{c.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold">
                          {c.levelOrCr}
                        </span>
                        {c.kind === 'pc' && isBlueprint && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                            {tr('Blueprint / Pre-Gen', 'Blueprint / Pre-Gen')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">
                        {c.kind === 'pc' && isBlueprint
                          ? tr('Unassigned (Reusable by DM)', 'Non assegnato (Riutilizzabile dal DM)')
                          : c.playerOrRole}{' '}
                        {c.classOrArchetype ? `• ${c.classOrArchetype}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-950 text-amber-300 border border-stone-800">
                          @npc[{c.id}]
                        </span>
                        {c.tags.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800/80 text-stone-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-stone-200">
                      <span className="px-2 py-0.5 rounded bg-stone-800">
                        {tr('AC', 'CA')} {c.ac}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-200 border border-red-800/40">
                        {tr('HP', 'PF')} {c.hpMax}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      {c.kind === 'pc' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLevelUpTargetChar(c);
                          }}
                          title={tr(
                            'Level Up this character (Wizard)',
                            'Fai salire di livello questo personaggio'
                          )}
                          className="px-2 py-0.5 text-[11px] rounded bg-purple-900/60 hover:bg-purple-700 text-purple-200 font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {tr('Lv +', 'Liv +')}
                        </button>
                      )}
                      {c.kind === 'pc' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInstantiateModal(c);
                          }}
                          title={tr(
                            'Create an assigned player instance from this PC Blueprint',
                            'Assegna a un giocatore / Crea istanza da questo PG Blueprint'
                          )}
                          className="px-2 py-0.5 text-[11px] rounded bg-purple-900/60 hover:bg-purple-700 text-purple-200 font-semibold transition"
                        >
                          {tr('+ Instance', '+ Istanza')}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadOfficialCharacterPdf(c, lang);
                        }}
                        title={tr(
                          'Export Official D&D 5e PDF',
                          'Esporta PDF Ufficiale D&D 5e'
                        )}
                        className="p-1 rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-300 transition"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChar(structuredClone(c));
                        }}
                        className="px-2 py-0.5 text-[11px] rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 transition"
                      >
                        {tr('Edit', 'Modifica')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(c);
                        }}
                        title={tr('Duplicate sheet', 'Duplica scheda')}
                        className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCharacter(c.id);
                        }}
                        title={tr('Delete sheet', 'Elimina scheda')}
                        className="p-1 rounded bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Statblock Preview */}
          <div className="lg:col-span-7 overflow-y-auto max-h-[72vh] pr-1">
            {selectedCharacter ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900/90 border border-stone-800 px-4 py-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-stone-300">
                    <span>
                      {tr(
                        'Quick-insert tags for Homebrewery story:',
                        'Tag per inserimento rapido nella storia Homebrewery:'
                      )}
                    </span>
                    <code className="px-2 py-0.5 rounded bg-stone-950 text-amber-400 border border-stone-800 font-mono">
                      @npc[{selectedCharacter.id}]
                    </code>
                    <span>{tr('or', 'oppure')}</span>
                    <code className="px-2 py-0.5 rounded bg-stone-950 text-amber-400 border border-stone-800 font-mono">
                      @statblock[{selectedCharacter.id}]
                    </code>
                  </div>
                </div>
                <StatblockCard
                  character={selectedCharacter}
                  onEdit={(ch) => {
                    setEditingChar(structuredClone(ch));
                    setMasterOverrideAccepted(false);
                  }}
                  onLevelUp={
                    selectedCharacter.kind === 'pc'
                      ? (ch) => setLevelUpTargetChar(ch)
                      : undefined
                  }
                  onCreatePcInstance={
                    selectedCharacter.kind === 'pc'
                      ? (bp) => openInstantiateModal(bp)
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="p-12 text-center text-stone-500 bg-stone-900/40 rounded-xl border border-stone-800">
                {tr(
                  'Select or create a character to view its D&D 5e Statblock.',
                  'Seleziona o crea un personaggio per visualizzare lo Statblock D&D 5e.'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Instantiate Player Character from Blueprint */}
      {instantiatingBlueprint && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-header text-xl font-bold text-amber-400 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                {tr(
                  'Create Player Instance from PC Blueprint',
                  'Crea Istanza Giocatore da Blueprint PG'
                )}
              </h3>
              <button
                onClick={() => setInstantiatingBlueprint(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-stone-400 leading-relaxed">
              {tr(
                'You are creating an independent character sheet from blueprint ',
                'Stai generando una scheda personaggio indipendente a partire dal blueprint '
              )}
              <strong className="text-amber-300">{instantiatingBlueprint.name}</strong>.{' '}
              {tr(
                'The original blueprint will remain untouched so you can reuse or print it for other one-shots and campaigns.',
                'Il blueprint originale resterà intatto per essere ristampato o assegnato in altre one-shot e campagne.'
              )}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Assigned Player Name', 'Nome del Giocatore Assegnato')}
                </label>
                <input
                  type="text"
                  value={instPlayerName}
                  onChange={(e) => setInstPlayerName(e.target.value)}
                  placeholder={tr('e.g. Alex / Giulia', 'es. Alessandro / Giulia')}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Character Name (can customize)', 'Nome del Personaggio (personalizzabile)')}
                </label>
                <input
                  type="text"
                  value={instCustomCharName}
                  onChange={(e) => setInstCustomCharName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr(
                    'Add directly to a Party Group (optional)',
                    'Aggiungi direttamente a un Gruppo / Party (opzionale)'
                  )}
                </label>
                <select
                  value={instTargetPartyId}
                  onChange={(e) => setInstTargetPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-amber-300"
                >
                  <option value="">
                    {tr('— Do not add to a party now —', '— Non aggiungere a un gruppo ora —')}
                  </option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                onClick={() => setInstantiatingBlueprint(null)}
                className="px-3 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={handleConfirmInstantiate}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                {tr('Create Assigned PC Sheet', 'Crea Scheda PG Assegnata')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Editor Modal */}
      {editingChar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-header text-xl font-bold text-amber-400">
                {tr('D&D 5e Sheet Editor', 'Editor Scheda D&D 5e')} — {editingChar.name}
              </h3>
              <div className="flex items-center gap-2">
                {editingChar.kind === 'pc' && (
                  <button
                    type="button"
                    onClick={() => setLevelUpTargetChar(editingChar)}
                    className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-purple-100 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {tr('Level Up', 'Passaggio di Livello')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadOfficialCharacterPdf(editingChar, lang)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  {tr('Export Official 5e PDF', 'Esporta PDF Ufficiale 5e')}
                </button>
                <button
                  onClick={() => {
                    setEditingChar(null);
                    setMasterOverrideAccepted(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 cursor-pointer"
                >
                  {tr('Cancel', 'Annulla')}
                </button>
                <button
                  onClick={() => {
                    const validation = validatePgCombination(editingChar, lang);
                    if (
                      editingChar.kind === 'pc' &&
                      validation.advisories.length > 0 &&
                      !masterOverrideAccepted
                    ) {
                      setShowWarningConfirmation(true);
                      return;
                    }
                    onSaveCharacter(editingChar);
                    setSelectedId(editingChar.id);
                    setEditingChar(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Check className="w-4 h-4" /> {tr('Save Sheet', 'Salva Scheda')}
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (7 cols) */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                {/* Supervised Rules Advisory Banner for PCs */}
                {editingChar.kind === 'pc' && (() => {
                  const validation = validatePgCombination(editingChar, lang);
                  const hasAdvisories = validation.advisories.length > 0;

                  return (
                    <div
                      className={`p-3.5 rounded-xl border transition ${
                        hasAdvisories
                          ? masterOverrideAccepted
                            ? 'bg-amber-950/20 border-amber-500/40 text-stone-300'
                            : 'bg-amber-950/40 border-amber-500 text-amber-200'
                          : 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {hasAdvisories ? (
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold text-xs flex items-center gap-2">
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
                              <span className="text-[10px] px-2 py-0.2 rounded bg-stone-900 border border-stone-800 text-stone-400 font-normal">
                                {validation.standardClass
                                  ? lang === 'it'
                                    ? validation.standardClass.nameIt
                                    : validation.standardClass.nameEn
                                  : tr('Custom Class', 'Classe Custom')}{' '}
                                • Lv {validation.level}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              {tr(
                                'The Dungeon Master is ALWAYS the final decision maker. You can align with standard 5e rules or continue anyway with custom values.',
                                'Il Dungeon Master è SEMPRE l’arbitro finale. Puoi allinearti alle regole 5e o continuare comunque con valori personalizzati.'
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
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition"
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
                        <div className="mt-3 space-y-2 border-t border-stone-800/80 pt-2.5 text-[11px]">
                          {validation.advisories.map((adv) => (
                            <div
                              key={adv.id}
                              className="p-2 rounded bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-2"
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
                                  className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600 hover:text-stone-950 border border-amber-500/50 text-amber-200 text-[10px] font-bold shrink-0 transition cursor-pointer"
                                >
                                  {tr('Align with 5e Standard', 'Allinea a Standard')}
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Master Override / Continue Anyway Checkbox */}
                          <div className="flex items-center justify-between pt-1">
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
                  );
                })()}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      {tr('Category', 'Categoria')}
                    </label>
                    <select
                      value={editingChar.kind}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, kind: e.target.value as EntityKind })
                      }
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                    >
                      <option value="pc">{tr('PC (Player / Pre-Gen)', 'PG (Giocatore / Pre-Gen)')}</option>
                      <option value="npc">{tr('NPC (Ally/Character)', 'NPC (Alleato/PNG)')}</option>
                      <option value="monster">{tr('Monster / Boss', 'Mostro / Boss')}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-stone-400 mb-1 font-semibold">
                      {tr('Full Name', 'Nome Completo')}
                    </label>
                    <input
                      type="text"
                      value={editingChar.name}
                      onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                    />
                  </div>
                </div>

                {/* PC Blueprint vs Assigned Player Toggle */}
                {editingChar.kind === 'pc' && (
                  <div className="p-3 rounded-xl bg-stone-950 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
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
                        <div className="font-bold text-amber-300">
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

                {/* Portrait / Image Upload & URL */}
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
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
                        onClick={() => setEditingChar({ ...editingChar, portraitUrl: undefined })}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        {tr('Remove Image', 'Rimuovi Immagine')}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {editingChar.portraitUrl && (
                      <img
                        src={editingChar.portraitUrl}
                        alt="Portrait preview"
                        className="w-14 h-14 rounded-lg object-cover border border-amber-500/50 shrink-0"
                      />
                    )}
                    <label className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold cursor-pointer border border-stone-700">
                      {tr('Upload Image File...', 'Carica File Immagine...')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePortraitUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={editingChar.portraitUrl || ''}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, portraitUrl: e.target.value || undefined })
                      }
                      placeholder={tr(
                        'Or paste image URL / DataURL...',
                        'Oppure incolla URL immagine / DataURL...'
                      )}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      {editingChar.kind === 'pc'
                        ? tr('Player Name (Optional)', 'Nome Giocatore (Opzionale)')
                        : tr('Narrative Role / Title', 'Ruolo Narrativo / Titolo')}
                    </label>
                    <input
                      type="text"
                      value={editingChar.playerOrRole}
                      disabled={editingChar.kind === 'pc' && Boolean(editingChar.isPreGenBlueprint)}
                      placeholder={
                        editingChar.kind === 'pc'
                          ? tr('Unassigned (Pre-Gen)', 'Non assegnato (Pre-Gen)')
                          : ''
                      }
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, playerOrRole: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-stone-400 font-semibold">
                        {tr('Level (PC) or CR', 'Livello (PG) o GS')}
                      </label>
                      {editingChar.kind === 'pc' && (
                        <button
                          type="button"
                          onClick={() => setLevelUpTargetChar(editingChar)}
                          className="text-[10px] text-purple-300 hover:text-purple-200 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {tr('Level Up ▲', 'Livello + ▲')}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingChar.levelOrCr}
                      onChange={(e) => {
                        const updated = { ...editingChar, levelOrCr: e.target.value };
                        setEditingChar(syncSkillAndSaveStrings(updated));
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
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
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-stone-400 font-semibold">
                        {tr('Type / Species', 'Tipo / Razza')}
                      </label>
                      {editingChar.kind === 'pc' && (
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
                          className="text-[10px] bg-stone-900 border border-stone-700 text-amber-300 rounded px-1 py-0.5"
                        >
                          <option value="">{tr('Presets...', 'Preimpostati...')}</option>
                          {STANDARD_RACES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {lang === 'it' ? r.nameIt : r.nameEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingChar.creatureType}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, creatureType: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-stone-400 font-semibold">
                        {tr('Class / Archetype', 'Classe / Archetipo')}
                      </label>
                      {editingChar.kind === 'pc' && (
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
                          className="text-[10px] bg-stone-900 border border-stone-700 text-amber-300 rounded px-1 py-0.5"
                        >
                          <option value="">{tr('Presets...', 'Preimpostati...')}</option>
                          {STANDARD_CLASSES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {lang === 'it' ? c.nameIt : c.nameEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editingChar.classOrArchetype || ''}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, classOrArchetype: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
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
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                {/* Combat Vitals */}
                <div className="grid grid-cols-5 gap-2 bg-stone-950 p-3 rounded-lg border border-stone-800">
                  <div>
                    <label className="block text-stone-400 mb-1">{tr('AC', 'CA')}</label>
                    <input
                      type="number"
                      value={editingChar.ac}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, ac: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">{tr('Max HP', 'PF Max')}</label>
                    <input
                      type="number"
                      value={editingChar.hpMax}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, hpMax: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">
                      {tr('Hit Dice', 'Formula Dadi')}
                    </label>
                    <input
                      type="text"
                      value={editingChar.hitDiceFormula}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, hitDiceFormula: e.target.value })
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">
                      {tr('Init Bonus', 'Bonus Iniz.')}
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
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">
                      {tr('Pass. Perc.', 'Perc. Passiva')}
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
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                {/* 6 Abilities */}
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr(
                      'D&D 5e Ability Scores (auto-updates all 18 skills & saving throws)',
                      'Caratteristiche D&D 5e (aggiorna in automatico tutte le 18 abilità e i TS)'
                    )}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {DND_ABILITY_META.map((ab) => (
                      <div
                        key={ab.key}
                        className="bg-stone-950 p-2 rounded border border-stone-800 text-center"
                      >
                        <div className="text-[10px] font-bold text-amber-400">
                          {lang === 'it' ? ab.shortIt : ab.shortEn}
                        </div>
                        <input
                          type="number"
                          value={editingChar.abilities[ab.key]}
                          onChange={(e) => updateAbility(ab.key, Number(e.target.value))}
                          className="w-full mt-1 text-center py-1 rounded bg-stone-900 border border-stone-700 text-stone-100 font-bold"
                        />
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {formatMod(editingChar.abilities[ab.key])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Saving Throws & All 18 Skills Editor */}
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      {tr(
                        `All 18 Skills & Saving Throws (Proficiency Bonus: +${getProficiencyBonus(
                          editingChar
                        )})`,
                        `Tutte le 18 Abilità & Tiri Salvezza (Bonus Competenza: +${getProficiencyBonus(
                          editingChar
                        )})`
                      )}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {tr(
                        'Click a skill to cycle: None (○) → Proficient (●) → Expertise (◆)',
                        'Clicca un’abilità per ciclare: Base (○) → Competenza (●) → Maestria (◆)'
                      )}
                    </span>
                  </div>

                  {/* 6 Saving Throws toggles */}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                      {tr('Saving Throws', 'Tiri Salvezza')}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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
                            className={`px-2 py-1.5 rounded border text-xs flex items-center justify-between transition cursor-pointer ${
                              proficient
                                ? 'bg-amber-600/20 border-amber-500 text-amber-200 font-bold'
                                : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            <span>
                              {proficient ? '● ' : '○ '}
                              {lang === 'it' ? ab.shortIt : ab.shortEn}
                            </span>
                            <span className="font-mono">{formatSignedBonus(total)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 18 Skills interactive buttons */}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">
                      {tr('All 18 D&D 5e Skills', 'Tutte le 18 Abilità D&D 5e')}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
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
                            className={`px-2.5 py-1.5 rounded border text-left text-xs flex items-center justify-between transition cursor-pointer ${
                              rank === 2
                                ? 'bg-purple-600/25 border-purple-400 text-purple-200 font-bold'
                                : rank === 1
                                ? 'bg-amber-600/20 border-amber-500 text-amber-200 font-bold'
                                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <span className="truncate">
                              <span className="mr-1">{icon}</span>
                              {lang === 'it' ? sk.labelIt : sk.labelEn}{' '}
                              <span className="text-[9px] opacity-60">({abShort})</span>
                            </span>
                            <span className="font-mono ml-1">{formatSignedBonus(total)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Traits & Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      {tr('Traits & Special Abilities', 'Tratti & Capacità Speciali')}
                    </span>
                    <button
                      type="button"
                      onClick={() => addListEntry('traits')}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300"
                    >
                      {tr('+ Add Trait', '+ Aggiungi Tratto')}
                    </button>
                  </div>
                  {editingChar.traits.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start bg-stone-950 p-2 rounded border border-stone-800"
                    >
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => updateListEntry('traits', idx, { name: e.target.value })}
                        placeholder={tr('Trait name', 'Nome tratto')}
                        className="w-1/3 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                      />
                      <input
                        type="text"
                        value={t.description}
                        onChange={(e) =>
                          updateListEntry('traits', idx, { description: e.target.value })
                        }
                        placeholder={tr('Description', 'Descrizione')}
                        className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeListEntry('traits', idx)}
                        className="p-1 text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      {tr('Actions & Attacks', 'Azioni & Attacchi')}
                    </span>
                    <button
                      type="button"
                      onClick={() => addListEntry('actions')}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300"
                    >
                      {tr('+ Add Action', '+ Aggiungi Azione')}
                    </button>
                  </div>
                  {editingChar.actions.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start bg-stone-950 p-2 rounded border border-stone-800"
                    >
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateListEntry('actions', idx, { name: e.target.value })}
                        placeholder={tr('Action name', 'Nome azione')}
                        className="w-1/3 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                      />
                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) =>
                          updateListEntry('actions', idx, { description: e.target.value })
                        }
                        placeholder={tr(
                          'Attack / damage description',
                          'Descrizione attacco / danni'
                        )}
                        className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeListEntry('actions', idx)}
                        className="p-1 text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1">
                      {tr('Spells & Slots Notes', 'Note Incantesimi & Slot')}
                    </label>
                    <textarea
                      rows={2}
                      value={editingChar.spellsNotes || ''}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, spellsNotes: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">
                      {tr('Backstory & Equipment Notes', 'Biografia, Personalità & Equipaggiamento')}
                    </label>
                    <textarea
                      rows={2}
                      value={editingChar.biographyOrLore}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, biographyOrLore: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>
              </div>

              {/* Right Live Statblock Preview (5 cols) */}
              <div className="lg:col-span-5">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  {tr('Live D&D 5e Statblock Preview', 'Anteprima Live Statblock D&D 5e')}
                </div>
                <StatblockCard character={editingChar} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party Modal */}
      {editingParty && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-header text-xl font-bold text-amber-400">
              {tr('Configure Adventuring Party', 'Configura Gruppo (Party di Giocatori)')}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Party Name', 'Nome del Gruppo')}
                </label>
                <input
                  type="text"
                  value={editingParty.name}
                  onChange={(e) => setEditingParty({ ...editingParty, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Description / Schedule', 'Descrizione / Giorno di gioco')}
                </label>
                <input
                  type="text"
                  value={editingParty.description}
                  onChange={(e) =>
                    setEditingParty({ ...editingParty, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1.5 font-semibold">
                  {tr(
                    'Select Repository PCs (Assigned or Pre-Gen Blueprints) belonging to this party:',
                    'Seleziona i PG del Repository (Assegnati o Blueprint Pre-Gen) che fanno parte di questo gruppo:'
                  )}
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto bg-stone-950 p-2.5 rounded border border-stone-800">
                  {pcsOnly.map((pc) => {
                    const checked = editingParty.memberCharacterIds.includes(pc.id);
                    const bp = isPcBlueprint(pc);
                    return (
                      <label
                        key={pc.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-stone-900 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...editingParty.memberCharacterIds, pc.id]
                                : editingParty.memberCharacterIds.filter((id) => id !== pc.id);
                              setEditingParty({ ...editingParty, memberCharacterIds: next });
                            }}
                            className="rounded accent-amber-500"
                          />
                          <span className="font-bold text-stone-200">{pc.name}</span>
                          <span className="text-stone-400">
                            ({bp ? tr('Pre-Gen Blueprint', 'Blueprint Pre-Gen') : pc.playerOrRole})
                          </span>
                        </div>
                        <span className="text-amber-400 font-semibold">{pc.classOrArchetype}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingParty(null)}
                className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={() => {
                  onSaveParty(editingParty);
                  setEditingParty(null);
                  setFilterKind('parties');
                }}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
              >
                {tr('Save Party', 'Salva Gruppo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervised PC Creation Wizard Modal */}
      {showSupervisedCreate && (
        <SupervisedPgCreateModal
          isOpen={showSupervisedCreate.isOpen}
          isBlueprintDefault={showSupervisedCreate.isBlueprint}
          onClose={() => setShowSupervisedCreate(null)}
          onConfirm={(createdChar) => {
            onSaveCharacter(createdChar);
            setSelectedId(createdChar.id);
            setEditingChar(structuredClone(createdChar));
            setMasterOverrideAccepted(false);
            setShowSupervisedCreate(null);
          }}
        />
      )}

      {/* Level-Up Wizard Modal */}
      {levelUpTargetChar && (
        <LevelUpModal
          isOpen={Boolean(levelUpTargetChar)}
          character={levelUpTargetChar}
          onClose={() => setLevelUpTargetChar(null)}
          onSave={(updatedChar, saveMode) => {
            onSaveCharacter(updatedChar);
            setSelectedId(updatedChar.id);
            if (editingChar && editingChar.id === levelUpTargetChar.id) {
              setEditingChar(structuredClone(updatedChar));
            }
            setLevelUpTargetChar(null);
          }}
        />
      )}

      {/* Soft Confirmation Modal for Unacknowledged Rules Advisories */}
      {showWarningConfirmation && editingChar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/60 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-header text-lg font-bold text-amber-300">
                  {tr('Master Authority & Rules Advisory', 'Autorità del Master & Avviso Regole')}
                </h3>
                <p className="text-stone-400 text-[11px] mt-0.5">
                  {tr(
                    'Some attributes diverge from standard D&D 5e SRD benchmarks.',
                    'Alcuni attributi divergono dai parametri standard di D&D 5e SRD.'
                  )}
                </p>
              </div>
            </div>

            <p className="text-stone-300 leading-relaxed">
              {tr(
                'As the Dungeon Master, you are ALWAYS the final decision maker. Would you like to review the advisories, or continue anyway with your custom/homebrew values?',
                'In qualità di Dungeon Master, hai SEMPRE l’ultima parola. Desideri rivedere i suggerimenti o continuare comunque con i tuoi valori personalizzati/homebrew?'
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowWarningConfirmation(false)}
                className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold cursor-pointer"
              >
                {tr('Review Advisories', 'Rivedi Suggerimenti')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMasterOverrideAccepted(true);
                  setShowWarningConfirmation(false);
                  onSaveCharacter(editingChar);
                  setSelectedId(editingChar.id);
                  setEditingChar(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {tr('Continue Anyway & Save', 'Continua Comunque & Salva')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
