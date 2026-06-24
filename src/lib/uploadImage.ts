import api from '@/lib/api';
import { processImage } from '@/utils/imageUpload';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please select an image file (JPEG, PNG, GIF, or WebP).';
  }
  if (file.size > MAX_BYTES) {
    return 'Image is too large. Please use a file under 10MB.';
  }
  return null;
}

export function getUploadErrorMessage(err: unknown): string {
  const ax = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
  if (ax.response?.status === 413) {
    return 'Image is too large. Maximum size is 10MB.';
  }
  return ax.response?.data?.message || ax.message || 'Upload failed';
}

/** Compress once and upload — moderation runs on the server at /upload. */
export async function uploadImageFile(file: File): Promise<string> {
  const processed = await processImage(file);
  const formData = new FormData();
  formData.append('image', processed);
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.imageUrl;
}
