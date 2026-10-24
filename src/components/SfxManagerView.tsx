import React, { useEffect, useState } from 'react';
import { SfxCategory, SfxItem, SynthPresetId } from '../types/dnd';
import { soundboardEngine } from '../services/audioEngine';
import { storageRepository } from '../services/storageRepository';
import { useLanguage } from '../i18n/LanguageContext';
import {
  VolumeX,
  Plus,
  Play,
  Square,
  Repeat,
  Upload,
  Trash2,
  Copy,
  Check,
  Radio,
} from 'lucide-react';

interface SfxManagerViewProps {
  sfxCatalog: SfxItem[];
  onSaveSfx: (item: SfxItem) => void;
  onDeleteSfx: (id: string) => void;
}

export const SfxManagerView: React.FC<SfxManagerViewProps> = ({
  sfxCatalog,
  onSaveSfx,
  onDeleteSfx,
}) => {
  const { tr } = useLanguage();
  const [, setTick] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | SfxCategory>('all');
  const [editingSfx, setEditingSfx] = useState<SfxItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categoryLabels: Record<SfxCategory, string> = {
    ambience: tr('Ambience & Atmospheres (Loop)', 'Atmosfere & Ambience (Loop)'),
    combat_music: tr('Combat Music & Drums', 'Musica & Ritmi Combat'),
    sfx_environment: tr('Environment & Dungeon SFX', 'SFX Ambientali & Dungeon'),
    sfx_creature: tr('Creatures, Weapons & Boss SFX', 'SFX Creature, Armi & Boss'),
    sfx_magic: tr('Spells & Divine SFX', 'SFX Incantesimi & Divino'),
    sfx_ui: tr('Cues & Misc Effects', 'Segnali & Effetti Vari'),
  };

  const synthPresets: Array<{ id: SynthPresetId; label: string }> = [
    { id: 'tavern_hearth', label: tr('Tavern Hearth / Fire (Loop)', 'Camino Locanda / Fuoco (Loop)') },
    { id: 'rain_storm', label: tr('Rain & Night Wind (Loop)', 'Pioggia & Vento Notturno (Loop)') },
    { id: 'dungeon_wind', label: tr('Cave Wind (Loop)', 'Vento di Caverna (Loop)') },
    { id: 'crypt_whispers', label: tr('Dark Crypt Echoes (Loop)', 'Echi Oscuri della Cripta (Loop)') },
    { id: 'combat_drums', label: tr('War Drums (Loop)', 'Tamburi da Guerra (Loop)') },
    { id: 'thunder_clap', label: tr('Sudden Thunderclap', 'Tuono Improvviso') },
    { id: 'creaking_door', label: tr('Heavy Door / Stone Gate', 'Porta / Cancello Pesante') },
    { id: 'trap_trigger', label: tr('Mechanical Trap Trigger', 'Scatto di Trappola') },
    { id: 'sword_clash', label: tr('Clash of Blades', 'Scontro di Lame') },
    { id: 'dragon_roar', label: tr('Boss Roar / Howl', 'Ruggito / Urlo del Boss') },
    { id: 'arcane_blast', label: tr('Arcane Blast', 'Esplosione Arcana') },
    { id: 'healing_chime', label: tr('Healing / Celestial Chime', 'Cura / Luce Celestiale') },
    { id: 'war_horn', label: tr('War Horn', 'Corno da Guerra') },
    { id: 'dice_roll', label: tr('Dice Roll', 'Lancio di Dadi') },
  ];

  useEffect(() => {
    return soundboardEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const filtered = sfxCatalog.filter(
    (s) => selectedCategory === 'all' || s.category === selectedCategory
  );

  const activeIds = soundboardEngine.getActiveTrackIds();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSfx) return;
    setIsUploading(true);
    try {
      const url = await storageRepository.saveAudioMedia(file);
      setEditingSfx({
        ...editingSfx,
        customAudioUrl: url,
      });
    } catch (err) {
      console.warn('Errore salvataggio media audio:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const newSfx = (): SfxItem => ({
    id: `sfx-${Date.now()}`,
    name: tr('New sound', 'Nuovo suono'),
    category: 'sfx_environment',
    description: '',
    loop: false,
    defaultVolume: 0.8,
    synthPreset: 'thunder_clap',
    customAudioUrl: '',
    iconName: 'Volume2',
    color: '#b39a62',
    tags: ['Custom'],
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-header text-xl font-bold text-stone-200">
            {tr('Sound library', 'Libreria suoni')}
          </h2>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as 'all' | SfxCategory)}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs"
          >
            <option value="all">
              {tr('All categories', 'Tutte le categorie')} ({sfxCatalog.length})
            </option>
            {(Object.keys(categoryLabels) as SfxCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {activeIds.length > 0 && (
            <button
              onClick={() => soundboardEngine.stopAll()}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-red-900/60 text-stone-200 text-xs font-medium flex items-center gap-1.5"
            >
              <VolumeX className="w-4 h-4" /> {tr(`Stop all (${activeIds.length})`, `Ferma tutti (${activeIds.length})`)}
            </button>
          )}
          <button
            onClick={() => setEditingSfx(newSfx())}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {tr('New sound', 'Nuovo suono')}
          </button>
        </div>
      </div>

      {/* Sound list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-stone-500 py-6 text-center">
          {tr('No sounds in this category.', 'Nessun suono in questa categoria.')}
        </p>
      ) : (
        <ul className="divide-y divide-stone-800/70 border border-stone-800 rounded-xl overflow-hidden">
          {filtered.map((item) => {
            const playing = soundboardEngine.isPlaying(item.id);
            return (
              <li
                key={item.id}
                className={`group px-3 py-2.5 flex items-center gap-3 ${
                  playing ? 'bg-stone-800/70' : 'bg-stone-900/40 hover:bg-stone-900'
                }`}
              >
                <button
                  onClick={() => soundboardEngine.toggle(item)}
                  title={playing ? tr('Stop', 'Ferma') : tr('Play', 'Riproduci')}
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition cursor-pointer ${
                    playing
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-800 hover:bg-stone-700 text-amber-300'
                  }`}
                >
                  {playing ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-100 truncate flex items-center gap-2">
                    {item.name}
                    {item.loop && <Repeat className="w-3 h-3 text-stone-500 shrink-0" />}
                    {item.customAudioUrl && <Radio className="w-3 h-3 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{item.description}</div>
                </div>

                <span className="hidden md:block text-xs text-stone-500 w-56 truncate text-right">
                  {categoryLabels[item.category]}
                </span>

                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`@sfx[${item.id}]`);
                      setCopiedId(item.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    title={tr(`Copy story tag @sfx[${item.id}]`, `Copia tag per la storia @sfx[${item.id}]`)}
                    className="p-1.5 rounded-md hover:bg-stone-800 text-stone-400"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingSfx(structuredClone(item))}
                    className="px-2 py-1 rounded-md hover:bg-stone-800 text-stone-300 text-xs"
                  >
                    {tr('Edit', 'Modifica')}
                  </button>
                  <button
                    onClick={() => onDeleteSfx(item.id)}
                    title={tr('Delete', 'Elimina')}
                    className="p-1.5 rounded-md hover:bg-stone-800 text-stone-500 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal Editor SFX */}
      {editingSfx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-header text-xl font-bold text-amber-400">
              {tr('Configure Sound Effect / Ambience', 'Configura Effetto Sonoro / Atmosfera')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Effect Name', 'Nome Effetto')}
                </label>
                <input
                  type="text"
                  value={editingSfx.name}
                  onChange={(e) => setEditingSfx({ ...editingSfx, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Category', 'Categoria')}
                  </label>
                  <select
                    value={editingSfx.category}
                    onChange={(e) =>
                      setEditingSfx({ ...editingSfx, category: e.target.value as SfxCategory })
                    }
                    className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                  >
                    {(Object.keys(categoryLabels) as SfxCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {categoryLabels[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Playback Mode', 'Modalità Riproduzione')}
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded bg-stone-950 border border-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSfx.loop}
                      onChange={(e) => setEditingSfx({ ...editingSfx, loop: e.target.checked })}
                      className="accent-amber-500"
                    />
                    <span className="text-stone-200 font-semibold">
                      {tr('Continuous Loop', 'Riproduzione Continua (Loop)')}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">
                  {tr('Description', 'Descrizione')}
                </label>
                <input
                  type="text"
                  value={editingSfx.description}
                  onChange={(e) => setEditingSfx({ ...editingSfx, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-stone-950 border border-stone-700 text-stone-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr(
                      'Built-in Synthesizer (Fallback / Default)',
                      'Sintetizzatore Integrato (Fallback / Default)'
                    )}
                  </label>
                  <select
                    value={editingSfx.synthPreset}
                    onChange={(e) =>
                      setEditingSfx({ ...editingSfx, synthPreset: e.target.value as SynthPresetId })
                    }
                    className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                  >
                    {synthPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    {tr('Default Volume', 'Volume Predefinito')} (
                    {Math.round(editingSfx.defaultVolume * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={editingSfx.defaultVolume}
                    onChange={(e) =>
                      setEditingSfx({ ...editingSfx, defaultVolume: Number(e.target.value) })
                    }
                    className="w-full mt-2 accent-amber-500"
                  />
                </div>
              </div>

              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-2">
                <label className="block text-amber-300 font-semibold">
                  {tr(
                    'Custom Audio File (.mp3, .wav, .ogg) — Optional',
                    'File Audio Personalizzato (.mp3, .wav, .ogg) — Opzionale'
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer flex items-center gap-1.5 font-semibold">
                    <Upload className="w-3.5 h-3.5" />{' '}
                    {tr('Choose Audio File from Disk', 'Scegli File Audio da Disco')}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {editingSfx.customAudioUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingSfx({ ...editingSfx, customAudioUrl: '' })}
                      className="text-red-400 hover:underline"
                    >
                      {tr('Remove custom file', 'Rimuovi file custom')}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={editingSfx.customAudioUrl || ''}
                  onChange={(e) => setEditingSfx({ ...editingSfx, customAudioUrl: e.target.value })}
                  placeholder={tr(
                    'Or paste audio file URL / local path...',
                    'Oppure incolla URL / percorso locale file audio...'
                  )}
                  className="w-full px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-stone-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => soundboardEngine.play(editingSfx)}
                className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> {tr('Test Audio', 'Prova Audio')}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingSfx(null)}
                  className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 font-semibold"
                >
                  {tr('Cancel', 'Annulla')}
                </button>
                <button
                  onClick={() => {
                    onSaveSfx(editingSfx);
                    setEditingSfx(null);
                  }}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                >
                  {tr('Save to Library', 'Salva nella Libreria')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
