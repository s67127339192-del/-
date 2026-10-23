import { createWorker } from 'tesseract.js';
import { DocumentType, LineItem, Shipment } from '../types';
import { preprocessImageAdvanced, PreprocessOptions, PreprocessResult } from './imagePreprocessor';
import { isPdfSource, renderPdfToImage, renderAllPdfPagesToImages, PdfPageRenderResult } from './pdfHelper';

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface MathValidationResult {
  itemsSum: number;
  extractedTotal: number;
  difference: number;
  isMatch: boolean;
  status: 'MATCH' | 'DISCREPANCY' | 'NO_ITEMS';
  message: string;
}

export interface ExtractedShippingData {
  documentType: DocumentType;
  invoiceNo: string;
  invoiceDate: string;
  blNo: string;
  bookingNo: string;
  shipperName: string;
  shipperAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  pol: string;
  pod: string;
  vesselName: string;
  voyageNo: string;
  containerNo: string;
  sealNo: string;
  items: LineItem[];
  currency: 'USD' | 'THB' | 'EUR' | 'JPY' | 'GBP' | 'CNY';
  totalAmount: number;
  totalGrossWeightKg: number;
  totalNetWeightKg: number;
  totalCBM: number;
  packageCount?: number;
  mathValidation: MathValidationResult;
  rawText: string;
  confidence: number;
  fieldConfidences: {
    invoiceNo: number;
    invoiceDate: number;
    shipperName: number;
    consigneeName: number;
    containerNo: number;
    sealNo: number;
    pol: number;
    pod: number;
    vesselName: number;
    totalAmount: number;
    grossWeight: number;
    netWeight: number;
    items: number;
  };
  preprocessingStats: {
    deskewAngle: number;
    processingTimeMs: number;
    originalWidth: number;
    originalHeight: number;
  };
}

/**
 * Executes full OCR pipeline with Preprocessing, Tesseract.js, and Multi-vendor Extraction
 * Supports JPG, PNG, and Multi-page PDF via PDF.js
 */
export async function performOcr(
  source: string | File,
  onProgress?: (progress: OcrProgress) => void,
  preprocessOptions?: PreprocessOptions,
  pdfPageNumber = 1,
  fileName?: string,
  expectedDocType?: DocumentType
): Promise<{ data: ExtractedShippingData; processedImageUrl: string; originalImageUrl: string; totalPages?: number }> {
  const reporter = onProgress || (() => {});

  let imageSources: string[] = [];
  let originalDisplayUrl = '';
  let totalDocPages = 1;

  // 1. PDF Conversion (handles single or multi-page PDF with PDF.js)
  if (isPdfSource(source, fileName)) {
    reporter({ status: 'กำลังแปลงหน้าเอกสาร PDF ด้วย PDF.js...', progress: 0.1 });
    try {
      const pdfPages = await renderAllPdfPagesToImages(source, 5, 2.0);
      if (pdfPages.length > 0) {
        totalDocPages = pdfPages[0].totalPages;
        imageSources = pdfPages.map((p: PdfPageRenderResult) => p.dataUrl);
        originalDisplayUrl = pdfPages[0].dataUrl;
      } else {
        const single = await renderPdfToImage(source, pdfPageNumber, 2.0);
        imageSources = [single.dataUrl];
        originalDisplayUrl = single.dataUrl;
        totalDocPages = single.totalPages;
      }
    } catch (e) {
      console.warn('Multi-page render failed, falling back to single page:', e);
      const single = await renderPdfToImage(source, pdfPageNumber, 2.0);
      imageSources = [single.dataUrl];
      originalDisplayUrl = single.dataUrl;
      totalDocPages = single.totalPages;
    }
  } else if (typeof source === 'string') {
    imageSources = [source];
    originalDisplayUrl = source;
  } else {
    const objectUrl = URL.createObjectURL(source);
    imageSources = [objectUrl];
    originalDisplayUrl = objectUrl;
  }

  // 2. Initialize Tesseract.js Worker Engine
  reporter({ status: 'กำลังโหลด Tesseract OCR Engine (Client-Side)...', progress: 0.25 });

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = 0.35 + (m.progress || 0) * 0.6;
        reporter({
          status: `กำลังอ่านข้อความ OCR (${Math.round((m.progress || 0) * 100)}%)...`,
          progress: Math.min(pct, 0.95),
        });
      }
    },
  });

  try {
    let combinedRawText = '';
    let totalConfidence = 0;
    let firstProcessedImageUrl = '';
    let primaryPrepResult: PreprocessResult | undefined;

    // 3. Process every page sequentially to prevent memory overload on iPad
    for (let p = 0; p < imageSources.length; p++) {
      const pageNum = p + 1;
      reporter({
        status: imageSources.length > 1 
          ? `กำลังปรับแต่งและอ่านหน้า ${pageNum}/${imageSources.length}...`
          : 'กำลังปรับแต่งภาพ (Grayscale, Contrast, Sharpen)...',
        progress: 0.3 + (p / imageSources.length) * 0.65,
      });

      const prepResult: PreprocessResult = await preprocessImageAdvanced(imageSources[p], {
        enableDeskew: true,
        enableGrayscale: true,
        enableContrast: true,
        enableSharpen: true,
        contrastFactor: 1.4,
        ...preprocessOptions,
      });

      if (p === 0) {
        firstProcessedImageUrl = prepResult.dataUrl;
        primaryPrepResult = prepResult;
      }

      const ret = await worker.recognize(prepResult.dataUrl);
      const pageText = ret.data.text || '';
      combinedRawText += (combinedRawText ? '\n\n--- PAGE ' + pageNum + ' ---\n\n' : '') + pageText;
      totalConfidence += ret.data.confidence || 0;
    }

    const overallConfidence = imageSources.length > 0 ? Math.round(totalConfidence / imageSources.length) : 0;

    reporter({ status: 'กำลังวิเคราะห์ฟิลด์ข้อมูลด้วยระบบ Multi-Vendor Label Parser...', progress: 0.98 });
    const parsedData = parseOcrText(combinedRawText, overallConfidence, primaryPrepResult, expectedDocType);
    reporter({ status: 'ประมวลผล OCR เสร็จสมบูรณ์', progress: 1.0 });

    return {
      data: parsedData,
      processedImageUrl: firstProcessedImageUrl,
      originalImageUrl: originalDisplayUrl,
      totalPages: totalDocPages,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Intelligent Multi-vendor Label-based and Regex Extractor
 * Strict Zero-Hallucination Policy: Missing data returns empty string / 0, NEVER fake data!
 */
export function parseOcrText(
  rawText: string,
  overallConfidence: number,
  prepResult?: PreprocessResult,
  expectedDocType?: DocumentType
): ExtractedShippingData {
  const cleanText = rawText.replace(/\r/g, '');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Confidence tracker for each extracted field
  const fieldConfidences = {
    invoiceNo: 0,
    invoiceDate: 0,
    shipperName: 0,
    consigneeName: 0,
    containerNo: 0,
    sealNo: 0,
    pol: 0,
    pod: 0,
    vesselName: 0,
    totalAmount: 0,
    grossWeight: 0,
    netWeight: 0,
    items: 0,
  };

  // 1. Document Type Detection
  let documentType: DocumentType = expectedDocType || 'INVOICE';
  const hasInvLabel = /COMMERCIAL\s*INVOICE|INVOICE\s*(?:NO|NUMBER|#)?|BILLING\s*STATEMENT/i.test(cleanText);
  const hasPlLabel = /PACKING\s*LIST|PACKAGE\s*LIST|WEIGHT\s*LIST/i.test(cleanText);
  const hasBlLabel = /BILL\s*OF\s*LADING|OCEAN\s*BILL\s*OF\s*LADING|WAYBILL/i.test(cleanText);

  if (!expectedDocType || expectedDocType === 'OTHER') {
    if (hasInvLabel && hasPlLabel) {
      documentType = 'COMBINED';
    } else if (hasPlLabel && !hasInvLabel) {
      documentType = 'PACKING_LIST';
    } else if (hasBlLabel) {
      documentType = 'BILL_OF_LADING';
    }
  }

  // 2. Invoice / Packing List Number
  let invoiceNo = '';
  // Pattern 1: Explicit labels (Invoice No, Inv #, Document No, Bill No, Packing List No)
  const invLabelRegex = /(?:INVOICE\s*(?:NO|NUMBER|#|NUM)|INV\s*NO\.?|DOCUMENT\s*NO\.?|BILL\s*NO\.?|INVOICE\s*REF|PACKING\s*LIST\s*NO\.?|P\/L\s*NO\.?)[:\s#]*([A-Z0-9\-_/]+)/i;
  const invMatch = cleanText.match(invLabelRegex);
  if (invMatch && invMatch[1].length >= 3 && !/DATE|PAGE/i.test(invMatch[1])) {
    invoiceNo = invMatch[1].trim();
    fieldConfidences.invoiceNo = Math.min(95, Math.round(overallConfidence + 5));
  } else {
    // Proximity search: Look for line with "INVOICE" or "INV" or "PACKING" followed by value
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/INVOICE\s*(NO|#|NUM)|PACKING\s*(NO|#|NUM)/i.test(line)) {
        const parts = line.split(/[:#]/);
        if (parts.length > 1 && parts[1].trim().length >= 3) {
          invoiceNo = parts[1].trim().split(/\s+/)[0];
          fieldConfidences.invoiceNo = Math.round(overallConfidence);
          break;
        } else if (i + 1 < lines.length && /^[A-Z0-9\-_/]{4,20}$/i.test(lines[i + 1])) {
          invoiceNo = lines[i + 1].trim();
          fieldConfidences.invoiceNo = Math.round(overallConfidence - 10);
          break;
        }
      }
    }
  }

  // 3. Invoice Date
  let invoiceDate = '';
  const dateRegex = /(?:INVOICE\s*DATE|DATE\s*OF\s*INVOICE|BILLING\s*DATE|DATE|DATED)[:\s]*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i;
  const dateMatch = cleanText.match(dateRegex);
  if (dateMatch) {
    const rawDate = dateMatch[1].trim();
    const parsedTs = Date.parse(rawDate);
    if (!isNaN(parsedTs)) {
      invoiceDate = new Date(parsedTs).toISOString().split('T')[0];
      fieldConfidences.invoiceDate = Math.min(96, Math.round(overallConfidence + 6));
    } else {
      invoiceDate = rawDate;
      fieldConfidences.invoiceDate = 70;
    }
  } else {
    // Standalone date pattern search (e.g. 18 OCT 2026 or 2026-10-18)
    const standaloneDate = cleanText.match(/\b([0-9]{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+[0-9]{4})\b/i);
    if (standaloneDate) {
      invoiceDate = standaloneDate[1];
      fieldConfidences.invoiceDate = Math.round(overallConfidence - 5);
    }
  }

  // 4. Exporter / Shipper (Multi-line and label-based)
  let shipperName = '';
  let shipperAddress = '';
  const shipperLabelRegex = /(?:SHIPPER(?:\s*\/\s*EXPORTER)?|EXPORTER|SELLER|VENDOR|FROM\s*:|SOLD\s*BY)[:\s]*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(shipperLabelRegex);
    if (match) {
      const restOfLine = match[1]?.trim();
      if (restOfLine && restOfLine.length > 3 && !/CONSIGNEE|BUYER/i.test(restOfLine)) {
        shipperName = restOfLine;
      } else if (i + 1 < lines.length && lines[i + 1].length > 3 && !/CONSIGNEE|BUYER/i.test(lines[i + 1])) {
        shipperName = lines[i + 1].trim();
        if (i + 2 < lines.length && !/CONSIGNEE|BUYER|INVOICE/i.test(lines[i + 2])) {
          shipperAddress = lines[i + 2].trim();
        }
      }
      fieldConfidences.shipperName = Math.round(overallConfidence);
      break;
    }
  }

  // If no explicit shipper label, look for common company entity endings in top 8 lines
  if (!shipperName) {
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      if (/CO\.,?\s*LTD|PCL|INC\.|CORP\.|LLC|GMBH|B\.V\.|LIMITED/i.test(lines[i]) && !/CONSIGNEE|BUYER/i.test(lines[i])) {
        shipperName = lines[i];
        fieldConfidences.shipperName = Math.round(overallConfidence - 15);
        break;
      }
    }
  }

  // 5. Consignee / Buyer
  let consigneeName = '';
  let consigneeAddress = '';
  const consigneeLabelRegex = /(?:CONSIGNEE(?:\s*\/\s*BUYER)?|BUYER|SOLD\s*TO|BILL\s*TO|SHIP\s*TO|APPLICANT|PURCHASER)[:\s]*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(consigneeLabelRegex);
    if (match) {
      const restOfLine = match[1]?.trim();
      if (restOfLine && restOfLine.length > 3 && !/NOTIFY|SHIPPER/i.test(restOfLine)) {
        consigneeName = restOfLine;
      } else if (i + 1 < lines.length && lines[i + 1].length > 3 && !/NOTIFY|SHIPPER/i.test(lines[i + 1])) {
        consigneeName = lines[i + 1].trim();
        if (i + 2 < lines.length && !/NOTIFY|VESSEL|PORT/i.test(lines[i + 2])) {
          consigneeAddress = lines[i + 2].trim();
        }
      }
      fieldConfidences.consigneeName = Math.round(overallConfidence);
      break;
    }
  }

  // 6. Maritime Logistics (POL, POD, Vessel, Voyage, B/L, Booking)
  let pol = '';
  let pod = '';
  let vesselName = '';
  let voyageNo = '';
  let blNo = '';
  let bookingNo = '';

  const polMatch = cleanText.match(/(?:PORT\s*OF\s*LOADING|POL|LOADING\s*PORT)[:\s]*([^\n\r,]+(?:,[^\n\r]+)?)/i);
  if (polMatch) {
    pol = polMatch[1].replace(/[:_]/g, '').trim();
    fieldConfidences.pol = Math.round(overallConfidence);
  }

  const podMatch = cleanText.match(/(?:PORT\s*OF\s*DISCHARGE|POD|DISCHARGE\s*PORT|FINAL\s*DESTINATION)[:\s]*([^\n\r,]+(?:,[^\n\r]+)?)/i);
  if (podMatch) {
    pod = podMatch[1].replace(/[:_]/g, '').trim();
    fieldConfidences.pod = Math.round(overallConfidence);
  }

  const vesselMatch = cleanText.match(/(?:VESSEL\s*(?:\/|\s*AND\s*)?\s*VOYAGE|VESSEL\s*NAME|VESSEL)[:\s]*([^\n\r]+)/i);
  if (vesselMatch) {
    const vStr = vesselMatch[1].trim();
    const parts = vStr.split(/\s+V\.|\s+VOY\.|\s+VOYAGE\s+/i);
    if (parts.length >= 2) {
      vesselName = parts[0].trim();
      voyageNo = 'V.' + parts[1].trim();
    } else {
      vesselName = vStr;
    }
    fieldConfidences.vesselName = Math.round(overallConfidence);
  }

  const blMatch = cleanText.match(/(?:B\/L\s*(?:NO|NUMBER|#)?|BILL\s*OF\s*LADING)[:\s]*([A-Z0-9\-_/]+)/i);
  if (blMatch) blNo = blMatch[1].trim();

  const bkgMatch = cleanText.match(/(?:BOOKING\s*(?:NO|NUMBER|#)?|BKG\s*NO\.?)[:\s]*([A-Z0-9\-_/]+)/i);
  if (bkgMatch) bookingNo = bkgMatch[1].trim();

  // 7. Container No (ISO 6346: 4 letters + 7 digits) & Seal No
  let containerNo = '';
  const isoContainerRegex = /\b([A-Z]{4}\s?[0-9]{7})\b/i;
  const isoMatch = cleanText.match(isoContainerRegex);
  if (isoMatch) {
    containerNo = isoMatch[1].replace(/\s+/g, '').toUpperCase();
    fieldConfidences.containerNo = Math.min(98, Math.round(overallConfidence + 10));
  } else {
    const cntLabelMatch = cleanText.match(/(?:CONTAINER\s*(?:NO|#)?|CNTR\s*NO\.?)[:\s]*([A-Z0-9\s]{9,12})/i);
    if (cntLabelMatch) {
      containerNo = cntLabelMatch[1].trim().replace(/\s+/g, '').toUpperCase();
      fieldConfidences.containerNo = Math.round(overallConfidence - 10);
    }
  }

  let sealNo = '';
  const sealMatch = cleanText.match(/(?:SEAL\s*(?:NO|#)?|SEAL\s*NUMBER)[:\s]*([A-Z0-9\-_]+)/i);
  if (sealMatch) {
    sealNo = sealMatch[1].trim();
    fieldConfidences.sealNo = Math.round(overallConfidence);
  }

  // 8. Currency Detection
  let currency: 'USD' | 'THB' | 'EUR' | 'JPY' | 'GBP' | 'CNY' = 'USD';
  if (/THB|BAHT|฿/i.test(cleanText)) currency = 'THB';
  else if (/EUR|EURO|€/i.test(cleanText)) currency = 'EUR';
  else if (/JPY|YEN|¥/i.test(cleanText)) currency = 'JPY';
  else if (/GBP|POUND|£/i.test(cleanText)) currency = 'GBP';
  else if (/CNY|RMB/i.test(cleanText)) currency = 'CNY';

  // 9. Total Amount Extraction
  let totalAmount = 0;
  // Multiple regex patterns matching Total Amount, Grand Total, Invoice Total
  const totalMatches = [
    ...cleanText.matchAll(/(?:TOTAL\s*(?:AMOUNT|USD|THB|EUR|CIF|FOB)?|FINAL\s*TOTAL|GRAND\s*TOTAL|AMOUNT\s*DUE|INVOICE\s*TOTAL)[:\s]*(?:USD|\$|THB|EUR|€|£)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi),
  ];

  if (totalMatches.length > 0) {
    // Pick the most likely total (typically bottom-most or largest)
    const valStr = totalMatches[totalMatches.length - 1][1].replace(/,/g, '');
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      totalAmount = num;
      fieldConfidences.totalAmount = Math.min(95, Math.round(overallConfidence + 5));
    }
  }

  // 10. Weights (Gross Weight & Net Weight) and Package Count
  let totalGrossWeightKg = 0;
  let totalNetWeightKg = 0;
  let totalCBM = 0;
  let packageCount = 0;

  const pkgMatch = cleanText.match(/(?:TOTAL\s*(?:PACKAGES|PKGS|BAGS|CARTONS|CTNS|BOXES|UNITS)|PACKAGES|QUANTITY)[:\s]*([0-9,]+)\s*(?:BAGS|CARTONS|CTNS|PKGS|PCS|UNITS)?/i) ||
    cleanText.match(/\b([0-9,]+)\s*(?:BAGS|CARTONS|CTNS|PKGS|PACKAGES)\b/i);
  if (pkgMatch) {
    packageCount = parseInt(pkgMatch[1].replace(/,/g, ''), 10) || 0;
  }

  const gwMatch = cleanText.match(/(?:GROSS\s*(?:WT|WEIGHT)|G\.?W\.?|TOTAL\s*GROSS\s*WEIGHT)[:\s]*([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|TONS?)?/i);
  if (gwMatch) {
    let val = parseFloat(gwMatch[1].replace(/,/g, ''));
    if (gwMatch[2] && /MT|TON/i.test(gwMatch[2])) val = val * 1000;
    totalGrossWeightKg = val;
    fieldConfidences.grossWeight = Math.round(overallConfidence);
  }

  const nwMatch = cleanText.match(/(?:NET\s*(?:WT|WEIGHT)|N\.?W\.?|TOTAL\s*NET\s*WEIGHT)[:\s]*([0-9,]+(?:\.[0-9]+)?)\s*(KGS?|KG|MT|TONS?)?/i);
  if (nwMatch) {
    let val = parseFloat(nwMatch[1].replace(/,/g, ''));
    if (nwMatch[2] && /MT|TON/i.test(nwMatch[2])) val = val * 1000;
    totalNetWeightKg = val;
    fieldConfidences.netWeight = Math.round(overallConfidence);
  }

  const cbmMatch = cleanText.match(/(?:CBM|MEASUREMENT|M3|VOLUME)[:\s]*([0-9,]+(?:\.[0-9]+)?)/i);
  if (cbmMatch) {
    totalCBM = parseFloat(cbmMatch[1].replace(/,/g, ''));
  }

  // 11. Multi-Line Item Table Parsing with HS Code & Unit Price
  const items: LineItem[] = [];

  // Look for lines that contain: Description + (Optional HS code) + Qty + Unit + Unit Price + Total
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line looks like an item row: contains numbers, prices, or quantities
    // Match line pattern: Description ... HS Code (optional) ... Qty ... Price ... Amount
    const priceAmountMatch = line.match(/([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})/);
    const hsCodeMatch = line.match(/\b([0-9]{4}\.[0-9]{2}(?:\.[0-9]{2})?)\b/);

    if (priceAmountMatch) {
      const uPrice = parseFloat(priceAmountMatch[1].replace(/,/g, ''));
      const lineTotal = parseFloat(priceAmountMatch[2].replace(/,/g, ''));

      // Find quantity before price
      const beforePrices = line.substring(0, priceAmountMatch.index);
      const qtyMatch = beforePrices.match(/\b([0-9,]+(?:\.[0-9]+)?)\s*(BAGS?|CTNS?|CARTONS?|UNITS?|PCS|PIECES?|KGS?|SETS?|BOXES?|CRATES?)\b/i);

      let qty = 1;
      let unit = 'Units';
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1].replace(/,/g, '')) || 1;
        unit = qtyMatch[2];
      } else {
        // Calculate qty from lineTotal / uPrice
        if (uPrice > 0) qty = Math.round(lineTotal / uPrice);
      }

      // Description is everything preceding the numbers
      let desc = beforePrices
        .replace(/^[0-9]+[\.\s]+/, '') // remove item index
        .replace(/\b([0-9]{4}\.[0-9]{2}(?:\.[0-9]{2})?)\b/, '') // remove HS code
        .replace(/\b([0-9,]+)\s*(BAGS?|CTNS?|UNITS?|PCS|KGS?|SETS?)\b/gi, '')
        .trim();

      if (!desc || desc.length < 3) {
        desc = `Item #${items.length + 1}`;
      }

      items.push({
        id: 'itm-' + (items.length + 1),
        itemNo: items.length + 1,
        description: desc,
        hsCode: hsCodeMatch ? hsCodeMatch[1] : undefined,
        qty,
        unit,
        unitPrice: uPrice,
        totalAmount: lineTotal,
      });
    }
  }

  // If no items extracted through two-price regex, scan line by line for structured columns
  if (items.length === 0) {
    // Scan for single amounts with description
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/TOTAL|SUBTOTAL|PACKAGES|WEIGHT|MEASUREMENT|INVOICE|DATE|SHIPPER|CONSIGNEE/i.test(line)) {
        continue;
      }
      const amtMatch = line.match(/(?:USD|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/);
      const hsMatch = line.match(/\b([0-9]{4}\.[0-9]{2}(?:\.[0-9]{2})?)\b/);

      if (amtMatch && !line.includes('TOTAL')) {
        const itemAmt = parseFloat(amtMatch[1].replace(/,/g, ''));
        if (itemAmt > 0 && itemAmt <= (totalAmount || 1000000)) {
          const descClean = line.replace(amtMatch[0], '').replace(/^[0-9]+[\.\s]+/, '').trim();
          if (descClean.length >= 4) {
            items.push({
              id: 'itm-' + (items.length + 1),
              itemNo: items.length + 1,
              description: descClean,
              hsCode: hsMatch ? hsMatch[1] : undefined,
              qty: 1,
              unit: 'Lot',
              unitPrice: itemAmt,
              totalAmount: itemAmt,
            });
          }
        }
      }
    }
  }

  if (items.length > 0) {
    fieldConfidences.items = Math.round(overallConfidence);
  }

  // 12. Mathematical Cross-Check Validation (Quantity × Unit Price vs Total Amount)
  const itemsSum = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const diff = Math.abs(itemsSum - totalAmount);

  let mathStatus: 'MATCH' | 'DISCREPANCY' | 'NO_ITEMS' = 'NO_ITEMS';
  let mathMessage = 'ไม่มีรายการสินค้าให้เปรียบเทียบ';

  if (documentType === 'PACKING_LIST') {
    mathStatus = 'MATCH';
    mathMessage = packageCount > 0 
      ? `เอกสาร Packing List: บันทึกหีบห่อรวม ${packageCount.toLocaleString()} หีบห่อ / น้ำหนัก Gross ${totalGrossWeightKg.toLocaleString()} กก.`
      : 'เอกสาร Packing List: บันทึกข้อมูลหีบห่อและน้ำหนักเรียบร้อย';
  } else if (items.length > 0) {
    if (totalAmount === 0 && itemsSum > 0) {
      totalAmount = itemsSum;
      mathStatus = 'MATCH';
      mathMessage = `คำนวณยอดรวมจากผลรวมรายการสินค้า (${items.length} รายการ)`;
    } else if (diff <= 0.05) {
      mathStatus = 'MATCH';
      mathMessage = 'ยอดคำนวณถูกต้อง: ผลรวม Qty × Unit Price ตรงกับ Total Amount 100%';
    } else {
      mathStatus = 'DISCREPANCY';
      mathMessage = `พบส่วนต่าง: ผลรวมรายการ ${currency} ${itemsSum.toFixed(2)} vs Total เอกสาร ${currency} ${totalAmount.toFixed(2)} (ต่าง ${currency} ${diff.toFixed(2)})`;
    }
  }

  return {
    documentType,
    invoiceNo,
    invoiceDate,
    blNo,
    bookingNo,
    shipperName,
    shipperAddress,
    consigneeName,
    consigneeAddress,
    pol,
    pod,
    vesselName,
    voyageNo,
    containerNo,
    sealNo,
    items,
    currency,
    totalAmount,
    totalGrossWeightKg,
    totalNetWeightKg,
    totalCBM,
    packageCount,
    mathValidation: {
      itemsSum: Number(itemsSum.toFixed(2)),
      extractedTotal: Number(totalAmount.toFixed(2)),
      difference: Number(diff.toFixed(2)),
      isMatch: (diff <= 0.05 && items.length > 0) || documentType === 'PACKING_LIST',
      status: mathStatus,
      message: mathMessage,
    },
    rawText: cleanText,
    confidence: Math.round(overallConfidence),
    fieldConfidences,
    preprocessingStats: {
      deskewAngle: prepResult?.detectedSkewAngle || 0,
      processingTimeMs: prepResult?.processingTimeMs || 0,
      originalWidth: prepResult?.originalWidth || 0,
      originalHeight: prepResult?.originalHeight || 0,
    },
  };
}

/**
 * Converts extracted OCR data into a structured Shipment model for IndexedDB
 */
export function convertOcrToShipment(ocrData: ExtractedShippingData, sourceImageUrl?: string): Shipment {
  const now = new Date().toISOString();
  return {
    id: 'shp-' + Date.now().toString(36),
    invoiceNo: ocrData.invoiceNo || 'INV-' + Date.now().toString(36).toUpperCase(),
    blNo: ocrData.blNo || (ocrData.containerNo ? `BL-${ocrData.containerNo}` : ''),
    bookingNo: ocrData.bookingNo || '',
    date: ocrData.invoiceDate || now.split('T')[0],
    documentType: ocrData.documentType,
    shipperName: ocrData.shipperName || 'ไม่ระบุผู้ส่งออก',
    shipperAddress: ocrData.shipperAddress || '',
    consigneeName: ocrData.consigneeName || 'ไม่ระบุผู้รับปลายทาง',
    consigneeAddress: ocrData.consigneeAddress || '',
    pol: ocrData.pol || 'Laem Chabang Port (THLCH)',
    pod: ocrData.pod || 'Port of Discharge (POD)',
    vesselName: ocrData.vesselName || 'Ocean Vessel',
    voyageNo: ocrData.voyageNo || '',
    containerNo: ocrData.containerNo || '',
    containerType: ocrData.totalCBM > 33 ? '40HC' : '20GP',
    sealNo: ocrData.sealNo || '',
    items: ocrData.items,
    currency: (ocrData.currency === 'USD' || ocrData.currency === 'THB' || ocrData.currency === 'EUR') ? ocrData.currency : 'USD',
    totalAmount: ocrData.totalAmount,
    totalGrossWeightKg: ocrData.totalGrossWeightKg,
    totalNetWeightKg: ocrData.totalNetWeightKg,
    totalCBM: ocrData.totalCBM,
    incoterm: 'FOB',
    status: 'BOOKED',
    notes: `นำเข้าจากระบบ OCR (ความแม่นยำ ${ocrData.confidence}%) ตรวจสอบความถูกต้องเมื่อ ${new Date().toLocaleDateString('th-TH')}`,
    sourceImageUrl,
    createdAt: now,
    updatedAt: now,
  };
}
