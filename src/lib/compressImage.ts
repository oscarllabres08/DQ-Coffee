export type CompressImageOptions = {
  maxSide?: number;
  quality?: number;
};

const MENU_MAX_SIDE = 1200;
const MENU_QUALITY = 0.82;

function outputMime(file: File) {
  if (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif') return 'image/webp' as const;
  return 'image/jpeg' as const;
}

function fileNameFor(file: File, mime: string) {
  const base = file.name.replace(/\.[^.]+$/, '').trim() || 'photo';
  const ext = mime === 'image/webp' ? 'webp' : 'jpg';
  return `${base}.${ext}`;
}

export async function compressImageFile(file: File, options: CompressImageOptions = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo file.');
  const maxSide = options.maxSide ?? MENU_MAX_SIDE;
  const quality = options.quality ?? MENU_QUALITY;
  const mime = outputMime(file);

  let source: ImageBitmap | HTMLImageElement;
  let releaseSource: (() => void) | undefined;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      source = bitmap;
      releaseSource = () => bitmap.close();
    } else {
      objectUrl = URL.createObjectURL(file);
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not read the photo.'));
        image.src = objectUrl;
      });
      releaseSource = () => URL.revokeObjectURL(objectUrl);
    }
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error('Could not read the photo.');
  }

  const srcWidth = source.width;
  const srcHeight = source.height;
  const scale = Math.min(1, maxSide / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    releaseSource?.();
    throw new Error('Could not prepare the photo.');
  }
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  releaseSource?.();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, quality));
  if (!blob) throw new Error('Could not compress the photo.');

  const unchanged = scale === 1 && blob.size >= file.size * 0.92 && file.type === mime;
  if (unchanged) return file;

  return new File([blob], fileNameFor(file, mime), { type: mime, lastModified: Date.now() });
}