/**
 * Phones show characters as small icons, so portraits are downscaled to a square thumbnail
 * before they are handed to the live server. This keeps transfers tiny and means the original
 * (possibly huge) uploaded image never leaves the DM's machine.
 */
export async function shrinkPortrait(dataUrl: string, size: number): Promise<string | null> {
  if (!dataUrl.startsWith('data:image/')) return null;
  const img = new Image();
  img.decoding = 'async';
  const loaded = new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = dataUrl;
  if (!(await loaded) || !img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // Center-crop to a square so icons are never stretched.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/** Cheap change detector for cache-busting the portrait URL (not a security hash). */
export function portraitVersion(dataUrl: string): string {
  let h = 5381;
  const step = Math.max(1, Math.floor(dataUrl.length / 512));
  for (let i = 0; i < dataUrl.length; i += step) h = ((h << 5) + h + dataUrl.charCodeAt(i)) | 0;
  return `${dataUrl.length.toString(36)}${(h >>> 0).toString(36)}`;
}

/**
 * Downscales an image (keeping its aspect ratio) so its longest side is at most `maxSide`.
 * Used for assets shown on phones: the original never leaves the DM's machine.
 */
export async function shrinkImage(dataUrl: string, maxSide: number): Promise<string | null> {
  if (!dataUrl.startsWith('data:image/')) return null;
  const img = new Image();
  img.decoding = 'async';
  const loaded = new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = dataUrl;
  if (!(await loaded) || !img.naturalWidth || !img.naturalHeight) return null;

  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
