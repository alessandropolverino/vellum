import React, { useState } from 'react';
import {
  CharacterEntity,
  EntityKind,
  PartyGroup,
  isPcBlueprint,
} from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { StatblockCard } from './StatblockCard';
import { SupervisedPgCreateView } from './SupervisedPgCreateView';
import { FullPageCharacterEditor } from './FullPageCharacterEditor';
import { LevelUpModal } from './LevelUpModal';
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
  Sparkles,
  TrendingUp,
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
          (t) =>
            t.toLowerCase() !== 'blueprint' &&
            t.toLowerCase() !== 'pre-gen' &&
            !t.toLowerCase().includes('blueprint')
        ),
        tr('Playing PC', 'PG Giocante'),
      ],
    };
    onSaveCharacter(instanceChar);

    if (instTargetPartyId) {
      const party = parties.find((p) => p.id === instTargetPartyId);
      if (party && !party.memberCharacterIds.includes(instanceChar.id)) {
        onSaveParty({
          ...party,
          memberCharacterIds: [...party.memberCharacterIds, instanceChar.id],
        });
      }
    }

    setInstantiatingBlueprint(null);
    setSelectedId(instanceChar.id);
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

  const pcsOnly = visibleCharacters.filter((c) => c.kind === 'pc');
  const blueprintsCount = pcsOnly.filter((c) => isPcBlueprint(c)).length;

  // 1. FULL PAGE: Supervised PC Creation View
  if (showSupervisedCreate) {
    return (
      <SupervisedPgCreateView
        isBlueprintDefault={showSupervisedCreate.isBlueprint}
        onCancel={() => setShowSupervisedCreate(null)}
        onSaveDirect={(createdChar) => {
          onSaveCharacter(createdChar);
          setSelectedId(createdChar.id);
          setShowSupervisedCreate(null);
        }}
        onProceedToEditor={(createdChar) => {
          onSaveCharacter(createdChar);
          setSelectedId(createdChar.id);
          setShowSupervisedCreate(null);
          setEditingChar(structuredClone(createdChar));
        }}
      />
    );
  }

  // 2. FULL PAGE: Character Sheet Editor
  if (editingChar) {
    return (
      <>
        <FullPageCharacterEditor
          character={editingChar}
          onSave={(savedChar) => {
            onSaveCharacter(savedChar);
            setSelectedId(savedChar.id);
            setEditingChar(null);
          }}
          onCancel={() => setEditingChar(null)}
          onLevelUp={(charToLevelUp) => setLevelUpTargetChar(charToLevelUp)}
        />

        {/* Level-Up Modal when invoked from inside the editor */}
        {levelUpTargetChar && (
          <LevelUpModal
            isOpen={Boolean(levelUpTargetChar)}
            character={levelUpTargetChar}
            onClose={() => setLevelUpTargetChar(null)}
            onSave={(updatedChar, saveMode) => {
              if (saveMode === 'new_blueprint') {
                const newBp: CharacterEntity = {
                  ...updatedChar,
                  id: `pc-bp-${Date.now()}`,
                  isPreGenBlueprint: true,
                  sourceBlueprintId: levelUpTargetChar.id,
                };
                onSaveCharacter(newBp);
                setSelectedId(newBp.id);
                setEditingChar(structuredClone(newBp));
              } else {
                onSaveCharacter(updatedChar);
                setSelectedId(updatedChar.id);
                setEditingChar(structuredClone(updatedChar));
              }
              setLevelUpTargetChar(null);
            }}
          />
        )}
      </>
    );
  }

  // 3. MAIN REPOSITORY LIST VIEW
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
                className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-header text-lg font-bold text-amber-400 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        {party.name}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">{party.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingParty(structuredClone(party))}
                        className="px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold"
                      >
                        {tr('Edit', 'Modifica')}
                      </button>
                      <button
                        onClick={() => onDeleteParty(party.id)}
                        className="p-1 rounded bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                      {tr('Roster Members', 'Componenti del Gruppo')} ({members.length})
                    </div>
                    {members.length === 0 ? (
                      <div className="text-xs text-stone-500 italic p-3 bg-stone-950/60 rounded border border-stone-800/60">
                        {tr(
                          'No characters assigned to this party yet.',
                          'Nessun personaggio ancora assegnato a questo gruppo.'
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {members.map((m) => {
                          const isBp = isPcBlueprint(m);
                          return (
                            <div
                              key={m.id}
                              className="p-2.5 rounded bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {m.portraitUrl && (
                                  <img
                                    src={m.portraitUrl}
                                    alt={m.name}
                                    className="w-8 h-8 rounded object-cover border border-amber-500/30 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-stone-200 truncate">
                                    {m.name}
                                  </div>
                                  <div className="text-[10px] text-stone-400 truncate">
                                    {isBp
                                      ? tr('Blueprint (Reusable)', 'Blueprint (Riutilizzabile)')
                                      : m.playerOrRole || tr('Player PC', 'PG Giocatore')}{' '}
                                    • {m.levelOrCr}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 shrink-0">
                                {m.classOrArchetype}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between items-center text-xs text-stone-500">
                  <span>ID: {party.id}</span>
                  <span>
                    {members.length}{' '}
                    {members.length === 1
                      ? tr('character', 'personaggio')
                      : tr('characters', 'personaggi')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Characters 2-Column View: Master list & Live statblock preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
          {/* Left List */}
          <div className="lg:col-span-5 space-y-2 overflow-y-auto max-h-[72vh] pr-1">
            {filteredCharacters.length === 0 && (
              <div className="p-8 text-center text-stone-500 bg-stone-900/50 rounded-xl border border-stone-800">
                {tr(
                  'No characters found matching the current filters.',
                  'Nessun personaggio trovato con i filtri correnti.'
                )}
              </div>
            )}

            {filteredCharacters.map((c) => {
              const isSelected = c.id === selectedCharacter?.id;
              const isBp = isPcBlueprint(c);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {c.portraitUrl ? (
                      <img
                        src={c.portraitUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-lg object-cover border border-stone-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0">
                        {c.kind === 'pc' ? (
                          <Users className="w-6 h-6 text-amber-500" />
                        ) : c.kind === 'npc' ? (
                          <UserCheck className="w-6 h-6 text-sky-400" />
                        ) : (
                          <Skull className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-100 text-sm truncate">{c.name}</span>
                        {isBp && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 whitespace-nowrap">
                            {tr('Blueprint', 'Blueprint')}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-stone-400 mt-0.5 truncate">
                        <span className="text-amber-400 font-semibold">{c.classOrArchetype}</span>
                        {c.classOrArchetype && ' • '}
                        <span>{c.levelOrCr}</span>
                        {c.playerOrRole && (
                          <span className="opacity-75">
                            {' '}
                            (
                            {isBp
                              ? tr('Reusable Template', 'Modello Riutilizzabile')
                              : c.playerOrRole}
                            )
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.tags.slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400"
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
                            'Level Up this character',
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
          <div className="bg-stone-900 border border-purple-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-header text-lg font-bold text-purple-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              {tr('Instantiate PC for Active Campaign', 'Crea PG Giocante da Blueprint')}
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              {tr(
                'Generate an independent, player-assigned PC sheet cloned from blueprint',
                'Genera una scheda personaggio indipendente e assegnata partendo dal modello'
              )}{' '}
              <strong className="text-amber-400">{instantiatingBlueprint.name}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  {tr('Assigned Player Name:', 'Nome del Giocatore Assegnato:')}
                </label>
                <input
                  type="text"
                  value={instPlayerName}
                  onChange={(e) => setInstPlayerName(e.target.value)}
                  placeholder={tr('e.g. Marco, Elena...', 'es. Marco, Elena...')}
                  className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  {tr('Character Name (Customizable):', 'Nome Personaggio (Personalizzabile):')}
                </label>
                <input
                  type="text"
                  value={instCustomCharName}
                  onChange={(e) => setInstCustomCharName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-semibold">
                  {tr('Add Directly to Party (Optional):', 'Aggiungi Direttamente al Gruppo:')}
                </label>
                <select
                  value={instTargetPartyId}
                  onChange={(e) => setInstTargetPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-200"
                >
                  <option value="">
                    {tr('Do not assign to a party now', 'Non assegnare a nessun gruppo')}
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
                className="px-3 py-2 rounded-lg bg-stone-800 text-stone-300 font-semibold text-xs"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                onClick={handleConfirmInstantiate}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                {tr('Create Assigned PC Sheet', 'Crea Scheda PG Assegnata')}
              </button>
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
                }}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
              >
                {tr('Save Party', 'Salva Gruppo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level-Up Wizard Modal from repository cards */}
      {levelUpTargetChar && (
        <LevelUpModal
          isOpen={Boolean(levelUpTargetChar)}
          character={levelUpTargetChar}
          onClose={() => setLevelUpTargetChar(null)}
          onSave={(updatedChar, saveMode) => {
            if (saveMode === 'new_blueprint') {
              const newBp: CharacterEntity = {
                ...updatedChar,
                id: `pc-bp-${Date.now()}`,
                isPreGenBlueprint: true,
                sourceBlueprintId: levelUpTargetChar.id,
              };
              onSaveCharacter(newBp);
              setSelectedId(newBp.id);
            } else {
              onSaveCharacter(updatedChar);
              setSelectedId(updatedChar.id);
            }
            setLevelUpTargetChar(null);
          }}
        />
      )}
    </div>
  );
};
