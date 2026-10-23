import React, { useState } from 'react';
import { Shipment, ContainerTracking } from '../types';
import heroShipImg from '../assets/images/maritime_container_ship_1792726524223.jpg';
import { 
  Ship, 
  ScanText, 
  Navigation, 
  Calculator, 
  FileSpreadsheet, 
  ArrowUpRight, 
  Anchor, 
  Clock, 
  CheckCircle2, 
  Search,
  Filter,
  Eye,
  Globe2
} from 'lucide-react';

interface DashboardViewProps {
  shipments: Shipment[];
  containers: ContainerTracking[];
  onNavigateTab: (tabId: string) => void;
  onSelectShipment: (shipment: Shipment) => void;
  onSelectContainer: (containerNo: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shipments,
  containers,
  onNavigateTab,
  onSelectShipment,
  onSelectContainer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Compute stats
  const totalShipments = shipments.length;
  const inTransitCount = containers.filter(c => c.currentStatus === 'SAILING').length;
  const customsOrPortCount = containers.filter(c => c.currentStatus === 'GATE_IN' || c.currentStatus === 'CUSTOMS_CLEARED' || c.currentStatus === 'LOADED').length;
  const deliveredCount = containers.filter(c => c.currentStatus === 'DELIVERED').length;

  const totalValueUSD = shipments.reduce((sum, s) => {
    if (s.currency === 'USD') return sum + s.totalAmount;
    if (s.currency === 'THB') return sum + (s.totalAmount / 35.5);
    return sum + s.totalAmount;
  }, 0);

  const totalGrossWeightKgs = shipments.reduce((sum, s) => sum + (s.totalGrossWeightKg || 0), 0);
  const totalCBM = shipments.reduce((sum, s) => sum + (s.totalCBM || 0), 0);

  // Filtered shipments
  const filteredShipments = shipments.filter(s => {
    const matchesSearch = 
      s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.containerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consigneeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.pod.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  const getStatusBadge = (status: Shipment['status']) => {
    switch (status) {
      case 'IN_TRANSIT':
        return <span className="text-sky-700 font-medium">กำลังเดินทางในทะเล</span>;
      case 'CUSTOMS_CLEARED':
        return <span className="text-emerald-700 font-medium">ตรวจปล่อยศุลกากรแล้ว</span>;
      case 'LOADED':
        return <span className="text-blue-700 font-medium">โหลดขึ้นเรือแล้ว</span>;
      case 'DELIVERED':
        return <span className="text-slate-600 font-medium">ส่งมอบเสร็จสิ้น</span>;
      case 'BOOKED':
        return <span className="text-amber-700 font-medium">จองระวางแล้ว</span>;
      default:
        return <span className="text-slate-500 font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner with Authentic Maritime Photography */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
        <div className="relative h-64 sm:h-72 lg:h-80 w-full">
          <img
            src={heroShipImg}
            alt="International Maritime Container Vessel"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          {/* Measured gradient scrim for 4.5:1 text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-900/40" />

          {/* Banner Content */}
          <div className="absolute inset-0 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-2 tracking-wide uppercase">
                <span>ระบบบริหารการส่งออกทางทะเลอัจฉริยะ</span>
                <span aria-hidden="true">·</span>
                <span>Thailand Maritime Port Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                ศูนย์ควบคุมและติดตามการส่งออกทางเรือ
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-300 line-clamp-2 max-w-xl">
                ระบบจัดการตู้คอนเทนเนอร์ สแกนใบกำกับสินค้า (Invoice/Packing List) ด้วยเทคโนโลยี OCR และวิเคราะห์ต้นทุนค่าระวางเรือแบบเรียลไทม์
              </p>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                onClick={() => onNavigateTab('ocr')}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 shadow-sm min-h-[44px]"
              >
                <ScanText className="w-4 h-4" />
                <span>สแกนเอกสาร Invoice/PL</span>
              </button>
              <button
                onClick={() => onNavigateTab('tracking')}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm rounded-lg border border-slate-700 transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>เปิดแผนที่ติดตามตู้เรือ</span>
              </button>
              <button
                onClick={() => onNavigateTab('calculator')}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm rounded-lg border border-slate-700 transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>คำนวณต้นทุน Freight & THC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Shipments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">รายการส่งออกทั้งหมด</span>
            <Ship className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalShipments}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>กำลังดำเนินงาน</span>
              <span aria-hidden="true">·</span>
              <span>พร้อมส่งออก {customsOrPortCount} รายการ</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Containers at Sea */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ตู้คอนเทนเนอร์ในทะเล</span>
            <Anchor className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-700 tabular-nums">
              {inTransitCount}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>สายเรือหลัก Maersk / MSC / ONE</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Export Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">มูลค่าสินค้าส่งออกรวม</span>
            <Globe2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              ${totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>≈ ฿{(totalValueUSD * 35.5).toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
              <span aria-hidden="true">·</span>
              <span>USD/THB 35.50</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Delivered Completed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">ปริมาตร & น้ำหนักรวม</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalCBM.toFixed(1)} <span className="text-base font-normal text-slate-500">CBM</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>{(totalGrossWeightKgs / 1000).toFixed(1)} ตัน (Gross Wt)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Split Grid: Live Vessels Strip & Port Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Live Vessel Monitoring Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">สถานะเรือและตู้คอนเทนเนอร์กำลังเดินเรือ</h2>
              <p className="text-xs text-slate-500 mt-0.5">การระบุตำแหน่งผ่านระบบดาวเทียมและการจำลองเส้นทางเดินเรือ</p>
            </div>
            <button
              onClick={() => onNavigateTab('tracking')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
            >
              <span>ดูแผนที่ทั้งหมด</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Vessels Mini Cards */}
          <div className="space-y-3">
            {containers.map((container) => (
              <div
                key={container.id}
                onClick={() => {
                  onSelectContainer(container.containerNo);
                  onNavigateTab('tracking');
                }}
                className="p-4 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900 text-sm">
                      {container.containerNo}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs text-slate-600">{container.containerType}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-800">{container.shippingLine}</span>
                    {container.isReefer && (
                      <span className="text-xs text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">
                        Reefer {container.temperatureCelsius}°C
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-medium text-slate-700">{container.pol}</span>
                    <span>→</span>
                    <span className="font-medium text-slate-700">{container.pod}</span>
                    <span className="text-slate-400">·</span>
                    <span>เรือ {container.vesselName} ({container.voyage})</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    ตำแหน่ง: {container.currentLocationName} ({container.speedKnots} นอต)
                  </div>
                </div>

                {/* Progress Bar & ETA */}
                <div className="sm:text-right shrink-0 min-w-[140px]">
                  <div className="text-xs font-medium text-slate-900 mb-1">
                    ETA: {container.eta}
                  </div>
                  <div className="w-full sm:w-36 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        container.progressPercent === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${container.progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    ความคืบหน้า {container.progressPercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Top Trade Lanes & Ports */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">เส้นทางส่งออกยอดนิยม</h2>
            <p className="text-xs text-slate-500 mt-0.5">พอร์ตปลายทางและระยะเวลาเดินทางเฉลี่ย (Transit Time)</p>

            <div className="mt-5 space-y-4">
              {[
                { port: 'Port of Los Angeles (USLAX)', region: 'สหรัฐอเมริกา ฝั่งตะวันตก', days: '16-19 วัน', freq: '35%', fclRate: '$2,850 - $3,400' },
                { port: 'Port of Rotterdam (NLRTM)', region: 'ยุโรปตะวันตก', days: '24-28 วัน', freq: '28%', fclRate: '$2,400 - $3,100' },
                { port: 'Port of Tokyo / Yokohama (JPTYO)', region: 'ญี่ปุ่น', days: '7-9 วัน', freq: '20%', fclRate: '$750 - $1,100' },
                { port: 'Port of Singapore (SGSIN)', region: 'อาเซียน (Transshipment)', days: '3-4 วัน', freq: '17%', fclRate: '$280 - $450' },
              ].map((lane, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{lane.port}</span>
                    <span className="text-xs font-medium text-sky-700">{lane.days}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{lane.region}</span>
                    <span className="tabular-nums text-slate-600">ค่าระวาง {lane.fclRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-lg">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              คำแนะนำระวางเรือประจำสัปดาห์
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระวางเรือเส้นทางสหรัฐฯ ช่วงนี้มีความหนาแน่น แนะนำจอง Booking ล่วงหน้าอย่างน้อย 10-14 วัน ก่อนวันที่สินค้าพร้อมส่งออก (Cargo Ready Date)
            </p>
          </div>
        </div>

      </div>

      {/* Shipment Register Table with Search & Status Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ทะเบียนรายการส่งออกล่าสุด (Shipment Register)</h2>
            <p className="text-xs text-slate-500 mt-0.5">บันทึกข้อมูลและดึงจากเอกสาร Invoice & Packing List ด้วย OCR</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหา Invoice, ตู้เรือ, ปลายทาง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'IN_TRANSIT', 'CUSTOMS_CLEARED', 'DELIVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'ทั้งหมด' : st === 'IN_TRANSIT' ? 'กำลังเดินทาง' : st === 'CUSTOMS_CLEARED' ? 'ผ่านศุลกากร' : 'ส่งมอบแล้ว'}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('reports')}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>ดาวน์โหลด CSV</span>
            </button>
          </div>
        </div>

        {/* High-density Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">เลขที่ Invoice</th>
                <th className="py-3 px-4">ผู้รับปลายทาง (Consignee)</th>
                <th className="py-3 px-4">เส้นทาง (POL → POD)</th>
                <th className="py-3 px-4">หมายเลขตู้คอนเทนเนอร์</th>
                <th className="py-3 px-4">เรือ / เที่ยว</th>
                <th className="py-3 px-4 text-right">มูลค่ารวม</th>
                <th className="py-3 px-4 text-right">น้ำหนัก / CBM</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    ไม่พบรายการที่ตรงกับการค้นหา
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {s.invoiceNo}
                      <div className="text-[11px] font-normal text-slate-400">{s.date}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate" title={s.consigneeName}>
                      {s.consigneeName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-800 truncate max-w-[170px]">{s.pod}</div>
                      <div className="text-[11px] text-slate-400">จาก {s.pol}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-sky-800">
                      {s.containerNo}
                      <span className="text-[11px] text-slate-400 ml-1">({s.containerType})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {s.vesselName}
                      <div className="text-[11px] text-slate-400">{s.voyageNo}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {s.currency} {s.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {(s.totalGrossWeightKg / 1000).toFixed(2)} t
                      <div className="text-[11px] text-slate-400">{s.totalCBM.toFixed(1)} CBM</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectShipment(s)}
                        className="px-2.5 py-1 text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded border border-slate-200 transition-colors inline-flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>รายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
