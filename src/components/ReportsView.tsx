import React, { useState, useMemo } from 'react';
import { 
  VesselBooking, 
  BerthAssignment, 
  VesselTracking, 
  PortContainer, 
  ExportCalculationRecord, 
  PortCongestionMetrics 
} from '../types';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  FileText, 
  Anchor, 
  Ship, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';

interface ReportsViewProps {
  bookings: VesselBooking[];
  berths: BerthAssignment[];
  trackings: VesselTracking[];
  containers: PortContainer[];
  calculations: ExportCalculationRecord[];
  congestion: PortCongestionMetrics;
}

type ReportCategory = 'BOOKINGS' | 'BERTHS' | 'WAITING_TIME' | 'COST_REVENUE';

export const ReportsView: React.FC<ReportsViewProps> = ({
  bookings,
  berths,
  trackings,
  containers,
  calculations,
  congestion,
}) => {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('BOOKINGS');
  const [searchTerm, setSearchTerm] = useState('');
  const [demoFilter, setDemoFilter] = useState<'ALL' | 'REAL' | 'DEMO'>('ALL');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Helper to trigger CSV file download with UTF-8 BOM
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    // Add UTF-8 BOM \uFEFF for Thai language support in Excel
    const bom = '\uFEFF';
    const csvContent =
      bom +
      [
        headers.join(','),
        ...rows.map((r) =>
          r.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // 1. Export Bookings Report
  const handleExportBookingsCsv = () => {
    const headers = [
      'Booking ID',
      'สายการเดินเรือ (Shipping Line)',
      'ชื่อเรือ (Vessel)',
      'เที่ยวเรือ (Voyage)',
      'ท่าเรือต้นทาง (POL)',
      'ท่าเรือปลายทาง (POD)',
      'เวลาออกเรือ (ETD)',
      'เวลาถึง (ETA)',
      'ขนาดตู้',
      'จำนวนตู้',
      'สินค้า (Cargo)',
      'ผู้ส่งออก (Shipper)',
      'สถานะ (Status)',
      'ค่าระวางเรือ ($ USD)',
      'ประเภทข้อมูล (Data Type)',
    ];

    const rows = filteredBookings.map((b) => [
      b.bookingId,
      b.shippingLine,
      b.vesselName,
      b.voyageNo,
      b.pol,
      b.pod,
      b.etd,
      b.eta,
      b.containerType,
      b.quantity,
      b.cargoDescription,
      b.shipperName,
      b.status,
      b.freightAmountUSD,
      b.isDemo ? 'DEMO' : 'ข้อมูลจริง',
    ]);

    downloadCsv(`Vessel_Bookings_Report_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  // 2. Export Berths Report
  const handleExportBerthsCsv = () => {
    const headers = [
      'รหัสท่า (Berth Code)',
      'ชื่อท่าเทียบเรือ (Terminal Name)',
      'ชื่อเรือที่เข้าเทียบ (Vessel Name)',
      'สายการเดินเรือ',
      'เวลาเริ่มเทียบท่า (ETA)',
      'เวลาออกจากท่า (ETD)',
      'จำนวนปั้นจั่น (Cranes)',
      'สถานะท่าเรือ',
      'กินน้ำลึกจริง (m)',
      'ความลึกสูงสุดของท่า (m)',
      'ความยาวเรือ (LOA m)',
      'สถานะการจองซ้ำซ้อน (Conflict)',
    ];

    const rows = berths.map((b) => [
      b.berthCode,
      b.berthName,
      b.vesselName,
      b.shippingLine,
      b.eta,
      b.etd,
      b.cranes,
      b.status,
      b.draftRequired,
      b.maxDraft,
      b.loaLengthMeters,
      b.hasConflict ? 'พบเวลาทับซ้อน' : 'ปกติ',
    ]);

    downloadCsv(`Berth_Utilization_Report_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  // 3. Export Waiting Time & Tracking Report
  const handleExportWaitingTimeCsv = () => {
    const headers = [
      'ชื่อเรือ (Vessel)',
      'Booking ID',
      'สายการเดินเรือ',
      'สถานะการเดินทาง (Stage)',
      'พิกัดละติจูด (Lat)',
      'พิกัดลองจิจูด (Lng)',
      'ความเร็ว (Knots)',
      'ระยะทางที่แล่นแล้ว (NM)',
      'ระยะทางทั้งหมด (NM)',
      'เวลานับถอยหลังถึงท่า (ชม.)',
      'ตำแหน่งปัจจุบัน',
    ];

    const rows = trackings.map((t) => [
      t.vesselName,
      t.bookingId,
      t.shippingLine,
      t.currentStatus,
      t.lat,
      t.lng,
      t.speedKnots,
      t.nauticalMilesCompleted,
      t.nauticalMilesTotal,
      t.etaCountdownHours,
      t.currentLocationName,
    ]);

    downloadCsv(`Port_Waiting_Tracking_Report_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  // 4. Export Cost & Revenue Report
  const handleExportCostCsv = () => {
    const headers = [
      'วันที่คำนวณ',
      'Booking ID อ้างอิง',
      'ขนาดตู้',
      'จำนวนตู้',
      'น้ำหนักสินค้า (ตัน MT)',
      'วันฝากตู้ในลาน',
      'ค่าระวางเรือ ($ USD)',
      'ค่าระวางเรือ (บาท)',
      'THC ต้นทาง (บาท)',
      'THC ปลายทาง ($ USD)',
      'ค่าภาระท่าเรือ (บาท)',
      'ค่าจัดเก็บตู้เกินเวลา (บาท)',
      'ค่าเอกสารและพิธีการ (บาท)',
      'ยอดรวมทั้งหมด (บาท)',
      'ยอดรวมเทียบเท่า ($ USD)',
    ];

    const rows = calculations.map((c) => [
      c.calculationDate,
      c.bookingId || '-',
      c.containerType,
      c.quantity,
      c.cargoWeightTon,
      c.yardStorageDays,
      c.oceanFreightUSD,
      c.oceanFreightTHB,
      c.thcOriginTHB,
      c.thcDestUSD,
      c.wharfageTHB,
      c.storageFeeTHB,
      c.docFeeTHB + c.customsClearanceTHB,
      c.totalTHB,
      c.totalUSD,
    ]);

    downloadCsv(`Port_Tariff_Cost_Report_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  // Filtered Bookings for Report
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch =
        b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.shipperName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDemo =
        demoFilter === 'ALL' ? true : demoFilter === 'DEMO' ? b.isDemo : !b.isDemo;
      return matchSearch && matchDemo;
    });
  }, [bookings, searchTerm, demoFilter]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            <span>ระบบรายงานและการส่งออกข้อมูล (Port Operations Reports & CSV)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            รายงานการจองเรือ การใช้ท่าเทียบเรือ เวลารอคอย และค่าใช้จ่าย พร้อมดาวน์โหลดเป็นไฟล์ CSV (UTF-8 BOM รองรับภาษาไทยใน Excel)
          </p>
        </div>

        {/* Download CSV Button for Active Report */}
        <button
          onClick={
            activeCategory === 'BOOKINGS' ? handleExportBookingsCsv :
            activeCategory === 'BERTHS' ? handleExportBerthsCsv :
            activeCategory === 'WAITING_TIME' ? handleExportWaitingTimeCsv :
            handleExportCostCsv
          }
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          <span>ดาวน์โหลดรายงานเป็น CSV (Download CSV)</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ส่งออกไฟล์ CSV สำเร็จเรียบร้อยแล้ว! (เปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน)</span>
        </div>
      )}

      {/* Report Categories Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => setActiveCategory('BOOKINGS')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCategory === 'BOOKINGS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ship className="w-4 h-4 text-sky-600" />
          <span>1. รายงานการจองเรือ (Vessel Bookings)</span>
        </button>

        <button
          onClick={() => setActiveCategory('BERTHS')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCategory === 'BERTHS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Anchor className="w-4 h-4 text-sky-600" />
          <span>2. รายงานการใช้ท่าเทียบเรือ (Berths)</span>
        </button>

        <button
          onClick={() => setActiveCategory('WAITING_TIME')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCategory === 'WAITING_TIME'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-600" />
          <span>3. รายงานเวลารอคอย & ติดตามเรือ</span>
        </button>

        <button
          onClick={() => setActiveCategory('COST_REVENUE')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            activeCategory === 'COST_REVENUE'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-sky-600" />
          <span>4. รายงานค่าธรรมเนียม & ค่าใช้จ่าย</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาในรายงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-500">ประเภทข้อมูล:</span>
          <select
            value={demoFilter}
            onChange={(e) => setDemoFilter(e.target.value as any)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">ทั้งหมด (ข้อมูลจริง + DEMO)</option>
            <option value="REAL">เฉพาะข้อมูลจริง</option>
            <option value="DEMO">เฉพาะ DEMO</option>
          </select>
        </div>
      </div>

      {/* Report Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          {/* CATEGORY 1: BOOKINGS */}
          {activeCategory === 'BOOKINGS' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3.5">Booking ID</th>
                  <th className="py-3 px-3.5">สายการเดินเรือ</th>
                  <th className="py-3 px-3.5">ชื่อเรือ (Vessel)</th>
                  <th className="py-3 px-3.5">POL → POD</th>
                  <th className="py-3 px-3.5">ตู้สินค้า</th>
                  <th className="py-3 px-3.5">ผู้ส่งออก (Shipper)</th>
                  <th className="py-3 px-3.5">ETD</th>
                  <th className="py-3 px-3.5">สถานะ</th>
                  <th className="py-3 px-3.5 text-right">ค่าระวาง ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-sky-800">
                      {b.bookingId}
                      {b.isDemo && <span className="ml-1 text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded">DEMO</span>}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium">{b.shippingLine}</td>
                    <td className="py-2.5 px-3.5">{b.vesselName} (Voy: {b.voyageNo})</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{b.pol.split(' ')[0]} → {b.pod.split(' ')[0]}</td>
                    <td className="py-2.5 px-3.5 font-mono">{b.quantity} × {b.containerType}</td>
                    <td className="py-2.5 px-3.5 truncate max-w-[140px]">{b.shipperName}</td>
                    <td className="py-2.5 px-3.5 font-mono">{b.etd}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-700">{b.status}</td>
                    <td className="py-2.5 px-3.5 font-mono text-right font-bold text-slate-900">${b.freightAmountUSD.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* CATEGORY 2: BERTHS */}
          {activeCategory === 'BERTHS' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3.5">ท่าเทียบเรือ</th>
                  <th className="py-3 px-3.5">ชื่อท่าเต็ม</th>
                  <th className="py-3 px-3.5">เรือที่เทียบท่า</th>
                  <th className="py-3 px-3.5">สายการเดินเรือ</th>
                  <th className="py-3 px-3.5">ETA (เข้า)</th>
                  <th className="py-3 px-3.5">ETD (ออก)</th>
                  <th className="py-3 px-3.5">ปั้นจั่น</th>
                  <th className="py-3 px-3.5">กินน้ำลึก (m)</th>
                  <th className="py-3 px-3.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {berths.map((berth) => (
                  <tr key={berth.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-sky-800">Berth {berth.berthCode}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">{berth.berthName}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">{berth.vesselName}</td>
                    <td className="py-2.5 px-3.5">{berth.shippingLine}</td>
                    <td className="py-2.5 px-3.5 font-mono">{berth.eta}</td>
                    <td className="py-2.5 px-3.5 font-mono">{berth.etd}</td>
                    <td className="py-2.5 px-3.5">{berth.cranes} คัน</td>
                    <td className="py-2.5 px-3.5 font-mono">{berth.draftRequired} / {berth.maxDraft}m</td>
                    <td className="py-2.5 px-3.5 font-semibold">
                      {berth.hasConflict ? (
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded">เวลาทับซ้อน</span>
                      ) : (
                        <span>{berth.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* CATEGORY 3: WAITING TIME & TRACKING */}
          {activeCategory === 'WAITING_TIME' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3.5">ชื่อเรือ (Vessel)</th>
                  <th className="py-3 px-3.5">สถานะ (Voyage Stage)</th>
                  <th className="py-3 px-3.5">พิกัด (Lat / Lng)</th>
                  <th className="py-3 px-3.5">ความเร็ว</th>
                  <th className="py-3 px-3.5">ระยะทางที่แล่นแล้ว</th>
                  <th className="py-3 px-3.5">นับถอยหลังถึงท่า (ETA)</th>
                  <th className="py-3 px-3.5">ตำแหน่งปัจจุบัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trackings.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">{t.vesselName}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {t.currentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">{t.lat.toFixed(2)}°N, {t.lng.toFixed(2)}°E</td>
                    <td className="py-2.5 px-3.5 font-mono">{t.speedKnots} kts</td>
                    <td className="py-2.5 px-3.5 font-mono">{t.nauticalMilesCompleted} / {t.nauticalMilesTotal} NM</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-sky-800">~{t.etaCountdownHours} ชม.</td>
                    <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[200px]">{t.currentLocationName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* CATEGORY 4: COST & REVENUE */}
          {activeCategory === 'COST_REVENUE' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3.5">วันที่</th>
                  <th className="py-3 px-3.5">Booking ID</th>
                  <th className="py-3 px-3.5">ตู้สินค้า</th>
                  <th className="py-3 px-3.5">น้ำหนัก (MT)</th>
                  <th className="py-3 px-3.5">ค่าระวาง ($)</th>
                  <th className="py-3 px-3.5">THC ต้นทาง (฿)</th>
                  <th className="py-3 px-3.5">ค่าเก็บตู้ในลาน (฿)</th>
                  <th className="py-3 px-3.5 text-right">ยอดรวม (฿ THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      ยังไม่มีรายการคำนวณที่บันทึกไว้ในระบบ สามารถบันทึกได้จากเมนู "คำนวณค่าระวาง & ท่าเรือ"
                    </td>
                  </tr>
                ) : (
                  calculations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3.5 font-mono">{c.calculationDate}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-sky-800">{c.bookingId || '-'}</td>
                      <td className="py-2.5 px-3.5">{c.quantity} × {c.containerType}</td>
                      <td className="py-2.5 px-3.5 font-mono">{c.cargoWeightTon}</td>
                      <td className="py-2.5 px-3.5 font-mono">${c.oceanFreightUSD.toLocaleString()}</td>
                      <td className="py-2.5 px-3.5 font-mono">฿{c.thcOriginTHB.toLocaleString()}</td>
                      <td className="py-2.5 px-3.5 font-mono">฿{c.storageFeeTHB.toLocaleString()}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-right text-slate-900">
                        ฿{c.totalTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>

    </div>
  );
};
