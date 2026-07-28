/**
 * Image Utility
 * Reads image file and returns raw Data URL without compression/loss to preserve original clarity.
 */
export function compressImage(
  file: File,
  _maxWidth: number = 800,
  _initialQuality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid image file'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Failed to read file'));
        return;
      }
      resolve(src);
    };
    reader.readAsDataURL(file);
  });
}
