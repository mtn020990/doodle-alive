const MAX_UPLOAD_EDGE = 2048;

type Decoded = ImageBitmap | HTMLImageElement;

async function decode(blob: Blob): Promise<Decoded> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      // fall through (e.g. HEIC on some browsers)
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes the image, runs `work`, then frees the decoded pixels (a 12 MP photo is ~48 MB). */
async function withDecoded<T>(blob: Blob, work: (image: Decoded) => T | Promise<T>): Promise<T> {
  const image = await decode(blob);
  try {
    return await work(image);
  } finally {
    if ('close' in image) image.close();
  }
}

function drawScaled(source: Decoded, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
      type,
      quality,
    ),
  );
}

/**
 * Shrinks big phone photos before upload so they travel fast over Wi-Fi.
 * Small images are returned untouched.
 */
export async function prepareForUpload(file: Blob): Promise<Blob> {
  try {
    return await withDecoded(file, (image) =>
      Math.max(image.width, image.height) <= MAX_UPLOAD_EDGE && file.size < 4_000_000
        ? file
        : canvasToBlob(drawScaled(image, MAX_UPLOAD_EDGE), 'image/jpeg', 0.9),
    );
  } catch {
    return file; // let the server decide
  }
}

/** A small JPEG data URL used for the library and the before/after view. */
export async function makeThumbnail(file: Blob, maxEdge = 480): Promise<string | null> {
  try {
    return await withDecoded(file, (image) =>
      drawScaled(image, maxEdge).toDataURL('image/jpeg', 0.8),
    );
  } catch {
    return null;
  }
}
