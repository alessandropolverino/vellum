import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AssetImageEditorProps {
  imageUrl: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

/** Longest side of the saved image: sharp on a phone, light enough for the database. */
const MAX_OUTPUT_SIDE = 1600;
const BOX_W = 480;
const BOX_H = 340;

type AspectChoice = 'original' | '16:9' | '4:3' | '1:1' | '3:4';

const ASPECT_VALUES: Record<Exclude<AspectChoice, 'original'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
};

/**
 * Pan / zoom / frame editor for asset images, similar to the character portrait one but with a
 * choice of frame shapes (maps and handouts are rarely square).
 */
export const AssetImageEditor: React.FC<AssetImageEditorProps> = ({ imageUrl, onConfirm, onCancel }) => {
  const { tr } = useLanguage();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const [aspectChoice, setAspectChoice] = useState<AspectChoice>('original');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setError(true);
    img.src = imageUrl;
  }, [imageUrl]);

  const aspect = !image
    ? 16 / 9
    : aspectChoice === 'original'
      ? image.naturalWidth / image.naturalHeight
      : ASPECT_VALUES[aspectChoice];
  // Frame that fits the editing box while keeping the chosen shape.
  const vw = aspect >= BOX_W / BOX_H ? BOX_W : Math.round(BOX_H * aspect);
  const vh = aspect >= BOX_W / BOX_H ? Math.round(BOX_W / aspect) : BOX_H;

  const metrics = useCallback(
    (z: number, off: { x: number; y: number }) => {
      if (!image) return { scale: 1, drawX: 0, drawY: 0, dispW: vw, dispH: vh, off: { x: 0, y: 0 } };
      const scale = Math.max(vw / image.naturalWidth, vh / image.naturalHeight) * z;
      const dispW = image.naturalWidth * scale;
      const dispH = image.naturalHeight * scale;
      const maxX = Math.max(0, (dispW - vw) / 2);
      const maxY = Math.max(0, (dispH - vh) / 2);
      const x = Math.max(-maxX, Math.min(maxX, off.x));
      const y = Math.max(-maxY, Math.min(maxY, off.y));
      return { scale, dispW, dispH, drawX: (vw - dispW) / 2 + x, drawY: (vh - dispH) / 2 + y, off: { x, y } };
    },
    [image, vw, vh]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);
    const m = metrics(zoom, offset);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, m.drawX, m.drawY, m.dispW, m.dispH);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (const f of [1 / 3, 2 / 3]) {
      ctx.moveTo(vw * f, 0);
      ctx.lineTo(vw * f, vh);
      ctx.moveTo(0, vh * f);
      ctx.lineTo(vw, vh * f);
    }
    ctx.stroke();
  }, [image, zoom, offset, vw, vh, metrics]);

  const changeZoom = (next: number) => {
    const z = Math.max(1, Math.min(4, next));
    setZoom(z);
    setOffset(metrics(z, offset).off);
  };

  const changeAspect = (choice: AspectChoice) => {
    setAspectChoice(choice);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = () => {
    if (!image) return;
    const m = metrics(zoom, offset);
    // Never upscale beyond the source resolution.
    const k = Math.min(MAX_OUTPUT_SIDE / Math.max(vw, vh), 1 / m.scale);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(vw * k));
    out.height = Math.max(1, Math.round(vh * k));
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, m.drawX * k, m.drawY * k, m.dispW * k, m.dispH * k);
    onConfirm(out.toDataURL('image/jpeg', 0.88));
  };

  const choices: Array<[AspectChoice, string]> = [
    ['original', tr('Original', 'Originale')],
    ['16:9', '16:9'],
    ['4:3', '4:3'],
    ['1:1', '1:1'],
    ['3:4', '3:4'],
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl text-xs text-stone-200">
        <h3 className="font-header text-lg font-bold text-amber-400 flex items-center gap-2">
          <Move className="w-4 h-4" />
          {tr('Frame the image', 'Inquadra l’immagine')}
        </h3>

        {error ? (
          <p className="text-red-300">{tr('Could not load this image.', 'Impossibile caricare questa immagine.')}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {choices.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => changeAspect(id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    aspectChoice === id
                      ? 'bg-amber-600 text-stone-950'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex justify-center bg-stone-950 rounded-lg p-2">
              <canvas
                ref={canvasRef}
                style={{ width: vw, height: vh, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
                className="rounded border border-amber-600/60"
                onPointerDown={(e) => {
                  if (!image) return;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDragging(true);
                  dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
                }}
                onPointerMove={(e) => {
                  if (!dragging) return;
                  const next = {
                    x: dragRef.current.ox + e.clientX - dragRef.current.x,
                    y: dragRef.current.oy + e.clientY - dragRef.current.y,
                  };
                  setOffset(metrics(zoom, next).off);
                }}
                onPointerUp={() => setDragging(false)}
                onWheel={(e) => changeZoom(zoom - e.deltaY * 0.0015)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => changeZoom(zoom - 0.2)} className="p-1.5 rounded bg-stone-800 hover:bg-stone-700">
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => changeZoom(Number(e.target.value))}
                className="flex-1"
              />
              <button onClick={() => changeZoom(zoom + 0.2)} className="p-1.5 rounded bg-stone-800 hover:bg-stone-700">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                title={tr('Reset', 'Reimposta')}
                className="p-1.5 rounded bg-stone-800 hover:bg-stone-700"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-stone-500">
              {tr('Drag to pan, wheel or slider to zoom.', 'Trascina per spostare, rotella o cursore per lo zoom.')}
            </p>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center gap-1">
            <X className="w-4 h-4" />
            {tr('Cancel', 'Annulla')}
          </button>
          <button
            onClick={confirm}
            disabled={!image}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold flex items-center gap-1 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            {tr('Apply', 'Applica')}
          </button>
        </div>
      </div>
    </div>
  );
};
