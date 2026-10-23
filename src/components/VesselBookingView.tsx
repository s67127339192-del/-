import React, { useState, useMemo } from 'react';
import { 
  VesselBooking, 
  ContainerType, 
  BookingStatus, 
  BerthCode 
} from '../types';
import { 
  saveBooking, 
  deleteBooking, 
  saveVesselTracking, 
  getVesselTrackings 
} from '../services/db';
import { 
  Ship, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  XCircle, 
  CheckCircle2, 
  Navigation, 
  FileText, 
  Calendar, 
  X, 
  Save, 
  AlertCircle 
} from 'lucide-react';

interface VesselBookingViewProps {
  bookings: VesselBooking[];
  onRefreshData: () => Promise<void>;
  onNavigateTracking: (vesselName: string) => void;
  onSelectBookingForCalc?: (booking: VesselBooking) => void;
}

export const VesselBookingView: React.FC<VesselBookingViewProps> = ({
  bookings,
  onRefreshData,
  onNavigateTracking,
  onSelectBookingForCalc,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [shippingLineFilter, setShippingLineFilter] = useState<string>('ALL');
  const [demoFilter, setDemoFilter] = useState<'ALL' | 'REAL' | 'DEMO'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<VesselBooking | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<VesselBooking>>({
    bookingId: '',
    shippingLine: 'Maersk Line',
    vesselName: '',
    voyageNo: '',
    pol: 'Laem Chabang Port (THLCH)',
    pod: 'Port of Singapore (SGSIN)',
    etd: '2026-10-25 14:00',
    eta: '2026-10-28 08:00',
    containerType: '40HC',
    quantity: 1,
    cargoDescription: '',
    shipperName: '',
    consigneeName: '',
    status: 'BOOKED',
    freightAmountUSD: 1800,
    assignedBerth: 'A1',
    notes: '',
  });

  const [formError, setFormError] = useState('');

  // Shipping Line options
  const shippingLines = [
    'Maersk Line',
    'Ocean Network Express (ONE)',
    'MSC',
    'Evergreen Marine',
    'COSCO Shipping',
    'Hapag-Lloyd',
    'CMA CGM',
    'Yang Ming',
  ];

  const popularPODs = [
    'Port of Singapore (SGSIN)',
    'Port of Shanghai (CNSHA)',
    'Port of Rotterdam (NLRTM)',
    'Port of Los Angeles (USLAX)',
    'Port of Tokyo (JPTYO)',
    'Port of Busan (KRPUS)',
    'Port of Hamburg (DEHAM)',
    'Port Klang (MYPKG)',
  ];

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch = 
        b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.shipperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.cargoDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.pol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.pod.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchLine = shippingLineFilter === 'ALL' || b.shippingLine === shippingLineFilter;
      const matchDemo = 
        demoFilter === 'ALL' ? true :
        demoFilter === 'DEMO' ? b.isDemo : !b.isDemo;

      return matchSearch && matchStatus && matchLine && matchDemo;
    });
  }, [bookings, searchTerm, statusFilter, shippingLineFilter, demoFilter]);

  // Open modal for Create
  const handleOpenCreate = () => {
    const randomId = 'BKG-2026-' + Math.floor(100 + Math.random() * 900);
    setEditingBooking(null);
    setFormData({
      bookingId: randomId,
      shippingLine: 'Maersk Line',
      vesselName: '',
      voyageNo: 'V.2610E',
      pol: 'Laem Chabang Port (THLCH)',
      pod: 'Port of Singapore (SGSIN)',
      etd: '2026-10-25 14:00',
      eta: '2026-10-28 08:00',
      containerType: '40HC',
      quantity: 2,
      cargoDescription: '',
      shipperName: '',
      consigneeName: '',
      status: 'BOOKED',
      freightAmountUSD: 2400,
      assignedBerth: 'A1',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (booking: VesselBooking) => {
    setEditingBooking(booking);
    setFormData({ ...booking });
    setFormError('');
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bookingId || !formData.vesselName || !formData.shipperName) {
      setFormError('กรุณากรอก Booking ID, ชื่อเรือ และชื่อผู้ส่งออก');
      return;
    }

    const now = new Date().toISOString();
    const id = editingBooking ? editingBooking.id : 'bkg-' + Date.now();

    const newBooking: VesselBooking = {
      id,
      bookingId: formData.bookingId!,
      shippingLine: formData.shippingLine || 'Maersk Line',
      vesselName: formData.vesselName!,
      voyageNo: formData.voyageNo || 'V.01',
      pol: formData.pol || 'Laem Chabang Port (THLCH)',
      pod: formData.pod || 'Port of Singapore (SGSIN)',
      etd: formData.etd || '2026-10-26 10:00',
      eta: formData.eta || '2026-10-29 18:00',
      containerType: (formData.containerType as ContainerType) || '40HC',
      quantity: Number(formData.quantity) || 1,
      cargoDescription: formData.cargoDescription || 'สินค้าส่งออกทั่วไป',
      shipperName: formData.shipperName!,
      consigneeName: formData.consigneeName || 'ผู้รับปลายทาง',
      status: (formData.status as BookingStatus) || 'BOOKED',
      freightAmountUSD: Number(formData.freightAmountUSD) || 1500,
      assignedBerth: formData.assignedBerth as BerthCode,
      notes: formData.notes || '',
      isDemo: editingBooking ? editingBooking.isDemo : false, // User created items are real (isDemo: false)
      createdAt: editingBooking ? editingBooking.createdAt : now,
      updatedAt: now,
    };

    await saveBooking(newBooking);

    // Also sync or create tracking record for this vessel
    try {
      const existingTrackings = await getVesselTrackings();
      const existingTrk = existingTrackings.find(t => t.vesselName.toLowerCase() === newBooking.vesselName.toLowerCase());
      if (!existingTrk) {
        await saveVesselTracking({
          id: 'trk-' + Date.now(),
          bookingId: newBooking.bookingId,
          vesselName: newBooking.vesselName,
          shippingLine: newBooking.shippingLine,
          voyageNo: newBooking.voyageNo,
          pol: newBooking.pol,
          pod: newBooking.pod,
          etd: newBooking.etd,
          eta: newBooking.eta,
          currentStatus: 'BOOKED',
          lat: 13.08,
          lng: 100.88,
          speedKnots: 0,
          headingDeg: 180,
          nauticalMilesTotal: 1200,
          nauticalMilesCompleted: 0,
          etaCountdownHours: 72,
          currentLocationName: 'ท่าเทียบเรือแหลมฉบัง (รอออกเรือตามกำหนด)',
          waypoints: [
            { name: newBooking.pol.split(' ')[0], lat: 13.08, lng: 100.88, reached: true },
            { name: 'อ่าวไทยตอนล่าง', lat: 8.5, lng: 102.0, reached: false },
            { name: newBooking.pod.split(' ')[0], lat: 1.3, lng: 103.8, reached: false },
          ],
          isDemo: false,
          lastUpdated: now,
        });
      }
    } catch (err) {
      console.warn('Tracking sync notice:', err);
    }

    setIsModalOpen(false);
    await onRefreshData();
  };

  // Cancel Booking
  const handleCancelBooking = async (booking: VesselBooking) => {
    const updated: VesselBooking = {
      ...booking,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };
    await saveBooking(updated);
    await onRefreshData();
  };

  // Delete Booking
  const handleDeleteBooking = async (id: string, name: string) => {
    await deleteBooking(id);
    await onRefreshData();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Ship className="w-6 h-6 text-sky-600" />
            <span>ระบบบริหารจัดการการจองเรือ (Vessel Booking System)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เพิ่ม แก้ไข ยกเลิก และบันทึกข้อมูลการจองระวางเรือขนส่งสินค้าทางทะเล
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ สร้างการจองเรือใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา Booking ID, ชื่อเรือ, ผู้ส่งออก, ท่าเรือ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">สถานะทั้งหมด (All Status)</option>
              <option value="BOOKED">BOOKED (จองแล้ว)</option>
              <option value="CONFIRMED">CONFIRMED (ยืนยันแล้ว)</option>
              <option value="COMPLETED">COMPLETED (เสร็จสิ้น)</option>
              <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
            </select>
          </div>

          {/* Shipping Line Filter */}
          <div className="md:col-span-2">
            <select
              value={shippingLineFilter}
              onChange={(e) => setShippingLineFilter(e.target.value)}
              className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">ทุกสายการเดินเรือ</option>
              {shippingLines.map((line) => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          {/* Demo Data Selector (Requirement 12) */}
          <div className="md:col-span-2">
            <select
              value={demoFilter}
              onChange={(e) => setDemoFilter(e.target.value as any)}
              className="w-full text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">ทั้งหมด (จริง + DEMO)</option>
              <option value="REAL">เฉพาะข้อมูลจริง (User Data)</option>
              <option value="DEMO">เฉพาะข้อมูล DEMO</option>
            </select>
          </div>

        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
          <span>พบข้อมูลการจองเรือ: <strong className="text-slate-900 font-mono">{filteredBookings.length}</strong> รายการ</span>
          <span className="text-[11px] text-slate-400">ข้อมูลบันทึกในเครื่องด้วย IndexedDB อัตโนมัติ</span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3.5">Booking ID</th>
                <th className="py-3 px-3.5">เรือ & เที่ยวเรือ</th>
                <th className="py-3 px-3.5">สายการเดินเรือ</th>
                <th className="py-3 px-3.5">เส้นทาง (POL → POD)</th>
                <th className="py-3 px-3.5">ตู้สินค้า</th>
                <th className="py-3 px-3.5">ผู้ส่งออก (Shipper)</th>
                <th className="py-3 px-3.5">ETD / ETA</th>
                <th className="py-3 px-3.5">สถานะ</th>
                <th className="py-3 px-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Ship className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div>ไม่พบข้อมูลการจองเรือที่ตรงกับเงื่อนไข</div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-sky-800 text-xs">
                        {b.bookingId}
                      </div>
                      {b.isDemo ? (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-sans inline-block mt-0.5">
                          DEMO
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-sans inline-block mt-0.5">
                          ข้อมูลจริง
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{b.vesselName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Voy: {b.voyageNo}</div>
                    </td>

                    <td className="py-3 px-3.5 text-slate-700 font-medium">
                      {b.shippingLine}
                    </td>

                    <td className="py-3 px-3.5 text-slate-600">
                      <div className="font-medium text-slate-800">{b.pol.split(' ')[0]}</div>
                      <div className="text-[11px] text-slate-500">→ {b.pod.split(' ')[0]}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-slate-800">
                        {b.quantity} × {b.containerType}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[130px]" title={b.cargoDescription}>
                        {b.cargoDescription}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-slate-700 truncate max-w-[150px]" title={b.shipperName}>
                      {b.shipperName}
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                      <div>ETD: <span className="font-mono">{b.etd}</span></div>
                      <div>ETA: <span className="font-mono">{b.eta}</span></div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        b.status === 'BOOKED' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                        b.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {b.status === 'CONFIRMED' ? 'ยืนยันแล้ว' :
                         b.status === 'BOOKED' ? 'จองแล้ว' :
                         b.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'ยกเลิกแล้ว'}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onNavigateTracking(b.vesselName)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="ดูแผนที่ติดตามเรือ"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="แก้ไขการจอง"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelBooking(b)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="ยกเลิกการจอง"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteBooking(b.id, b.bookingId)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ลบรายการ"
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

      {/* Add / Edit Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  {editingBooking ? `แก้ไขการจองเรือ: ${editingBooking.bookingId}` : 'สร้างการจองเรือใหม่ (New Vessel Booking)'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Booking ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookingId || ''}
                    onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สายการเดินเรือ (Shipping Line)
                  </label>
                  <select
                    value={formData.shippingLine || 'Maersk Line'}
                    onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {shippingLines.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อเรือ (Vessel Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น MAERSK MC-KINNEY MOLLER"
                    value={formData.vesselName || ''}
                    onChange={(e) => setFormData({ ...formData, vesselName: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เที่ยวเรือ (Voyage No.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 2601W"
                    value={formData.voyageNo || ''}
                    onChange={(e) => setFormData({ ...formData, voyageNo: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ท่าเรือต้นทาง (Port of Loading - POL)
                  </label>
                  <select
                    value={formData.pol || 'Laem Chabang Port (THLCH)'}
                    onChange={(e) => setFormData({ ...formData, pol: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="Laem Chabang Port (THLCH)">Laem Chabang Port (THLCH)</option>
                    <option value="Bangkok Port (THBKK)">Bangkok Port - Klong Toey (THBKK)</option>
                    <option value="Songkhla Port (THSGZ)">Songkhla Port (THSGZ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ท่าเรือปลายทาง (Port of Discharge - POD)
                  </label>
                  <select
                    value={formData.pod || 'Port of Singapore (SGSIN)'}
                    onChange={(e) => setFormData({ ...formData, pod: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {popularPODs.map((pod) => (
                      <option key={pod} value={pod}>{pod}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กำหนดเวลาออกเรือ (ETD)
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD HH:mm"
                    value={formData.etd || ''}
                    onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กำหนดเวลาถึงท่าเรือปลายทาง (ETA)
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD HH:mm"
                    value={formData.eta || ''}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทตู้สินค้า (Container Type)
                  </label>
                  <select
                    value={formData.containerType || '40HC'}
                    onChange={(e) => setFormData({ ...formData, containerType: e.target.value as ContainerType })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="20GP">20' General Purpose (20GP)</option>
                    <option value="40GP">40' General Purpose (40GP)</option>
                    <option value="40HC">40' High Cube (40HC)</option>
                    <option value="20RF">20' Reefer แช่เย็น (20RF)</option>
                    <option value="40RF">40' Reefer แช่เย็น (40RF)</option>
                    <option value="45HC">45' High Cube (45HC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวนตู้ (Quantity)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.quantity || 1}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะการจอง (Booking Status)
                  </label>
                  <select
                    value={formData.status || 'BOOKED'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="BOOKED">BOOKED (จองแล้ว)</option>
                    <option value="CONFIRMED">CONFIRMED (ยืนยันแล้ว)</option>
                    <option value="COMPLETED">COMPLETED (เสร็จสิ้น)</option>
                    <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ท่าเทียบเรือที่ระบุ (Assigned Berth)
                  </label>
                  <select
                    value={formData.assignedBerth || 'A1'}
                    onChange={(e) => setFormData({ ...formData, assignedBerth: e.target.value as BerthCode })}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="A1">Berth A1 (Container Terminal 1)</option>
                    <option value="A2">Berth A2 (Container Terminal 1)</option>
                    <option value="B1">Berth B1 (Deep-Sea Terminal 2)</option>
                    <option value="B2">Berth B2 (Deep-Sea Terminal 2)</option>
                    <option value="C1">Berth C1 (Feeder Terminal)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    คำอธิบายสินค้า (Cargo Description)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ข้าวหอมมะลิไทย 100% บรรจุถุง 50 กก."
                    value={formData.cargoDescription || ''}
                    onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้ส่งออก (Shipper) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อบริษัทผู้ส่งออก"
                    value={formData.shipperName || ''}
                    onChange={(e) => setFormData({ ...formData, shipperName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้รับปลายทาง (Consignee)
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อผู้รับปลายทาง"
                    value={formData.consigneeName || ''}
                    onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm min-h-[40px]"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการจองเรือลง IndexedDB</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
