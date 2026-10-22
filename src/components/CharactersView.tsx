import React, { useState } from 'react';
import {
  CharacterEntity,
  EntityKind,
  PartyGroup,
  StatblockEntry,
  formatMod,
} from '../types/dnd';
import { StatblockCard } from './StatblockCard';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Skull,
  UserCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  FolderPlus,
} from 'lucide-react';

interface CharactersViewProps {
  characters: CharacterEntity[];
  parties: PartyGroup[];
  onSaveCharacter: (char: CharacterEntity) => void;
  onDeleteCharacter: (id: string) => void;
  onSaveParty: (party: PartyGroup) => void;
  onDeleteParty: (id: string) => void;
}

const EMPTY_CHARACTER: CharacterEntity = {
  id: '',
  kind: 'pc',
  name: 'Nuovo Personaggio',
  playerOrRole: 'Giocatore / Ruolo',
  size: 'Media',
  creatureType: 'Umanoide',
  alignment: 'Neutrale Buono',
  classOrArchetype: 'Guerriero',
  levelOrCr: 'Livello 3',
  ac: 15,
  acNote: '(Cotta di maglia)',
  hpMax: 28,
  hitDiceFormula: '3d10 + 6',
  speed: '9m',
  initiativeBonus: 2,
  passivePerception: 13,
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 11 },
  savingThrows: 'FOR +5, COS +4',
  skills: 'Atletica +5, Percezione +3',
  senses: 'Percezione passiva 13',
  languages: 'Comune',
  traits: [
    {
      name: 'Recuperare Energie',
      description: 'Usa un’azione bonus per recuperare 1d10 + 3 punti ferita.',
    },
  ],
  actions: [
    {
      name: 'Spada Lunga',
      description: 'Attacco con arma da mischia: +5 a colpire, portata 1,5m. Colpito: 1d8 + 3 danni taglienti.',
      attackBonus: 5,
      damageFormula: '1d8+3',
    },
  ],
  reactionsOrLegendary: [],
  spellsNotes: '',
  biographyOrLore: '',
  tags: ['Nuovo'],
};

export const CharactersView: React.FC<CharactersViewProps> = ({
  characters,
  parties,
  onSaveCharacter,
  onDeleteCharacter,
  onSaveParty,
  onDeleteParty,
}) => {
  const [filterKind, setFilterKind] = useState<'all' | EntityKind | 'parties'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id || '');
  const [editingChar, setEditingChar] = useState<CharacterEntity | null>(null);

  // Party creation/editing state
  const [editingParty, setEditingParty] = useState<PartyGroup | null>(null);

  const filteredCharacters = characters.filter((c) => {
    if (filterKind !== 'all' && filterKind !== 'parties' && c.kind !== filterKind) {
      return false;
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
    characters.find((c) => c.id === selectedId) || filteredCharacters[0] || characters[0];

  const handleCreateNew = (kind: EntityKind) => {
    const newChar: CharacterEntity = {
      ...structuredClone(EMPTY_CHARACTER),
      id: `${kind}-${Date.now()}`,
      kind,
      name:
        kind === 'pc'
          ? 'Nuovo Eroe PG'
          : kind === 'npc'
          ? 'Nuovo PNG Importante'
          : 'Nuova Creatura / Mostro',
      playerOrRole:
        kind === 'pc' ? 'Giocatore: ...' : kind === 'npc' ? 'NPC — Alleato / Contatto' : 'Mostro Dungeon',
      levelOrCr: kind === 'pc' ? 'Livello 3' : 'GS 1 (200 PE)',
      classOrArchetype: kind === 'pc' ? 'Avventuriero' : '',
    };
    setEditingChar(newChar);
  };

  const handleDuplicate = (char: CharacterEntity) => {
    const copy: CharacterEntity = {
      ...structuredClone(char),
      id: `${char.kind}-${Date.now()}`,
      name: `${char.name} (Copia)`,
    };
    onSaveCharacter(copy);
    setSelectedId(copy.id);
  };

  const updateAbility = (key: keyof CharacterEntity['abilities'], val: number) => {
    if (!editingChar) return;
    setEditingChar({
      ...editingChar,
      abilities: {
        ...editingChar.abilities,
        [key]: Math.max(1, Math.min(30, val || 10)),
      },
    });
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
    current.push({ name: 'Nuova Capacità / Azione', description: 'Descrizione dell’effetto o tiro per colpire.' });
    setEditingChar({ ...editingChar, [field]: current });
  };

  const removeListEntry = (field: 'traits' | 'actions' | 'reactionsOrLegendary', index: number) => {
    if (!editingChar) return;
    const current = [...(editingChar[field] || [])];
    current.splice(index, 1);
    setEditingChar({ ...editingChar, [field]: current });
  };

  const pcsOnly = characters.filter((c) => c.kind === 'pc');

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 p-4 rounded-xl">
        <div>
          <h2 className="font-header text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Repository Globale: PG, NPC, Bestiario & Gruppi
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Crea una sola volta le schede D&D 5e di giocatori, PNG e mostri per riutilizzarli in qualsiasi One-Shot, Campagna o Combattimento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCreateNew('pc')}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
          >
            <UserPlus className="w-4 h-4" /> + Nuovo PG
          </button>
          <button
            onClick={() => handleCreateNew('npc')}
            className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
          >
            <UserCheck className="w-4 h-4" /> + Nuovo NPC
          </button>
          <button
            onClick={() => handleCreateNew('monster')}
            className="px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-amber-100 font-bold text-xs flex items-center gap-1.5 transition shadow"
          >
            <Skull className="w-4 h-4" /> + Nuovo Mostro/Boss
          </button>
          <button
            onClick={() =>
              setEditingParty({
                id: `party-${Date.now()}`,
                name: 'Nuovo Gruppo di Gioco',
                description: 'Formazione di PG per sessioni o one-shot.',
                memberCharacterIds: pcsOnly.slice(0, 3).map((p) => p.id),
              })
            }
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <FolderPlus className="w-4 h-4" /> + Nuovo Gruppo (Party)
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-lg border border-stone-800">
          {(
            [
              ['all', `Tutti (${characters.length})`],
              ['pc', `PG Giocanti (${characters.filter((c) => c.kind === 'pc').length})`],
              ['npc', `NPC (${characters.filter((c) => c.kind === 'npc').length})`],
              ['monster', `Mostri & Boss (${characters.filter((c) => c.kind === 'monster').length})`],
              ['parties', `Gruppi / Party (${parties.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterKind(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
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
            placeholder="Cerca per nome, classe, GS, tag..."
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
                        Modifica
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
                      Membri del Gruppo ({members.length} PG)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-sm text-amber-200">{m.name}</div>
                            <div className="text-[11px] text-stone-400">
                              {m.classOrArchetype} • {m.levelOrCr}
                            </div>
                          </div>
                          <div className="text-right text-xs font-mono text-stone-300">
                            <div>CA {m.ac}</div>
                            <div className="text-emerald-400">PF {m.hpMax}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 border-t border-stone-800 pt-2">
                  ID Template Gruppo: <code>{party.id}</code> — Associabile a qualsiasi nuova Istanza di Gioco.
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          c.kind === 'pc'
                            ? 'bg-amber-400'
                            : c.kind === 'npc'
                            ? 'bg-sky-400'
                            : 'bg-red-500'
                        }`}
                      />
                      <h4 className="font-bold text-stone-100 truncate">{c.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold">
                        {c.levelOrCr}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {c.playerOrRole} {c.classOrArchetype ? `• ${c.classOrArchetype}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-950 text-amber-300 border border-stone-800">
                        id: @{c.kind === 'pc' ? 'npc' : 'npc'}[{c.id}]
                      </span>
                      {c.tags.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800/80 text-stone-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
                      <span className="px-2 py-0.5 rounded bg-stone-800">CA {c.ac}</span>
                      <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-200 border border-red-800/40">
                        PF {c.hpMax}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChar(structuredClone(c));
                        }}
                        className="px-2 py-0.5 text-[11px] rounded bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 transition"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(c);
                        }}
                        title="Duplica scheda"
                        className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCharacter(c.id);
                        }}
                        title="Elimina scheda"
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
                <div className="flex items-center justify-between bg-stone-900/90 border border-stone-800 px-4 py-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-stone-300">
                    <span>Tag per inserimento rapido nella storia Homebrewery:</span>
                    <code className="px-2 py-0.5 rounded bg-stone-950 text-amber-400 border border-stone-800 font-mono">
                      @npc[{selectedCharacter.id}]
                    </code>
                    <span>oppure</span>
                    <code className="px-2 py-0.5 rounded bg-stone-950 text-amber-400 border border-stone-800 font-mono">
                      @statblock[{selectedCharacter.id}]
                    </code>
                  </div>
                </div>
                <StatblockCard
                  character={selectedCharacter}
                  onEdit={(ch) => setEditingChar(structuredClone(ch))}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-stone-500 bg-stone-900/40 rounded-xl border border-stone-800">
                Seleziona o crea un personaggio per visualizzare lo Statblock D&D 5e.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Character Editor Modal */}
      {editingChar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
              <h3 className="font-header text-xl font-bold text-amber-400">
                Editor Scheda D&D 5e — {editingChar.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingChar(null)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    onSaveCharacter(editingChar);
                    setSelectedId(editingChar.id);
                    setEditingChar(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Salva Scheda nel Repository
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Form */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Categoria</label>
                    <select
                      value={editingChar.kind}
                      onChange={(e) => setEditingChar({ ...editingChar, kind: e.target.value as EntityKind })}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                    >
                      <option value="pc">PG (Giocatore)</option>
                      <option value="npc">NPC (Alleato/PNG)</option>
                      <option value="monster">Mostro / Boss</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-stone-400 mb-1 font-semibold">Nome Completo</label>
                    <input
                      type="text"
                      value={editingChar.name}
                      onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      {editingChar.kind === 'pc' ? 'Nome Giocatore' : 'Ruolo Narrativo / Titolo'}
                    </label>
                    <input
                      type="text"
                      value={editingChar.playerOrRole}
                      onChange={(e) => setEditingChar({ ...editingChar, playerOrRole: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      Livello (PG) o Grado di Sfida (GS)
                    </label>
                    <input
                      type="text"
                      value={editingChar.levelOrCr}
                      onChange={(e) => setEditingChar({ ...editingChar, levelOrCr: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Tipo / Razza</label>
                    <input
                      type="text"
                      value={editingChar.creatureType}
                      onChange={(e) => setEditingChar({ ...editingChar, creatureType: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Classe / Archetipo</label>
                    <input
                      type="text"
                      value={editingChar.classOrArchetype || ''}
                      onChange={(e) => setEditingChar({ ...editingChar, classOrArchetype: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Allineamento</label>
                    <input
                      type="text"
                      value={editingChar.alignment}
                      onChange={(e) => setEditingChar({ ...editingChar, alignment: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                {/* Combat Vitals */}
                <div className="grid grid-cols-5 gap-2 bg-stone-950 p-3 rounded-lg border border-stone-800">
                  <div>
                    <label className="block text-stone-400 mb-1">CA</label>
                    <input
                      type="number"
                      value={editingChar.ac}
                      onChange={(e) => setEditingChar({ ...editingChar, ac: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">PF Max</label>
                    <input
                      type="number"
                      value={editingChar.hpMax}
                      onChange={(e) => setEditingChar({ ...editingChar, hpMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Formula Dadi</label>
                    <input
                      type="text"
                      value={editingChar.hitDiceFormula}
                      onChange={(e) => setEditingChar({ ...editingChar, hitDiceFormula: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Bonus Iniz.</label>
                    <input
                      type="number"
                      value={editingChar.initiativeBonus}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, initiativeBonus: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Perc. Passiva</label>
                    <input
                      type="number"
                      value={editingChar.passivePerception}
                      onChange={(e) =>
                        setEditingChar({ ...editingChar, passivePerception: Number(e.target.value) })
                      }
                      className="w-full px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                {/* 6 Abilities */}
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    Caratteristiche D&D 5e (calcolo automatico modificatore)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {(
                      [
                        ['str', 'FOR'],
                        ['dex', 'DES'],
                        ['con', 'COS'],
                        ['int', 'INT'],
                        ['wis', 'SAG'],
                        ['cha', 'CAR'],
                      ] as const
                    ).map(([k, label]) => (
                      <div key={k} className="bg-stone-950 p-2 rounded border border-stone-800 text-center">
                        <div className="text-[10px] font-bold text-amber-400">{label}</div>
                        <input
                          type="number"
                          value={editingChar.abilities[k]}
                          onChange={(e) => updateAbility(k, Number(e.target.value))}
                          className="w-full mt-1 text-center py-1 rounded bg-stone-900 border border-stone-700 text-stone-100 font-bold"
                        />
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {formatMod(editingChar.abilities[k])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills & Saves */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1">Tiri Salvezza</label>
                    <input
                      type="text"
                      value={editingChar.savingThrows || ''}
                      onChange={(e) => setEditingChar({ ...editingChar, savingThrows: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Abilità</label>
                    <input
                      type="text"
                      value={editingChar.skills || ''}
                      onChange={(e) => setEditingChar({ ...editingChar, skills: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                    />
                  </div>
                </div>

                {/* Traits & Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">Tratti & Capacità Speciali</span>
                    <button
                      type="button"
                      onClick={() => addListEntry('traits')}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300"
                    >
                      + Aggiungi Tratto
                    </button>
                  </div>
                  {editingChar.traits.map((t, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-stone-950 p-2 rounded border border-stone-800">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => updateListEntry('traits', idx, { name: e.target.value })}
                        placeholder="Nome tratto"
                        className="w-1/3 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                      />
                      <input
                        type="text"
                        value={t.description}
                        onChange={(e) => updateListEntry('traits', idx, { description: e.target.value })}
                        placeholder="Descrizione"
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
                    <span className="font-bold text-amber-400">Azioni & Attacchi</span>
                    <button
                      type="button"
                      onClick={() => addListEntry('actions')}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300"
                    >
                      + Aggiungi Azione
                    </button>
                  </div>
                  {editingChar.actions.map((a, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-stone-950 p-2 rounded border border-stone-800">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateListEntry('actions', idx, { name: e.target.value })}
                        placeholder="Nome azione"
                        className="w-1/3 px-2 py-1 rounded bg-stone-900 border border-stone-700 text-amber-200 font-semibold"
                      />
                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) => updateListEntry('actions', idx, { description: e.target.value })}
                        placeholder="Descrizione attacco / danni"
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

                <div>
                  <label className="block text-stone-400 mb-1">Note Incantesimi / Equipaggiamento / Lore</label>
                  <textarea
                    rows={2}
                    value={editingChar.biographyOrLore}
                    onChange={(e) => setEditingChar({ ...editingChar, biographyOrLore: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                  />
                </div>
              </div>

              {/* Right Live Statblock Preview */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Anteprima Live Statblock D&D 5e
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
              Configura Gruppo (Party di Giocatori)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Nome del Gruppo</label>
                <input
                  type="text"
                  value={editingParty.name}
                  onChange={(e) => setEditingParty({ ...editingParty, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Descrizione / Giorno di gioco</label>
                <input
                  type="text"
                  value={editingParty.description}
                  onChange={(e) => setEditingParty({ ...editingParty, description: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1.5 font-semibold">
                  Seleziona i PG del Repository che fanno parte di questo gruppo:
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto bg-stone-950 p-2.5 rounded border border-stone-800">
                  {pcsOnly.map((pc) => {
                    const checked = editingParty.memberCharacterIds.includes(pc.id);
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
                          <span className="text-stone-400">({pc.playerOrRole})</span>
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
                Annulla
              </button>
              <button
                onClick={() => {
                  onSaveParty(editingParty);
                  setEditingParty(null);
                  setFilterKind('parties');
                }}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
              >
                Salva Gruppo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
