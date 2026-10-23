import { ScannedDocumentItem, CrossCheckResult, CrossCheckFieldResult, CrossCheckFieldStatus } from '../types';

/**
 * Normalizes text for comparison (removes redundant spaces, punctuation, lowercase)
 */
function normalizeText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[,\.\-\/\\#_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares two numeric values within a tolerance margin (e.g. 0.05)
 */
function compareNumbers(val1: number | undefined, val2: number | undefined, tolerance = 0.5): {
  status: CrossCheckFieldStatus;
  notes?: string;
} {
  const has1 = val1 !== undefined && val1 !== null && val1 > 0;
  const has2 = val2 !== undefined && val2 !== null && val2 > 0;

  if (!has1 && !has2) {
    return { status: 'MISSING_DATA', notes: 'ไม่พบตัวเลขทั้งสองเอกสาร' };
  }
  if (!has1) {
    return { status: 'MISSING_DATA', notes: 'ไม่พบข้อมูลใน Invoice' };
  }
  if (!has2) {
    return { status: 'MISSING_DATA', notes: 'ไม่พบข้อมูลใน Packing List' };
  }

  const diff = Math.abs(val1! - val2!);
  if (diff <= tolerance) {
    return { status: 'MATCH', notes: 'ตัวเลขตรงกันสมบูรณ์' };
  }

  return {
    status: 'MISMATCH',
    notes: `พบผลต่าง: ${diff.toLocaleString()} (${val1! > val2! ? 'Invoice มากกว่า' : 'Packing List มากกว่า'})`,
  };
}

/**
 * Compares two string fields strictly and with fuzzy tolerance
 */
function compareStrings(str1: string | undefined | null, str2: string | undefined | null): {
  status: CrossCheckFieldStatus;
  notes?: string;
} {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (!norm1 && !norm2) {
    return { status: 'MISSING_DATA', notes: 'ไม่มีข้อมูลทั้งสองเอกสาร' };
  }
  if (!norm1) {
    return { status: 'MISSING_DATA', notes: 'ไม่มีข้อมูลใน Invoice' };
  }
  if (!norm2) {
    return { status: 'MISSING_DATA', notes: 'ไม่มีข้อมูลใน Packing List' };
  }

  if (norm1 === norm2) {
    return { status: 'MATCH', notes: 'ข้อความตรงกัน 100%' };
  }

  // Check substring / containment
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return { status: 'REQUIRES_MANUAL_REVIEW', notes: 'ข้อความมีความคล้ายคลึงกันบางส่วน แนะนำตรวจสอบ' };
  }

  return { status: 'MISMATCH', notes: 'ข้อความไม่ตรงกัน' };
}

/**
 * Performs cross-document reconciliation between a Commercial Invoice and a Packing List
 */
export function performCrossCheck(
  invoiceDoc: ScannedDocumentItem,
  packingListDoc: ScannedDocumentItem
): CrossCheckResult {
  const invData = invoiceDoc.ocrData;
  const plData = packingListDoc.ocrData;

  const fields: CrossCheckFieldResult[] = [];

  // 1. Shipper / Exporter
  const shipperComp = compareStrings(invData?.shipperName, plData?.shipperName);
  fields.push({
    fieldName: 'shipperName',
    labelThai: 'ผู้ส่งออก (Shipper / Exporter)',
    invoiceValue: invData?.shipperName || '— (ไม่พบข้อมูล)',
    packingListValue: plData?.shipperName || '— (ไม่พบข้อมูล)',
    status: shipperComp.status,
    notes: shipperComp.notes,
  });

  // 2. Consignee / Buyer
  const consigneeComp = compareStrings(invData?.consigneeName, plData?.consigneeName);
  fields.push({
    fieldName: 'consigneeName',
    labelThai: 'ผู้รับปลายทาง (Consignee / Buyer)',
    invoiceValue: invData?.consigneeName || '— (ไม่พบข้อมูล)',
    packingListValue: plData?.consigneeName || '— (ไม่พบข้อมูล)',
    status: consigneeComp.status,
    notes: consigneeComp.notes,
  });

  // 3. Description of Goods
  const invGoods = invData?.items?.map((i) => i.description).join(', ') || '';
  const plGoods = plData?.items?.map((i) => i.description).join(', ') || '';
  const goodsComp = compareStrings(invGoods, plGoods);
  fields.push({
    fieldName: 'goodsDescription',
    labelThai: 'รายการสินค้า (Description of Goods)',
    invoiceValue: invGoods || '— (ไม่พบข้อมูล)',
    packingListValue: plGoods || '— (ไม่พบข้อมูล)',
    status: goodsComp.status,
    notes: goodsComp.notes,
  });

  // 4. Quantity (Total Quantity of items)
  const invQty = invData?.items?.reduce((s, itm) => s + (itm.qty || 0), 0) || 0;
  const plQty = plData?.items?.reduce((s, itm) => s + (itm.qty || 0), 0) || 0;
  const qtyComp = compareNumbers(invQty, plQty);
  fields.push({
    fieldName: 'quantity',
    labelThai: 'จำนวนสินค้ารวม (Total Quantity)',
    invoiceValue: invQty > 0 ? `${invQty.toLocaleString()} ${invData?.items?.[0]?.unit || 'Units'}` : '— (ไม่พบข้อมูล)',
    packingListValue: plQty > 0 ? `${plQty.toLocaleString()} ${plData?.items?.[0]?.unit || 'Units'}` : '— (ไม่พบข้อมูล)',
    status: qtyComp.status,
    notes: qtyComp.notes,
  });

  // 5. Total Net Weight (KGS)
  const netWeightComp = compareNumbers(invData?.totalNetWeightKg, plData?.totalNetWeightKg, 1.0);
  fields.push({
    fieldName: 'netWeight',
    labelThai: 'น้ำหนักสุทธิ (Net Weight - KGS)',
    invoiceValue: invData?.totalNetWeightKg ? `${invData.totalNetWeightKg.toLocaleString()} KGS` : '— (ไม่พบข้อมูล)',
    packingListValue: plData?.totalNetWeightKg ? `${plData.totalNetWeightKg.toLocaleString()} KGS` : '— (ไม่พบข้อมูล)',
    status: netWeightComp.status,
    notes: netWeightComp.notes,
  });

  // 6. Total Gross Weight (KGS)
  const grossWeightComp = compareNumbers(invData?.totalGrossWeightKg, plData?.totalGrossWeightKg, 1.0);
  fields.push({
    fieldName: 'grossWeight',
    labelThai: 'น้ำหนักรวม (Gross Weight - KGS)',
    invoiceValue: invData?.totalGrossWeightKg ? `${invData.totalGrossWeightKg.toLocaleString()} KGS` : '— (ไม่พบข้อมูล)',
    packingListValue: plData?.totalGrossWeightKg ? `${plData.totalGrossWeightKg.toLocaleString()} KGS` : '— (ไม่พบข้อมูล)',
    status: grossWeightComp.status,
    notes: grossWeightComp.notes,
  });

  // 7. Packages / Cartons count
  const invPkgs = invData?.items?.reduce((s, itm) => s + (itm.packageCount || 0), 0) || 0;
  const plPkgs = plData?.items?.reduce((s, itm) => s + (itm.packageCount || 0), 0) || 0;
  const pkgsComp = compareNumbers(invPkgs, plPkgs);
  fields.push({
    fieldName: 'packageCount',
    labelThai: 'จำนวนหีบห่อ/กล่อง (Total Packages)',
    invoiceValue: invPkgs > 0 ? `${invPkgs.toLocaleString()} หีบห่อ` : '— (ไม่พบข้อมูล)',
    packingListValue: plPkgs > 0 ? `${plPkgs.toLocaleString()} หีบห่อ` : '— (ไม่พบข้อมูล)',
    status: pkgsComp.status,
    notes: pkgsComp.notes,
  });

  // 8. Container Number (ISO 6346)
  const cntComp = compareStrings(invData?.containerNo, plData?.containerNo);
  fields.push({
    fieldName: 'containerNo',
    labelThai: 'หมายเลขตู้คอนเทนเนอร์ (Container No.)',
    invoiceValue: invData?.containerNo || '— (ไม่พบข้อมูล)',
    packingListValue: plData?.containerNo || '— (ไม่พบข้อมูล)',
    status: cntComp.status,
    notes: cntComp.notes,
  });

  // 9. Seal Number
  const sealComp = compareStrings(invData?.sealNo, plData?.sealNo);
  fields.push({
    fieldName: 'sealNo',
    labelThai: 'หมายเลขซีลตู้ (Seal No.)',
    invoiceValue: invData?.sealNo || '— (ไม่พบข้อมูล)',
    packingListValue: plData?.sealNo || '— (ไม่พบข้อมูล)',
    status: sealComp.status,
    notes: sealComp.notes,
  });

  // Count totals
  let matchCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  for (const f of fields) {
    if (f.status === 'MATCH') matchCount++;
    else if (f.status === 'MISMATCH') mismatchCount++;
    else missingCount++;
  }

  let overallStatus: 'PASSED' | 'WARNING' | 'FAILED' = 'PASSED';
  if (mismatchCount > 0) {
    overallStatus = 'FAILED';
  } else if (missingCount > 0) {
    overallStatus = 'WARNING';
  }

  return {
    invoiceDocId: invoiceDoc.id,
    invoiceName: invoiceDoc.fileName,
    packingListDocId: packingListDoc.id,
    packingListName: packingListDoc.fileName,
    overallStatus,
    matchCount,
    mismatchCount,
    missingCount,
    fields,
    checkedAt: new Date().toLocaleTimeString('th-TH'),
  };
}
