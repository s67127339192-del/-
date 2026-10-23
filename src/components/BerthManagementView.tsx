import React, { useState } from 'react';
import { 
  BerthAssignment, 
  BerthCode, 
  BerthStatus, 
  VesselBooking 
} from '../types';
import { saveBerth, deleteBerth } from '../services/db';
import { checkBerthConflicts } from '../services/portCongestion';
import { 
  Anchor, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Ship, 
  X, 
  Save, 
  Info, 
  Layers 
} from 'lucide-react';

interface BerthManagementViewProps {
  berths: BerthAssignment[];
  bookings: VesselBooking[];
  onRefreshData: () => Promise<void>;
  onNavigateTracking: (vesselName: string) => void;
}

export const BerthManagementView: React.FC<BerthManagementViewProps> = ({
  berths,
  bookings,
  onRefreshData,
  onNavigateTracking,
}) => {
  // Check for duplicate / overlapping berth bookings
  const evaluatedBerths = checkBerthConflicts(berths);
  const conflictingBerths = evaluatedBerths.filter((b) => b.hasConflict);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBerth, setEditingBerth] = useState<BerthAssignment | null>(null);

  const [formData, setFormData] = useState<Partial<BerthAssignment>>({
    berthCode: 'A1',
    berthName: 'ท่าเทียบเรือตู้สินค้า A1',
    vesselName: '',
    shippingLine: 'Maersk Line',
    eta: '2026-10-25 08:00',
    etd: '2026-10-25 22:00',
    cranes: 3,
    status: 'SCHEDULED',
    draftRequired: 14.0,
    maxDraft: 16.0,
    loaLengthMeters: 350,
  });

  const [formWarning, setFormWarning] = useState('');

  const BERTH_SPECS: Record<BerthCode, { name: string; maxDraft: number; defaultCranes: number }> = {
    A1: { name: 'ท่าเทียบเรือตู้สินค้า A1 (Terminal 1)', maxDraft: 16.0, defaultCranes: 4 },
    A2: { name: 'ท่าเทียบเรือตู้สินค้า A2 (Terminal 1)', maxDraft: 16.0, defaultCranes: 3 },
    B1: { name: 'ท่าเทียบเรือน้ำลึก B1 (Deep-Sea Terminal 2)', maxDraft: 16.5, defaultCranes: 4 },
    B2: { name: 'ท่าเทียบเรือน้ำลึก B2 (Deep-Sea Terminal 2)', maxDraft: 16.5, defaultCranes: 3 },
    C1: { name: 'ท่าเทียบเรือชายฝั่ง C1 (Feeder Terminal)', maxDraft: 12.0, defaultCranes: 2 },
  };

  // Open modal to assign/schedule vessel
  const handleOpenAssign = (berth?: BerthAssignment) => {
    if (berth) {
      setEditingBerth(berth);
      setFormData({ ...berth });
    } else {
      setEditingBerth(null);
      setFormData({
        berthCode: 'A1',
        berthName: BERTH_SPECS['A1'].name,
        vesselName: '',
        shippingLine: 'Maersk Line',
        eta: '2026-10-25 08:00',
        etd: '2026-10-25 22:00',
        cranes: BERTH_SPECS['A1'].defaultCranes,
        status: 'SCHEDULED',
        draftRequired: 14.0,
        maxDraft: BERTH_SPECS['A1'].maxDraft,
        loaLengthMeters: 350,
      });
    }
    setFormWarning('');
    setIsModalOpen(true);
  };

  // Handle Berth Selection in Modal
  const handleBerthCodeChange = (code: BerthCode) => {
    const spec = BERTH_SPECS[code];
    setFormData((prev) => ({
      ...prev,
      berthCode: code,
      berthName: spec.name,
      maxDraft: spec.maxDraft,
      cranes: spec.defaultCranes,
    }));
  };

  // Handle Booking Auto-Fill in Modal
  const handleSelectBooking = (bookingId: string) => {
    const found = bookings.find((b) => b.bookingId === bookingId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        bookingId: found.bookingId,
        vesselName: found.vesselName,
        shippingLine: found.shippingLine,
        eta: found.etd, // Arrives for loading at ETD window
        etd: found.etd,
      }));
    }
  };

  // Save Berth Assignment
  const handleSaveBerth = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (formData.berthCode as BerthCode) || 'A1';
    const spec = BERTH_SPECS[code];

    const draft = Number(formData.draftRequired) || 12;
    if (draft > spec.maxDraft) {
      setFormWarning(`คำเตือน: เรือกินน้ำลึก (${draft}m) เกินกว่าความลึกสูงสุดของท่า ${code} (${spec.maxDraft}m)! อาจเกิดอันตรายต่อเรือ`);
      return;
    }

    const id = editingBerth ? editingBerth.id : 'berth-' + code.toLowerCase() + '-' + Date.now();

    const newBerth: BerthAssignment = {
      id,
      berthCode: code,
      berthName: spec.name,
      bookingId: formData.bookingId,
      vesselName: formData.vesselName || 'เรือยังไม่ระบุ',
      shippingLine: formData.shippingLine || '-',
      eta: formData.eta || '-',
      etd: formData.etd || '-',
      cranes: Number(formData.cranes) || spec.defaultCranes,
      status: (formData.status as BerthStatus) || 'SCHEDULED',
      draftRequired: draft,
      maxDraft: spec.maxDraft,
      loaLengthMeters: Number(formData.loaLengthMeters) || 300,
      hasConflict: false,
      isDemo: false,
    };

    await saveBerth(newBerth);
    setIsModalOpen(false);
    await onRefreshData();
  };

  // Release Berth (Make Available)
  const handleReleaseBerth = async (berth: BerthAssignment) => {
    const updated: BerthAssignment = {
      ...berth,
      vesselName: '-',
      shippingLine: '-',
      bookingId: undefined,
      eta: '-',
      etd: '-',
      status: 'AVAILABLE',
      draftRequired: 0,
      hasConflict: false,
      conflictWith: undefined,
    };
    await saveBerth(updated);
    await onRefreshData();
  };

  // Simulate a berth conflict to test Requirement 5 (1-click test button)
  const handleTriggerConflictTest = async () => {
    const conflictItem: BerthAssignment = {
      id: 'berth-conflict-test',
      berthCode: 'A1',
      berthName: 'ท่าเทียบเรือตู้สินค้า A1 (Terminal 1)',
      vesselName: 'MSC FLAMINIA (เรือแทรกคิวฉุกเฉิน)',
      shippingLine: 'MSC',
      eta: '2026-10-24 10:00',
      etd: '2026-10-24 18:00',
      cranes: 3,
      status: 'SCHEDULED',
      draftRequired: 14.0,
      maxDraft: 16.0,
      loaLengthMeters: 300,
      hasConflict: true,
      conflictWith: 'MAERSK MC-KINNEY MOLLER',
      isDemo: true,
    };
    await saveBerth(conflictItem);
    await onRefreshData();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Anchor className="w-6 h-6 text-sky-600" />
            <span>ระบบบริหารจัดการท่าเทียบเรือ (Berth Management & Queue)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            กำหนดคิวเรือเทียบท่า ตรวจสอบเวลาน้ำขึ้น-น้ำลง และระบบตรวจจับการจองท่าเทียบเรือซ้ำซ้อนอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerConflictTest}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
            title="ทดสอบระบบแจ้งเตือนการจองท่าเทียบเรือซ้ำซ้อน"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>ทดสอบสร้างคิวทับซ้อน (Conflict Test)</span>
          </button>

          <button
            onClick={() => handleOpenAssign()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ กำหนดคิวเรือเทียบท่า</span>
          </button>
        </div>
      </div>

      {/* Conflict Warning Alert Banner if conflicts detected (Requirement 5) */}
      {conflictingBerths.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 text-rose-900 space-y-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rose-950">
                แจ้งเตือนตรวจพบการจองท่าเทียบเรือซ้ำซ้อน! (Berth Overlap Conflict Detected)
              </h3>
              <p className="text-xs text-rose-700">
                มีเรือจองเข้าเทียบท่าที่ท่าเดียวกันในช่วงเวลาที่ทับซ้อนกัน กรุณาปรับเปลี่ยนตารางเวลาหรือย้ายท่าเทียบเรือ
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {conflictingBerths.map((c) => (
              <div key={c.id} className="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-rose-900">ท่าเทียบเรือ {c.berthCode}:</span>{' '}
                  <span className="font-semibold text-slate-800">{c.vesselName}</span>
                  <div className="text-[11px] text-rose-600 mt-0.5">
                    {c.conflictDetails || `เวลาทับซ้อนกับเรือ ${c.conflictWith}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenAssign(c)}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 transition-colors"
                  >
                    แก้ไข/ย้ายท่า
                  </button>
                  <button
                    onClick={() => deleteBerth(c.id).then(onRefreshData)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    ยกเลิกรายการนี้
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Berth Visual Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {evaluatedBerths.map((berth) => {
          const isOccupied = berth.status === 'OCCUPIED';
          const isScheduled = berth.status === 'SCHEDULED';
          const isAvailable = berth.status === 'AVAILABLE';

          return (
            <div
              key={berth.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                berth.hasConflict
                  ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200'
                  : isOccupied
                  ? 'bg-sky-50/60 border-sky-300 ring-1 ring-sky-200'
                  : isScheduled
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    Berth {berth.berthCode}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    berth.hasConflict ? 'bg-rose-600 text-white animate-pulse' :
                    isOccupied ? 'bg-sky-600 text-white' :
                    isScheduled ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {berth.hasConflict ? 'ทับซ้อน' :
                     isOccupied ? 'กำลังเทียบท่า' :
                     isScheduled ? 'มีตารางจอง' : 'ท่าว่าง'}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={berth.vesselName}>
                    {berth.vesselName !== '-' ? berth.vesselName : 'ไม่มีเรือเข้าเทียบท่า'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {berth.shippingLine !== '-' ? berth.shippingLine : 'พร้อมรองรับเรือ'}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span>ปั้นจั่นประจำท่า:</span>
                    <strong className="text-slate-900">{berth.cranes} คัน</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>กินน้ำลึก:</span>
                    <strong className="text-slate-900 font-mono">{berth.draftRequired}m / {berth.maxDraft}m</strong>
                  </div>
                  {berth.eta !== '-' && (
                    <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <div>เข้า: {berth.eta}</div>
                      <div>ออก: {berth.etd}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenAssign(berth)}
                  className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>จัดการ</span>
                </button>

                {!isAvailable && (
                  <button
                    onClick={() => handleReleaseBerth(berth)}
                    className="text-slate-500 hover:text-rose-600 font-medium"
                    title="ปลดคิวเรือให้ท่าเทียบว่าง"
                  >
                    ปลดคิวเรือ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Gantt-like Berth Schedule Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              ตารางคิวเรือเทียบท่า 48 ชั่วโมง (Berth Allocation Timeline)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            แสดงช่วงเวลาเทียบท่าและขนถ่ายสินค้า
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[650px] space-y-3 py-2">
            
            {/* Timeline Header (Hours) */}
            <div className="grid grid-cols-12 text-[11px] font-mono text-slate-400 pl-24 pr-4 border-b border-slate-100 pb-1">
              <div>00:00</div>
              <div>04:00</div>
              <div>08:00</div>
              <div>12:00</div>
              <div>16:00</div>
              <div>20:00</div>
              <div>+24h</div>
              <div>+28h</div>
              <div>+32h</div>
              <div>+36h</div>
              <div>+40h</div>
              <div>+48h</div>
            </div>

            {/* Berth Rows */}
            {['A1', 'A2', 'B1', 'B2', 'C1'].map((code) => {
              const assigned = evaluatedBerths.find((b) => b.berthCode === code);
              const hasShip = assigned && assigned.vesselName !== '-';

              return (
                <div key={code} className="flex items-center gap-3">
                  <div className="w-20 font-bold text-xs font-mono text-slate-800 shrink-0">
                    Berth {code}
                  </div>

                  <div className="flex-1 bg-slate-50 h-9 rounded-lg border border-slate-200 relative overflow-hidden flex items-center p-1">
                    {hasShip ? (
                      <div
                        className={`h-7 rounded-md px-3 flex items-center gap-2 text-xs font-semibold text-white truncate shadow-xs ${
                          assigned.hasConflict ? 'bg-rose-600 ring-2 ring-rose-300' : 'bg-sky-700'
                        }`}
                        style={{ width: `${code === 'A1' ? '65%' : code === 'B1' ? '75%' : code === 'A2' ? '45%' : '55%'}` }}
                      >
                        <Ship className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{assigned.vesselName} ({assigned.shippingLine})</span>
                        {assigned.hasConflict && (
                          <span className="bg-white text-rose-700 text-[10px] px-1.5 py-0.2 rounded font-bold ml-auto">
                            เวลาชนกัน
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 pl-3">ท่าว่าง ไม่มีเรือจอง</span>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* Assign Vessel to Berth Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  กำหนดเรือเข้าเทียบท่า (Berth Scheduling)
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBerth} className="p-6 space-y-4">
              
              {formWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{formWarning}</span>
                </div>
              )}

              {/* Select Existing Booking shortcut */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกจากการจองเรือในระบบ (Auto-Fill from Booking)
                </label>
                <select
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">-- หรือกรอกข้อมูลเรือด้วยตนเอง --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.bookingId}>
                      {b.bookingId} - {b.vesselName} ({b.shippingLine})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ท่าเทียบเรือ (Berth)
                  </label>
                  <select
                    value={formData.berthCode || 'A1'}
                    onChange={(e) => handleBerthCodeChange(e.target.value as BerthCode)}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="A1">Berth A1 (Max Draft 16.0m)</option>
                    <option value="A2">Berth A2 (Max Draft 16.0m)</option>
                    <option value="B1">Berth B1 (Max Draft 16.5m)</option>
                    <option value="B2">Berth B2 (Max Draft 16.5m)</option>
                    <option value="C1">Berth C1 (Max Draft 12.0m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะท่าเรือ
                  </label>
                  <select
                    value={formData.status || 'SCHEDULED'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BerthStatus })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="SCHEDULED">SCHEDULED (มีตารางจอง)</option>
                    <option value="OCCUPIED">OCCUPIED (เทียบท่าอยู่)</option>
                    <option value="MAINTENANCE">MAINTENANCE (ปิดซ่อมบำรุง)</option>
                    <option value="AVAILABLE">AVAILABLE (ท่าว่าง)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเรือ (Vessel Name)
                </label>
                <input
                  type="text"
                  required
                  value={formData.vesselName || ''}
                  onChange={(e) => setFormData({ ...formData, vesselName: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เวลาเริ่มเข้าเทียบท่า (ETA Start)
                  </label>
                  <input
                    type="text"
                    value={formData.eta || ''}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เวลาออกจากท่า (ETD End)
                  </label>
                  <input
                    type="text"
                    value={formData.etd || ''}
                    onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ปั้นจั่น (Cranes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.cranes || 3}
                    onChange={(e) => setFormData({ ...formData, cranes: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กินน้ำลึก (Draft m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.draftRequired || 13.5}
                    onChange={(e) => setFormData({ ...formData, draftRequired: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ความยาวเรือ (LOA m)
                  </label>
                  <input
                    type="number"
                    value={formData.loaLengthMeters || 350}
                    onChange={(e) => setFormData({ ...formData, loaLengthMeters: parseInt(e.target.value, 10) || 200 })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกตารางเทียบท่า</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
