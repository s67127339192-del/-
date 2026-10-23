import React, { useState } from 'react';
import { ContainerTracking, ShippingLine } from '../types';
import { saveContainer, deleteContainer } from '../services/db';
import { 
  Navigation, 
  Search, 
  Ship, 
  Thermometer, 
  Wind, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  CircleDot, 
  Plus, 
  Play, 
  Trash2, 
  ArrowRight,
  Anchor,
  Compass,
  AlertCircle
} from 'lucide-react';

interface ContainerTrackingViewProps {
  containers: ContainerTracking[];
  selectedContainerNo?: string;
  onRefreshData: () => void;
}

export const ContainerTrackingView: React.FC<ContainerTrackingViewProps> = ({
  containers,
  selectedContainerNo,
  onRefreshData
}) => {
  const [searchQuery, setSearchQuery] = useState(selectedContainerNo || '');
  const [activeContainer, setActiveContainer] = useState<ContainerTracking>(
    () => {
      if (selectedContainerNo) {
        const found = containers.find(c => c.containerNo.toLowerCase() === selectedContainerNo.toLowerCase());
        if (found) return found;
      }
      return containers[0] || null;
    }
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // New Container Form State
  const [newContainerNo, setNewContainerNo] = useState('MSCU' + Math.floor(1000000 + Math.random() * 9000000));
  const [newBlNo, setNewBlNo] = useState('BL-' + Math.floor(100000 + Math.random() * 900000));
  const [newLine, setNewLine] = useState<ShippingLine>('Maersk');
  const [newVessel, setNewVessel] = useState('MAERSK TAIPEI');
  const [newPOL, setNewPOL] = useState('Laem Chabang (THLCH)');
  const [newPOD, setNewPOD] = useState('Los Angeles (USLAX)');
  const [newIsReefer, setNewIsReefer] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const found = containers.find(
      c => c.containerNo.toLowerCase().includes(query) ||
           c.blNo.toLowerCase().includes(query) ||
           c.bookingNo.toLowerCase().includes(query)
    );
    if (found) {
      setActiveContainer(found);
    }
  };

  const handleSelectContainer = (container: ContainerTracking) => {
    setActiveContainer(container);
    setSearchQuery(container.containerNo);
  };

  // Simulation: Advance vessel along its route
  const handleSimulateAdvance = async () => {
    if (!activeContainer) return;
    setSimulationRunning(true);

    const currentPercent = activeContainer.progressPercent;
    const newPercent = Math.min(100, currentPercent + 15);
    let newStatus = activeContainer.currentStatus;
    let newLocation = activeContainer.currentLocationName;
    let newSpeed = activeContainer.speedKnots;

    if (newPercent >= 100) {
      newStatus = 'DELIVERED';
      newLocation = `ส่งมอบสำเร็จ ณ ${activeContainer.pod}`;
      newSpeed = 0;
    } else if (newPercent >= 85) {
      newStatus = 'ARRIVED_PORT';
      newLocation = `เทียบท่าเรือปลายทาง ${activeContainer.pod}`;
      newSpeed = 2.4;
    } else {
      newStatus = 'SAILING';
      newLocation = `มหาสมุทร (พิกัดเส้นทางส่งออก)`;
      newSpeed = Number((18 + Math.random() * 3).toFixed(1));
    }

    const updatedMilestones = activeContainer.milestones.map((m, idx) => {
      if (idx === 0 || idx === 1) return { ...m, status: 'completed' as const };
      if (newPercent > 50 && idx <= 4) return { ...m, status: 'completed' as const };
      if (newPercent >= 100) return { ...m, status: 'completed' as const };
      return m;
    });

    const updated: ContainerTracking = {
      ...activeContainer,
      progressPercent: newPercent,
      currentStatus: newStatus,
      currentLocationName: newLocation,
      speedKnots: newSpeed,
      milestones: updatedMilestones,
      updatedAt: new Date().toLocaleTimeString('th-TH')
    };

    await saveContainer(updated);
    setActiveContainer(updated);
    onRefreshData();
    setTimeout(() => setSimulationRunning(false), 400);
  };

  // Add new container
  const handleAddNewContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ContainerTracking = {
      id: 'cnt-' + Date.now().toString(36),
      containerNo: newContainerNo.toUpperCase(),
      blNo: newBlNo,
      bookingNo: 'BKG-' + Math.floor(10000 + Math.random() * 90000),
      shippingLine: newLine,
      vesselName: newVessel,
      voyage: 'V.' + Math.floor(100 + Math.random() * 900) + 'E',
      containerType: newIsReefer ? '40RF' : '40HC',
      pol: newPOL,
      pod: newPOD,
      etd: new Date().toISOString().split('T')[0] + ' 16:00',
      eta: '2026-11-20 08:00',
      currentStatus: 'SAILING',
      progressPercent: 30,
      currentLocationName: 'ทะเลจีนใต้ (South China Sea)',
      currentCoordinates: { lat: 14.5, lng: 112.3 },
      speedKnots: 19.2,
      weatherStatus: 'คลื่นสงบ ท้องฟ้าโปร่ง',
      isReefer: newIsReefer,
      temperatureCelsius: newIsReefer ? -18.5 : undefined,
      humidityPercent: newIsReefer ? 85 : undefined,
      updatedAt: new Date().toLocaleTimeString('th-TH'),
      seaRoute: [
        { name: newPOL, lat: 13.08, lng: 100.88, status: 'passed' },
        { name: 'ตำแหน่งปัจจุบัน', lat: 14.5, lng: 112.3, status: 'current' },
        { name: newPOD, lat: 33.74, lng: -118.26, status: 'upcoming' }
      ],
      milestones: [
        { id: 'm-1', title: 'ตู้เข้าลานท่าเรือต้นทาง', location: newPOL, timestamp: '1 วันก่อนหน้า', status: 'completed' },
        { id: 'm-2', title: 'ตรวจปล่อยศุลกากรและโหลดขึ้นเรือ', location: newPOL, timestamp: '12 ชม. ก่อนหน้า', status: 'completed' },
        { id: 'm-3', title: 'กำลังแล่นในทะเลสากล', location: 'Open Sea Route', timestamp: 'ปัจจุบัน', status: 'in_progress' },
        { id: 'm-4', title: 'เข้าเทียบท่าปลายทาง', location: newPOD, timestamp: '20 พ.ย. 2026', status: 'pending' }
      ]
    };

    await saveContainer(newItem);
    setShowAddModal(false);
    setActiveContainer(newItem);
    onRefreshData();
  };

  const handleDeleteContainer = async (id: string) => {
    if (confirm('ยืนยันลบการติดตามตู้นี้ออกจากระบบ?')) {
      await deleteContainer(id);
      const remaining = containers.filter(c => c.id !== id);
      if (remaining.length > 0) setActiveContainer(remaining[0]);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Search & Container Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาด้วยหมายเลขตู้ (เช่น MSCU8843210, ONEU9941230) หรือ B/L..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors min-h-[40px] whitespace-nowrap"
            >
              ค้นหา
            </button>
          </form>

          {/* Quick Container Selector & Add Button */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">เลือกตู้ด่วน:</span>
            {containers.map((c) => {
              const isSelected = activeContainer?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectContainer(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors border ${
                    isSelected
                      ? 'bg-slate-900 text-sky-400 border-slate-900 font-semibold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.containerNo}
                </button>
              );
            })}

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มตู้จำลอง</span>
            </button>
          </div>

        </div>
      </div>

      {activeContainer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 Cols): Interactive SVG Ocean Route Map & Telemetry */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Visual SVG Maritime Map */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" />
                  <span className="text-sm font-bold text-white tracking-wide">
                    แผนที่จำลองเส้นทางเดินเรือมหาสมุทร (Maritime Route Simulation)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">อัปเดต: {activeContainer.updatedAt}</span>
                  <button
                    onClick={handleSimulateAdvance}
                    disabled={simulationRunning || activeContainer.progressPercent >= 100}
                    className="px-3 py-1 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>จำลองเดินเรือ (+15%)</span>
                  </button>
                </div>
              </div>

              {/* Interactive Visual Maritime Map Graphic */}
              <div className="relative w-full h-80 sm:h-96 rounded-lg bg-gradient-to-b from-[#0a1526] via-[#071324] to-[#040b17] border border-slate-800/80 overflow-hidden flex items-center justify-center">
                
                {/* SVG Ocean Grid and Route Curve */}
                <svg className="w-full h-full" viewBox="0 0 900 450" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#0284c7" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                    </linearGradient>
                    
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                  </defs>

                  {/* Lat/Long Grid Lines */}
                  {[75, 150, 225, 300, 375].map((y) => (
                    <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" />
                  ))}
                  {[150, 300, 450, 600, 750].map((x) => (
                    <line key={x} x1={x} y1="0" x2={x} y2="450" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" />
                  ))}

                  {/* Stylized Continents Outlines */}
                  {/* Asia / Thailand Coast */}
                  <path
                    d="M 110,60 Q 140,110 160,180 Q 170,240 180,310 Q 160,360 140,400 L 40,400 L 40,60 Z"
                    fill="#132338"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                  />
                  {/* Southeast Asia Islands */}
                  <circle cx="210" cy="330" r="14" fill="#132338" stroke="#1e3a5f" />
                  <circle cx="240" cy="360" r="18" fill="#132338" stroke="#1e3a5f" />

                  {/* Destination Coast (e.g. West Coast USA / Americas or Europe) */}
                  <path
                    d="M 760,40 Q 750,140 760,220 Q 780,300 810,400 L 890,400 L 890,40 Z"
                    fill="#132338"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                  />

                  {/* Maritime Shipping Route Great Circle Curve */}
                  <path
                    d="M 180,260 Q 340,120 540,130 T 780,230"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="3.5"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />

                  {/* Waypoint Nodes */}
                  {/* Origin: Laem Chabang */}
                  <circle cx="180" cy="260" r="6" fill="#38bdf8" />
                  <text x="170" y="290" fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="middle">
                    THLCH (ไทย)
                  </text>

                  {/* Destination: POD */}
                  <circle cx="780" cy="230" r="6" fill="#10b981" />
                  <text x="780" y="260" fill="#10b981" fontSize="12" fontWeight="600" textAnchor="middle">
                    {activeContainer.pod.split(' ')[0]}
                  </text>

                  {/* Calculated Vessel Position along curve using progressPercent */}
                  {(() => {
                    const t = activeContainer.progressPercent / 100;
                    // Parametric curve calculation: Q(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
                    const p0 = { x: 180, y: 260 };
                    const p1 = { x: 460, y: 110 };
                    const p2 = { x: 780, y: 230 };
                    
                    const curX = Math.round((1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x);
                    const curY = Math.round((1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y);

                    return (
                      <g transform={`translate(${curX}, ${curY})`} filter="url(#glow)">
                        {/* Animated Radar Pulse Rings */}
                        <circle r="18" fill="#38bdf8" opacity="0.25" className="animate-ping" />
                        <circle r="10" fill="#0284c7" opacity="0.6" />
                        <circle r="5" fill="#ffffff" />
                        
                        {/* Vessel Marker Box */}
                        <rect x="-65" y="-45" width="130" height="28" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                        <text x="0" y="-27" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                          🚢 {activeContainer.vesselName.substring(0, 14)}
                        </text>
                      </g>
                    );
                  })()}
                </svg>

                {/* Bottom Overlay Legend */}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <span>ท่าเรือต้นทาง ({activeContainer.pol.split(' ')[0]})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>ท่าเรือปลายทาง ({activeContainer.pod.split(' ')[0]})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 tabular-nums font-mono">
                    <span>ความเร็ว: {activeContainer.speedKnots} kts</span>
                    <span className="text-slate-600">|</span>
                    <span>พิกัด: {activeContainer.currentCoordinates.lat.toFixed(1)}°N, {activeContainer.currentCoordinates.lng.toFixed(1)}°E</span>
                  </div>
                </div>

              </div>

              {/* Status Banner */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <div className="text-slate-400">สายการเดินเรือ</div>
                  <div className="font-semibold text-white mt-0.5">{activeContainer.shippingLine}</div>
                </div>
                <div>
                  <div className="text-slate-400">เรือสินค้า / Voyage</div>
                  <div className="font-semibold text-white mt-0.5">{activeContainer.vesselName} ({activeContainer.voyage})</div>
                </div>
                <div>
                  <div className="text-slate-400">กำหนดออก (ETD)</div>
                  <div className="font-semibold text-white mt-0.5">{activeContainer.etd}</div>
                </div>
                <div>
                  <div className="text-slate-400">กำหนดถึง (ETA)</div>
                  <div className="font-semibold text-sky-400 mt-0.5">{activeContainer.eta}</div>
                </div>
              </div>

            </div>

            {/* Reefer Telemetry (If Reefer Container) */}
            {activeContainer.isReefer && (
              <div className="bg-white rounded-xl border border-sky-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ระบบตรวจสอบตู้แช่เย็นควบคุมอุณหภูมิ (Reefer Cold Chain Monitor)
                      </h3>
                      <p className="text-xs text-slate-500">เซ็นเซอร์ตรวจวัดอุณหภูมิและความชื้นแบบเรียลไทม์</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                    สถานะทำความเย็น: ปกติ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500">อุณหภูมิภายในตู้ (Internal Temp)</div>
                    <div className="text-xl font-bold text-sky-700 font-mono tabular-nums mt-1">
                      {activeContainer.temperatureCelsius}°C
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">เป้าหมาย: -18.0°C (±1.5°C)</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500">ความชื้นสัมพัทธ์ (Relative Humidity)</div>
                    <div className="text-xl font-bold text-slate-800 font-mono tabular-nums mt-1">
                      {activeContainer.humidityPercent || 85}%
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">การไหลเวียนลม: ปกติ</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500">แหล่งจ่ายไฟตู้สินค้า (Power Supply)</div>
                    <div className="text-sm font-semibold text-emerald-700 mt-1">
                      Vessel Reefer Plug 440V
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">ทำงานต่อเนื่อง 142 ชั่วโมง</div>
                  </div>
                </div>
              </div>
            )}

            {/* Container Details Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    ข้อมูลตู้สินค้า: <span className="font-mono text-sky-700">{activeContainer.containerNo}</span>
                  </span>
                  <span className="text-xs text-slate-500">({activeContainer.containerType})</span>
                </div>

                <button
                  onClick={() => handleDeleteContainer(activeContainer.id)}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบตู้นี้</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-400">Bill of Lading No.</span>
                  <div className="font-mono font-medium text-slate-800 mt-0.5">{activeContainer.blNo}</div>
                </div>
                <div>
                  <span className="text-slate-400">Booking No.</span>
                  <div className="font-mono font-medium text-slate-800 mt-0.5">{activeContainer.bookingNo}</div>
                </div>
                <div>
                  <span className="text-slate-400">สถานะปัจจุบัน</span>
                  <div className="font-semibold text-sky-700 mt-0.5">{activeContainer.currentStatus}</div>
                </div>
                <div>
                  <span className="text-slate-400">ท่าเรือต้นทาง (POL)</span>
                  <div className="font-medium text-slate-800 mt-0.5">{activeContainer.pol}</div>
                </div>
                <div>
                  <span className="text-slate-400">ท่าเรือปลายทาง (POD)</span>
                  <div className="font-medium text-slate-800 mt-0.5">{activeContainer.pod}</div>
                </div>
                <div>
                  <span className="text-slate-400">สภาพอากาศทางทะเล</span>
                  <div className="font-medium text-slate-800 mt-0.5">{activeContainer.weatherStatus}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (4 Cols): Milestones & Event Log */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            
            <div>
              <h3 className="text-base font-bold text-slate-900">ไทม์ไลน์สถานะตู้สินค้า</h3>
              <p className="text-xs text-slate-500 mt-0.5">เหตุการณ์สำคัญจากท่าเรือต้นทางถึงปลายทาง</p>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activeContainer.milestones.map((m) => {
                const isCompleted = m.status === 'completed';
                const isInProgress = m.status === 'in_progress';

                return (
                  <div key={m.id} className="relative">
                    {/* Status Dot */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isInProgress
                          ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                          : 'bg-white border-2 border-slate-300 text-transparent'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isInProgress && <CircleDot className="w-3 h-3 animate-spin" />}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{m.location}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.timestamp}</div>
                      {m.note && (
                        <div className="text-[11px] text-sky-800 bg-sky-50 p-1.5 rounded mt-1.5 border border-sky-100">
                          {m.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Ship className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <div className="text-base font-semibold text-slate-700">ไม่พบข้อมูลตู้คอนเทนเนอร์</div>
          <div className="text-xs text-slate-400 mt-1">กรุณากดเพิ่มตู้จำลอง หรือสแกนเอกสารเพื่อเริ่มติดตาม</div>
        </div>
      )}

      {/* Add Simulated Container Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">เพิ่มตู้คอนเทนเนอร์จำลอง</h3>

            <form onSubmit={handleAddNewContainer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเลขตู้ (ISO 6346)</label>
                <input
                  type="text"
                  required
                  value={newContainerNo}
                  onChange={(e) => setNewContainerNo(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สายการเดินเรือ</label>
                  <select
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value as ShippingLine)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Maersk">Maersk Line</option>
                    <option value="MSC">MSC</option>
                    <option value="ONE">Ocean Network Express (ONE)</option>
                    <option value="COSCO">COSCO Shipping</option>
                    <option value="Evergreen">Evergreen Marine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อเรือสินค้า</label>
                  <input
                    type="text"
                    required
                    value={newVessel}
                    onChange={(e) => setNewVessel(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ท่าเรือต้นทาง (POL)</label>
                  <input
                    type="text"
                    value={newPOL}
                    onChange={(e) => setNewPOL(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ท่าเรือปลายทาง (POD)</label>
                  <input
                    type="text"
                    value={newPOD}
                    onChange={(e) => setNewPOD(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalReefer"
                  checked={newIsReefer}
                  onChange={(e) => setNewIsReefer(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <label htmlFor="modalReefer" className="text-xs text-slate-700 cursor-pointer">
                  เป็นตู้แช่เย็นควบคุมอุณหภูมิ (Reefer Container -18°C)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
                >
                  บันทึกตู้คอนเทนเนอร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
