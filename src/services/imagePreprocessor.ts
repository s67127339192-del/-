/**
 * Advanced Client-Side Canvas Image Preprocessor for OCR
 * Supports: Grayscale, Contrast Stretching, Sharpen 3x3 Convolution, and Deskew Correction
 */

export interface PreprocessOptions {
  enableDeskew?: boolean;
  enableGrayscale?: boolean;
  enableContrast?: boolean;
  enableSharpen?: boolean;
  contrastFactor?: number; // 1.0 to 2.5
  maxDimension?: number;
}

export interface PreprocessResult {
  dataUrl: string;
  detectedSkewAngle: number;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  processingTimeMs: number;
}

export async function preprocessImageAdvanced(
  imageSource: string | File,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const startTime = performance.now();
  const {
    enableDeskew = true,
    enableGrayscale = true,
    enableContrast = true,
    enableSharpen = true,
    contrastFactor = 1.4,
    maxDimension = 2200,
  } = options;

  const img = await loadImage(imageSource);
  const origW = img.width;
  const origH = img.height;

  // Scale down if image is overly large for iPad/Safari memory safety while preserving high OCR resolution
  let targetW = origW;
  let targetH = origH;
  if (targetW > maxDimension || targetH > maxDimension) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDimension) / targetW);
      targetW = maxDimension;
    } else {
      targetW = Math.round((targetW * maxDimension) / targetH);
      targetH = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let imageData = ctx.getImageData(0, 0, targetW, targetH);

  // 1. Grayscale & Contrast Stretching
  if (enableGrayscale) {
    imageData = applyGrayscaleAndContrast(imageData, enableContrast, contrastFactor);
    ctx.putImageData(imageData, 0, 0);
  }

  // 2. Deskew detection & rotation
  let detectedAngle = 0;
  if (enableDeskew) {
    detectedAngle = estimateSkewAngle(ctx, targetW, targetH);
    if (Math.abs(detectedAngle) >= 0.5 && Math.abs(detectedAngle) <= 15) {
      rotateCanvas(canvas, ctx, detectedAngle);
      // Re-read image data after rotation
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  }

  // 3. 3x3 Convolution Sharpening
  if (enableSharpen) {
    imageData = applySharpenFilter(imageData);
    ctx.putImageData(imageData, 0, 0);
  }

  const endTime = performance.now();
  const dataUrl = canvas.toDataURL('image/png');

  return {
    dataUrl,
    detectedSkewAngle: Number(detectedAngle.toFixed(2)),
    originalWidth: origW,
    originalHeight: origH,
    processedWidth: canvas.width,
    processedHeight: canvas.height,
    processingTimeMs: Math.round(endTime - startTime),
  };
}

function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for preprocessing: ' + e));

    if (src instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(src);
    } else {
      img.src = src;
    }
  });
}

function applyGrayscaleAndContrast(
  imageData: ImageData,
  enableContrast: boolean,
  contrastFactor: number
): ImageData {
  const d = imageData.data;
  const len = d.length;

  // Find min and max luminance for histogram contrast stretching
  let minL = 255;
  let maxL = 0;

  for (let i = 0; i < len; i += 16) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum < minL) minL = lum;
    if (lum > maxL) maxL = lum;
  }

  const range = maxL - minL || 1;
  const factor = (259 * (contrastFactor * 100 + 255)) / (255 * (259 - contrastFactor * 100));

  for (let i = 0; i < len; i += 4) {
    // Standard perceptual luminance
    let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

    if (enableContrast) {
      // Normalize to full 0..255 range
      gray = ((gray - minL) / range) * 255;
      // Contrast S-curve factor
      gray = factor * (gray - 128) + 128;
    }

    const clamped = gray < 0 ? 0 : gray > 255 ? 255 : gray;
    d[i] = clamped;
    d[i + 1] = clamped;
    d[i + 2] = clamped;
  }

  return imageData;
}

/**
 * 3x3 Convolution Sharpening Kernel:
 *  0  -1   0
 * -1   5  -1
 *  0  -1   0
 */
function applySharpenFilter(imageData: ImageData): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;

  const output = new ImageData(w, h);
  const dst = output.data;

  // Copy alpha & borders
  for (let i = 0; i < src.length; i += 4) {
    dst[i + 3] = src[i + 3];
  }

  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0;
      let k = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          const weight = kernel[k++];
          r += src[idx] * weight;
        }
      }

      const pIdx = (y * w + x) * 4;
      const finalVal = r < 0 ? 0 : r > 255 ? 255 : r;
      dst[pIdx] = finalVal;
      dst[pIdx + 1] = finalVal;
      dst[pIdx + 2] = finalVal;
    }
  }

  return output;
}

/**
 * Estimate skew angle by finding the rotation that maximizes horizontal projection variance
 * Tests candidate angles between -10° and +10° with 0.5° increments
 */
function estimateSkewAngle(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  // Use a downsampled central crop for fast evaluation
  const cropW = Math.min(600, w);
  const cropH = Math.min(800, h);
  const startX = Math.floor((w - cropW) / 2);
  const startY = Math.floor((h - cropH) / 2);

  const sampleData = ctx.getImageData(startX, startY, cropW, cropH);
  const d = sampleData.data;

  // Convert to binary/dark points
  const darkPoints: { x: number; y: number }[] = [];
  const threshold = 140;

  for (let y = 0; y < cropH; y += 4) {
    for (let x = 0; x < cropW; x += 4) {
      const idx = (y * cropW + x) * 4;
      if (d[idx] < threshold) {
        darkPoints.push({ x: x - cropW / 2, y: y - cropH / 2 });
      }
    }
  }

  if (darkPoints.length < 50) return 0;

  let bestAngle = 0;
  let maxVariance = -1;

  // Search angles from -8° to +8° in 0.5° steps
  for (let deg = -8; deg <= 8; deg += 0.5) {
    if (deg === 0) continue;
    const rad = (deg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Project onto vertical axis and count points in horizontal buckets
    const bucketCount = 100;
    const buckets = new Int32Array(bucketCount);

    for (let i = 0; i < darkPoints.length; i++) {
      const pt = darkPoints[i];
      const projY = Math.round(-pt.x * sinA + pt.y * cosA + cropH / 2);
      const bIdx = Math.floor((projY / cropH) * bucketCount);
      if (bIdx >= 0 && bIdx < bucketCount) {
        buckets[bIdx]++;
      }
    }

    // Calculate variance
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < bucketCount; i++) {
      const val = buckets[i];
      sum += val;
      sumSq += val * val;
    }
    const variance = sumSq / bucketCount - (sum / bucketCount) * (sum / bucketCount);

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = deg;
    }
  }

  // Deskew rotation angle is negative of the skew
  return -bestAngle;
}

function rotateCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const w = canvas.width;
  const h = canvas.height;

  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tempCtx = temp.getContext('2d')!;
  tempCtx.drawImage(canvas, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(temp, -w / 2, -h / 2);
  ctx.restore();
}
