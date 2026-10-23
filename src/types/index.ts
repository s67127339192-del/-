// Smart Port & Vessel Booking Management System Type Definitions

export type BookingStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ContainerType = '20GP' | '40GP' | '40HC' | '20RF' | '40RF' | '45HC';

export type VesselTrackingStatus = 
  | 'BOOKED' 
  | 'DEPARTED' 
  | 'AT_SEA' 
  | 'ARRIVING' 
  | 'BERTHED' 
  | 'COMPLETED';

export type BerthCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type BerthStatus = 'SCHEDULED' | 'OCCUPIED' | 'MAINTENANCE' | 'AVAILABLE';

export type ContainerStatus = 'GATE_IN' | 'IN_YARD' | 'LOADED' | 'GATE_OUT' | 'CUSTOMS_HOLD';

export type YardZone = 'A' | 'B' | 'C' | 'D';

export interface VesselBooking {
  id: string;
  bookingId: string;
  shippingLine: string;
  vesselName: string;
  voyageNo: string;
  pol: string; // Port of Loading
  pod: string; // Port of Discharge
  etd: string; // Estimated Time of Departure
  eta: string; // Estimated Time of Arrival
  containerType: ContainerType;
  quantity: number;
  cargoDescription: string;
  shipperName: string;
  consigneeName: string;
  status: BookingStatus;
  freightAmountUSD: number;
  assignedBerth?: BerthCode;
  notes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  reached: boolean;
}

export interface VesselTracking {
  id: string;
  bookingId: string;
  vesselName: string;
  shippingLine: string;
  voyageNo: string;
  pol: string;
  pod: string;
  etd: string;
  eta: string;
  currentStatus: VesselTrackingStatus;
  lat: number;
  lng: number;
  speedKnots: number;
  headingDeg: number;
  nauticalMilesTotal: number;
  nauticalMilesCompleted: number;
  etaCountdownHours: number;
  currentLocationName: string;
  waypoints: Waypoint[];
  isDemo: boolean;
  lastUpdated: string;
}

export interface BerthAssignment {
  id: string;
  berthCode: BerthCode;
  berthName: string;
  bookingId?: string;
  vesselName: string;
  shippingLine: string;
  eta: string; // Start window (e.g. 2026-10-24 08:00)
  etd: string; // End window (e.g. 2026-10-25 14:00)
  cranes: number;
  status: BerthStatus;
  draftRequired: number; // in meters (e.g. 13.5m)
  maxDraft: number; // in meters (e.g. 16.0m)
  loaLengthMeters: number; // Length overall
  hasConflict: boolean;
  conflictWith?: string;
  conflictDetails?: string;
  isDemo: boolean;
}

export interface PortContainer {
  id: string;
  containerNo: string;
  sizeType: ContainerType;
  bookingId?: string;
  vesselName?: string;
  shippingLine?: string;
  grossWeightKg: number;
  tareWeightKg: number;
  status: ContainerStatus;
  yardZone: YardZone;
  yardBay: number;  // 1 - 10
  yardRow: number;  // 1 - 6
  yardTier: number; // 1 - 4
  gateInDate: string;
  freeDaysRemaining: number;
  demurrageDays: number;
  isDemo: boolean;
}

export interface TariffConfig {
  oceanFreight20GP: number; // USD
  oceanFreight40HC: number; // USD
  thcOriginTHB: number; // THB per container
  thcDestUSD: number; // USD per container
  wharfageRateTHB: number; // THB per MT
  storagePerDayAfterFreeTHB: number; // THB per day
  freeTimeDays: number; // Days allowed in yard without demurrage
  docFeeTHB: number;
  customsClearanceTHB: number;
  bafUSD: number;
  exchangeRateTHBPerUSD: number;
}

export interface PortCongestionMetrics {
  congestionIndex: number; // 0 - 100
  statusLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  waitingVesselsCount: number;
  activeBerthsCount: number;
  availableBerthsCount: number;
  berthOccupancyPercent: number;
  yardOccupancyPercent: number;
  avgWaitHours: number;
  estimatedTurnaroundHours: number;
  peakHour: string;
  recommendation: string;
  methodologyNotes: string;
}

export interface ExportCalculationRecord {
  id: string;
  bookingId?: string;
  calculationDate: string;
  containerType: ContainerType;
  quantity: number;
  cargoWeightTon: number;
  yardStorageDays: number;
  oceanFreightUSD: number;
  oceanFreightTHB: number;
  thcOriginTHB: number;
  thcDestUSD: number;
  thcDestTHB: number;
  wharfageTHB: number;
  storageFeeTHB: number;
  docFeeTHB: number;
  customsClearanceTHB: number;
  bafTHB: number;
  totalTHB: number;
  totalUSD: number;
  isDemo: boolean;
}
