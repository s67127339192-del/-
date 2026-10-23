import React, { useState, useMemo } from 'react';
import { 
  PortContainer, 
  ContainerType, 
  ContainerStatus, 
  YardZone, 
  VesselBooking 
} from '../types';
import { saveContainer, deleteContainer } from '../services/db';
import { 
  Box, 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  Layers, 
  MapPin 
} from 'lucide-react';

interface ContainerManagementViewProps {
  containers: PortContainer[];
  bookings: VesselBooking[];
  onRefreshData: () => Promise<void>;
}

export const ContainerManagementView: React.FC<ContainerManagementViewProps> = ({
  containers,
  bookings,
  onRefreshData,
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'YARD_GRID'>('LIST');
  const [selectedZone, setSelectedZone] = useState<YardZone>('A');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [demoFilter, setDemoFilter] = useState<'ALL' | 'REAL' | 'DEMO'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<PortContainer | null>(null);

  const [formData, setFormData] = useState<Partial<PortContainer>>({
    containerNo: '',
    sizeType: '40HC',
    bookingId: '',
    vesselName: '',
    shippingLine: 'Maersk Line',
    grossWeightKg: 26500,
    tareWeightKg: 3900,
    status: 'IN_YARD',
    yardZone: 'A',
    yardBay: 1,
    yardRow: 1,
    yardTier: 1,
    gateInDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
    freeDaysRemaining: 3,
    demurrageDays: 0,
  });

  const [formError, setFormError] = useState('');

  // Filtered Containers
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      const matchSearch =
        c.containerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.bookingId && c.bookingId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.vesselName && c.vesselName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchDemo =
        demoFilter === 'ALL' ? true :
        demoFilter === 'DEMO' ? c.isDemo : !c.isDemo;

      return matchSearch && matchStatus && matchDemo;
    });
  }, [containers, searchTerm, statusFilter, demoFilter]);

  // Open modal for Create
  const handleOpenCreate = (zone?: YardZone, bay?: number, row?: number) => {
    const randomPrefix = ['MSKU', 'ONEY', 'MEDU', 'EMCU', 'COSU', 'TGHU'][Math.floor(Math.random() * 6)];
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    const generatedNo = `${randomPrefix}${randomNum}`;

    setEditingContainer(null);
    setFormData({
      containerNo: generatedNo,
      sizeType: zone === 'B' ? '20GP' : zone === 'C' ? '40RF' : '40HC',
      bookingId: bookings[0]?.bookingId || '',
      vesselName: bookings[0]?.vesselName || '',
      shippingLine: bookings[0]?.shippingLine || 'Maersk Line',
      grossWeightKg: 28000,
      tareWeightKg: 3900,
      status: 'IN_YARD',
      yardZone: zone || 'A',
      yardBay: bay || 1,
      yardRow: row || 1,
      yardTier: 1,
      gateInDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      freeDaysRemaining: 3,
      demurrageDays: 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (container: PortContainer) => {
    setEditingContainer(container);
    setFormData({ ...container });
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Container
  const handleSaveContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.containerNo) {
      setFormError('กรุณาระบุหมายเลขตู้คอนเทนเนอร์');
      return;
    }

    const id = editingContainer ? editingContainer.id : 'cnt-' + Date.now();
    const newContainer: PortContainer = {
      id,
      containerNo: formData.containerNo.toUpperCase(),
      sizeType: (formData.sizeType as ContainerType) || '40HC',
      bookingId: formData.bookingId,
      vesselName: formData.vesselName,
      shippingLine: formData.shippingLine,
      grossWeightKg: Number(formData.grossWeightKg) || 20000,
      tareWeightKg: Number(formData.tareWeightKg) || 3800,
      status: (formData.status as ContainerStatus) || 'IN_YARD',
      yardZone: (formData.yardZone as YardZone) || 'A',
      yardBay: Number(formData.yardBay) || 1,
      yardRow: Number(formData.yardRow) || 1,
      yardTier: Number(formData.yardTier) || 1,
      gateInDate: formData.gateInDate || new Date().toISOString().substring(0, 16),
      freeDaysRemaining: Number(formData.freeDaysRemaining) ?? 3,
      demurrageDays: Number(formData.demurrageDays) || 0,
      isDemo: editingContainer ? editingContainer.isDemo : false,
    };

    await saveContainer(newContainer);
    setIsModalOpen(false);
    await onRefreshData();
  };

  // Delete Container
  const handleDeleteContainer = async (id: string) => {
    await deleteContainer(id);
    await onRefreshData();
  };

  // Quick Gate-Out Container
  const handleGateOut = async (container: PortContainer) => {
    const updated: PortContainer = {
      ...container,
      status: 'GATE_OUT',
    };
    await saveContainer(updated);
    await onRefreshData();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-sky-600" />
            <span>ระบบบริหารจัดการลานตู้สินค้า (Container Yard Management)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกหมายเลขตู้ ติดตามสถานะ Gate-In/Out ผังลานตู้สินค้า 2 มิติ และคำนวณวันปลอดค่าจัดเก็บ (Free Time)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher: Table vs Visual Grid */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>ตาราง</span>
            </button>
            <button
              onClick={() => setViewMode('YARD_GRID')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'YARD_GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ผังลานตู้ (2D Yard Grid)</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มตู้เข้าลาน (Gate-In)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] text-slate-500">ตู้ทั้งหมดในระบบ</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{containers.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] text-sky-700 font-semibold">ในลานตู้ (In Yard)</div>
          <div className="text-xl font-bold text-sky-900 font-mono mt-0.5">
            {containers.filter(c => c.status === 'IN_YARD').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold">โหลดขึ้นเรือ (Loaded)</div>
          <div className="text-xl font-bold text-emerald-900 font-mono mt-0.5">
            {containers.filter(c => c.status === 'LOADED').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] text-amber-700 font-semibold">เพิ่งเข้าประตู (Gate-In)</div>
          <div className="text-xl font-bold text-amber-900 font-mono mt-0.5">
            {containers.filter(c => c.status === 'GATE_IN').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] text-rose-700 font-semibold">ติดตรวจศุลกากร (Hold)</div>
          <div className="text-xl font-bold text-rose-900 font-mono mt-0.5">
            {containers.filter(c => c.status === 'CUSTOMS_HOLD').length}
          </div>
        </div>
      </div>

      {/* Visual 2D Yard Grid View */}
      {viewMode === 'YARD_GRID' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-5 h-5 text-sky-600" />
                <span>ผังการจัดวางตู้สินค้าในลาน (2D Visual Container Yard Map)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่ช่องว่างเพื่อวางตู้สินค้าลงในลาน หรือคลิกที่ตู้สินค้าเพื่อแก้ไขตำแหน่ง
              </p>
            </div>

            {/* Zone Selector Buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">โซนลานตู้:</span>
              {(['A', 'B', 'C', 'D'] as YardZone[]).map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    selectedZone === zone
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Zone {zone} {zone === 'A' ? '(40ft Dry)' : zone === 'B' ? '(20ft Dry)' : zone === 'C' ? '(Reefer)' : '(Gate/Staging)'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Yard Grid Rendering (Bays x Rows) */}
          <div className="overflow-x-auto p-2 bg-slate-900 rounded-xl">
            <div className="min-w-[680px] space-y-2">
              <div className="text-[11px] font-mono text-slate-400 flex justify-between px-2 pb-1 border-b border-slate-800">
                <span>ลานตู้สินค้า Zone {selectedZone}</span>
                <span>แกนแนวนอน: Bay 01-08 · แกนแนวตั้ง: Row 01-05</span>
              </div>

              {/* Grid Matrix: 5 Rows x 8 Bays */}
              {[1, 2, 3, 4, 5].map((rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-2">
                  <span className="w-12 text-[10px] font-mono text-slate-400 font-bold text-right shrink-0">
                    Row 0{rowIdx}
                  </span>

                  <div className="flex-1 grid grid-cols-8 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((bayIdx) => {
                      const placed = containers.find(
                        (c) => c.yardZone === selectedZone && c.yardBay === bayIdx && c.yardRow === rowIdx
                      );

                      if (placed) {
                        return (
                          <div
                            key={bayIdx}
                            onClick={() => handleOpenEdit(placed)}
                            className={`h-16 rounded-lg p-1.5 text-center cursor-pointer transition-all border flex flex-col justify-between shadow-xs ${
                              placed.status === 'LOADED' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' :
                              placed.status === 'CUSTOMS_HOLD' ? 'bg-rose-950/80 border-rose-500 text-rose-200' :
                              'bg-sky-950/80 border-sky-400 text-sky-200 hover:ring-2 hover:ring-sky-300'
                            }`}
                          >
                            <div className="font-mono font-bold text-[10px] truncate" title={placed.containerNo}>
                              {placed.containerNo}
                            </div>
                            <div className="text-[9px] text-slate-300 font-medium">
                              {placed.sizeType} · T{placed.yardTier}
                            </div>
                            <div className="text-[8px] opacity-75 truncate">
                              {placed.status}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={bayIdx}
                          onClick={() => handleOpenCreate(selectedZone, bayIdx, rowIdx)}
                          className="h-16 rounded-lg border border-dashed border-slate-700 hover:border-sky-500 bg-slate-900/60 hover:bg-slate-800/80 text-slate-600 hover:text-sky-300 flex flex-col items-center justify-center cursor-pointer transition-all text-[10px]"
                        >
                          <span className="font-mono opacity-50">B{bayIdx}-R{rowIdx}</span>
                          <span className="text-[9px] mt-0.5 opacity-60">+ ว่าง</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar for List View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาหมายเลขตู้คอนเทนเนอร์, Booking ID, ชื่อเรือ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="ALL">สถานะทั้งหมด (All Status)</option>
              <option value="IN_YARD">IN_YARD (อยู่ในลานตู้)</option>
              <option value="GATE_IN">GATE_IN (เพิ่งเข้าประตู)</option>
              <option value="LOADED">LOADED (ขึ้นเรือแล้ว)</option>
              <option value="GATE_OUT">GATE_OUT (นำออกจากท่า)</option>
              <option value="CUSTOMS_HOLD">CUSTOMS_HOLD (ศุลกากรกักตรวจ)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={demoFilter}
              onChange={(e) => setDemoFilter(e.target.value as any)}
              className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="ALL">ทั้งหมด (ข้อมูลจริง + DEMO)</option>
              <option value="REAL">เฉพาะข้อมูลจริง (User Added)</option>
              <option value="DEMO">เฉพาะข้อมูล DEMO</option>
            </select>
          </div>

        </div>
      </div>

      {/* Containers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3.5">หมายเลขตู้ (Container No.)</th>
                <th className="py-3 px-3.5">ขนาด / ประเภท</th>
                <th className="py-3 px-3.5">Booking / เรือ</th>
                <th className="py-3 px-3.5">ตำแหน่งลานตู้ (Yard Location)</th>
                <th className="py-3 px-3.5">น้ำหนัก Gross (กก.)</th>
                <th className="py-3 px-3.5">วันที่ Gate-In</th>
                <th className="py-3 px-3.5">สถานะ</th>
                <th className="py-3 px-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContainers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Box className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div>ไม่พบข้อมูลตู้คอนเทนเนอร์</div>
                  </td>
                </tr>
              ) : (
                filteredContainers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-sky-800 text-xs">
                        {c.containerNo}
                      </div>
                      {c.isDemo && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans">
                          DEMO
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-slate-800">
                      {c.sizeType}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-900">{c.bookingId || '-'}</div>
                      <div className="text-[11px] text-slate-500">{c.vesselName || '-'}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-block">
                        Zone {c.yardZone}-B{c.yardBay}-R{c.yardRow}-T{c.yardTier}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 font-mono text-slate-700">
                      {c.grossWeightKg.toLocaleString()} กก.
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                      {c.gateInDate}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'LOADED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        c.status === 'IN_YARD' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                        c.status === 'GATE_IN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        c.status === 'CUSTOMS_HOLD' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="แก้ไขข้อมูลตู้/ย้ายตำแหน่ง"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {c.status !== 'GATE_OUT' && (
                          <button
                            onClick={() => handleGateOut(c)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Gate-Out (นำตู้ออกจากท่าเรือ)"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteContainer(c.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ลบตู้สินค้า"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Container Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  {editingContainer ? `แก้ไขตู้คอนเทนเนอร์: ${editingContainer.containerNo}` : 'บันทึกตู้สินค้าเข้าสู่ลาน (Gate-In)'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContainer} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมายเลขตู้ (Container No.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น MSKU9182341"
                    value={formData.containerNo || ''}
                    onChange={(e) => setFormData({ ...formData, containerNo: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ขนาด / ประเภทตู้
                  </label>
                  <select
                    value={formData.sizeType || '40HC'}
                    onChange={(e) => setFormData({ ...formData, sizeType: e.target.value as ContainerType })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="20GP">20' GP</option>
                    <option value="40GP">40' GP</option>
                    <option value="40HC">40' High Cube</option>
                    <option value="20RF">20' Reefer</option>
                    <option value="40RF">40' Reefer</option>
                    <option value="45HC">45' High Cube</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Booking ID อ้างอิง
                  </label>
                  <select
                    value={formData.bookingId || ''}
                    onChange={(e) => {
                      const found = bookings.find(b => b.bookingId === e.target.value);
                      setFormData({
                        ...formData,
                        bookingId: e.target.value,
                        vesselName: found ? found.vesselName : formData.vesselName,
                      });
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.bookingId}>{b.bookingId} ({b.vesselName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะตู้
                  </label>
                  <select
                    value={formData.status || 'IN_YARD'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ContainerStatus })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="IN_YARD">IN_YARD (อยู่ในลานตู้)</option>
                    <option value="GATE_IN">GATE_IN (เพิ่งเข้าประตู)</option>
                    <option value="LOADED">LOADED (โหลดขึ้นเรือแล้ว)</option>
                    <option value="CUSTOMS_HOLD">CUSTOMS_HOLD (กักตรวจศุลกากร)</option>
                    <option value="GATE_OUT">GATE_OUT (นำออกจากท่าเรือ)</option>
                  </select>
                </div>
              </div>

              {/* Yard Location Pickers */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
                <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>ตำแหน่งการวางในลานตู้ (Yard Location Coordinate)</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-sky-900 mb-0.5">โซน (Zone)</label>
                    <select
                      value={formData.yardZone || 'A'}
                      onChange={(e) => setFormData({ ...formData, yardZone: e.target.value as YardZone })}
                      className="w-full text-xs font-bold p-2 bg-white border border-sky-300 rounded"
                    >
                      <option value="A">A (40ft)</option>
                      <option value="B">B (20ft)</option>
                      <option value="C">C (Reefer)</option>
                      <option value="D">D (Staging)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-sky-900 mb-0.5">Bay</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.yardBay || 1}
                      onChange={(e) => setFormData({ ...formData, yardBay: parseInt(e.target.value, 10) || 1 })}
                      className="w-full text-xs font-mono font-bold p-2 bg-white border border-sky-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-sky-900 mb-0.5">Row</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.yardRow || 1}
                      onChange={(e) => setFormData({ ...formData, yardRow: parseInt(e.target.value, 10) || 1 })}
                      className="w-full text-xs font-mono font-bold p-2 bg-white border border-sky-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-sky-900 mb-0.5">Tier (ชั้น)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formData.yardTier || 1}
                      onChange={(e) => setFormData({ ...formData, yardTier: parseInt(e.target.value, 10) || 1 })}
                      className="w-full text-xs font-mono font-bold p-2 bg-white border border-sky-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    น้ำหนัก Gross Weight (กก.)
                  </label>
                  <input
                    type="number"
                    value={formData.grossWeightKg || 25000}
                    onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันที่และเวลา Gate-In
                  </label>
                  <input
                    type="text"
                    value={formData.gateInDate || ''}
                    onChange={(e) => setFormData({ ...formData, gateInDate: e.target.value })}
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
                  <span>บันทึกตู้คอนเทนเนอร์</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
