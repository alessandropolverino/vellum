import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Crop,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  characterName?: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const VIEWPORT_SIZE = 360; // Logical pixels for crop viewport (1:1 square)
const OUTPUT_SIZE = 512; // Exported square resolution in px for crispness in PDF & UI

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageUrl,
  characterName,
  onConfirm,
  onCancel,
}) => {
  const { tr } = useLanguage();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statblockPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const tokenPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Load image whenever imageUrl changes or modal opens
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setLoading(true);
    setLoadError(null);
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImage(img);
      setLoading(false);
    };

    img.onerror = () => {
      // If anonymous CORS failed on external URL, try fallback without CORS
      if (img.crossOrigin) {
        const retryImg = new Image();
        retryImg.onload = () => {
          setImage(retryImg);
          setLoading(false);
        };
        retryImg.onerror = () => {
          setLoadError(
            tr(
              'Failed to load image. If this is an external URL, CORS may be blocked.',
              'Impossibile caricare l\'immagine. Se è un URL esterno, potrebbe essere bloccato da CORS.'
            )
          );
          setLoading(false);
        };
        retryImg.src = imageUrl;
      } else {
        setLoadError(
          tr(
            'Failed to load image for framing.',
            'Impossibile caricare l\'immagine per l\'inquadratura.'
          )
        );
        setLoading(false);
      }
    };

    img.src = imageUrl;
  }, [isOpen, imageUrl, tr]);

  // Compute scale and bounds
  const getRenderMetrics = useCallback(
    (targetSize: number, currentZoom: number, currentOffset: { x: number; y: number }) => {
      if (!image) {
        return {
          scale: 1,
          dispW: targetSize,
          dispH: targetSize,
          drawX: 0,
          drawY: 0,
          clampedOffset: { x: 0, y: 0 },
        };
      }

      // Base scale: image covers the target size in both dimensions
      const baseScale = Math.max(targetSize / image.naturalWidth, targetSize / image.naturalHeight);
      const scale = baseScale * currentZoom;
      const dispW = image.naturalWidth * scale;
      const dispH = image.naturalHeight * scale;

      // Max allowable pan offset so image completely covers targetSize
      const maxOffsetX = Math.max(0, (dispW - targetSize) / 2);
      const maxOffsetY = Math.max(0, (dispH - targetSize) / 2);

      const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, currentOffset.x));
      const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, currentOffset.y));

      const drawX = (targetSize - dispW) / 2 + clampedX;
      const drawY = (targetSize - dispH) / 2 + clampedY;

      return {
        scale,
        dispW,
        dispH,
        drawX,
        drawY,
        clampedOffset: { x: clampedX, y: clampedY },
      };
    },
    [image]
  );

  // Redraw canvases
  const drawCanvases = useCallback(() => {
    if (!image) return;

    // 1. Main Interactive Canvas
    const mainCanvas = canvasRef.current;
    if (mainCanvas) {
      const ctx = mainCanvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const size = VIEWPORT_SIZE;
        mainCanvas.width = size * dpr;
        mainCanvas.height = size * dpr;
        ctx.resetTransform?.();
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, size, size);

        const { dispW, dispH, drawX, drawY } = getRenderMetrics(size, zoom, offset);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, drawX, drawY, dispW, dispH);

        // Draw Rule of Thirds guidelines
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        // Vertical lines
        ctx.moveTo(size / 3, 0);
        ctx.lineTo(size / 3, size);
        ctx.moveTo((size * 2) / 3, 0);
        ctx.lineTo((size * 2) / 3, size);
        // Horizontal lines
        ctx.moveTo(0, size / 3);
        ctx.lineTo(size, size / 3);
        ctx.moveTo(0, (size * 2) / 3);
        ctx.lineTo(size, (size * 2) / 3);
        ctx.stroke();

        ctx.setLineDash([]);

        // Subtle circular boundary guide to show circular token crop
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle outer border
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
      }
    }

    // 2. Statblock Square Preview (80x80)
    const statCanvas = statblockPreviewRef.current;
    if (statCanvas) {
      const sCtx = statCanvas.getContext('2d');
      if (sCtx) {
        const sSize = 80;
        const dpr = window.devicePixelRatio || 1;
        statCanvas.width = sSize * dpr;
        statCanvas.height = sSize * dpr;
        sCtx.resetTransform?.();
        sCtx.scale(dpr, dpr);

        sCtx.clearRect(0, 0, sSize, sSize);

        const ratio = sSize / VIEWPORT_SIZE;
        const metrics = getRenderMetrics(VIEWPORT_SIZE, zoom, offset);

        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(
          image,
          metrics.drawX * ratio,
          metrics.drawY * ratio,
          metrics.dispW * ratio,
          metrics.dispH * ratio
        );
      }
    }

    // 3. Token Circular Preview (64x64)
    const tokenCanvas = tokenPreviewRef.current;
    if (tokenCanvas) {
      const tCtx = tokenCanvas.getContext('2d');
      if (tCtx) {
        const tSize = 64;
        const dpr = window.devicePixelRatio || 1;
        tokenCanvas.width = tSize * dpr;
        tokenCanvas.height = tSize * dpr;
        tCtx.resetTransform?.();
        tCtx.scale(dpr, dpr);

        tCtx.clearRect(0, 0, tSize, tSize);

        // Clip circle
        tCtx.save();
        tCtx.beginPath();
        tCtx.arc(tSize / 2, tSize / 2, tSize / 2, 0, Math.PI * 2);
        tCtx.clip();

        const ratio = tSize / VIEWPORT_SIZE;
        const metrics = getRenderMetrics(VIEWPORT_SIZE, zoom, offset);

        tCtx.imageSmoothingEnabled = true;
        tCtx.imageSmoothingQuality = 'high';
        tCtx.drawImage(
          image,
          metrics.drawX * ratio,
          metrics.drawY * ratio,
          metrics.dispW * ratio,
          metrics.dispH * ratio
        );
        tCtx.restore();
      }
    }
  }, [image, zoom, offset, getRenderMetrics]);

  useEffect(() => {
    drawCanvases();
  }, [drawCanvases]);

  // Pointer drag handling for pan
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: offset.x,
      startY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;

    const newX = dragStartRef.current.startX + deltaX;
    const newY = dragStartRef.current.startY + deltaY;

    const { clampedOffset } = getRenderMetrics(VIEWPORT_SIZE, zoom, { x: newX, y: newY });
    setOffset(clampedOffset);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
      setIsDragging(false);
    }
  };

  // Wheel zoom handling
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!image) return;
    const delta = -e.deltaY * 0.0015;
    const nextZoom = Math.max(1.0, Math.min(3.5, zoom + delta));
    setZoom(nextZoom);
    // Re-clamp offset with new zoom
    const { clampedOffset } = getRenderMetrics(VIEWPORT_SIZE, nextZoom, offset);
    setOffset(clampedOffset);
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.max(1.0, Math.min(3.5, nextZoom));
    setZoom(clampedZoom);
    const { clampedOffset } = getRenderMetrics(VIEWPORT_SIZE, clampedZoom, offset);
    setOffset(clampedOffset);
  };

  const handleReset = () => {
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped square image
  const handleConfirm = () => {
    if (!image) return;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = OUTPUT_SIZE;
      offscreen.height = OUTPUT_SIZE;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      const metrics = getRenderMetrics(VIEWPORT_SIZE, zoom, offset);

      ctx.drawImage(
        image,
        metrics.drawX * ratio,
        metrics.drawY * ratio,
        metrics.dispW * ratio,
        metrics.dispH * ratio
      );

      const croppedDataUrl = offscreen.toDataURL('image/png');
      onConfirm(croppedDataUrl);
    } catch (err) {
      console.error('Failed to export cropped image:', err);
      // Fallback: if canvas is tainted by external URL without CORS, use imageUrl directly
      onConfirm(imageUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-header text-lg font-bold text-amber-300">
                {tr('Adjust Character Portrait Framing', 'Regola Inquadratura Ritratto Personaggio')}
              </h3>
              <p className="text-xs text-stone-400">
                {characterName
                  ? `${characterName} • ${tr('Crop & Focus', 'Ritaglia e Centra')}`
                  : tr(
                      'Choose the exact visible portion for cards, statblocks, and tokens',
                      'Scegli la parte esatta da mostrare in schede, statblock e token'
                    )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">{tr('Loading image...', 'Caricamento immagine...')}</span>
          </div>
        ) : loadError ? (
          <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700"
            >
              {tr('Close', 'Chiudi')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Interactive Row */}
            <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
              {/* Interactive Viewport Canvas */}
              <div className="relative group">
                <div
                  className="rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-xl bg-stone-950 cursor-grab active:cursor-grabbing"
                  style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                    className="w-full h-full block touch-none"
                  />
                </div>

                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[11px] font-sans font-medium text-amber-200/90 flex items-center gap-1.5 pointer-events-none">
                  <Move className="w-3.5 h-3.5" />
                  <span>{tr('Drag to move', 'Trascina per spostare')}</span>
                </div>
              </div>

              {/* Side Live Previews */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-5 p-4 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tr('Statblock', 'Statblock')}</span>
                  </div>
                  {/* Statblock preview card style */}
                  <div className="w-20 h-20 rounded-lg border-2 border-[#58180D] shadow-md bg-[#efe0bb] overflow-hidden p-0.5 mx-auto">
                    <canvas
                      ref={statblockPreviewRef}
                      className="w-full h-full rounded-md object-cover block"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    {tr('Header Top-Right', 'In alto a destra')}
                  </span>
                </div>

                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tr('Token / Avatar', 'Token / Avatar')}</span>
                  </div>
                  {/* Token circle style */}
                  <div className="w-16 h-16 rounded-full border-2 border-amber-500 shadow-md bg-stone-900 overflow-hidden mx-auto">
                    <canvas
                      ref={tokenPreviewRef}
                      className="w-full h-full rounded-full object-cover block"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    {tr('Combat & Party', 'Combattimento & Party')}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Bar: Zoom Slider + Reset Button */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.2)}
                  title={tr('Zoom Out', 'Riduci Zoom')}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="1.0"
                  max="3.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.2)}
                  title={tr('Zoom In', 'Aumenta Zoom')}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-stone-400 font-mono w-12 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{tr('Reset Framing', 'Reimposta')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition"
          >
            {tr('Cancel', 'Annulla')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || Boolean(loadError)}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Check className="w-4 h-4" />
            <span>{tr('Apply Framing', 'Applica Inquadratura')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
