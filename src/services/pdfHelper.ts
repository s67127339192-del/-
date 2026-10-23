import * as pdfjsLib from 'pdfjs-dist';

// Use standard unpkg/cdnjs worker fallback for Vite client-side bundle
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

export interface PdfPageRenderResult {
  dataUrl: string;
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
}

/**
 * Checks if a file or URL is a PDF document
 */
export function isPdfSource(fileOrUrl: File | string, fileName?: string): boolean {
  if (fileOrUrl instanceof File) {
    return fileOrUrl.type === 'application/pdf' || fileOrUrl.name.toLowerCase().endsWith('.pdf');
  }
  if (typeof fileOrUrl === 'string') {
    if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
    return (
      fileOrUrl.toLowerCase().endsWith('.pdf') ||
      fileOrUrl.startsWith('data:application/pdf') ||
      fileOrUrl.includes('application/pdf')
    );
  }
  return false;
}

/**
 * Converts a PDF page into high-resolution image for OCR
 */
export async function renderPdfToImage(
  fileOrData: File | ArrayBuffer | string,
  pageNumber = 1,
  scale = 2.0
): Promise<PdfPageRenderResult> {
  const pages = await renderAllPdfPagesToImages(fileOrData, 1, scale, pageNumber);
  return pages[0];
}

/**
 * Renders multiple or all pages of a PDF into high-res images for comprehensive OCR
 * Safe page limit of 8 pages to prevent iPad Safari memory exhaustion
 */
export async function renderAllPdfPagesToImages(
  fileOrData: File | ArrayBuffer | string,
  maxPages = 8,
  scale = 2.0,
  startPage = 1
): Promise<PdfPageRenderResult[]> {
  let data: ArrayBuffer | Uint8Array;

  if (fileOrData instanceof File) {
    data = await fileOrData.arrayBuffer();
  } else if (typeof fileOrData === 'string' && fileOrData.startsWith('data:application/pdf')) {
    const base64 = fileOrData.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    data = bytes.buffer;
  } else if (fileOrData instanceof ArrayBuffer) {
    data = fileOrData;
  } else {
    // If it's a URL or Blob URL
    const response = await fetch(fileOrData as string);
    data = await response.arrayBuffer();
  }

  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const results: PdfPageRenderResult[] = [];
  const endPage = Math.min(totalPages, startPage + maxPages - 1);

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    const dataUrl = canvas.toDataURL('image/png');

    results.push({
      dataUrl,
      pageNumber: pageNum,
      totalPages,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}
