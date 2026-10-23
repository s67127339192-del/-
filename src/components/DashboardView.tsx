import React from 'react';
import { 
  VesselBooking, 
  VesselTracking, 
  BerthAssignment, 
  PortContainer, 
  PortCongestionMetrics 
} from '../types';
import { 
  Ship, 
  Anchor, 
  Box, 
  Navigation, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  ArrowUpRight, 
  Waves, 
  Wind, 
  Eye, 
  Plus, 
  FileText 
} from 'lucide-react';

interface DashboardViewProps {
  bookings: VesselBooking[];
  trackings: VesselTracking[];
  berths: BerthAssignment[];
  containers: PortContainer[];
  congestion: PortCongestionMetrics;
  onNavigateTab: (tabId: string) => void;
  onSelectBooking: (booking: VesselBooking) => void;
  onSelectTracking: (vesselName: string) => void;
  onOpenNewBooking: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bookings,
  trackings,
  berths,
  containers,
  congestion,
  onNavigateTab,
  onSelectBooking,
  onSelectTracking,
  onOpenNewBooking,
}) => {
  const vesselsAtSea = trackings.filter((t) => t.currentStatus === 'AT_SEA' || t.currentStatus === 'DEPARTED').length;
  const vesselsWaiting = trackings.filter((t) => t.currentStatus === 'ARRIVING').length;
  const availableBerthsCount = berths.filter((b) => b.status === 'AVAILABLE').length;
  const containersInYard = containers.filter((c) => c.status === 'IN_YARD' || c.status === 'GATE_IN' || c.status === 'CUSTOMS_HOLD').length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Hero Welcome & Port Quick Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold tracking-wider uppercase">
              <Anchor className="w-4 h-4" />
              <span>Laem Chabang Port Terminal Control (ท่าเรือแหลมฉบัง)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Smart Port & Vessel Booking Dashboard
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              ศูนย์กลางควบคุมการจองระวางเรือ ติดตามตำแหน่งเรือขนส่งสินค้า ตรวจสอบตารางท่าเทียบเรือ 
              และวิเคราะห์ความแออัดของท่าเรือด้วยข้อมูลการปฏิบัติการจริงในระบบ
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenNewBooking}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>+ จองเรือใหม่ (New Booking)</span>
            </button>
            <button
              onClick={() => onNavigateTab('tracking')}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Navigation className="w-4 h-4 text-sky-400" />
              <span>แผนที่ติดตามเรือ</span>
            </button>
          </div>
        </div>

        {/* Port Weather & Tidal Simulation Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Waves className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">ระดับน้ำขึ้น-ลง (Tide)</div>
              <div className="font-semibold text-white">+2.45 ม. (น้ำเกิด High Tide)</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <Wind className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">ความเร็วลม (Wind)</div>
              <div className="font-semibold text-white">12 นอต (ทิศ ตอ./น.)</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">ร่องน้ำเดินเรือ (Channel)</div>
              <div className="font-semibold text-white">ลึก 16.0 ม. (ปลอดภัย)</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[11px]">เวลารอคอยเฉลี่ย (Avg Wait)</div>
              <div className="font-semibold text-white">{congestion.avgWaitHours} ชั่วโมง</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Metric Cards (Requirement 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Bookings */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">การจองเรือทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {bookings.length} <span className="text-xs font-normal text-slate-500">บุ๊กกิ้ง</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>ยืนยันแล้ว {bookings.filter(b => b.status === 'CONFIRMED').length} รายการ</span>
            <ArrowUpRight className="w-3 h-3 text-sky-500 ml-auto" />
          </div>
        </div>

        {/* Metric 2: Vessels En Route */}
        <div 
          onClick={() => onNavigateTab('tracking')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">เรือกำลังเดินทาง</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {vesselsAtSea} <span className="text-xs font-normal text-slate-500">ลำ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>อยู่ระหว่างการเดินเรือในทะเล</span>
            <ArrowUpRight className="w-3 h-3 text-indigo-500 ml-auto" />
          </div>
        </div>

        {/* Metric 3: Vessels Waiting for Berth */}
        <div 
          onClick={() => onNavigateTab('berths')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">เรือรอเทียบท่า</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {vesselsWaiting} <span className="text-xs font-normal text-slate-500">ลำ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>บริเวณทุ่นนำร่อง / นอกท่า</span>
            <ArrowUpRight className="w-3 h-3 text-amber-500 ml-auto" />
          </div>
        </div>

        {/* Metric 4: Available Berths */}
        <div 
          onClick={() => onNavigateTab('berths')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">ท่าเทียบเรือว่าง</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Anchor className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {availableBerthsCount} / {berths.length} <span className="text-xs font-normal text-slate-500">ท่า</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>อัตราใช้งาน {congestion.berthOccupancyPercent}%</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-500 ml-auto" />
          </div>
        </div>

        {/* Metric 5: Containers in Yard */}
        <div 
          onClick={() => onNavigateTab('containers')}
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">ตู้คอนเทนเนอร์ในลาน</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {containersInYard} <span className="text-xs font-normal text-slate-500">ตู้</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>ความหนาแน่นลานตู้ {congestion.yardOccupancyPercent}%</span>
            <ArrowUpRight className="w-3 h-3 text-teal-500 ml-auto" />
          </div>
        </div>

      </div>

      {/* Main Grid: Berths Live Monitor + Congestion Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 Cols): Berths Quick Live Monitor */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                สถานะท่าเทียบเรือสด (Berth Operations Monitor)
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('berths')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
            >
              <span>ดูตารางคิวเรือทั้งหมด</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {berths.map((berth) => {
              const isOccupied = berth.status === 'OCCUPIED';
              const isScheduled = berth.status === 'SCHEDULED';
              const isAvailable = berth.status === 'AVAILABLE';

              return (
                <div 
                  key={berth.id}
                  onClick={() => onNavigateTab('berths')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isOccupied 
                      ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-200' 
                      : isScheduled 
                      ? 'bg-amber-50/40 border-amber-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 font-mono">
                        ท่า {berth.berthCode}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isOccupied 
                          ? 'bg-sky-600 text-white' 
                          : isScheduled 
                          ? 'bg-amber-600 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {isOccupied ? 'กำลังเทียบท่า' : isScheduled ? 'มีตารางจอง' : 'ท่าเทียบว่าง'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 truncate" title={berth.vesselName}>
                      {berth.vesselName !== '-' ? berth.vesselName : 'ไม่มีเรือเทียบท่า'}
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>สายเรือ: <strong className="text-slate-700">{berth.shippingLine}</strong></div>
                      <div>ปั้นจั่น: <strong>{berth.cranes} คัน</strong> · กินน้ำลึก: <strong>{berth.draftRequired}m</strong> / {berth.maxDraft}m</div>
                      {berth.eta !== '-' && (
                        <div className="text-[10px] text-slate-600">
                          ช่วงเวลา: {berth.eta.split(' ')[0]} ({berth.eta.split(' ')[1]} - {berth.etd.split(' ')[1]})
                        </div>
                      )}
                    </div>
                  </div>

                  {berth.hasConflict && (
                    <div className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 p-1.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>พบเวลาจองทับซ้อน</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 Cols): Congestion Index & Quick Analysis */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  ดัชนีความแออัดท่าเรือ
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('congestion')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                ดูหลักการคำนวณ
              </button>
            </div>

            {/* Gauge Display */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <div className="text-3xl font-extrabold text-slate-900 font-mono">
                {congestion.congestionIndex}%
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                style={{
                  backgroundColor: 
                    congestion.statusLevel === 'CRITICAL' ? '#e11d48' :
                    congestion.statusLevel === 'HIGH' ? '#ea580c' :
                    congestion.statusLevel === 'MODERATE' ? '#0284c7' : '#059669'
                }}
              >
                ระดับความแออัด: {
                  congestion.statusLevel === 'CRITICAL' ? 'วิกฤต (Critical)' :
                  congestion.statusLevel === 'HIGH' ? 'หนาแน่นสูง (High)' :
                  congestion.statusLevel === 'MODERATE' ? 'ปานกลาง (Moderate)' : 'คล่องตัว (Low)'
                }
              </div>

              <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                {congestion.recommendation}
              </p>
            </div>

            {/* Sub-breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>อัตราใช้ท่าเทียบเรือ:</span>
                <span className="font-semibold text-slate-900 font-mono">{congestion.berthOccupancyPercent}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>ความหนาแน่นลานตู้:</span>
                <span className="font-semibold text-slate-900 font-mono">{congestion.yardOccupancyPercent}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>คิวเรือรอเข้าเทียบท่า:</span>
                <span className="font-semibold text-slate-900 font-mono">{congestion.waitingVesselsCount} ลำ</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-[11px] text-sky-900 leading-relaxed">
            <strong>หมายเหตุโปร่งใส:</strong> คำนวณด้วยแบบจำลองคณิตศาสตร์แถวคอย (Queuing Theory) จากข้อมูลในระบบ IndexedDB โดยตรง
          </div>
        </div>

      </div>

      {/* Upcoming Vessels Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              รายการการจองเรือและการเดินทางล่าสุด (Recent Vessel Bookings & Tracking)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงสถานะการจองเรือ สายการเดินเรือ ท่าเรือต้นทาง-ปลายทาง และเวลาออกเรือ
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('bookings')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>จัดการการจองเรือทั้งหมด</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Booking ID</th>
                <th className="py-2.5 px-3">ชื่อเรือ & เที่ยวเรือ</th>
                <th className="py-2.5 px-3">สายการเดินเรือ</th>
                <th className="py-2.5 px-3">เส้นทาง (POL → POD)</th>
                <th className="py-2.5 px-3">ตู้สินค้า</th>
                <th className="py-2.5 px-3">ETD (ออก)</th>
                <th className="py-2.5 px-3">สถานะ</th>
                <th className="py-2.5 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.slice(0, 6).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-sky-700">
                    {b.bookingId}
                    {b.isDemo && (
                      <span className="ml-1.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                        DEMO
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <div>{b.vesselName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Voy: {b.voyageNo}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {b.shippingLine}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    <div>{b.pol.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-400">→ {b.pod.split(' ')[0]}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {b.quantity} × {b.containerType}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {b.etd}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      b.status === 'BOOKED' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      b.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectBooking(b)}
                      className="px-2 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded transition-colors"
                    >
                      ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
