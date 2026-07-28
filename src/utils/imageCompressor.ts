/**
 * Image Compression Utility
 * Automatically compresses images before upload:
 * - Max dimension: 800px (maintaining aspect ratio)
 * - Quality: 0.7
 * - Size limit: <= 200KB
 * - Preserves transparency for PNG/WEBP
 */
export function compressImage(
  file: File,
  maxWidth: number = 800,
  initialQuality: number = 0.7
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

      // Return SVG as is
      if (file.type === 'image/svg+xml') {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        if (ratio > 1) ratio = 1;

        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Keep PNG format for PNGs to preserve transparent backgrounds
        const isPngOrWebp = file.type === 'image/png' || file.type === 'image/webp';
        const mimeType = isPngOrWebp ? file.type : 'image/jpeg';

        let currentQuality = initialQuality;
        let dataUrl = canvas.toDataURL(mimeType, currentQuality);

        // Target size: <= 200KB (~270,000 base64 chars)
        const maxCharLength = 270000;

        let attempts = 0;
        while (dataUrl.length > maxCharLength && currentQuality > 0.15 && attempts < 6) {
          currentQuality -= 0.1;
          attempts++;
          dataUrl = canvas.toDataURL(mimeType, currentQuality);
        }

        // Scale down if still over 200KB
        if (dataUrl.length > maxCharLength) {
          let scaleFactor = 0.8;
          while (dataUrl.length > maxCharLength && scaleFactor > 0.2) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.max(1, Math.round(canvas.width * scaleFactor));
            tempCanvas.height = Math.max(1, Math.round(canvas.height * scaleFactor));
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
              dataUrl = tempCanvas.toDataURL(mimeType, 0.6);
            }
            scaleFactor -= 0.2;
          }
        }

        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
