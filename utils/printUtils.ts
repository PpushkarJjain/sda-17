/**
 * Print-Ready Image Utility
 * Converts images to high-quality JPG with 300 DPI metadata for print.
 */

/**
 * Patches the JFIF APP0 segment in a JPEG binary to set the desired DPI.
 * JFIF spec: bytes 14-15 = X density, bytes 16-17 = Y density, byte 13 = units (1 = DPI).
 */
function setJpegDpi(jpegArrayBuffer: ArrayBuffer, dpi: number): ArrayBuffer {
  const data = new Uint8Array(jpegArrayBuffer);

  // Find JFIF APP0 marker: FF E0
  for (let i = 0; i < data.length - 20; i++) {
    if (data[i] === 0xff && data[i + 1] === 0xe0) {
      // Verify JFIF identifier: "JFIF\0" at offset +4
      if (
        data[i + 4] === 0x4a && // J
        data[i + 5] === 0x46 && // F
        data[i + 6] === 0x49 && // I
        data[i + 7] === 0x46 && // F
        data[i + 8] === 0x00    // \0
      ) {
        // Set density units to 1 (dots per inch)
        data[i + 11] = 0x01;
        // Set X density (big-endian 16-bit)
        data[i + 12] = (dpi >> 8) & 0xff;
        data[i + 13] = dpi & 0xff;
        // Set Y density (big-endian 16-bit)
        data[i + 14] = (dpi >> 8) & 0xff;
        data[i + 15] = dpi & 0xff;
        break;
      }
    }
  }

  return data.buffer;
}

/**
 * Downloads the given image as a print-ready JPG at 300 DPI, max quality.
 * Works entirely client-side using Canvas API.
 *
 * @param imageSrc - The image source (data URI or URL)
 * @param filename - Desired download filename (should end in .jpg)
 * @param dpi - Target DPI (default: 300)
 */
export async function downloadPrintReadyJPG(
  imageSrc: string,
  filename: string,
  dpi: number = 300
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        // Create off-screen canvas at full resolution
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw at full resolution
        ctx.drawImage(img, 0, 0);

        // Export as max-quality JPEG
        const jpegBlob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob(
            (blob) => (blob ? res(blob) : rej(new Error('Canvas toBlob failed'))),
            'image/jpeg',
            1.0 // Maximum quality
          );
        });

        // Read blob as ArrayBuffer to patch DPI
        const arrayBuffer = await jpegBlob.arrayBuffer();
        const patchedBuffer = setJpegDpi(arrayBuffer, dpi);

        // Create download link
        const patchedBlob = new Blob([patchedBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(patchedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        resolve();
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for print conversion'));
    img.src = imageSrc;
  });
}
