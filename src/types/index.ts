import { ExtractedShippingData } from '../services/ocr';

export type DocumentType = 'INVOICE' | 'PACKING_LIST' | 'BILL_OF_LADING' | 'COMBINED' | 'OTHER';

export type ContainerType = '20GP' | '40GP' | '40HC' | '20RF' | '40RF' | 'LCL';

export type Incoterm = 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'DDP' | 'DAP';

export type ShipmentStatus = 
  | 'DRAFT' 
  | 'BOOKED' 
  | 'CUSTOMS_CLEARED' 
  | 'LOADED' 
  | 'IN_TRANSIT' 
  | 'ARRIVED_PORT' 
  | 'DELIVERED' 
  | 'CANCELLED';

export interface LineItem {
  id: string;
  itemNo: number;
  description: string;
  hsCode?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  packageCount?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  cbm?: number;
}

export interface Shipment {
  id: string;
  invoiceNo: string;
  blNo?: string;
  bookingNo?: string;
  date: string;
  documentType: DocumentType;
  shipperName: string;
  shipperAddress?: string;
  consigneeName: string;
  consigneeAddress?: string;
  notifyParty?: string;
  pol: string; // Port of Loading e.g. "Laem Chabang (THLCH)"
  pod: string; // Port of Discharge e.g. "Los Angeles (USLAX)"
  vesselName: string;
  voyageNo: string;
  containerNo: string;
  containerType: ContainerType;
  sealNo: string;
  items: LineItem[];
  currency: 'USD' | 'THB' | 'EUR' | 'CNY';
  totalAmount: number;
  totalGrossWeightKg: number;
  totalNetWeightKg: number;
  totalCBM: number;
  incoterm: Incoterm;
  status: ShipmentStatus;
  notes?: string;
  sourceImageUrl?: string;
  documentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type OcrDocStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface ScannedDocumentItem {
  id: string; // Unique document ID
  documentId?: string; // Unique document ID alias
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // image/png, application/pdf, etc.
  file?: File; // Original File object
  docType: DocumentType;
  documentType?: DocumentType; // Alias
  status: OcrDocStatus;
  ocrStatus?: OcrDocStatus; // Alias
  progress: number;
  statusMessage?: string;
  originalUrl: string; // dataUrl or objectUrl
  thumbnailUrl?: string; // small thumbnail for light storage
  totalPages?: number;
  currentPage?: number;
  ocrData?: ExtractedShippingData;
  extractedFields?: ExtractedShippingData; // Alias
  rawText?: string;
  error?: string;
  uploadedAt: string;
}

export type FieldSourceType = DocumentType | 'USER_MANUAL' | 'AGREED_BOTH' | 'NONE';

export interface MergedFieldSource<T = any> {
  value: T;
  sourceDocId?: string;
  sourceDocType?: FieldSourceType;
  sourceDocName?: string;
  sourcePage?: number;
  confidence?: number;
  userVerified?: boolean;
  isUserEdited?: boolean;
  hasConflict?: boolean;
  conflictOptions?: {
    docId: string;
    docName: string;
    docType: DocumentType;
    value: T;
    confidence?: number;
  }[];
}

export interface UnifiedShipmentSummary {
  invoiceNo: MergedFieldSource<string>;
  invoiceDate: MergedFieldSource<string>;
  shipperName: MergedFieldSource<string>;
  consigneeName: MergedFieldSource<string>;
  description: MergedFieldSource<string>;
  quantity: MergedFieldSource<number>;
  unit: MergedFieldSource<string>;
  unitPrice: MergedFieldSource<number>;
  currency: MergedFieldSource<'USD' | 'THB' | 'EUR' | 'CNY'>;
  totalAmount: MergedFieldSource<number>;
  packageCount: MergedFieldSource<number>;
  totalNetWeightKg: MergedFieldSource<number>;
  totalGrossWeightKg: MergedFieldSource<number>;
  containerNo: MergedFieldSource<string>;
  sealNo: MergedFieldSource<string>;
  blNo: MergedFieldSource<string>;
  pol: MergedFieldSource<string>;
  pod: MergedFieldSource<string>;
  vesselName: MergedFieldSource<string>;
  voyageNo: MergedFieldSource<string>;
  hasConflicts: boolean;
  conflictCount: number;
  allVerified: boolean;
  lastUpdatedAt: string;
}

export type CrossCheckFieldStatus = 'MATCH' | 'MISMATCH' | 'MISSING_DATA' | 'REQUIRES_MANUAL_REVIEW';

export interface CrossCheckFieldResult {
  fieldName: string;
  labelThai: string;
  invoiceValue: string | number;
  packingListValue: string | number;
  status: CrossCheckFieldStatus;
  notes?: string;
}

export interface CrossCheckResult {
  invoiceDocId: string;
  invoiceName: string;
  packingListDocId: string;
  packingListName: string;
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
  matchCount: number;
  mismatchCount: number;
  missingCount: number;
  fields: CrossCheckFieldResult[];
  checkedAt: string;
}

export type ShippingLine = 'Maersk' | 'MSC' | 'ONE' | 'COSCO' | 'Evergreen' | 'CMA CGM' | 'Hapag-Lloyd';

export interface RouteWaypoint {
  name: string;
  lat: number;
  lng: number;
  status: 'passed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface Milestone {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'pending';
  note?: string;
}

export interface ContainerTracking {
  id: string;
  containerNo: string;
  blNo: string;
  bookingNo: string;
  shippingLine: ShippingLine;
  vesselName: string;
  voyage: string;
  containerType: ContainerType;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  currentStatus: 'GATE_IN' | 'CUSTOMS_CLEARED' | 'LOADED' | 'SAILING' | 'ARRIVED_PORT' | 'DISCHARGED' | 'DELIVERED';
  progressPercent: number;
  currentLocationName: string;
  currentCoordinates: { lat: number; lng: number };
  seaRoute: RouteWaypoint[];
  speedKnots: number;
  weatherStatus: string;
  temperatureCelsius?: number; // For Reefer containers
  humidityPercent?: number;
  isReefer: boolean;
  milestones: Milestone[];
  updatedAt: string;
}

export interface LocalCharges {
  thc: number; // Terminal Handling Charge THB
  blFee: number; // Bill of Lading documentation fee THB
  sealFee: number; // Container seal fee THB
  customsPaperwork: number; // Customs clearance & paperless THB
  portEntry: number; // Port gate entry THB
  inlandTrucking: number; // Trucking to port THB
  terminalSecurity: number; // Security / ISPS charge THB
}

export interface ExportCalculation {
  id: string;
  title: string;
  customerName: string;
  destinationPort: string;
  incoterm: Incoterm;
  containerType: ContainerType;
  containerQuantity: number;
  cargoValueTHB: number;
  exchangeRateUSDTHB: number;
  oceanFreightUSD: number;
  bunkerAdjustmentUSD: number; // BAF / Fuel Surcharge
  localChargesTHB: LocalCharges;
  marineInsuranceRatePercent: number;
  dutyTariffPercent: number;
  targetGrossMarginPercent: number;
  
  // Computed values
  oceanFreightTHB: number;
  totalFreightAndLocalTHB: number;
  insuranceTHB: number;
  cifValueTHB: number;
  tariffTHB: number;
  totalCostTHB: number;
  costPerContainerTHB: number;
  recommendedSellingPriceTHB: number;
  grossProfitTHB: number;
  grossProfitPerContainerTHB: number;
  createdAt: string;
}
