import api from '@/lib/api';
import { processImage } from '@/utils/imageUpload';
import { getUploadErrorMessage } from '@/lib/uploadImage';

/** Scan image with Sightengine before showing or saving it. */
export async function moderateImageFile(file: File): Promise<void> {
  const processed = await processImage(file);
  const form = new FormData();
  form.append('image', processed);
  await api.post('/moderation/check-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getModerationErrorMessage(err: unknown): string {
  return getUploadErrorMessage(err);
}
