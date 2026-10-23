import { 
  DocumentType, 
  ScannedDocumentItem, 
  UnifiedShipmentSummary, 
  MergedFieldSource 
} from '../types';

/**
 * Creates an empty default field source
 */
function createEmptyField<T>(defaultValue: T): MergedFieldSource<T> {
  return {
    value: defaultValue,
    sourceDocType: 'NONE',
    confidence: 0,
    userVerified: false,
    isUserEdited: false,
    hasConflict: false,
    conflictOptions: [],
  };
}

/**
 * Helper to normalize string for comparison
 */
function normalizeStr(val?: string | null): string {
  if (!val) return '';
  return val
    .toUpperCase()
    .replace(/CO\.,\s*LTD\.?/g, 'CO LTD')
    .replace(/PCL\.?/g, '')
    .replace(/INC\.?/g, '')
    .replace(/LLC\.?/g, '')
    .replace(/[\s,.\-_/\\()]/g, '');
}

/**
 * Merges extracted fields from all uploaded & completed documents into a central
 * Unified Shipment Document Summary form based on maritime domain rules (Rules 15-24).
 * 
 * - Invoice is primary for: invoiceNo, invoiceDate, unitPrice, currency, totalAmount
 * - Packing List is primary for: packageCount, netWeight, grossWeight, containerNo
 * - Shipper, Consignee, Description, Quantity are cross-compared between documents:
 *     - If both match: source = 'AGREED_BOTH'
 *     - If they differ: hasConflict = true, present both options for user selection
 *     - If present in only one: filled from that document with clear source badge
 * - Preserves user-verified or user-edited values from previousSummary.
 */
export function buildUnifiedShipmentSummary(
  documents: ScannedDocumentItem[],
  previousSummary?: UnifiedShipmentSummary | null
): UnifiedShipmentSummary {
  const completedDocs = documents.filter(
    (d) => d.status === 'COMPLETED' && d.ocrData
  );

  // Separate by primary document role
  const invoiceDoc = completedDocs.find(
    (d) => d.docType === 'INVOICE' || d.documentType === 'INVOICE' || d.docType === 'COMBINED'
  );
  const plDoc = completedDocs.find(
    (d) => d.docType === 'PACKING_LIST' || d.documentType === 'PACKING_LIST' || d.docType === 'COMBINED'
  );
  const blDoc = completedDocs.find(
    (d) => d.docType === 'BILL_OF_LADING' || d.documentType === 'BILL_OF_LADING'
  );

  // Initialize summary with empty fields
  const summary: UnifiedShipmentSummary = {
    invoiceNo: createEmptyField<string>(''),
    invoiceDate: createEmptyField<string>(''),
    shipperName: createEmptyField<string>(''),
    consigneeName: createEmptyField<string>(''),
    description: createEmptyField<string>(''),
    quantity: createEmptyField<number>(0),
    unit: createEmptyField<string>('Units'),
    unitPrice: createEmptyField<number>(0),
    currency: createEmptyField<'USD' | 'THB' | 'EUR' | 'CNY'>('USD'),
    totalAmount: createEmptyField<number>(0),
    packageCount: createEmptyField<number>(0),
    totalNetWeightKg: createEmptyField<number>(0),
    totalGrossWeightKg: createEmptyField<number>(0),
    containerNo: createEmptyField<string>(''),
    sealNo: createEmptyField<string>(''),
    blNo: createEmptyField<string>(''),
    pol: createEmptyField<string>(''),
    pod: createEmptyField<string>(''),
    vesselName: createEmptyField<string>(''),
    voyageNo: createEmptyField<string>(''),
    hasConflicts: false,
    conflictCount: 0,
    allVerified: false,
    lastUpdatedAt: new Date().toLocaleTimeString('th-TH'),
  };

  // Helper to preserve user edits if valid
  const shouldPreserveUserEdit = (fieldName: keyof UnifiedShipmentSummary): boolean => {
    if (!previousSummary) return false;
    const prevField = previousSummary[fieldName] as MergedFieldSource<any>;
    if (!prevField) return false;
    return !!(prevField.isUserEdited || prevField.userVerified);
  };

  const copyUserField = <T>(fieldName: keyof UnifiedShipmentSummary, currentField: MergedFieldSource<T>): MergedFieldSource<T> => {
    if (shouldPreserveUserEdit(fieldName)) {
      const prev = previousSummary![fieldName] as MergedFieldSource<T>;
      return {
        ...currentField,
        value: prev.value,
        isUserEdited: true,
        userVerified: true,
        sourceDocType: 'USER_MANUAL',
        sourceDocName: 'แก้ไข/ยืนยันโดยผู้ใช้',
        hasConflict: false,
        conflictOptions: [],
      };
    }
    return currentField;
  };

  // 1. INVOICE NUMBER (Primary: Invoice -> Fallback: Packing List / BL)
  if (invoiceDoc?.ocrData?.invoiceNo) {
    summary.invoiceNo = {
      value: invoiceDoc.ocrData.invoiceNo,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.invoiceNo,
    };
  } else if (plDoc?.ocrData?.invoiceNo) {
    summary.invoiceNo = {
      value: plDoc.ocrData.invoiceNo,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: plDoc.ocrData.fieldConfidences.invoiceNo,
    };
  }
  summary.invoiceNo = copyUserField('invoiceNo', summary.invoiceNo);

  // 2. INVOICE DATE (Primary: Invoice -> Fallback: PL / BL)
  if (invoiceDoc?.ocrData?.invoiceDate) {
    summary.invoiceDate = {
      value: invoiceDoc.ocrData.invoiceDate,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.invoiceDate,
    };
  } else if (plDoc?.ocrData?.invoiceDate) {
    summary.invoiceDate = {
      value: plDoc.ocrData.invoiceDate,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: plDoc.ocrData.fieldConfidences.invoiceDate,
    };
  }
  summary.invoiceDate = copyUserField('invoiceDate', summary.invoiceDate);

  // 3. CURRENCY, UNIT PRICE, TOTAL AMOUNT (Primary: Invoice)
  if (invoiceDoc?.ocrData?.currency) {
    summary.currency = {
      value: (invoiceDoc.ocrData.currency === 'USD' || invoiceDoc.ocrData.currency === 'THB' || invoiceDoc.ocrData.currency === 'EUR' || invoiceDoc.ocrData.currency === 'CNY')
        ? invoiceDoc.ocrData.currency
        : 'USD',
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: 90,
    };
  }
  summary.currency = copyUserField('currency', summary.currency);

  if (invoiceDoc?.ocrData?.totalAmount && invoiceDoc.ocrData.totalAmount > 0) {
    summary.totalAmount = {
      value: invoiceDoc.ocrData.totalAmount,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.totalAmount,
    };
  } else {
    // Check other documents
    const docWithAmount = completedDocs.find((d) => (d.ocrData?.totalAmount || 0) > 0);
    if (docWithAmount) {
      summary.totalAmount = {
        value: docWithAmount.ocrData!.totalAmount,
        sourceDocId: docWithAmount.id,
        sourceDocType: docWithAmount.docType,
        sourceDocName: docWithAmount.fileName,
        confidence: docWithAmount.ocrData!.fieldConfidences.totalAmount,
      };
    }
  }
  summary.totalAmount = copyUserField('totalAmount', summary.totalAmount);

  // Unit Price from items
  const primaryItem = invoiceDoc?.ocrData?.items?.[0] || completedDocs.find((d) => (d.ocrData?.items?.length || 0) > 0)?.ocrData?.items?.[0];
  if (primaryItem && primaryItem.unitPrice > 0) {
    summary.unitPrice = {
      value: primaryItem.unitPrice,
      sourceDocId: invoiceDoc?.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc?.fileName,
      confidence: 85,
    };
  }
  summary.unitPrice = copyUserField('unitPrice', summary.unitPrice);

  // 4. PACKAGES, NET WEIGHT, GROSS WEIGHT, CONTAINER NO (Primary: Packing List -> Fallback: Invoice)
  // Package Count
  if (plDoc?.ocrData?.packageCount && plDoc.ocrData.packageCount > 0) {
    summary.packageCount = {
      value: plDoc.ocrData.packageCount,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: 92,
    };
  } else if (invoiceDoc?.ocrData?.packageCount && invoiceDoc.ocrData.packageCount > 0) {
    summary.packageCount = {
      value: invoiceDoc.ocrData.packageCount,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: 80,
    };
  } else {
    // Sum from line items if present
    const totalItemQty = completedDocs.reduce(
      (max, d) => Math.max(max, d.ocrData?.items?.reduce((s, it) => s + (it.qty || 0), 0) || 0),
      0
    );
    if (totalItemQty > 0) {
      summary.packageCount = {
        value: totalItemQty,
        sourceDocType: invoiceDoc ? 'INVOICE' : 'PACKING_LIST',
        sourceDocName: 'คำนวณจากผลรวมจำนวนสินค้า',
        confidence: 75,
      };
    }
  }
  summary.packageCount = copyUserField('packageCount', summary.packageCount);

  // Net Weight (Rule 17 & 19: Packing List is primary, fallback to Invoice)
  if (plDoc?.ocrData?.totalNetWeightKg && plDoc.ocrData.totalNetWeightKg > 0) {
    summary.totalNetWeightKg = {
      value: plDoc.ocrData.totalNetWeightKg,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: plDoc.ocrData.fieldConfidences.netWeight,
    };
  } else if (invoiceDoc?.ocrData?.totalNetWeightKg && invoiceDoc.ocrData.totalNetWeightKg > 0) {
    summary.totalNetWeightKg = {
      value: invoiceDoc.ocrData.totalNetWeightKg,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.netWeight,
    };
  }
  summary.totalNetWeightKg = copyUserField('totalNetWeightKg', summary.totalNetWeightKg);

  // Gross Weight (Rule 17 & 19: Packing List is primary, fallback to Invoice)
  if (plDoc?.ocrData?.totalGrossWeightKg && plDoc.ocrData.totalGrossWeightKg > 0) {
    summary.totalGrossWeightKg = {
      value: plDoc.ocrData.totalGrossWeightKg,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: plDoc.ocrData.fieldConfidences.grossWeight,
    };
  } else if (invoiceDoc?.ocrData?.totalGrossWeightKg && invoiceDoc.ocrData.totalGrossWeightKg > 0) {
    summary.totalGrossWeightKg = {
      value: invoiceDoc.ocrData.totalGrossWeightKg,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.grossWeight,
    };
  }
  summary.totalGrossWeightKg = copyUserField('totalGrossWeightKg', summary.totalGrossWeightKg);

  // Container Number (Primary: Packing List or BL, fallback Invoice)
  const isIsoContainer = (c?: string) => !!(c && /^[A-Z]{3,4}\s?[0-9]{6,7}$/i.test(c.trim()));
  if (isIsoContainer(plDoc?.ocrData?.containerNo)) {
    summary.containerNo = {
      value: plDoc!.ocrData!.containerNo.toUpperCase(),
      sourceDocId: plDoc!.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc!.fileName,
      confidence: plDoc!.ocrData!.fieldConfidences.containerNo,
    };
  } else if (isIsoContainer(blDoc?.ocrData?.containerNo)) {
    summary.containerNo = {
      value: blDoc!.ocrData!.containerNo.toUpperCase(),
      sourceDocId: blDoc!.id,
      sourceDocType: 'BILL_OF_LADING',
      sourceDocName: blDoc!.fileName,
      confidence: 90,
    };
  } else if (invoiceDoc?.ocrData?.containerNo) {
    summary.containerNo = {
      value: invoiceDoc.ocrData.containerNo.toUpperCase(),
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.containerNo,
    };
  }
  summary.containerNo = copyUserField('containerNo', summary.containerNo);

  // Seal Number
  if (plDoc?.ocrData?.sealNo) {
    summary.sealNo = {
      value: plDoc.ocrData.sealNo,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: plDoc.ocrData.fieldConfidences.sealNo,
    };
  } else if (invoiceDoc?.ocrData?.sealNo) {
    summary.sealNo = {
      value: invoiceDoc.ocrData.sealNo,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: invoiceDoc.ocrData.fieldConfidences.sealNo,
    };
  }
  summary.sealNo = copyUserField('sealNo', summary.sealNo);

  // Bill of Lading Number
  if (blDoc?.ocrData?.blNo) {
    summary.blNo = {
      value: blDoc.ocrData.blNo,
      sourceDocId: blDoc.id,
      sourceDocType: 'BILL_OF_LADING',
      sourceDocName: blDoc.fileName,
      confidence: 95,
    };
  } else if (invoiceDoc?.ocrData?.blNo) {
    summary.blNo = {
      value: invoiceDoc.ocrData.blNo,
      sourceDocId: invoiceDoc.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc.fileName,
      confidence: 85,
    };
  } else if (plDoc?.ocrData?.blNo) {
    summary.blNo = {
      value: plDoc.ocrData.blNo,
      sourceDocId: plDoc.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc.fileName,
      confidence: 85,
    };
  }
  summary.blNo = copyUserField('blNo', summary.blNo);

  // Ports & Vessel
  const firstWithPorts = completedDocs.find((d) => d.ocrData?.pol || d.ocrData?.pod);
  if (firstWithPorts?.ocrData) {
    if (firstWithPorts.ocrData.pol) {
      summary.pol = {
        value: firstWithPorts.ocrData.pol,
        sourceDocId: firstWithPorts.id,
        sourceDocType: firstWithPorts.docType,
        sourceDocName: firstWithPorts.fileName,
        confidence: firstWithPorts.ocrData.fieldConfidences.pol,
      };
    }
    if (firstWithPorts.ocrData.pod) {
      summary.pod = {
        value: firstWithPorts.ocrData.pod,
        sourceDocId: firstWithPorts.id,
        sourceDocType: firstWithPorts.docType,
        sourceDocName: firstWithPorts.fileName,
        confidence: firstWithPorts.ocrData.fieldConfidences.pod,
      };
    }
    if (firstWithPorts.ocrData.vesselName) {
      summary.vesselName = {
        value: firstWithPorts.ocrData.vesselName,
        sourceDocId: firstWithPorts.id,
        sourceDocType: firstWithPorts.docType,
        sourceDocName: firstWithPorts.fileName,
        confidence: firstWithPorts.ocrData.fieldConfidences.vesselName,
      };
    }
    if (firstWithPorts.ocrData.voyageNo) {
      summary.voyageNo = {
        value: firstWithPorts.ocrData.voyageNo,
        sourceDocId: firstWithPorts.id,
        sourceDocType: firstWithPorts.docType,
        sourceDocName: firstWithPorts.fileName,
        confidence: 80,
      };
    }
  }

  // 5. SHIPPER, CONSIGNEE, DESCRIPTION, QUANTITY: COMPARE BOTH DOCUMENTS (Rule 18 & 21)
  
  // Shipper Comparison
  const invShipper = invoiceDoc?.ocrData?.shipperName?.trim();
  const plShipper = plDoc?.ocrData?.shipperName?.trim();

  if (invShipper && plShipper) {
    const isMatch = normalizeStr(invShipper) === normalizeStr(plShipper) ||
      normalizeStr(invShipper).includes(normalizeStr(plShipper).substring(0, 10)) ||
      normalizeStr(plShipper).includes(normalizeStr(invShipper).substring(0, 10));

    if (isMatch) {
      summary.shipperName = {
        value: invShipper.length >= plShipper.length ? invShipper : plShipper,
        sourceDocType: 'AGREED_BOTH',
        sourceDocName: 'ตรงกันทั้ง 2 เอกสาร (Invoice & Packing List)',
        confidence: Math.max(invoiceDoc?.ocrData?.fieldConfidences.shipperName || 0, plDoc?.ocrData?.fieldConfidences.shipperName || 0),
        hasConflict: false,
      };
    } else {
      // Discrepancy! Flag conflict and wait for user selection
      summary.shipperName = {
        value: invShipper,
        sourceDocType: 'INVOICE',
        sourceDocName: invoiceDoc?.fileName,
        hasConflict: true,
        conflictOptions: [
          {
            docId: invoiceDoc!.id,
            docName: invoiceDoc!.fileName,
            docType: 'INVOICE',
            value: invShipper,
            confidence: invoiceDoc!.ocrData?.fieldConfidences.shipperName,
          },
          {
            docId: plDoc!.id,
            docName: plDoc!.fileName,
            docType: 'PACKING_LIST',
            value: plShipper,
            confidence: plDoc!.ocrData?.fieldConfidences.shipperName,
          },
        ],
      };
    }
  } else if (invShipper) {
    summary.shipperName = {
      value: invShipper,
      sourceDocId: invoiceDoc?.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc?.fileName,
      confidence: invoiceDoc?.ocrData?.fieldConfidences.shipperName,
      hasConflict: false,
    };
  } else if (plShipper) {
    summary.shipperName = {
      value: plShipper,
      sourceDocId: plDoc?.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc?.fileName,
      confidence: plDoc?.ocrData?.fieldConfidences.shipperName,
      hasConflict: false,
    };
  }
  summary.shipperName = copyUserField('shipperName', summary.shipperName);

  // Consignee Comparison
  const invConsignee = invoiceDoc?.ocrData?.consigneeName?.trim();
  const plConsignee = plDoc?.ocrData?.consigneeName?.trim();

  if (invConsignee && plConsignee) {
    const isMatch = normalizeStr(invConsignee) === normalizeStr(plConsignee) ||
      normalizeStr(invConsignee).includes(normalizeStr(plConsignee).substring(0, 10)) ||
      normalizeStr(plConsignee).includes(normalizeStr(invConsignee).substring(0, 10));

    if (isMatch) {
      summary.consigneeName = {
        value: invConsignee.length >= plConsignee.length ? invConsignee : plConsignee,
        sourceDocType: 'AGREED_BOTH',
        sourceDocName: 'ตรงกันทั้ง 2 เอกสาร (Invoice & Packing List)',
        confidence: Math.max(invoiceDoc?.ocrData?.fieldConfidences.consigneeName || 0, plDoc?.ocrData?.fieldConfidences.consigneeName || 0),
        hasConflict: false,
      };
    } else {
      summary.consigneeName = {
        value: invConsignee,
        sourceDocType: 'INVOICE',
        sourceDocName: invoiceDoc?.fileName,
        hasConflict: true,
        conflictOptions: [
          {
            docId: invoiceDoc!.id,
            docName: invoiceDoc!.fileName,
            docType: 'INVOICE',
            value: invConsignee,
            confidence: invoiceDoc!.ocrData?.fieldConfidences.consigneeName,
          },
          {
            docId: plDoc!.id,
            docName: plDoc!.fileName,
            docType: 'PACKING_LIST',
            value: plConsignee,
            confidence: plDoc!.ocrData?.fieldConfidences.consigneeName,
          },
        ],
      };
    }
  } else if (invConsignee) {
    summary.consigneeName = {
      value: invConsignee,
      sourceDocId: invoiceDoc?.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc?.fileName,
      confidence: invoiceDoc?.ocrData?.fieldConfidences.consigneeName,
      hasConflict: false,
    };
  } else if (plConsignee) {
    summary.consigneeName = {
      value: plConsignee,
      sourceDocId: plDoc?.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc?.fileName,
      confidence: plDoc?.ocrData?.fieldConfidences.consigneeName,
      hasConflict: false,
    };
  }
  summary.consigneeName = copyUserField('consigneeName', summary.consigneeName);

  // Description Comparison
  const invDesc = invoiceDoc?.ocrData?.items?.[0]?.description?.trim();
  const plDesc = plDoc?.ocrData?.items?.[0]?.description?.trim();

  if (invDesc && plDesc) {
    const isMatch = normalizeStr(invDesc) === normalizeStr(plDesc) ||
      normalizeStr(invDesc).includes(normalizeStr(plDesc).substring(0, 10)) ||
      normalizeStr(plDesc).includes(normalizeStr(invDesc).substring(0, 10));

    if (isMatch) {
      summary.description = {
        value: invDesc.length >= plDesc.length ? invDesc : plDesc,
        sourceDocType: 'AGREED_BOTH',
        sourceDocName: 'ตรงกันทั้ง 2 เอกสาร',
        confidence: 90,
        hasConflict: false,
      };
    } else {
      summary.description = {
        value: invDesc,
        sourceDocType: 'INVOICE',
        sourceDocName: invoiceDoc?.fileName,
        hasConflict: true,
        conflictOptions: [
          {
            docId: invoiceDoc!.id,
            docName: invoiceDoc!.fileName,
            docType: 'INVOICE',
            value: invDesc,
          },
          {
            docId: plDoc!.id,
            docName: plDoc!.fileName,
            docType: 'PACKING_LIST',
            value: plDesc,
          },
        ],
      };
    }
  } else if (invDesc) {
    summary.description = {
      value: invDesc,
      sourceDocId: invoiceDoc?.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc?.fileName,
      confidence: 88,
      hasConflict: false,
    };
  } else if (plDesc) {
    summary.description = {
      value: plDesc,
      sourceDocId: plDoc?.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc?.fileName,
      confidence: 88,
      hasConflict: false,
    };
  }
  summary.description = copyUserField('description', summary.description);

  // Quantity Comparison (Rule 18 & 21)
  const invQty = invoiceDoc?.ocrData?.packageCount || invoiceDoc?.ocrData?.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0;
  const plQty = plDoc?.ocrData?.packageCount || plDoc?.ocrData?.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0;

  if (invQty > 0 && plQty > 0) {
    if (invQty === plQty) {
      summary.quantity = {
        value: invQty,
        sourceDocType: 'AGREED_BOTH',
        sourceDocName: 'ตรงกันทั้ง 2 เอกสาร (Invoice: ' + invQty.toLocaleString() + ' = Packing List: ' + plQty.toLocaleString() + ')',
        confidence: 95,
        hasConflict: false,
      };
    } else {
      // Discrepancy! Alert user
      summary.quantity = {
        value: invQty, // initial default to invoice
        sourceDocType: 'INVOICE',
        sourceDocName: invoiceDoc?.fileName,
        hasConflict: true,
        conflictOptions: [
          {
            docId: invoiceDoc!.id,
            docName: invoiceDoc!.fileName,
            docType: 'INVOICE',
            value: invQty,
          },
          {
            docId: plDoc!.id,
            docName: plDoc!.fileName,
            docType: 'PACKING_LIST',
            value: plQty,
          },
        ],
      };
    }
  } else if (invQty > 0) {
    summary.quantity = {
      value: invQty,
      sourceDocId: invoiceDoc?.id,
      sourceDocType: 'INVOICE',
      sourceDocName: invoiceDoc?.fileName,
      confidence: 85,
      hasConflict: false,
    };
  } else if (plQty > 0) {
    summary.quantity = {
      value: plQty,
      sourceDocId: plDoc?.id,
      sourceDocType: 'PACKING_LIST',
      sourceDocName: plDoc?.fileName,
      confidence: 85,
      hasConflict: false,
    };
  }
  summary.quantity = copyUserField('quantity', summary.quantity);

  // Unit of Measurement
  const primaryUnit = invoiceDoc?.ocrData?.items?.[0]?.unit || plDoc?.ocrData?.items?.[0]?.unit || 'Bags';
  summary.unit = {
    value: primaryUnit,
    sourceDocType: invoiceDoc ? 'INVOICE' : 'PACKING_LIST',
    confidence: 85,
  };
  summary.unit = copyUserField('unit', summary.unit);

  // Calculate conflict totals
  const fieldsToCheck: (keyof UnifiedShipmentSummary)[] = [
    'invoiceNo', 'invoiceDate', 'shipperName', 'consigneeName',
    'description', 'quantity', 'totalNetWeightKg', 'totalGrossWeightKg', 'containerNo'
  ];

  let conflictCount = 0;
  for (const f of fieldsToCheck) {
    const fieldObj = summary[f] as MergedFieldSource<any>;
    if (fieldObj?.hasConflict && !fieldObj.isUserEdited && !fieldObj.userVerified) {
      conflictCount++;
    }
  }

  summary.hasConflicts = conflictCount > 0;
  summary.conflictCount = conflictCount;

  return summary;
}
