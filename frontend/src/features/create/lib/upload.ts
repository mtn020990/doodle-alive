import type { DrawingFields, UploadImage } from '@/shared/api';
import { prepareForUpload } from '@/shared/lib/image';
import type { PickedImage } from '../types';

async function shrink(image: UploadImage): Promise<UploadImage> {
  const blob = await prepareForUpload(image.blob);
  return blob === image.blob ? image : { blob, fileName: 'drawing.jpg' };
}

/** The request fields for the picked drawing(s), with big phone photos shrunk for upload. */
export async function drawingFields(
  image: PickedImage,
  second: PickedImage | null,
  paint: boolean,
): Promise<DrawingFields> {
  const [main, extra] = await Promise.all([shrink(image), second ? shrink(second) : null]);
  return { image: main, image2: extra, paint };
}
