import { Shipment, ContainerTracking, ExportCalculation, ScannedDocumentItem } from '../types';

const DB_NAME = 'SeaExportAIDB';
const DB_VERSION = 1;

export const STORES = {
  SHIPMENTS: 'shipments',
  CONTAINERS: 'containers',
  CALCULATIONS: 'calculations',
  DOCUMENTS: 'documents',
} as const;

let dbInstance: IDBDatabase | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.SHIPMENTS)) {
        const shipmentStore = db.createObjectStore(STORES.SHIPMENTS, { keyPath: 'id' });
        shipmentStore.createIndex('invoiceNo', 'invoiceNo', { unique: false });
        shipmentStore.createIndex('containerNo', 'containerNo', { unique: false });
        shipmentStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CONTAINERS)) {
        const containerStore = db.createObjectStore(STORES.CONTAINERS, { keyPath: 'id' });
        containerStore.createIndex('containerNo', 'containerNo', { unique: false });
        containerStore.createIndex('blNo', 'blNo', { unique: false });
        containerStore.createIndex('shippingLine', 'shippingLine', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CALCULATIONS)) {
        db.createObjectStore(STORES.CALCULATIONS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// --- INITIAL SEED DATA ---
export const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 'shp-001',
    invoiceNo: 'INV-2026-TH0891',
    blNo: 'MSKU2026TH9921',
    bookingNo: 'BKG-LCH-99420',
    date: '2026-10-18',
    documentType: 'COMBINED',
    shipperName: 'Siam Agri-Food Global Co., Ltd. (Bangkok, Thailand)',
    shipperAddress: '88/12 Rama III Rd., Bang Phongphang, Yannawa, Bangkok 10120',
    consigneeName: 'Pacific Golden Grain Imports LLC (California, USA)',
    consigneeAddress: '2400 Harbor Blvd, Suite 400, Long Beach, CA 90802, USA',
    notifyParty: 'Same as Consignee',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Los Angeles (USLAX)',
    vesselName: 'MSC ADRIATIC',
    voyageNo: 'V.2610E',
    containerNo: 'MSKU8843210',
    containerType: '40HC',
    sealNo: 'TH-SL-884102',
    currency: 'USD',
    incoterm: 'CIF',
    status: 'IN_TRANSIT',
    totalGrossWeightKg: 24500,
    totalNetWeightKg: 24000,
    totalCBM: 58.4,
    totalAmount: 38400.00,
    notes: 'ข้าวหอมมะลิไทยเกรดพรีเมียม 100% บรรจุถุงสุญญากาศ 25 กก.',
    createdAt: '2026-10-18T08:30:00Z',
    updatedAt: '2026-10-21T14:20:00Z',
    items: [
      {
        id: 'itm-01',
        itemNo: 1,
        description: 'Thai Hom Mali Rice 100% Grade A (25kg PP Bag)',
        hsCode: '1006.30.90',
        qty: 960,
        unit: 'Bags',
        unitPrice: 40.00,
        totalAmount: 38400.00,
        packageCount: 960,
        netWeightKg: 24000,
        grossWeightKg: 24500,
        cbm: 58.4
      }
    ]
  },
  {
    id: 'shp-002',
    invoiceNo: 'INV-2026-EU4412',
    blNo: 'ONEU66723812',
    bookingNo: 'BKG-LCH-44128',
    date: '2026-10-15',
    documentType: 'COMBINED',
    shipperName: 'Andaman Frozen Marine Products PCL (Samut Sakhon, Thailand)',
    shipperAddress: '15/4 Setthakit 1 Rd., Tha Sai, Mueang Samut Sakhon 74000',
    consigneeName: 'Nordic Sea Trade BV (Rotterdam, Netherlands)',
    consigneeAddress: 'Maasvlakte 2, Haven 9200, 3199 LK Rotterdam, Netherlands',
    notifyParty: 'Rotterdam Customs Clearance Agency',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Rotterdam (NLRTM)',
    vesselName: 'ONE HARMONY',
    voyageNo: 'V.032W',
    containerNo: 'ONEU9941230',
    containerType: '40RF',
    sealNo: 'RF-991204',
    currency: 'USD',
    incoterm: 'CIF',
    status: 'IN_TRANSIT',
    totalGrossWeightKg: 19800,
    totalNetWeightKg: 18500,
    totalCBM: 45.2,
    totalAmount: 92500.00,
    notes: 'กุ้งกุลาดำแช่แข็ง IQF (-18 องศาเซลเซียส ตู้ควบคุมอุณหภูมิ Reefer)',
    createdAt: '2026-10-15T09:15:00Z',
    updatedAt: '2026-10-22T06:00:00Z',
    items: [
      {
        id: 'itm-02',
        itemNo: 1,
        description: 'Frozen Black Tiger Shrimp Headless Shell-On (IQF -18C)',
        hsCode: '0306.17.10',
        qty: 1850,
        unit: 'Cartons',
        unitPrice: 50.00,
        totalAmount: 92500.00,
        packageCount: 1850,
        netWeightKg: 18500,
        grossWeightKg: 19800,
        cbm: 45.2
      }
    ]
  },
  {
    id: 'shp-003',
    invoiceNo: 'INV-2026-JP0034',
    blNo: 'COSU88234120',
    bookingNo: 'BKG-BKK-11029',
    date: '2026-10-20',
    documentType: 'INVOICE',
    shipperName: 'Eastern Precision Auto Parts Thailand Co., Ltd.',
    shipperAddress: 'Amata City Chonburi Industrial Estate, Chonburi 20000',
    consigneeName: 'Kanto Motor Assembly Parts Ltd. (Yokohama, Japan)',
    consigneeAddress: 'Daiko-cho, Tsurumi-ku, Yokohama, Kanagawa 230-0053, Japan',
    pol: 'Bangkok Port (THBKK)',
    pod: 'Port of Tokyo (JPTYO)',
    vesselName: 'COSCO PACIFIC',
    voyageNo: 'V.114N',
    containerNo: 'COSU8823412',
    containerType: '20GP',
    sealNo: 'CS-771239',
    currency: 'USD',
    incoterm: 'FOB',
    status: 'CUSTOMS_CLEARED',
    totalGrossWeightKg: 14200,
    totalNetWeightKg: 13500,
    totalCBM: 28.0,
    totalAmount: 48600.00,
    notes: 'ชิ้นส่วนประกอบยานยนต์ อะลูมิเนียมหล่อขึ้นรูป',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-22T11:00:00Z',
    items: [
      {
        id: 'itm-03',
        itemNo: 1,
        description: 'Aluminium Die-Casting Transmission Brackets for Auto',
        hsCode: '8708.29.90',
        qty: 600,
        unit: 'Crins',
        unitPrice: 81.00,
        totalAmount: 48600.00,
        packageCount: 60,
        netWeightKg: 13500,
        grossWeightKg: 14200,
        cbm: 28.0
      }
    ]
  },
  {
    id: 'shp-004',
    invoiceNo: 'INV-2026-SG7710',
    blNo: 'MAEU44192019',
    bookingNo: 'BKG-LCH-77100',
    date: '2026-10-10',
    documentType: 'PACKING_LIST',
    shipperName: 'Thai Circuit Microelectronics PCL (Pathum Thani)',
    shipperAddress: 'Navanakorn Industrial Estate, Khlong Luang, Pathum Thani 12120',
    consigneeName: 'Apex Data Tech Singapore Pte Ltd',
    consigneeAddress: 'Tuas South Ave 8, Singapore 637000',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Singapore (SGSIN)',
    vesselName: 'MAERSK SEMBAWANG',
    voyageNo: 'V.880S',
    containerNo: 'MSCU5567812',
    containerType: '20GP',
    sealNo: 'MK-128890',
    currency: 'USD',
    incoterm: 'CIF',
    status: 'DELIVERED',
    totalGrossWeightKg: 8500,
    totalNetWeightKg: 7800,
    totalCBM: 18.5,
    totalAmount: 112000.00,
    notes: 'แผงวงจรพิมพ์อิเล็กทรอนิกส์ (PCB Assemblies) ส่งมอบปลายทางเรียบร้อย',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-18T16:00:00Z',
    items: [
      {
        id: 'itm-04',
        itemNo: 1,
        description: 'Multilayer Printed Circuit Board Assemblies (PCBA)',
        hsCode: '8534.00.00',
        qty: 2500,
        unit: 'Units',
        unitPrice: 44.80,
        totalAmount: 112000.00,
        packageCount: 125,
        netWeightKg: 7800,
        grossWeightKg: 8500,
        cbm: 18.5
      }
    ]
  }
];

export const INITIAL_CONTAINERS: ContainerTracking[] = [
  {
    id: 'cnt-001',
    containerNo: 'MSKU8843210',
    blNo: 'MSKU2026TH9921',
    bookingNo: 'BKG-LCH-99420',
    shippingLine: 'MSC',
    vesselName: 'MSC ADRIATIC',
    voyage: 'V.2610E',
    containerType: '40HC',
    pol: 'Laem Chabang (THLCH)',
    pod: 'Los Angeles (USLAX)',
    etd: '2026-10-19 18:00',
    eta: '2026-11-04 07:00',
    currentStatus: 'SAILING',
    progressPercent: 38,
    currentLocationName: 'มหาสมุทรแปซิฟิก (Pacific Ocean - East of Taiwan)',
    currentCoordinates: { lat: 21.8, lng: 124.5 },
    speedKnots: 19.4,
    weatherStatus: 'คลื่นลมสงบ (Calm Sea, Wave 1.2m)',
    isReefer: false,
    updatedAt: '2026-10-22 14:30',
    seaRoute: [
      { name: 'ท่าเรือแหลมฉบัง (Laem Chabang)', lat: 13.08, lng: 100.88, status: 'passed', timestamp: '19 ต.ค. 18:00' },
      { name: 'อ่าวไทย (Gulf of Thailand)', lat: 10.50, lng: 102.10, status: 'passed', timestamp: '20 ต.ค. 06:00' },
      { name: 'ทะเลจีนใต้ (South China Sea)', lat: 15.20, lng: 114.50, status: 'passed', timestamp: '21 ต.ค. 12:00' },
      { name: 'ช่องแคบลูซอน (Luzon Strait)', lat: 20.50, lng: 121.80, status: 'passed', timestamp: '22 ต.ค. 02:00' },
      { name: 'ตำแหน่งปัจจุบันเรือ (Current Position)', lat: 21.80, lng: 124.50, status: 'current', timestamp: '22 ต.ค. 14:30' },
      { name: 'จุดตัดกึ่งกลางแปซิฟิก (Mid-Pacific Waypoint)', lat: 28.00, lng: 165.00, status: 'upcoming', timestamp: '27 ต.ค.' },
      { name: 'น่านน้ำชายฝั่งแคลิฟอร์เนีย (West Coast USA)', lat: 33.50, lng: -120.00, status: 'upcoming', timestamp: '03 พ.ย.' },
      { name: 'ท่าเรือลอสแองเจลิส (Port of Los Angeles)', lat: 33.74, lng: -118.26, status: 'upcoming', timestamp: '04 พ.ย. 07:00' }
    ],
    milestones: [
      { id: 'm-1', title: 'ตู้เข้าลานท่าเรือ (Gate-in)', location: 'Laem Chabang Terminal D', timestamp: '2026-10-18 10:30', status: 'completed' },
      { id: 'm-2', title: 'ตรวจปล่อยพิธีการศุลกากร (Customs Cleared)', location: 'Customs Office THLCH', timestamp: '2026-10-18 15:45', status: 'completed' },
      { id: 'm-3', title: 'ยกตู้ขึ้นเรือสินค้า (Loaded on Vessel)', location: 'Berth D1, MSC ADRIATIC', timestamp: '2026-10-19 14:10', status: 'completed' },
      { id: 'm-4', title: 'เรือออกเดินทางจากท่าเรือ (Vessel Departed)', location: 'Laem Chabang Port', timestamp: '2026-10-19 18:00', status: 'completed' },
      { id: 'm-5', title: 'กำลังเดินทางในทะเล (In Transit at Sea)', location: 'Pacific Ocean (East of Taiwan)', timestamp: '2026-10-22 14:30', status: 'in_progress', note: 'ความเร็ว 19.4 นอต อุณหภูมิปกติ' },
      { id: 'm-6', title: 'เรือเทียบท่าปลายทาง (Vessel Berthing)', location: 'Port of Los Angeles Pier 400', timestamp: '2026-11-04 07:00 (Est.)', status: 'pending' },
      { id: 'm-7', title: 'ยกตู้ลงจากเรือและส่งมอบ (Discharge & Delivery)', location: 'USLAX Terminal Area', timestamp: '2026-11-05 16:00 (Est.)', status: 'pending' }
    ]
  },
  {
    id: 'cnt-002',
    containerNo: 'ONEU9941230',
    blNo: 'ONEU66723812',
    bookingNo: 'BKG-LCH-44128',
    shippingLine: 'ONE',
    vesselName: 'ONE HARMONY',
    voyage: 'V.032W',
    containerType: '40RF',
    pol: 'Laem Chabang (THLCH)',
    pod: 'Rotterdam (NLRTM)',
    etd: '2026-10-16 22:00',
    eta: '2026-11-12 14:00',
    currentStatus: 'SAILING',
    progressPercent: 24,
    currentLocationName: 'มหาสมุทรอินเดีย (Indian Ocean - Off Sri Lanka)',
    currentCoordinates: { lat: 5.8, lng: 80.2 },
    speedKnots: 20.8,
    weatherStatus: 'คลื่นปานกลาง (Moderate, Wind 14 kts)',
    isReefer: true,
    temperatureCelsius: -18.2,
    humidityPercent: 88,
    updatedAt: '2026-10-22 13:00',
    seaRoute: [
      { name: 'ท่าเรือแหลมฉบัง (Laem Chabang)', lat: 13.08, lng: 100.88, status: 'passed', timestamp: '16 ต.ค. 22:00' },
      { name: 'ช่องแคบมะละกา (Malacca Strait)', lat: 2.50, lng: 101.50, status: 'passed', timestamp: '18 ต.ค. 04:00' },
      { name: 'สิงคโปร์ (Singapore Strait)', lat: 1.25, lng: 103.80, status: 'passed', timestamp: '18 ต.ค. 18:00' },
      { name: 'ตำแหน่งปัจจุบันเรือ (Current Position)', lat: 5.80, lng: 80.20, status: 'current', timestamp: '22 ต.ค. 13:00' },
      { name: 'คลองสุเอซ (Suez Canal Transit)', lat: 29.97, lng: 32.55, status: 'upcoming', timestamp: '01 พ.ย.' },
      { name: 'ทะเลเมดิเตอร์เรเนียน (Mediterranean Sea)', lat: 35.00, lng: 18.00, status: 'upcoming', timestamp: '05 พ.ย.' },
      { name: 'ช่องแคบยิบรอลตาร์ (Gibraltar)', lat: 35.95, lng: -5.60, status: 'upcoming', timestamp: '08 พ.ย.' },
      { name: 'ท่าเรือรอตเตอร์ดัม (Port of Rotterdam)', lat: 51.92, lng: 4.47, status: 'upcoming', timestamp: '12 พ.ย. 14:00' }
    ],
    milestones: [
      { id: 'm-21', title: 'ตู้เข้าลานและเสียบปลั๊กไฟ Reefer', location: 'Laem Chabang Reefer Yard', timestamp: '2026-10-15 14:00', status: 'completed' },
      { id: 'm-22', title: 'ศุลกากรตรวจปล่อยของแช่แข็ง', location: 'THLCH Customs', timestamp: '2026-10-16 11:30', status: 'completed' },
      { id: 'm-23', title: 'โหลดขึ้นเรือ ONE HARMONY', location: 'Laem Chabang Terminal B', timestamp: '2026-10-16 19:40', status: 'completed' },
      { id: 'm-24', title: 'เรือออกเดินทาง (Sailed)', location: 'Laem Chabang', timestamp: '2026-10-16 22:00', status: 'completed' },
      { id: 'm-25', title: 'เดินทางผ่านมหาสมุทรอินเดีย', location: 'Indian Ocean (Sri Lanka)', timestamp: '2026-10-22 13:00', status: 'in_progress', note: 'อุณหภูมิตู้ Reefer -18.2°C สภาพคงที่' },
      { id: 'm-26', title: 'ผ่านคลองสุเอซ (Suez Transit)', location: 'Egypt Port Said', timestamp: '2026-11-01 (Est.)', status: 'pending' },
      { id: 'm-27', title: 'เทียบท่ารอตเตอร์ดัม', location: 'Port of Rotterdam Haven 9200', timestamp: '2026-11-12 14:00 (Est.)', status: 'pending' }
    ]
  },
  {
    id: 'cnt-003',
    containerNo: 'COSU8823412',
    blNo: 'COSU88234120',
    bookingNo: 'BKG-BKK-11029',
    shippingLine: 'COSCO',
    vesselName: 'COSCO PACIFIC',
    voyage: 'V.114N',
    containerType: '20GP',
    pol: 'Bangkok Port (THBKK)',
    pod: 'Tokyo (JPTYO)',
    etd: '2026-10-23 06:00',
    eta: '2026-10-30 18:00',
    currentStatus: 'CUSTOMS_CLEARED',
    progressPercent: 15,
    currentLocationName: 'ลานเทียบเรือท่าเรือกรุงเทพ (คลองเตย BKK Port)',
    currentCoordinates: { lat: 13.70, lng: 100.58 },
    speedKnots: 0.0,
    weatherStatus: 'ท้องฟ้าแจ่มใส (Clear Sky)',
    isReefer: false,
    updatedAt: '2026-10-22 11:00',
    seaRoute: [
      { name: 'ท่าเรือกรุงเทพ (Bangkok Port)', lat: 13.70, lng: 100.58, status: 'current', timestamp: '22 ต.ค. 11:00' },
      { name: 'ปากน้ำสมุทรปราการ (Chao Phraya Estuary)', lat: 13.55, lng: 100.60, status: 'upcoming', timestamp: '23 ต.ค. 06:00' },
      { name: 'ทะเลจีนใต้ (South China Sea)', lat: 16.00, lng: 112.00, status: 'upcoming', timestamp: '25 ต.ค.' },
      { name: 'ช่องแคบโอกินาวา (Okinawa Channel)', lat: 26.50, lng: 128.00, status: 'upcoming', timestamp: '28 ต.ค.' },
      { name: 'ท่าเรือโตเกียว (Port of Tokyo)', lat: 35.62, lng: 139.78, status: 'upcoming', timestamp: '30 ต.ค. 18:00' }
    ],
    milestones: [
      { id: 'm-31', title: 'ตู้เข้าลานท่าเรือกรุงเทพ', location: 'Bangkok Port Klongtoey', timestamp: '2026-10-20 14:20', status: 'completed' },
      { id: 'm-32', title: 'ศุลกากรท่าเรือกรุงเทพตรวจปล่อย', location: 'Customs Klongtoey', timestamp: '2026-10-21 16:00', status: 'completed' },
      { id: 'm-33', title: 'รอโหลดขึ้นเรือ COSCO PACIFIC', location: 'Berth 20B Bangkok Port', timestamp: '2026-10-22 11:00', status: 'in_progress', note: 'กำหนดการโหลดคืนนี้ 22:00' },
      { id: 'm-34', title: 'เรือออกเดินทาง (ETD)', location: 'Bangkok Port', timestamp: '2026-10-23 06:00', status: 'pending' },
      { id: 'm-35', title: 'เทียบท่าโตเกียว (ETA)', location: 'Tokyo Container Terminal', timestamp: '2026-10-30 18:00', status: 'pending' }
    ]
  },
  {
    id: 'cnt-004',
    containerNo: 'MSCU5567812',
    blNo: 'MAEU44192019',
    bookingNo: 'BKG-LCH-77100',
    shippingLine: 'Maersk',
    vesselName: 'MAERSK SEMBAWANG',
    voyage: 'V.880S',
    containerType: '20GP',
    pol: 'Laem Chabang (THLCH)',
    pod: 'Singapore (SGSIN)',
    etd: '2026-10-12 10:00',
    eta: '2026-10-15 16:00',
    currentStatus: 'DELIVERED',
    progressPercent: 100,
    currentLocationName: 'ส่งมอบคลังสินค้าลูกค้าปลายทาง (Apex Singapore Tuas)',
    currentCoordinates: { lat: 1.30, lng: 103.65 },
    speedKnots: 0.0,
    weatherStatus: 'จัดส่งสำเร็จ (Delivered)',
    isReefer: false,
    updatedAt: '2026-10-18 16:00',
    seaRoute: [
      { name: 'ท่าเรือแหลมฉบัง (Laem Chabang)', lat: 13.08, lng: 100.88, status: 'passed', timestamp: '12 ต.ค. 10:00' },
      { name: 'อ่าวไทย (Gulf of Thailand)', lat: 9.00, lng: 103.00, status: 'passed', timestamp: '13 ต.ค. 04:00' },
      { name: 'ท่าเรือสิงคโปร์ (PSA Singapore)', lat: 1.27, lng: 103.82, status: 'passed', timestamp: '15 ต.ค. 16:00' },
      { name: 'คลังสินค้าปลายทาง (Tuas Warehouse)', lat: 1.30, lng: 103.65, status: 'passed', timestamp: '18 ต.ค. 16:00' }
    ],
    milestones: [
      { id: 'm-41', title: 'ตู้เข้าลานและศุลกากรตรวจปล่อย', location: 'Laem Chabang', timestamp: '2026-10-11 15:00', status: 'completed' },
      { id: 'm-42', title: 'เรือเดินทางถึงสิงคโปร์ (Arrived PSA)', location: 'PSA Singapore Terminal', timestamp: '2026-10-15 16:00', status: 'completed' },
      { id: 'm-43', title: 'ยกตู้ลงจากเรือและตรวจรับรอง', location: 'PSA Berth 12', timestamp: '2026-10-16 09:30', status: 'completed' },
      { id: 'm-44', title: 'รถหัวลากนำส่งถึงโรงงานลูกค้า (Delivered)', location: 'Apex Data Tech Tuas, Singapore', timestamp: '2026-10-18 16:00', status: 'completed', note: 'ลงนามรับมอบสินค้าสมบูรณ์ 100%' }
    ]
  }
];

export const INITIAL_CALCULATIONS: ExportCalculation[] = [
  {
    id: 'calc-001',
    title: 'ส่งออกข้าวหอมมะลิไป LA (FCL 40HC x 2 ตู้)',
    customerName: 'Pacific Golden Grain Imports LLC',
    destinationPort: 'Los Angeles (USLAX)',
    incoterm: 'CIF',
    containerType: '40HC',
    containerQuantity: 2,
    cargoValueTHB: 2600000,
    exchangeRateUSDTHB: 35.50,
    oceanFreightUSD: 3200,
    bunkerAdjustmentUSD: 300,
    localChargesTHB: {
      thc: 4800,
      blFee: 1200,
      sealFee: 300,
      customsPaperwork: 2500,
      portEntry: 600,
      inlandTrucking: 7500,
      terminalSecurity: 400
    },
    marineInsuranceRatePercent: 0.25,
    dutyTariffPercent: 0,
    targetGrossMarginPercent: 18,
    oceanFreightTHB: 248500, // (3200 + 300) * 35.50 * 2
    totalFreightAndLocalTHB: 283100,
    insuranceTHB: 7150,
    cifValueTHB: 2890250,
    tariffTHB: 0,
    totalCostTHB: 2890250,
    costPerContainerTHB: 1445125,
    recommendedSellingPriceTHB: 3524695,
    grossProfitTHB: 634445,
    grossProfitPerContainerTHB: 317222.5,
    createdAt: '2026-10-18T10:15:00Z'
  }
];

// Seed DB on start
export const initDB = async (): Promise<void> => {
  const db = await openDB();

  // Check shipments count
  const shipmentCount = await countStore(db, STORES.SHIPMENTS);
  if (shipmentCount === 0) {
    const tx = db.transaction([STORES.SHIPMENTS, STORES.CONTAINERS, STORES.CALCULATIONS], 'readwrite');
    const shipStore = tx.objectStore(STORES.SHIPMENTS);
    const contStore = tx.objectStore(STORES.CONTAINERS);
    const calcStore = tx.objectStore(STORES.CALCULATIONS);

    for (const item of INITIAL_SHIPMENTS) {
      shipStore.put(item);
    }
    for (const item of INITIAL_CONTAINERS) {
      contStore.put(item);
    }
    for (const item of INITIAL_CALCULATIONS) {
      calcStore.put(item);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};

const countStore = (db: IDBDatabase, storeName: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => reject(countReq.error);
  });
};

// --- SHIPMENTS API ---
export const getShipments = async (): Promise<Shipment[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SHIPMENTS, 'readonly');
    const store = tx.objectStore(STORES.SHIPMENTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as Shipment[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

export const saveShipment = async (shipment: Shipment): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SHIPMENTS, 'readwrite');
    const store = tx.objectStore(STORES.SHIPMENTS);
    const req = store.put(shipment);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteShipment = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SHIPMENTS, 'readwrite');
    const store = tx.objectStore(STORES.SHIPMENTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- CONTAINERS API ---
export const getContainers = async (): Promise<ContainerTracking[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTAINERS, 'readonly');
    const store = tx.objectStore(STORES.CONTAINERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ContainerTracking[]);
    req.onerror = () => reject(req.error);
  });
};

export const saveContainer = async (container: ContainerTracking): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
    const store = tx.objectStore(STORES.CONTAINERS);
    const req = store.put(container);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteContainer = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
    const store = tx.objectStore(STORES.CONTAINERS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- CALCULATIONS API ---
export const getCalculations = async (): Promise<ExportCalculation[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULATIONS, 'readonly');
    const store = tx.objectStore(STORES.CALCULATIONS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as ExportCalculation[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

export const saveCalculation = async (calc: ExportCalculation): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULATIONS, 'readwrite');
    const store = tx.objectStore(STORES.CALCULATIONS);
    const req = store.put(calc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteCalculation = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULATIONS, 'readwrite');
    const store = tx.objectStore(STORES.CALCULATIONS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- SCANNED DOCUMENTS API ---
export const getScannedDocuments = async (): Promise<ScannedDocumentItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORES.DOCUMENTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ScannedDocumentItem[]);
    req.onerror = () => reject(req.error);
  });
};

export const saveScannedDocument = async (doc: ScannedDocumentItem): Promise<void> => {
  const db = await openDB();
  // Strip huge dataUrl if exceeding 1MB to prevent IndexedDB quota exhaustion on iPad
  const docToStore = { ...doc };
  if (docToStore.originalUrl && docToStore.originalUrl.length > 1000000) {
    // Keep lightweight thumbnail or first 200kb
    docToStore.thumbnailUrl = docToStore.thumbnailUrl || docToStore.originalUrl.substring(0, 50000);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORES.DOCUMENTS);
    const req = store.put(docToStore);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const deleteScannedDocument = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORES.DOCUMENTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- RESET & BACKUP TOOLS ---
export const resetToDefaultData = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([STORES.SHIPMENTS, STORES.CONTAINERS, STORES.CALCULATIONS], 'readwrite');
  tx.objectStore(STORES.SHIPMENTS).clear();
  tx.objectStore(STORES.CONTAINERS).clear();
  tx.objectStore(STORES.CALCULATIONS).clear();

  for (const item of INITIAL_SHIPMENTS) {
    tx.objectStore(STORES.SHIPMENTS).put(item);
  }
  for (const item of INITIAL_CONTAINERS) {
    tx.objectStore(STORES.CONTAINERS).put(item);
  }
  for (const item of INITIAL_CALCULATIONS) {
    tx.objectStore(STORES.CALCULATIONS).put(item);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const exportDatabaseJSON = async (): Promise<string> => {
  const shipments = await getShipments();
  const containers = await getContainers();
  const calculations = await getCalculations();
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    shipments,
    containers,
    calculations
  }, null, 2);
};

export const importDatabaseJSON = async (jsonString: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.shipments && !data.containers) {
      throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
    }
    const db = await openDB();
    const tx = db.transaction([STORES.SHIPMENTS, STORES.CONTAINERS, STORES.CALCULATIONS], 'readwrite');
    
    if (Array.isArray(data.shipments)) {
      const sStore = tx.objectStore(STORES.SHIPMENTS);
      sStore.clear();
      for (const item of data.shipments) sStore.put(item);
    }
    if (Array.isArray(data.containers)) {
      const cStore = tx.objectStore(STORES.CONTAINERS);
      cStore.clear();
      for (const item of data.containers) cStore.put(item);
    }
    if (Array.isArray(data.calculations)) {
      const kStore = tx.objectStore(STORES.CALCULATIONS);
      kStore.clear();
      for (const item of data.calculations) kStore.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Import error:', err);
    throw err;
  }
};
