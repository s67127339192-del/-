import { 
  VesselBooking, 
  VesselTracking, 
  BerthAssignment, 
  PortContainer, 
  TariffConfig, 
  ExportCalculationRecord 
} from '../types';

const DB_NAME = 'SeaExportSmartPortDB';
const DB_VERSION = 3;

export const STORES = {
  BOOKINGS: 'bookings',
  VESSEL_TRACKING: 'vessel_tracking',
  BERTHS: 'berths',
  CONTAINERS: 'containers',
  TARIFFS: 'tariffs',
  CALCULATIONS: 'calculations',
} as const;

let dbInstance: IDBDatabase | null = null;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.BOOKINGS)) {
        const store = db.createObjectStore(STORES.BOOKINGS, { keyPath: 'id' });
        store.createIndex('bookingId', 'bookingId', { unique: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('shippingLine', 'shippingLine', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.VESSEL_TRACKING)) {
        const store = db.createObjectStore(STORES.VESSEL_TRACKING, { keyPath: 'id' });
        store.createIndex('bookingId', 'bookingId', { unique: false });
        store.createIndex('currentStatus', 'currentStatus', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.BERTHS)) {
        const store = db.createObjectStore(STORES.BERTHS, { keyPath: 'id' });
        store.createIndex('berthCode', 'berthCode', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CONTAINERS)) {
        const store = db.createObjectStore(STORES.CONTAINERS, { keyPath: 'id' });
        store.createIndex('containerNo', 'containerNo', { unique: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('yardZone', 'yardZone', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.TARIFFS)) {
        db.createObjectStore(STORES.TARIFFS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.CALCULATIONS)) {
        db.createObjectStore(STORES.CALCULATIONS, { keyPath: 'id' });
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

// ==========================================
// DEFAULT SEED DEMO DATA (Labeled [DEMO])
// ==========================================

export const DEFAULT_TARIFFS: TariffConfig = {
  oceanFreight20GP: 950,
  oceanFreight40HC: 2200,
  thcOriginTHB: 4200,
  thcDestUSD: 180,
  wharfageRateTHB: 95,
  storagePerDayAfterFreeTHB: 450,
  freeTimeDays: 3,
  docFeeTHB: 1200,
  customsClearanceTHB: 2500,
  bafUSD: 150,
  exchangeRateTHBPerUSD: 36.5,
};

export const INITIAL_BOOKINGS: VesselBooking[] = [
  {
    id: 'bkg-001',
    bookingId: 'BKG-2026-081',
    shippingLine: 'Maersk Line',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    voyageNo: '2601W',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Singapore (SGSIN)',
    etd: '2026-10-24 14:00',
    eta: '2026-10-27 06:00',
    containerType: '40HC',
    quantity: 8,
    cargoDescription: 'Thai Hom Mali Rice 100% Grade A (ส่งออกข้าวหอมมะลิ)',
    shipperName: 'Siam Agri-Food Global Co., Ltd. (กรุงเทพฯ)',
    consigneeName: 'SingaFood Commodities Pte Ltd (สิงคโปร์)',
    status: 'CONFIRMED',
    freightAmountUSD: 7600,
    assignedBerth: 'A1',
    notes: 'ตู้สินค้าต้องผ่านการตรวจสอบรมยาและใบรับรองสุขอนามัยพืช',
    isDemo: true,
    createdAt: '2026-10-20 10:00',
    updatedAt: '2026-10-22 15:30',
  },
  {
    id: 'bkg-002',
    bookingId: 'BKG-2026-082',
    shippingLine: 'Ocean Network Express (ONE)',
    vesselName: 'ONE APUS',
    voyageNo: '0114E',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Los Angeles (USLAX)',
    etd: '2026-10-25 18:00',
    eta: '2026-11-12 08:00',
    containerType: '40HC',
    quantity: 12,
    cargoDescription: 'Natural Rubber TSR20 in Pallets (ยางพาราแท่งแปรรูป)',
    shipperName: 'Thai Eastern Rubber Industry PCL (ระยอง)',
    consigneeName: 'Pacific Rim Tire & Rubber Imports LLC (สหรัฐฯ)',
    status: 'BOOKED',
    freightAmountUSD: 26400,
    assignedBerth: 'B1',
    notes: 'น้ำหนักตู้ต้องปฏิบัติตามมาตรฐาน VGM อย่างเคร่งครัด',
    isDemo: true,
    createdAt: '2026-10-21 09:15',
    updatedAt: '2026-10-21 09:15',
  },
  {
    id: 'bkg-003',
    bookingId: 'BKG-2026-083',
    shippingLine: 'MSC',
    vesselName: 'MSC OSCAR',
    voyageNo: 'MS2609',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Rotterdam (NLRTM)',
    etd: '2026-10-26 10:00',
    eta: '2026-11-20 12:00',
    containerType: '40GP',
    quantity: 6,
    cargoDescription: 'Automotive Engine Parts & Electronics (ชิ้นส่วนยานยนต์)',
    shipperName: 'Siam Auto Components Mfg Co., Ltd. (สมุทรปราการ)',
    consigneeName: 'EuroAuto Logistics B.V. (เนเธอร์แลนด์)',
    status: 'CONFIRMED',
    freightAmountUSD: 13800,
    assignedBerth: 'A2',
    notes: 'สินค้ามูลค่าสูง ต้องการสายรัด High-Security Bolt Seal',
    isDemo: true,
    createdAt: '2026-10-19 14:20',
    updatedAt: '2026-10-22 11:00',
  },
  {
    id: 'bkg-004',
    bookingId: 'BKG-2026-084',
    shippingLine: 'Evergreen Marine',
    vesselName: 'EVER GIVEN',
    voyageNo: '0845-032B',
    pol: 'Bangkok Port (THBKK)',
    pod: 'Port of Tokyo (JPTYO)',
    etd: '2026-10-27 16:00',
    eta: '2026-11-04 10:00',
    containerType: '40RF',
    quantity: 4,
    cargoDescription: 'Frozen Black Tiger Prawns (กุ้งกุลาดำแช่เยือกแข็ง -20°C)',
    shipperName: 'Andaman Seafoods Cold Chain Ltd. (สมุทรสาคร)',
    consigneeName: 'Tokyo Central Marine Foods K.K. (ญี่ปุ่น)',
    status: 'BOOKED',
    freightAmountUSD: 14000,
    assignedBerth: 'C1',
    notes: 'ตู้ Reefer ควบคุมอุณหภูมิ -20°C พร้อม Data Logger',
    isDemo: true,
    createdAt: '2026-10-22 08:30',
    updatedAt: '2026-10-22 08:30',
  },
  {
    id: 'bkg-005',
    bookingId: 'BKG-2026-085',
    shippingLine: 'COSCO Shipping',
    vesselName: 'COSCO SHIPPING UNIVERSE',
    voyageNo: 'CS8821',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Shanghai (CNSHA)',
    etd: '2026-10-28 08:00',
    eta: '2026-11-03 14:00',
    containerType: '20GP',
    quantity: 15,
    cargoDescription: 'Polypropylene Granules (เม็ดพลาสติก PP Resin)',
    shipperName: 'Thai Petrochem Polymer Solutions PCL (ระยอง)',
    consigneeName: 'Shanghai Global Plastics Trading Co. (จีน)',
    status: 'CONFIRMED',
    freightAmountUSD: 10500,
    assignedBerth: 'B2',
    notes: 'จัดส่งเข้าลานตู้ Zone B ลานคอนเทนเนอร์ 20 ฟุต',
    isDemo: true,
    createdAt: '2026-10-20 16:45',
    updatedAt: '2026-10-21 17:10',
  },
];

export const INITIAL_TRACKING: VesselTracking[] = [
  {
    id: 'trk-001',
    bookingId: 'BKG-2026-081',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    shippingLine: 'Maersk Line',
    voyageNo: '2601W',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Singapore (SGSIN)',
    etd: '2026-10-24 14:00',
    eta: '2026-10-27 06:00',
    currentStatus: 'AT_SEA',
    lat: 7.82,
    lng: 103.15,
    speedKnots: 18.4,
    headingDeg: 195,
    nauticalMilesTotal: 850,
    nauticalMilesCompleted: 510,
    etaCountdownHours: 19,
    currentLocationName: 'อ่าวไทยตอนล่าง มุ่งหน้าสู่ช่องแคบมะละกา',
    waypoints: [
      { name: 'แหลมฉบัง (POL)', lat: 13.08, lng: 100.88, reached: true },
      { name: 'เกาะกูด (Waypoint 1)', lat: 11.65, lng: 102.50, reached: true },
      { name: 'กลางอ่าวไทย (Waypoint 2)', lat: 9.50, lng: 101.80, reached: true },
      { name: 'นอกชายฝั่งสงขลา (Waypoint 3)', lat: 7.82, lng: 103.15, reached: true },
      { name: 'ช่องแคบมะละกาตอนบน', lat: 3.50, lng: 100.50, reached: false },
      { name: 'ท่าเรือสิงคโปร์ (POD)', lat: 1.29, lng: 103.85, reached: false },
    ],
    isDemo: true,
    lastUpdated: '2026-10-23 09:30',
  },
  {
    id: 'trk-002',
    bookingId: 'BKG-2026-082',
    vesselName: 'ONE APUS',
    shippingLine: 'Ocean Network Express (ONE)',
    voyageNo: '0114E',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Los Angeles (USLAX)',
    etd: '2026-10-25 18:00',
    eta: '2026-11-12 08:00',
    currentStatus: 'BERTHED',
    lat: 13.08,
    lng: 100.88,
    speedKnots: 0.0,
    headingDeg: 0,
    nauticalMilesTotal: 8400,
    nauticalMilesCompleted: 0,
    etaCountdownHours: 460,
    currentLocationName: 'เทียบท่า Berth B1 ท่าเรือแหลมฉบัง (กำลังโหลดสินค้า)',
    waypoints: [
      { name: 'ท่าเทียบเรือ B1 แหลมฉบัง', lat: 13.08, lng: 100.88, reached: true },
      { name: 'ช่องแคบฟิลิปปินส์', lat: 14.50, lng: 120.50, reached: false },
      { name: 'มหาสมุทรแปซิฟิกเหนือ', lat: 28.00, lng: 165.00, reached: false },
      { name: 'ท่าเรือลอสแอนเจลิส (USLAX)', lat: 33.74, lng: -118.26, reached: false },
    ],
    isDemo: true,
    lastUpdated: '2026-10-23 10:00',
  },
  {
    id: 'trk-003',
    bookingId: 'BKG-2026-083',
    vesselName: 'MSC OSCAR',
    shippingLine: 'MSC',
    voyageNo: 'MS2609',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Rotterdam (NLRTM)',
    etd: '2026-10-26 10:00',
    eta: '2026-11-20 12:00',
    currentStatus: 'ARRIVING',
    lat: 12.92,
    lng: 100.72,
    speedKnots: 8.2,
    headingDeg: 35,
    nauticalMilesTotal: 9200,
    nauticalMilesCompleted: 15,
    etaCountdownHours: 660,
    currentLocationName: 'บริเวณจุดรับนำร่อง (Pilot Station) อ่าวแหลมฉบัง',
    waypoints: [
      { name: 'จุดจอดทอดสมอนอกท่า', lat: 12.80, lng: 100.65, reached: true },
      { name: 'จุดรับพนักงานนำร่อง', lat: 12.92, lng: 100.72, reached: true },
      { name: 'ร่องน้ำทางเข้าท่าเรือ', lat: 13.02, lng: 100.82, reached: false },
      { name: 'เทียบท่า Berth A2', lat: 13.08, lng: 100.89, reached: false },
    ],
    isDemo: true,
    lastUpdated: '2026-10-23 10:15',
  },
  {
    id: 'trk-004',
    bookingId: 'BKG-2026-084',
    vesselName: 'EVER GIVEN',
    shippingLine: 'Evergreen Marine',
    voyageNo: '0845-032B',
    pol: 'Bangkok Port (THBKK)',
    pod: 'Port of Tokyo (JPTYO)',
    etd: '2026-10-27 16:00',
    eta: '2026-11-04 10:00',
    currentStatus: 'BOOKED',
    lat: 13.70,
    lng: 100.58,
    speedKnots: 0.0,
    headingDeg: 0,
    nauticalMilesTotal: 2950,
    nauticalMilesCompleted: 0,
    etaCountdownHours: 280,
    currentLocationName: 'ท่าเรือคลองเตย กรุงเทพฯ รอการตรวจปล่อยศุลกากร',
    waypoints: [
      { name: 'ท่าเรือกรุงเทพ (คลองเตย)', lat: 13.70, lng: 100.58, reached: true },
      { name: 'ปากน้ำสมุทรปราการ', lat: 13.55, lng: 100.60, reached: false },
      { name: 'ทะเลจีนใต้', lat: 18.00, lng: 115.00, reached: false },
      { name: 'ช่องแคบไต้หวัน', lat: 24.00, lng: 120.00, reached: false },
      { name: 'ท่าเรือโตเกียว (JPTYO)', lat: 35.62, lng: 139.78, reached: false },
    ],
    isDemo: true,
    lastUpdated: '2026-10-23 08:00',
  },
  {
    id: 'trk-005',
    bookingId: 'BKG-2026-085',
    vesselName: 'COSCO SHIPPING UNIVERSE',
    shippingLine: 'COSCO Shipping',
    voyageNo: 'CS8821',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Shanghai (CNSHA)',
    etd: '2026-10-28 08:00',
    eta: '2026-11-03 14:00',
    currentStatus: 'DEPARTED',
    lat: 12.35,
    lng: 101.10,
    speedKnots: 19.1,
    headingDeg: 145,
    nauticalMilesTotal: 2400,
    nauticalMilesCompleted: 85,
    etaCountdownHours: 148,
    currentLocationName: 'พ้นอ่าวแหลมฉบัง มุ่งหน้าสู่ทะเลจีนใต้',
    waypoints: [
      { name: 'แหลมฉบัง Berth B2', lat: 13.08, lng: 100.88, reached: true },
      { name: 'เกาะสเม็ด', lat: 12.55, lng: 101.45, reached: true },
      { name: 'ทะเลจีนใต้ตอนกลาง', lat: 15.00, lng: 112.00, reached: false },
      { name: 'ปากแม่น้ำแยงซีเกียง', lat: 31.20, lng: 122.00, reached: false },
      { name: 'ท่าเรือเซี่ยงไฮ้ (CNSHA)', lat: 31.35, lng: 121.65, reached: false },
    ],
    isDemo: true,
    lastUpdated: '2026-10-23 09:45',
  },
];

export const INITIAL_BERTHS: BerthAssignment[] = [
  {
    id: 'berth-a1',
    berthCode: 'A1',
    berthName: 'ท่าเทียบเรือตู้สินค้า A1 (Container Terminal 1)',
    bookingId: 'BKG-2026-081',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    shippingLine: 'Maersk Line',
    eta: '2026-10-24 06:00',
    etd: '2026-10-24 20:00',
    cranes: 4,
    status: 'OCCUPIED',
    draftRequired: 14.5,
    maxDraft: 16.0,
    loaLengthMeters: 399,
    hasConflict: false,
    isDemo: true,
  },
  {
    id: 'berth-a2',
    berthCode: 'A2',
    berthName: 'ท่าเทียบเรือตู้สินค้า A2 (Container Terminal 1)',
    bookingId: 'BKG-2026-083',
    vesselName: 'MSC OSCAR',
    shippingLine: 'MSC',
    eta: '2026-10-25 08:00',
    etd: '2026-10-26 12:00',
    cranes: 3,
    status: 'SCHEDULED',
    draftRequired: 15.2,
    maxDraft: 16.0,
    loaLengthMeters: 395,
    hasConflict: false,
    isDemo: true,
  },
  {
    id: 'berth-b1',
    berthCode: 'B1',
    berthName: 'ท่าเทียบเรือน้ำลึก B1 (Deep-Sea Terminal 2)',
    bookingId: 'BKG-2026-082',
    vesselName: 'ONE APUS',
    shippingLine: 'Ocean Network Express (ONE)',
    eta: '2026-10-24 10:00',
    etd: '2026-10-25 18:00',
    cranes: 4,
    status: 'OCCUPIED',
    draftRequired: 15.0,
    maxDraft: 16.5,
    loaLengthMeters: 364,
    hasConflict: false,
    isDemo: true,
  },
  {
    id: 'berth-b2',
    berthCode: 'B2',
    berthName: 'ท่าเทียบเรือน้ำลึก B2 (Deep-Sea Terminal 2)',
    bookingId: 'BKG-2026-085',
    vesselName: 'COSCO SHIPPING UNIVERSE',
    shippingLine: 'COSCO Shipping',
    eta: '2026-10-27 12:00',
    etd: '2026-10-28 16:00',
    cranes: 3,
    status: 'SCHEDULED',
    draftRequired: 14.0,
    maxDraft: 16.5,
    loaLengthMeters: 400,
    hasConflict: false,
    isDemo: true,
  },
  {
    id: 'berth-c1',
    berthCode: 'C1',
    berthName: 'ท่าเทียบเรือชายฝั่ง C1 (Feeder & Coastal Terminal)',
    bookingId: undefined,
    vesselName: '-',
    shippingLine: '-',
    eta: '-',
    etd: '-',
    cranes: 2,
    status: 'AVAILABLE',
    draftRequired: 0,
    maxDraft: 12.0,
    loaLengthMeters: 220,
    hasConflict: false,
    isDemo: true,
  },
];

export const INITIAL_CONTAINERS: PortContainer[] = [
  {
    id: 'cnt-001',
    containerNo: 'MSKU9182341',
    sizeType: '40HC',
    bookingId: 'BKG-2026-081',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    shippingLine: 'Maersk Line',
    grossWeightKg: 28400,
    tareWeightKg: 3900,
    status: 'IN_YARD',
    yardZone: 'A',
    yardBay: 3,
    yardRow: 2,
    yardTier: 2,
    gateInDate: '2026-10-21 11:20',
    freeDaysRemaining: 1,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-002',
    containerNo: 'TGHU8472910',
    sizeType: '40HC',
    bookingId: 'BKG-2026-081',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    shippingLine: 'Maersk Line',
    grossWeightKg: 29100,
    tareWeightKg: 3900,
    status: 'IN_YARD',
    yardZone: 'A',
    yardBay: 3,
    yardRow: 2,
    yardTier: 3,
    gateInDate: '2026-10-21 11:35',
    freeDaysRemaining: 1,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-003',
    containerNo: 'ONEY3928174',
    sizeType: '40HC',
    bookingId: 'BKG-2026-082',
    vesselName: 'ONE APUS',
    shippingLine: 'Ocean Network Express (ONE)',
    grossWeightKg: 27500,
    tareWeightKg: 3950,
    status: 'LOADED',
    yardZone: 'A',
    yardBay: 5,
    yardRow: 4,
    yardTier: 1,
    gateInDate: '2026-10-20 09:00',
    freeDaysRemaining: 0,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-004',
    containerNo: 'MEDU7182945',
    sizeType: '40GP',
    bookingId: 'BKG-2026-083',
    vesselName: 'MSC OSCAR',
    shippingLine: 'MSC',
    grossWeightKg: 24200,
    tareWeightKg: 3750,
    status: 'IN_YARD',
    yardZone: 'B',
    yardBay: 2,
    yardRow: 3,
    yardTier: 1,
    gateInDate: '2026-10-22 14:10',
    freeDaysRemaining: 2,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-005',
    containerNo: 'EMCU5938217',
    sizeType: '40RF',
    bookingId: 'BKG-2026-084',
    vesselName: 'EVER GIVEN',
    shippingLine: 'Evergreen Marine',
    grossWeightKg: 26000,
    tareWeightKg: 4600,
    status: 'CUSTOMS_HOLD',
    yardZone: 'C',
    yardBay: 1,
    yardRow: 1,
    yardTier: 1,
    gateInDate: '2026-10-18 10:00',
    freeDaysRemaining: 0,
    demurrageDays: 2,
    isDemo: true,
  },
  {
    id: 'cnt-006',
    containerNo: 'COSU6291843',
    sizeType: '20GP',
    bookingId: 'BKG-2026-085',
    vesselName: 'COSCO SHIPPING UNIVERSE',
    shippingLine: 'COSCO Shipping',
    grossWeightKg: 21500,
    tareWeightKg: 2200,
    status: 'GATE_IN',
    yardZone: 'D',
    yardBay: 1,
    yardRow: 1,
    yardTier: 1,
    gateInDate: '2026-10-23 08:30',
    freeDaysRemaining: 3,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-007',
    containerNo: 'CMAU4928170',
    sizeType: '40HC',
    grossWeightKg: 28800,
    tareWeightKg: 3900,
    status: 'IN_YARD',
    yardZone: 'A',
    yardBay: 4,
    yardRow: 1,
    yardTier: 1,
    gateInDate: '2026-10-22 16:00',
    freeDaysRemaining: 2,
    demurrageDays: 0,
    isDemo: true,
  },
  {
    id: 'cnt-008',
    containerNo: 'SMLU3829104',
    sizeType: '20GP',
    grossWeightKg: 19800,
    tareWeightKg: 2250,
    status: 'GATE_OUT',
    yardZone: 'D',
    yardBay: 2,
    yardRow: 1,
    yardTier: 1,
    gateInDate: '2026-10-19 08:00',
    freeDaysRemaining: 0,
    demurrageDays: 0,
    isDemo: true,
  },
];

// ==========================================
// CRUD OPERATIONS
// ==========================================

export const initDB = async (): Promise<void> => {
  const db = await openDB();

  // Seed Bookings if empty
  const bookingCount = await countStore(db, STORES.BOOKINGS);
  if (bookingCount === 0) {
    const tx = db.transaction(STORES.BOOKINGS, 'readwrite');
    const store = tx.objectStore(STORES.BOOKINGS);
    INITIAL_BOOKINGS.forEach((b) => store.put(b));
    await txComplete(tx);
  }

  // Seed Tracking if empty
  const trackingCount = await countStore(db, STORES.VESSEL_TRACKING);
  if (trackingCount === 0) {
    const tx = db.transaction(STORES.VESSEL_TRACKING, 'readwrite');
    const store = tx.objectStore(STORES.VESSEL_TRACKING);
    INITIAL_TRACKING.forEach((t) => store.put(t));
    await txComplete(tx);
  }

  // Seed Berths if empty
  const berthCount = await countStore(db, STORES.BERTHS);
  if (berthCount === 0) {
    const tx = db.transaction(STORES.BERTHS, 'readwrite');
    const store = tx.objectStore(STORES.BERTHS);
    INITIAL_BERTHS.forEach((b) => store.put(b));
    await txComplete(tx);
  }

  // Seed Containers if empty
  const containerCount = await countStore(db, STORES.CONTAINERS);
  if (containerCount === 0) {
    const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
    const store = tx.objectStore(STORES.CONTAINERS);
    INITIAL_CONTAINERS.forEach((c) => store.put(c));
    await txComplete(tx);
  }

  // Seed Tariffs if empty
  const tariffCount = await countStore(db, STORES.TARIFFS);
  if (tariffCount === 0) {
    const tx = db.transaction(STORES.TARIFFS, 'readwrite');
    const store = tx.objectStore(STORES.TARIFFS);
    store.put({ id: 'default_tariffs', ...DEFAULT_TARIFFS });
    await txComplete(tx);
  }
};

const countStore = (db: IDBDatabase, storeName: string): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
};

const txComplete = (tx: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

// --- BOOKINGS CRUD ---
export const getBookings = async (): Promise<VesselBooking[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BOOKINGS, 'readonly');
    const store = tx.objectStore(STORES.BOOKINGS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveBooking = async (booking: VesselBooking): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.BOOKINGS, 'readwrite');
  const store = tx.objectStore(STORES.BOOKINGS);
  store.put(booking);
  await txComplete(tx);
};

export const deleteBooking = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.BOOKINGS, 'readwrite');
  const store = tx.objectStore(STORES.BOOKINGS);
  store.delete(id);
  await txComplete(tx);
};

// --- VESSEL TRACKING CRUD ---
export const getVesselTrackings = async (): Promise<VesselTracking[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VESSEL_TRACKING, 'readonly');
    const store = tx.objectStore(STORES.VESSEL_TRACKING);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveVesselTracking = async (tracking: VesselTracking): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.VESSEL_TRACKING, 'readwrite');
  const store = tx.objectStore(STORES.VESSEL_TRACKING);
  store.put(tracking);
  await txComplete(tx);
};

export const deleteVesselTracking = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.VESSEL_TRACKING, 'readwrite');
  const store = tx.objectStore(STORES.VESSEL_TRACKING);
  store.delete(id);
  await txComplete(tx);
};

// --- BERTHS CRUD ---
export const getBerths = async (): Promise<BerthAssignment[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BERTHS, 'readonly');
    const store = tx.objectStore(STORES.BERTHS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveBerth = async (berth: BerthAssignment): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.BERTHS, 'readwrite');
  const store = tx.objectStore(STORES.BERTHS);
  store.put(berth);
  await txComplete(tx);
};

export const deleteBerth = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.BERTHS, 'readwrite');
  const store = tx.objectStore(STORES.BERTHS);
  store.delete(id);
  await txComplete(tx);
};

// --- CONTAINERS CRUD ---
export const getContainers = async (): Promise<PortContainer[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTAINERS, 'readonly');
    const store = tx.objectStore(STORES.CONTAINERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveContainer = async (container: PortContainer): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
  const store = tx.objectStore(STORES.CONTAINERS);
  store.put(container);
  await txComplete(tx);
};

export const deleteContainer = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
  const store = tx.objectStore(STORES.CONTAINERS);
  store.delete(id);
  await txComplete(tx);
};

// --- TARIFFS ---
export const getTariffs = async (): Promise<TariffConfig> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.TARIFFS, 'readonly');
    const store = tx.objectStore(STORES.TARIFFS);
    const req = store.get('default_tariffs');
    req.onsuccess = () => {
      if (req.result) {
        const { id, ...tariffs } = req.result;
        resolve(tariffs as TariffConfig);
      } else {
        resolve(DEFAULT_TARIFFS);
      }
    };
    req.onerror = () => resolve(DEFAULT_TARIFFS);
  });
};

export const saveTariffs = async (tariffs: TariffConfig): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.TARIFFS, 'readwrite');
  const store = tx.objectStore(STORES.TARIFFS);
  store.put({ id: 'default_tariffs', ...tariffs });
  await txComplete(tx);
};

// --- CALCULATIONS CRUD ---
export const getCalculations = async (): Promise<ExportCalculationRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CALCULATIONS, 'readonly');
    const store = tx.objectStore(STORES.CALCULATIONS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveCalculation = async (calc: ExportCalculationRecord): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.CALCULATIONS, 'readwrite');
  const store = tx.objectStore(STORES.CALCULATIONS);
  store.put(calc);
  await txComplete(tx);
};

export const deleteCalculation = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORES.CALCULATIONS, 'readwrite');
  const store = tx.objectStore(STORES.CALCULATIONS);
  store.delete(id);
  await txComplete(tx);
};

// ==========================================
// BACKUP & RESTORE & RESET
// ==========================================

export interface FullDatabaseBackup {
  exportDate: string;
  appVersion: string;
  systemName: string;
  data: {
    bookings: VesselBooking[];
    vesselTrackings: VesselTracking[];
    berths: BerthAssignment[];
    containers: PortContainer[];
    tariffs: TariffConfig;
    calculations: ExportCalculationRecord[];
  };
}

export const exportFullDatabaseJson = async (): Promise<string> => {
  const [bookings, vesselTrackings, berths, containers, tariffs, calculations] = await Promise.all([
    getBookings(),
    getVesselTrackings(),
    getBerths(),
    getContainers(),
    getTariffs(),
    getCalculations(),
  ]);

  const backup: FullDatabaseBackup = {
    exportDate: new Date().toISOString(),
    appVersion: '2.0-smartport',
    systemName: 'SeaExport AI - Smart Port & Vessel Booking Management System',
    data: {
      bookings,
      vesselTrackings,
      berths,
      containers,
      tariffs,
      calculations,
    },
  };

  return JSON.stringify(backup, null, 2);
};

export const importFullDatabaseJson = async (jsonString: string): Promise<boolean> => {
  try {
    const parsed: FullDatabaseBackup = JSON.parse(jsonString);
    if (!parsed.data || !Array.isArray(parsed.data.bookings)) {
      throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
    }

    const db = await openDB();

    // Clear existing and replace
    const storesToClear = [
      STORES.BOOKINGS,
      STORES.VESSEL_TRACKING,
      STORES.BERTHS,
      STORES.CONTAINERS,
      STORES.TARIFFS,
      STORES.CALCULATIONS,
    ];

    for (const s of storesToClear) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      await txComplete(tx);
    }

    // Populate
    if (parsed.data.bookings?.length) {
      const tx = db.transaction(STORES.BOOKINGS, 'readwrite');
      parsed.data.bookings.forEach((b) => tx.objectStore(STORES.BOOKINGS).put(b));
      await txComplete(tx);
    }
    if (parsed.data.vesselTrackings?.length) {
      const tx = db.transaction(STORES.VESSEL_TRACKING, 'readwrite');
      parsed.data.vesselTrackings.forEach((t) => tx.objectStore(STORES.VESSEL_TRACKING).put(t));
      await txComplete(tx);
    }
    if (parsed.data.berths?.length) {
      const tx = db.transaction(STORES.BERTHS, 'readwrite');
      parsed.data.berths.forEach((b) => tx.objectStore(STORES.BERTHS).put(b));
      await txComplete(tx);
    }
    if (parsed.data.containers?.length) {
      const tx = db.transaction(STORES.CONTAINERS, 'readwrite');
      parsed.data.containers.forEach((c) => tx.objectStore(STORES.CONTAINERS).put(c));
      await txComplete(tx);
    }
    if (parsed.data.tariffs) {
      const tx = db.transaction(STORES.TARIFFS, 'readwrite');
      tx.objectStore(STORES.TARIFFS).put({ id: 'default_tariffs', ...parsed.data.tariffs });
      await txComplete(tx);
    }
    if (parsed.data.calculations?.length) {
      const tx = db.transaction(STORES.CALCULATIONS, 'readwrite');
      parsed.data.calculations.forEach((c) => tx.objectStore(STORES.CALCULATIONS).put(c));
      await txComplete(tx);
    }

    return true;
  } catch (err) {
    console.error('Failed to import database JSON:', err);
    return false;
  }
};

export const resetToDemoData = async (): Promise<void> => {
  const db = await openDB();

  const storesToClear = [
    STORES.BOOKINGS,
    STORES.VESSEL_TRACKING,
    STORES.BERTHS,
    STORES.CONTAINERS,
    STORES.TARIFFS,
    STORES.CALCULATIONS,
  ];

  for (const s of storesToClear) {
    const tx = db.transaction(s, 'readwrite');
    tx.objectStore(s).clear();
    await txComplete(tx);
  }

  // Reseed defaults
  const tx1 = db.transaction(STORES.BOOKINGS, 'readwrite');
  INITIAL_BOOKINGS.forEach((b) => tx1.objectStore(STORES.BOOKINGS).put(b));
  await txComplete(tx1);

  const tx2 = db.transaction(STORES.VESSEL_TRACKING, 'readwrite');
  INITIAL_TRACKING.forEach((t) => tx2.objectStore(STORES.VESSEL_TRACKING).put(t));
  await txComplete(tx2);

  const tx3 = db.transaction(STORES.BERTHS, 'readwrite');
  INITIAL_BERTHS.forEach((b) => tx3.objectStore(STORES.BERTHS).put(b));
  await txComplete(tx3);

  const tx4 = db.transaction(STORES.CONTAINERS, 'readwrite');
  INITIAL_CONTAINERS.forEach((c) => tx4.objectStore(STORES.CONTAINERS).put(c));
  await txComplete(tx4);

  const tx5 = db.transaction(STORES.TARIFFS, 'readwrite');
  tx5.objectStore(STORES.TARIFFS).put({ id: 'default_tariffs', ...DEFAULT_TARIFFS });
  await txComplete(tx5);
};
