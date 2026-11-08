import React, { useState } from 'react';
import { Asset } from '../types/dnd';
import { AssetImageEditor } from './AssetImageEditor';
import { useLanguage } from '../i18n/LanguageContext';
import { useConfirmDelete } from './ConfirmDialog';
import { LabelChips, LabelEditor, LabelFilter, LabelOption } from './Labels';
import { addLabelFilter, hasAllLabels } from '../services/labels';
import { Plus, Upload, Trash2, Copy, Check, Crop, Image as ImageIcon } from 'lucide-react';

interface AssetsViewProps {
  assets: Asset[];
  labelOptions: LabelOption[];
  onSaveAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Library of images with captions: tag them in scene text as @asset[id] and show them to players. */
export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  labelOptions,
  onSaveAsset,
  onDeleteAsset,
}) => {
  const { tr } = useLanguage();
  const confirmDelete = useConfirmDelete();
  const [editing, setEditing] = useState<Asset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState(false);
  // Image waiting to be framed in the editor (a fresh upload or the current image).
  const [framing, setFraming] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = assets.filter(
    (a) =>
      hasAllLabels(a.tags, labelFilter) &&
      (!q ||
        a.name.toLowerCase().includes(q) ||
        a.caption.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)))
  );

  const newAsset = (): Asset => ({
    id: `asset-${Date.now()}`,
    name: tr('New asset', 'Nuovo asset'),
    caption: '',
    imageUrl: '',
    tags: [],
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setUploadError(false);
    try {
      setFraming(await readAsDataUrl(file));
    } catch {
      setUploadError(true);
    }
  };

  /** Tags use the asset name, so it must be unique and free of the closing bracket. */
  const validateName = (asset: Asset): string | null => {
    const name = asset.name.trim();
    if (!name) return tr('Name is required.', 'Il nome è obbligatorio.');
    if (name.includes(']') || name.includes('[')) {
      return tr('The name cannot contain [ or ].', 'Il nome non può contenere [ o ].');
    }
    if (assets.some((a) => a.id !== asset.id && a.name.trim().toLowerCase() === name.toLowerCase())) {
      return tr('Another asset already has this name.', 'Esiste già un asset con questo nome.');
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-header text-xl font-bold text-stone-200">
            {tr('Assets', 'Asset')}
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('Search assets…', 'Cerca asset…')}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs"
          />
          <LabelFilter options={labelOptions} selected={labelFilter} onChange={setLabelFilter} />
        </div>
        <button
          onClick={() => {
            setUploadError(false);
            setNameError(null);
            setEditing(newAsset());
          }}
          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> {tr('New asset', 'Nuovo asset')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-500 py-6 text-center">
          {assets.length === 0
            ? tr(
                'No assets yet. Add an image with a caption to tag it in your story and show it to players.',
                'Ancora nessun asset. Aggiungi un’immagine con didascalia per taggarla nella storia e mostrarla ai giocatori.'
              )
            : tr('No assets match your search.', 'Nessun asset corrisponde alla ricerca.')}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <li
              key={asset.id}
              className="group rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden flex flex-col"
            >
              <div className="aspect-video bg-stone-950 flex items-center justify-center">
                {asset.imageUrl ? (
                  <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-stone-700" />
                )}
              </div>
              <div className="p-3 space-y-1 flex-1">
                <div className="text-sm font-semibold text-stone-100 truncate">{asset.name}</div>
                {asset.caption && (
                  <div className="text-xs text-stone-400 line-clamp-2">{asset.caption}</div>
                )}
                {asset.tags.length > 0 && (
                  <div className="pt-1">
                    <LabelChips
                      labels={asset.tags}
                      onPick={(l) => setLabelFilter((f) => addLabelFilter(f, l))}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-0.5 px-2 pb-2 opacity-70 group-hover:opacity-100 transition">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`@asset[${asset.name}]`);
                    setCopiedId(asset.id);
                    setTimeout(() => setCopiedId(null), 1500);
                  }}
                  title={tr(
                    `Copy story tag @asset[${asset.name}]`,
                    `Copia tag per la storia @asset[${asset.name}]`
                  )}
                  className="p-1.5 rounded-md hover:bg-stone-800 text-stone-400"
                >
                  {copiedId === asset.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setUploadError(false);
                    setNameError(null);
                    setEditing(structuredClone(asset));
                  }}
                  className="px-2 py-1 rounded-md hover:bg-stone-800 text-stone-300 text-xs"
                >
                  {tr('Edit', 'Modifica')}
                </button>
                <button
                  onClick={async () => {
                    if (await confirmDelete(tr(`the asset “${asset.name}”`, `l’asset “${asset.name}”`))) {
                      onDeleteAsset(asset.id);
                    }
                  }}
                  title={tr('Delete', 'Elimina')}
                  className="p-1.5 rounded-md hover:bg-stone-800 text-stone-500 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {framing && (
        <AssetImageEditor
          imageUrl={framing}
          onCancel={() => setFraming(null)}
          onConfirm={(url) => {
            setEditing((cur) => (cur ? { ...cur, imageUrl: url } : cur));
            setFraming(null);
          }}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-header text-xl font-bold text-amber-400">
              {tr('Configure asset', 'Configura asset')}
            </h3>

            <div className="aspect-video rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden">
              {editing.imageUrl ? (
                <img src={editing.imageUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-10 h-10 text-stone-700" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex-1 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4" />
                {editing.imageUrl
                  ? tr('Replace image', 'Sostituisci immagine')
                  : tr('Choose image (optional)', 'Scegli immagine (facoltativa)')}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
              {editing.imageUrl && (
                <>
                  <button
                    onClick={() => setFraming(editing.imageUrl)}
                    className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1.5"
                  >
                    <Crop className="w-4 h-4" />
                    {tr('Adjust framing', 'Modifica inquadratura')}
                  </button>
                  <button
                    onClick={() => setEditing({ ...editing, imageUrl: '' })}
                    className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-red-900/60 text-stone-300 font-semibold"
                  >
                    {tr('Remove image', 'Rimuovi immagine')}
                  </button>
                </>
              )}
            </div>
            {uploadError && (
              <p className="text-red-300">
                {tr('Could not read that image.', 'Impossibile leggere questa immagine.')}
              </p>
            )}

            <div>
              <label className="block text-stone-400 mb-1 font-semibold">{tr('Name', 'Nome')}</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => {
                  setNameError(null);
                  setEditing({ ...editing, name: e.target.value });
                }}
                className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-bold"
              />
              <p className="text-stone-500 mt-1">
                {tr('Tag in text:', 'Tag nel testo:')} <code>@asset[{editing.name.trim() || '…'}]</code>
              </p>
              {nameError && <p className="text-red-300 mt-1">{nameError}</p>}
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                {tr('Caption (shown with the image)', 'Didascalia (mostrata con l’immagine)')}
              </label>
              <textarea
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-semibold">
                {tr('Labels', 'Etichette')}
              </label>
              <LabelEditor
                value={editing.tags}
                suggestions={labelOptions}
                onChange={(tags) => setEditing({ ...editing, tags })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                {tr('Cancel', 'Annulla')}
              </button>
              <button
                disabled={!editing.name.trim()}
                onClick={() => {
                  const problem = validateName(editing);
                  if (problem) {
                    setNameError(problem);
                    return;
                  }
                  onSaveAsset({ ...editing, name: editing.name.trim() });
                  setEditing(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold disabled:opacity-40"
              >
                {tr('Save', 'Salva')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
