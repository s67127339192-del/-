import React, { useState, useEffect } from 'react';
import { 
  TariffConfig, 
  ContainerType, 
  ExportCalculationRecord, 
  VesselBooking 
} from '../types';
import { 
  getTariffs, 
  saveTariffs, 
  saveCalculation, 
  getCalculations, 
  deleteCalculation 
} from '../services/db';
import { 
  Calculator, 
  Settings, 
  Save, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  FileText, 
  Box, 
  ArrowRight, 
  Clock 
} from 'lucide-react';

interface CostCalculatorViewProps {
  bookings: VesselBooking[];
  onRefreshData: () => Promise<void>;
}

export const CostCalculatorView: React.FC<CostCalculatorViewProps> = ({
  bookings,
  onRefreshData,
}) => {
  // Tariff Config State (Customizable by user)
  const [tariffs, setTariffs] = useState<TariffConfig>({
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
  });

  const [isEditingTariffs, setIsEditingTariffs] = useState(false);
  const [tariffSaveNotice, setTariffSaveNotice] = useState(false);

  // Calculation Form State
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [containerType, setContainerType] = useState<ContainerType>('40HC');
  const [quantity, setQuantity] = useState<number>(2);
  const [cargoWeightTon, setCargoWeightTon] = useState<number>(48);
  const [yardStorageDays, setYardStorageDays] = useState<number>(5); // 5 days -> 2 days demurrage if 3 days free

  // Saved Calculations
  const [savedCalculations, setSavedCalculations] = useState<ExportCalculationRecord[]>([]);
  const [calcSaveNotice, setCalcSaveNotice] = useState(false);

  // Load tariffs & calculations on mount
  useEffect(() => {
    const load = async () => {
      const t = await getTariffs();
      if (t) setTariffs(t);
      const c = await getCalculations();
      if (c) setSavedCalculations(c);
    };
    load();
  }, []);

  // Handle Booking Selection
  const handleSelectBooking = (bkgId: string) => {
    setSelectedBookingId(bkgId);
    const found = bookings.find((b) => b.bookingId === bkgId);
    if (found) {
      setContainerType(found.containerType);
      setQuantity(found.quantity);
      setCargoWeightTon(found.quantity * (found.containerType === '20GP' ? 18 : 24));
    }
  };

  // Math Calculations
  const ratePerUnitUSD = containerType === '20GP' ? tariffs.oceanFreight20GP : tariffs.oceanFreight40HC;
  const oceanFreightUSD = ratePerUnitUSD * quantity;
  const oceanFreightTHB = oceanFreightUSD * tariffs.exchangeRateTHBPerUSD;

  const thcOriginTHB = tariffs.thcOriginTHB * quantity;
  const thcDestUSD = tariffs.thcDestUSD * quantity;
  const thcDestTHB = thcDestUSD * tariffs.exchangeRateTHBPerUSD;

  const wharfageTHB = tariffs.wharfageRateTHB * cargoWeightTon;

  // Yard Storage Demurrage (After free time)
  const taxableStorageDays = Math.max(0, yardStorageDays - tariffs.freeTimeDays);
  const storageFeeTHB = taxableStorageDays * tariffs.storagePerDayAfterFreeTHB * quantity;

  const docFeeTHB = tariffs.docFeeTHB;
  const customsClearanceTHB = tariffs.customsClearanceTHB;
  const bafUSD = tariffs.bafUSD * quantity;
  const bafTHB = bafUSD * tariffs.exchangeRateTHBPerUSD;

  const totalTHB = oceanFreightTHB + thcOriginTHB + thcDestTHB + wharfageTHB + storageFeeTHB + docFeeTHB + customsClearanceTHB + bafTHB;
  const totalUSD = totalTHB / (tariffs.exchangeRateTHBPerUSD || 36.5);

  // Save Custom Tariffs
  const handleSaveTariffConfig = async () => {
    await saveTariffs(tariffs);
    setTariffSaveNotice(true);
    setIsEditingTariffs(false);
    setTimeout(() => setTariffSaveNotice(false), 3000);
  };

  // Save this calculation to IndexedDB
  const handleSaveCalculation = async () => {
    const record: ExportCalculationRecord = {
      id: 'calc-' + Date.now(),
      bookingId: selectedBookingId || undefined,
      calculationDate: new Date().toISOString().substring(0, 10),
      containerType,
      quantity,
      cargoWeightTon,
      yardStorageDays,
      oceanFreightUSD,
      oceanFreightTHB,
      thcOriginTHB,
      thcDestUSD,
      thcDestTHB,
      wharfageTHB,
      storageFeeTHB,
      docFeeTHB,
      customsClearanceTHB,
      bafTHB,
      totalTHB,
      totalUSD,
      isDemo: false,
    };

    await saveCalculation(record);
    const updated = await getCalculations();
    setSavedCalculations(updated);
    setCalcSaveNotice(true);
    setTimeout(() => setCalcSaveNotice(false), 3000);
  };

  // Delete Calculation
  const handleDeleteCalculation = async (id: string) => {
    await deleteCalculation(id);
    const updated = await getCalculations();
    setSavedCalculations(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-sky-600" />
            <span>เครื่องคำนวณค่าระวางเรือ ค่าท่าเรือ THC และค่าจัดเก็บตู้ (Export & Port Cost Calculator)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            คำนวณต้นทุนการขนส่งทางทะเลตามอัตราค่าบริการที่ผู้ใช้กำหนดเอง (Customizable Tariffs) พร้อมพิมพ์ใบเสนอราคา
          </p>
        </div>

        <button
          onClick={() => setIsEditingTariffs(!isEditingTariffs)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs min-h-[44px]"
        >
          <Settings className="w-4 h-4 text-sky-400" />
          <span>{isEditingTariffs ? 'ปิดการตั้งค่าอัตราค่าบริการ' : 'ตั้งค่าอัตราค่าบริการ (Tariff Settings)'}</span>
        </button>
      </div>

      {tariffSaveNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>บันทึกอัตราค่าบริการที่กำหนดเองลง IndexedDB เรียบร้อยแล้ว!</span>
        </div>
      )}

      {/* Customizable Tariffs Panel (Requirement 8) */}
      {isEditingTariffs && (
        <div className="bg-white rounded-2xl border-2 border-sky-300 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                กำหนดอัตราค่าบริการและพิกัดอัตราภาษี/ค่าภาระ (User-Defined Tariff Configuration)
              </h3>
              <p className="text-xs text-slate-500">
                ผู้ใช้สามารถปรับเปลี่ยนราคาได้ตามสัญญาของแต่ละสายการเดินเรือ โดยระบบจะบันทึกไว้ในเบราว์เซอร์
              </p>
            </div>
            <button
              onClick={handleSaveTariffConfig}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกอัตราบริการนี้</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">ค่าระวาง 20'GP ($ USD)</label>
              <input
                type="number"
                value={tariffs.oceanFreight20GP}
                onChange={(e) => setTariffs({ ...tariffs, oceanFreight20GP: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">ค่าระวาง 40'HC ($ USD)</label>
              <input
                type="number"
                value={tariffs.oceanFreight40HC}
                onChange={(e) => setTariffs({ ...tariffs, oceanFreight40HC: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">THC ต้นทาง (บาท/ตู้)</label>
              <input
                type="number"
                value={tariffs.thcOriginTHB}
                onChange={(e) => setTariffs({ ...tariffs, thcOriginTHB: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">THC ปลายทาง ($ USD/ตู้)</label>
              <input
                type="number"
                value={tariffs.thcDestUSD}
                onChange={(e) => setTariffs({ ...tariffs, thcDestUSD: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">วันปลอดค่าจัดเก็บ Free Time (วัน)</label>
              <input
                type="number"
                value={tariffs.freeTimeDays}
                onChange={(e) => setTariffs({ ...tariffs, freeTimeDays: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">ค่าจัดเก็บตู้ในลาน (บาท/วัน/ตู้)</label>
              <input
                type="number"
                value={tariffs.storagePerDayAfterFreeTHB}
                onChange={(e) => setTariffs({ ...tariffs, storagePerDayAfterFreeTHB: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">ค่าภาระท่าเรือ Wharfage (บาท/ตัน)</label>
              <input
                type="number"
                value={tariffs.wharfageRateTHB}
                onChange={(e) => setTariffs({ ...tariffs, wharfageRateTHB: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">อัตราแลกเปลี่ยน (บาท/USD)</label>
              <input
                type="number"
                step="0.1"
                value={tariffs.exchangeRateTHBPerUSD}
                onChange={(e) => setTariffs({ ...tariffs, exchangeRateTHBPerUSD: parseFloat(e.target.value) || 36.5 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-sky-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Calculator Form & Real-Time Itemized Invoice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 Cols): Inputs Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
            พารามิเตอร์การจัดส่ง (Shipment Parameters)
          </h2>

          {/* Booking Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ดึงข้อมูลจากการจองเรือ (Select from Booking)
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => handleSelectBooking(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">-- คำนวณแบบระบุค่าเอง (Manual Input) --</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.bookingId}>
                  {b.bookingId} - {b.vesselName} ({b.quantity} × {b.containerType})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ขนาดตู้ (Container Type)
              </label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value as ContainerType)}
                className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="20GP">20' General Purpose</option>
                <option value="40GP">40' General Purpose</option>
                <option value="40HC">40' High Cube</option>
                <option value="20RF">20' Reefer</option>
                <option value="40RF">40' Reefer</option>
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
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                น้ำหนักสินค้ารวม (ตัน MT)
              </label>
              <input
                type="number"
                min="1"
                value={cargoWeightTon}
                onChange={(e) => setCargoWeightTon(parseFloat(e.target.value) || 1)}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนวันที่ฝากตู้ในลาน (วัน)
              </label>
              <input
                type="number"
                min="0"
                value={yardStorageDays}
                onChange={(e) => setYardStorageDays(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>วันปลอดค่าจัดเก็บ (Free Time):</span>
              <strong className="text-slate-900">{tariffs.freeTimeDays} วัน</strong>
            </div>
            <div className="flex justify-between">
              <span>วันที่เกินและต้องคิดค่าจัดเก็บ:</span>
              <strong className={`${taxableStorageDays > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                {taxableStorageDays} วัน {taxableStorageDays > 0 ? '(มีค่า Demurrage)' : '(อยู่ใน Free Time)'}
              </strong>
            </div>
          </div>

          <button
            onClick={handleSaveCalculation}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการคำนวณลงฐานข้อมูล (Save Calculation)</span>
          </button>

          {calcSaveNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs text-center font-medium">
              บันทึกผลการคำนวณเรียบร้อยแล้ว
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Itemized Breakdown Quotation */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                PROFORMA QUOTATION SUMMARY
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                สรุปค่าใช้จ่ายและค่าธรรมเนียมทั้งหมด
              </h2>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">อัตราแลกเปลี่ยน</div>
              <div className="text-xs font-mono font-bold text-slate-800">฿{tariffs.exchangeRateTHBPerUSD} / $1</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="divide-y divide-slate-100 text-xs">
            
            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">1. ค่าระวางเรือ (Ocean Freight)</div>
                <div className="text-[11px] text-slate-500">{quantity} × {containerType} @ ${ratePerUnitUSD}</div>
              </div>
              <div className="text-right font-mono">
                <div className="font-bold text-slate-900">${oceanFreightUSD.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">฿{oceanFreightTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">2. ค่าจัดการท่าเรือต้นทาง (THC - Origin)</div>
                <div className="text-[11px] text-slate-500">Laem Chabang Port @ ฿{tariffs.thcOriginTHB.toLocaleString()} / ตู้</div>
              </div>
              <div className="text-right font-mono font-semibold text-slate-800">
                ฿{thcOriginTHB.toLocaleString()}
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">3. ค่าจัดการท่าเรือปลายทาง (THC - Destination)</div>
                <div className="text-[11px] text-slate-500">Port of Discharge @ ${tariffs.thcDestUSD} / ตู้</div>
              </div>
              <div className="text-right font-mono">
                <div className="font-semibold text-slate-800">${thcDestUSD.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">฿{thcDestTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">4. ค่าภาระท่าเรือ (Wharfage Fee)</div>
                <div className="text-[11px] text-slate-500">{cargoWeightTon} MT @ ฿{tariffs.wharfageRateTHB} / ตัน</div>
              </div>
              <div className="text-right font-mono font-semibold text-slate-800">
                ฿{wharfageTHB.toLocaleString()}
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">5. ค่าจัดเก็บตู้ในลาน (Yard Storage Demurrage)</div>
                <div className="text-[11px] text-slate-500">
                  {taxableStorageDays} วันเกิน @ ฿{tariffs.storagePerDayAfterFreeTHB} × {quantity} ตู้
                </div>
              </div>
              <div className="text-right font-mono font-semibold text-slate-800">
                ฿{storageFeeTHB.toLocaleString()}
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">6. ค่าน้ำมันผันแปร (Bunker Adjustment - BAF)</div>
                <div className="text-[11px] text-slate-500">${tariffs.bafUSD} × {quantity} ตู้</div>
              </div>
              <div className="text-right font-mono font-semibold text-slate-800">
                ฿{bafTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">7. ค่าเอกสาร B/L และพิธีการศุลกากร</div>
                <div className="text-[11px] text-slate-500">Documentation ฿{tariffs.docFeeTHB} + Customs ฿{tariffs.customsClearanceTHB}</div>
              </div>
              <div className="text-right font-mono font-semibold text-slate-800">
                ฿{(docFeeTHB + customsClearanceTHB).toLocaleString()}
              </div>
            </div>

          </div>

          {/* Grand Total Box */}
          <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-sky-400 font-semibold tracking-wide uppercase">
                ยอดรวมค่าใช้จ่ายประมาณการ (Estimated Total Cost)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1">
                ฿{totalTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">เทียบเท่าเงินดอลลาร์</div>
              <div className="text-xl sm:text-2xl font-bold text-sky-300">
                ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Saved Calculations History */}
      {savedCalculations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              ประวัติการคำนวณที่บันทึกไว้ (Saved Quotation History)
            </h3>
            <span className="text-xs text-slate-500 font-mono">{savedCalculations.length} รายการ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">วันที่</th>
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">ตู้สินค้า</th>
                  <th className="py-2.5 px-3">น้ำหนัก</th>
                  <th className="py-2.5 px-3">ค่าระวาง (USD)</th>
                  <th className="py-2.5 px-3">ค่าจัดเก็บในลาน</th>
                  <th className="py-2.5 px-3">ยอดรวม (THB)</th>
                  <th className="py-2.5 px-3 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedCalculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono">{calc.calculationDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-800">{calc.bookingId || '-'}</td>
                    <td className="py-2.5 px-3">{calc.quantity} × {calc.containerType}</td>
                    <td className="py-2.5 px-3 font-mono">{calc.cargoWeightTon} MT</td>
                    <td className="py-2.5 px-3 font-mono">${calc.oceanFreightUSD.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono">฿{calc.storageFeeTHB.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      ฿{calc.totalTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteCalculation(calc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
