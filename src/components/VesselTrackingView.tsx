import React, { useState } from 'react';
import { 
  VesselTracking, 
  VesselTrackingStatus 
} from '../types';
import { saveVesselTracking } from '../services/db';
import { 
  Ship, 
  Navigation, 
  Compass, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RotateCw, 
  Layers, 
  ArrowRight, 
  Info, 
  Anchor, 
  Wind, 
  Waves 
} from 'lucide-react';

interface VesselTrackingViewProps {
  trackings: VesselTracking[];
  selectedVesselName?: string;
  onRefreshData: () => Promise<void>;
}

export const VesselTrackingView: React.FC<VesselTrackingViewProps> = ({
  trackings,
  selectedVesselName,
  onRefreshData,
}) => {
  const [activeTrackingId, setActiveTrackingId] = useState<string>(() => {
    if (selectedVesselName) {
      const found = trackings.find((t) => t.vesselName.toLowerCase() === selectedVesselName.toLowerCase());
      if (found) return found.id;
    }
    return trackings[0]?.id || '';
  });

  const activeVessel = trackings.find((t) => t.id === activeTrackingId) || trackings[0] || null;

  const STATUS_STAGES: { key: VesselTrackingStatus; label: string; desc: string }[] = [
    { key: 'BOOKED', label: 'จองแล้ว', desc: 'ออกใบจองและกำหนดเรือ' },
    { key: 'DEPARTED', label: 'ออกจากท่าแล้ว', desc: 'ปลดเชือกพ้นร่องน้ำท่าเรือ' },
    { key: 'AT_SEA', label: 'อยู่กลางทะเล', desc: 'กำลังเดินเรือตามเส้นทางสากล' },
    { key: 'ARRIVING', label: 'กำลังเข้าใกล้ท่า', desc: 'ถึงจุดรับพนักงานนำร่องนอกท่า' },
    { key: 'BERTHED', label: 'เทียบท่าแล้ว', desc: 'ผูกเชือกและเริ่มขนถ่ายสินค้า' },
    { key: 'COMPLETED', label: 'เสร็จสิ้น', desc: 'ขนถ่ายเสร็จสิ้นและตรวจปล่อย' },
  ];

  const getStatusIndex = (status: VesselTrackingStatus) => {
    return STATUS_STAGES.findIndex((s) => s.key === status);
  };

  // Advance to next status
  const handleAdvanceStatus = async () => {
    if (!activeVessel) return;
    const curIdx = getStatusIndex(activeVessel.currentStatus);
    if (curIdx < STATUS_STAGES.length - 1) {
      const nextStatus = STATUS_STAGES[curIdx + 1].key;
      const updated: VesselTracking = {
        ...activeVessel,
        currentStatus: nextStatus,
        lastUpdated: new Date().toISOString(),
      };
      await saveVesselTracking(updated);
      await onRefreshData();
    }
  };

  // Change status directly
  const handleChangeStatus = async (status: VesselTrackingStatus) => {
    if (!activeVessel) return;
    const updated: VesselTracking = {
      ...activeVessel,
      currentStatus: status,
      lastUpdated: new Date().toISOString(),
    };
    await saveVesselTracking(updated);
    await onRefreshData();
  };

  // Simulate vessel advancing distance along nautical route
  const handleSimulateDistance = async () => {
    if (!activeVessel) return;
    const added = 120; // 120 nautical miles
    const newCompleted = Math.min(activeVessel.nauticalMilesTotal, activeVessel.nauticalMilesCompleted + added);
    const newCountdown = Math.max(0, activeVessel.etaCountdownHours - Math.round(added / (activeVessel.speedKnots || 15)));
    
    // update status automatically if reached
    let nextStatus = activeVessel.currentStatus;
    if (newCompleted >= activeVessel.nauticalMilesTotal) {
      nextStatus = 'BERTHED';
    } else if (newCompleted > activeVessel.nauticalMilesTotal * 0.85) {
      nextStatus = 'ARRIVING';
    } else if (newCompleted > 0) {
      nextStatus = 'AT_SEA';
    }

    const updated: VesselTracking = {
      ...activeVessel,
      nauticalMilesCompleted: newCompleted,
      etaCountdownHours: newCountdown,
      currentStatus: nextStatus,
      lastUpdated: new Date().toISOString(),
    };
    await saveVesselTracking(updated);
    await onRefreshData();
  };

  if (!activeVessel) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Navigation className="w-12 h-12 mx-auto text-slate-300 mb-2" />
        <div>ไม่มีข้อมูลการติดตามเรือในขณะนี้</div>
      </div>
    );
  }

  const currentStageIdx = getStatusIndex(activeVessel.currentStatus);
  const progressPercent = activeVessel.nauticalMilesTotal > 0
    ? Math.min(100, Math.round((activeVessel.nauticalMilesCompleted / activeVessel.nauticalMilesTotal) * 100))
    : 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Disclaimer Banner (Requirement 4: ระบุชัดเจนว่าเป็นข้อมูลทดลอง/จำลอง) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-bold">⚠️ ประกาศระบบจำลองการเดินเรือ (Maritime Simulation / Test Data):</strong>
          <span className="ml-1 text-slate-700">
            พิกัดแผนที่ เส้นทางเดินเรือ ตำแหน่งดาวเทียมจำลอง และสถานะของเรือในหน้านี้เป็นข้อมูลทดลองสำหรับการจำลองการปฏิบัติงานของท่าเรือ 
            (Prototype Simulation) โดยไม่ได้เชื่อมต่อกับระบบ AIS ดาวเทียมเชิงพาณิชย์ที่ต้องเสียค่าบริการ เพื่อความปลอดภัยและประหยัดค่าใช้จ่าย
          </span>
        </div>
      </div>

      {/* Top Header & Vessel Selector Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Navigation className="w-5 h-5 text-sky-600" />
              <span>ติดตามเรือและเส้นทางเดินเรือจำลอง (Vessel Tracking & Maritime Chart)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามตำแหน่ง พิกัดละติจูด/ลองจิจูด ความเร็วเรือ และสถานะตามขั้นตอนการขนส่งทางทะเล
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateDistance}
              className="px-3.5 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[40px]"
              title="จำลองการเคลื่อนที่ไปข้างหน้า 120 ไมล์ทะเล"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-600" />
              <span>จำลองเดินเรือ +120 NM</span>
            </button>

            <button
              onClick={handleAdvanceStatus}
              disabled={currentStageIdx >= STATUS_STAGES.length - 1}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm min-h-[40px]"
            >
              <Play className="w-3.5 h-3.5" />
              <span>เลื่อนสถานะถัดไป</span>
            </button>
          </div>
        </div>

        {/* Vessel Carousel Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold shrink-0">เลือกเรือ:</span>
          {trackings.map((trk) => {
            const isSelected = trk.id === activeTrackingId;
            return (
              <button
                key={trk.id}
                onClick={() => setActiveTrackingId(trk.id)}
                className={`px-3 py-2 rounded-xl font-medium flex items-center gap-2 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-semibold ring-2 ring-sky-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Ship className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{trk.vesselName}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  trk.currentStatus === 'AT_SEA' ? 'bg-sky-500/20 text-sky-300' :
                  trk.currentStatus === 'BERTHED' ? 'bg-emerald-500/20 text-emerald-300' :
                  trk.currentStatus === 'ARRIVING' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {trk.currentStatus}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6-Stage Tracking Status Stepper (Requirement 4: Booked, Departed, At Sea, Arriving, Berthed, Completed) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            ขั้นตอนสถานะการเดินเรือ (Vessel Voyage Stages)
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">เปลี่ยนสถานะโดยตรง:</span>
            <select
              value={activeVessel.currentStatus}
              onChange={(e) => handleChangeStatus(e.target.value as VesselTrackingStatus)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
            >
              {STATUS_STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label} ({s.key})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {STATUS_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={stage.key}
                onClick={() => handleChangeStatus(stage.key)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono font-bold opacity-80">ขั้นที่ {idx + 1}</div>
                  <div className="font-bold text-xs mt-0.5">{stage.label}</div>
                  <div className={`text-[10px] mt-1 ${isCurrent ? 'text-sky-100' : 'text-slate-500'}`}>
                    {stage.desc}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-current/20 flex justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split: Interactive Maritime Chart (SVG) + Vessel Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 Cols): Interactive SVG Maritime Chart */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 p-5 shadow-lg text-white space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-slate-200">
                แผนที่จำลองน่านน้ำและเส้นทางเดินเรือสากล (Maritime Route Simulator)
              </span>
            </div>
            <div className="text-slate-400 text-[11px] font-mono">
              Lat: {activeVessel.lat.toFixed(2)}°N · Lng: {activeVessel.lng.toFixed(2)}°E
            </div>
          </div>

          {/* Interactive SVG Maritime Canvas */}
          <div className="relative w-full aspect-[16/9] bg-gradient-to-b from-[#0b1b36] via-[#09152b] to-[#040c1a] rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
            
            <svg 
              className="w-full h-full" 
              viewBox="0 0 800 450" 
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Bathymetry Grid Lines */}
              <defs>
                <pattern id="nauticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#172b4d" strokeWidth="0.5" strokeDasharray="2,2" />
                </pattern>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              <rect width="800" height="450" fill="url(#nauticalGrid)" />

              {/* Simplified Coastline Silhouettes (Gulf of Thailand, Malay Peninsula, Indochina) */}
              {/* Thailand / Indochina Coastline */}
              <path 
                d="M 50,0 L 220,0 L 250,90 L 280,140 L 320,160 L 370,180 L 410,210 L 480,240 L 520,300 L 560,450 L 0,450 Z" 
                fill="#132742" 
                opacity="0.6"
              />
              {/* Malay Peninsula / Singapore Island */}
              <path 
                d="M 230,170 Q 250,260 270,360 L 290,410 L 270,450 L 160,450 L 170,300 Z" 
                fill="#132742" 
                opacity="0.7"
              />
              {/* Borneo / Indonesia Island shape */}
              <path 
                d="M 420,330 Q 520,310 620,340 Q 640,410 580,450 L 410,450 Z" 
                fill="#132742" 
                opacity="0.5"
              />

              {/* Maritime Shipping Lanes (Dotted Lines) */}
              {/* Route 1: Bangkok/Laem Chabang -> Singapore -> Malacca */}
              <path 
                d="M 270,130 Q 320,230 290,400" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2.5" 
                strokeDasharray="6,4"
                opacity="0.8"
              />

              {/* Route 2: Singapore -> South China Sea -> East Asia */}
              <path 
                d="M 290,400 Q 480,260 700,100" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="2" 
                strokeDasharray="6,4" 
                opacity="0.6"
              />

              {/* Port Markers */}
              {/* Bangkok Port */}
              <circle cx="260" cy="115" r="5" fill="#38bdf8" />
              <text x="245" y="108" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">กรุงเทพ (THBKK)</text>

              {/* Laem Chabang Port (POL) */}
              <circle cx="270" cy="130" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
              <text x="282" y="133" fill="#ffffff" fontWeight="bold" fontSize="11" fontFamily="sans-serif">แหลมฉบัง (THLCH)</text>

              {/* Singapore Port (POD) */}
              <circle cx="290" cy="400" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <text x="302" y="405" fill="#a7f3d0" fontWeight="bold" fontSize="11" fontFamily="sans-serif">สิงคโปร์ (SGSIN)</text>

              {/* Shanghai Port */}
              <circle cx="680" cy="110" r="5" fill="#38bdf8" />
              <text x="690" y="113" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">เซี่ยงไฮ้ (CNSHA)</text>

              {/* Waypoints along route */}
              {activeVessel.waypoints.map((wp, i) => {
                // Approximate coordinate projection on SVG
                const cx = 270 + (i * 5);
                const cy = 130 + (i * 45);
                return (
                  <g key={wp.name}>
                    <circle cx={cx} cy={cy} r="3" fill={wp.reached ? '#10b981' : '#64748b'} />
                  </g>
                );
              })}

              {/* Dynamic Animated Vessel Position */}
              {/* Calculate position based on progress */}
              {(() => {
                const startX = 270;
                const startY = 130;
                const endX = 290;
                const endY = 400;
                const t = progressPercent / 100;
                const currentX = startX + (endX - startX) * t;
                const currentY = startY + (endY - startY) * t;

                return (
                  <g transform={`translate(${currentX}, ${currentY})`}>
                    {/* Pulsing signal ring */}
                    <circle cx="0" cy="0" r="14" fill="#38bdf8" opacity="0.25">
                      <animate attributeName="r" values="8;22;8" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>

                    {/* Ship heading direction arrow */}
                    <circle cx="0" cy="0" r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                    
                    {/* Vessel Tooltip Box on Chart */}
                    <rect x="12" y="-22" width="160" height="34" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />
                    <text x="20" y="-8" fill="#ffffff" fontWeight="bold" fontSize="10" fontFamily="sans-serif">
                      🚢 {activeVessel.vesselName}
                    </text>
                    <text x="20" y="5" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      {activeVessel.speedKnots} kts · {progressPercent}%
                    </text>
                  </g>
                );
              })()}

            </svg>

            {/* In-Chart Telemetry Badge */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-700 rounded-lg p-2.5 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Compass className="w-3.5 h-3.5" />
                <span>ทิศทางหัวเรือ: {activeVessel.headingDeg}° | ความเร็ว: {activeVessel.speedKnots} นอต</span>
              </div>
              <div className="text-slate-400">
                พิกัด: {activeVessel.lat.toFixed(2)}°N, {activeVessel.lng.toFixed(2)}°E
              </div>
            </div>

          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>ต้นทาง: <strong className="text-white">{activeVessel.pol}</strong></span>
            <span>ปลายทาง: <strong className="text-white">{activeVessel.pod}</strong></span>
          </div>
        </div>

        {/* Right Column (4 Cols): Voyage Telemetry & Waypoints */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
              ข้อมูลการเดินทาง (Voyage Details)
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              {activeVessel.vesselName}
            </h2>
            <div className="text-xs text-slate-500 font-mono">
              Voyage: {activeVessel.voyageNo} · {activeVessel.shippingLine}
            </div>
          </div>

          {/* Current Location Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>ตำแหน่งปัจจุบัน:</span>
            </div>
            <div className="text-xs font-medium text-slate-900 leading-relaxed">
              {activeVessel.currentLocationName}
            </div>
          </div>

          {/* Nautical Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">ระยะทางที่เดินทางแล้ว:</span>
              <span className="font-mono font-bold text-sky-800">
                {activeVessel.nauticalMilesCompleted.toLocaleString()} / {activeVessel.nauticalMilesTotal.toLocaleString()} NM
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-sky-600 h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              {progressPercent}% สมบูรณ์
            </div>
          </div>

          {/* ETA Countdown Card */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">เวลาออกเรือ (ETD)</div>
              <div className="font-bold text-slate-900 mt-0.5">{activeVessel.etd}</div>
            </div>
            <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
              <div className="text-[11px] text-sky-700">คาดการณ์ถึง (ETA)</div>
              <div className="font-bold text-sky-950 mt-0.5">{activeVessel.eta}</div>
              <div className="text-[10px] text-sky-700 font-mono mt-0.5">อีก ~{activeVessel.etaCountdownHours} ชม.</div>
            </div>
          </div>

          {/* Waypoints Sequence List */}
          <div>
            <div className="text-xs font-bold text-slate-800 mb-2">จุดนำร่องการเดินเรือ (Waypoints)</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {activeVessel.waypoints.map((wp, i) => (
                <div 
                  key={wp.name}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                    wp.reached ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] w-4 text-slate-400">{i + 1}.</span>
                    <span className="truncate">{wp.name}</span>
                  </div>
                  {wp.reached ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">ผ่านแล้ว</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">ยังไม่ถึง</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
