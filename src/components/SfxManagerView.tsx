import React, { useEffect, useState } from 'react';
import { SfxCategory, SfxItem, SynthPresetId } from '../types/dnd';
import { soundboardEngine } from '../services/audioEngine';
import {
  Volume2,
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

const CATEGORY_LABELS: Record<SfxCategory, string> = {
  ambience: 'Atmosfere & Ambience (Loop)',
  combat_music: 'Musica & Ritmi Combat',
  sfx_environment: 'SFX Ambientali & Dungeon',
  sfx_creature: 'SFX Creature, Armi & Boss',
  sfx_magic: 'SFX Incantesimi & Divino',
  sfx_ui: 'Segnali & Effetti Vari',
};

const SYNTH_PRESETS: Array<{ id: SynthPresetId; label: string }> = [
  { id: 'tavern_hearth', label: 'Camino Locanda / Fuoco (Loop)' },
  { id: 'rain_storm', label: 'Pioggia & Vento Notturno (Loop)' },
  { id: 'crypt_whispers', label: 'Echi Oscuri della Cripta (Loop)' },
  { id: 'combat_drums', label: 'Tamburi da Guerra (Loop)' },
  { id: 'thunder_clap', label: 'Tuono Improvviso' },
  { id: 'creaking_door', label: 'Porta / Cancello Pesante' },
  { id: 'trap_trigger', label: 'Scatto di Trappola' },
  { id: 'sword_clash', label: 'Scontro di Lame' },
  { id: 'dragon_roar', label: 'Ruggito / Urlo del Boss' },
  { id: 'arcane_blast', label: 'Esplosione Arcana' },
  { id: 'healing_chime', label: 'Cura / Luce Celestiale' },
  { id: 'war_horn', label: 'Corno da Guerra' },
];

export const SfxManagerView: React.FC<SfxManagerViewProps> = ({
  sfxCatalog,
  onSaveSfx,
  onDeleteSfx,
}) => {
  const [, setTick] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | SfxCategory>('all');
  const [editingSfx, setEditingSfx] = useState<SfxItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    return soundboardEngine.subscribe(() => setTick((t) => t + 1));
  }, []);

  const filtered = sfxCatalog.filter(
    (s) => selectedCategory === 'all' || s.category === selectedCategory
  );

  const activeIds = soundboardEngine.getActiveTrackIds();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSfx) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingSfx({
          ...editingSfx,
          customAudioUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 p-4 rounded-xl">
        <div>
          <h2 className="font-header text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-amber-500" />
            Libreria SFX & Soundboard Multi-Traccia
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Salva effetti sonori generali o atmosfere in loop e assegnali a singole scene o paragrafi della storia con <code>@sfx[id]</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeIds.length > 0 && (
            <button
              onClick={() => soundboardEngine.stopAll()}
              className="px-3 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-amber-100 text-xs font-bold flex items-center gap-1.5 shadow animate-pulse"
            >
              <VolumeX className="w-4 h-4" /> Ferma Tutti ({activeIds.length} attivi)
            </button>
          )}
          <button
            onClick={() =>
              setEditingSfx({
                id: `sfx-${Date.now()}`,
                name: 'Nuovo Effetto Sonoro',
                category: 'sfx_environment',
                description: 'Descrizione dell’effetto o del momento narrativo.',
                loop: false,
                defaultVolume: 0.8,
                synthPreset: 'thunder_clap',
                customAudioUrl: '',
                iconName: 'Volume2',
                color: '#d97706',
                tags: ['Custom'],
              })
            }
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> + Nuovo SFX / Audio
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5 bg-stone-900 p-1.5 rounded-xl border border-stone-800">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedCategory === 'all'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Tutti ({sfxCatalog.length})
        </button>
        {(Object.keys(CATEGORY_LABELS) as SfxCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === cat
                ? 'bg-amber-600 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Soundboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const playing = soundboardEngine.isPlaying(item.id);
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition ${
                playing
                  ? 'bg-amber-950/40 border-amber-500 shadow-lg ring-1 ring-amber-500/40'
                  : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  {item.loop && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Repeat className="w-3 h-3" /> Loop
                    </span>
                  )}
                </div>

                <h3 className="font-header text-base font-bold text-stone-100 mt-2">{item.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.description}</p>

                {item.customAudioUrl && (
                  <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Radio className="w-3 h-3" /> File Audio Custom Collegato
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => soundboardEngine.toggle(item)}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      playing
                        ? 'bg-amber-500 text-stone-950 shadow'
                        : 'bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-200'
                    }`}
                  >
                    {playing ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" /> Ferma Audio
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Riproduci
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`@sfx[${item.id}]`);
                      setCopiedId(item.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    title="Copia tag @sfx per la storia"
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => setEditingSfx(structuredClone(item))}
                    className="px-2.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                  >
                    Modifica
                  </button>

                  <button
                    onClick={() => onDeleteSfx(item.id)}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[10px] font-mono text-stone-500 flex items-center justify-between">
                  <span>Shortcode storia:</span>
                  <code className="text-amber-400/90">@sfx[{item.id}]</code>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Editor SFX */}
      {editingSfx && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-header text-xl font-bold text-amber-400">
              Configura Effetto Sonoro / Atmosfera
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Nome Effetto</label>
                <input
                  type="text"
                  value={editingSfx.name}
                  onChange={(e) => setEditingSfx({ ...editingSfx, name: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Categoria</label>
                  <select
                    value={editingSfx.category}
                    onChange={(e) =>
                      setEditingSfx({ ...editingSfx, category: e.target.value as SfxCategory })
                    }
                    className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                  >
                    {(Object.keys(CATEGORY_LABELS) as SfxCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Modalità Riproduzione</label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded bg-stone-950 border border-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSfx.loop}
                      onChange={(e) => setEditingSfx({ ...editingSfx, loop: e.target.checked })}
                      className="accent-amber-500"
                    />
                    <span className="text-stone-200 font-semibold">Riproduzione Continua (Loop)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1 font-semibold">Descrizione</label>
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
                    Sintetizzatore Integrato (Fallback / Default)
                  </label>
                  <select
                    value={editingSfx.synthPreset}
                    onChange={(e) =>
                      setEditingSfx({ ...editingSfx, synthPreset: e.target.value as SynthPresetId })
                    }
                    className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-200"
                  >
                    {SYNTH_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">
                    Volume Predefinito ({Math.round(editingSfx.defaultVolume * 100)}%)
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
                  File Audio Personalizzato (.mp3, .wav, .ogg) — Opzionale
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer flex items-center gap-1.5 font-semibold">
                    <Upload className="w-3.5 h-3.5" /> Scegli File Audio da Disco
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
                      Rimuovi file custom
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={editingSfx.customAudioUrl || ''}
                  onChange={(e) => setEditingSfx({ ...editingSfx, customAudioUrl: e.target.value })}
                  placeholder="Oppure incolla URL / percorso locale file audio..."
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
                <Play className="w-3.5 h-3.5" /> Prova Audio
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingSfx(null)}
                  className="px-3 py-1.5 rounded bg-stone-800 text-stone-300 font-semibold"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    onSaveSfx(editingSfx);
                    setEditingSfx(null);
                  }}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                >
                  Salva nella Libreria
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
