import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

/**
 * Compresses and converts HEIC images to JPG if needed.
 * @param file The original File object from the input.
 * @returns A Promise resolving to a compressed File object (or Blob).
 */
export const processImage = async (file: File): Promise<File> => {
  let imageToProcess: File | Blob = file;

  // 1. Check if the file is HEIC/HEIF and convert to JPG first
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      });
      
      // heic2any can return an array of blobs if it's an image sequence.
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      imageToProcess = new File([blob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
    } catch (err) {
      console.error('Error converting HEIC image:', err);
      throw new Error('Could not process HEIC image format. Please try a different photo.');
    }
  }

  // 2. Compress the image (works for JPG, PNG, WebP) — skip if already small
  const fileToCompress = imageToProcess instanceof File
    ? imageToProcess
    : new File([imageToProcess], file.name, { type: imageToProcess.type });

  if (!fileName.endsWith('.heic') && !fileName.endsWith('.heif') && fileToCompress.size <= 800 * 1024) {
    return fileToCompress;
  }

  try {
    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(fileToCompress, options);
    return compressedFile;
  } catch (err) {
    console.error('Error compressing image:', err);
    throw new Error('Could not compress the image. Please try a smaller photo.');
  }
};
