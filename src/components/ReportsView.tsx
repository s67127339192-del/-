import React, { useState } from 'react';
import { Shipment, ContainerTracking, ExportCalculation } from '../types';
import { 
  exportDatabaseJSON, 
  importDatabaseJSON, 
  resetToDefaultData 
} from '../services/db';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  Database,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ReportsViewProps {
  shipments: Shipment[];
  containers: ContainerTracking[];
  calculations: ExportCalculation[];
  onDataResetOrImported: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  shipments,
  containers,
  calculations,
  onDataResetOrImported
}) => {
  const [selectedReportType, setSelectedReportType] = useState<'SHIPMENTS' | 'CONTAINERS' | 'CALCULATIONS'>('SHIPMENTS');
  const [dateFilter, setDateFilter] = useState<'ALL' | '30DAYS' | 'THIS_YEAR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to trigger UTF-8 BOM CSV download
  const triggerCsvDownload = (filename: string, content: string) => {
    // \uFEFF ensures Thai characters open flawlessly in Microsoft Excel
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`);
  };

  // 1. Export Shipments CSV
  const handleExportShipmentsCSV = () => {
    const headers = [
      'ลำดับ',
      'เลขที่ Invoice',
      'วันที่',
      'ประเภทเอกสาร',
      'ผู้ส่งออก (Shipper)',
      'ผู้รับสินค้า (Consignee)',
      'ท่าเรือต้นทาง (POL)',
      'ท่าเรือปลายทาง (POD)',
      'เรือสินค้า (Vessel)',
      'เที่ยวเรือ (Voyage)',
      'หมายเลขตู้ (Container No)',
      'ประเภทตู้',
      'หมายเลขซีล (Seal No)',
      'สกุลเงิน',
      'มูลค่าสินค้ารวม',
      'น้ำหนักรวม (Gross Wt Kgs)',
      'ปริมาตรรวม (CBM)',
      'เงื่อนไข (Incoterm)',
      'สถานะ',
      'หมายเหตุ'
    ];

    const rows = shipments.map((s, idx) => [
      idx + 1,
      `"${s.invoiceNo}"`,
      `"${s.date}"`,
      `"${s.documentType}"`,
      `"${s.shipperName.replace(/"/g, '""')}"`,
      `"${s.consigneeName.replace(/"/g, '""')}"`,
      `"${s.pol.replace(/"/g, '""')}"`,
      `"${s.pod.replace(/"/g, '""')}"`,
      `"${s.vesselName.replace(/"/g, '""')}"`,
      `"${s.voyageNo}"`,
      `"${s.containerNo}"`,
      `"${s.containerType}"`,
      `"${s.sealNo}"`,
      s.currency,
      s.totalAmount.toFixed(2),
      s.totalGrossWeightKg.toFixed(2),
      s.totalCBM.toFixed(2),
      s.incoterm,
      s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerCsvDownload(`SeaExport_Shipment_Register_${new Date().toISOString().split('T')[0]}.csv`, csvString);
  };

  // 2. Export Container Fleet CSV
  const handleExportContainersCSV = () => {
    const headers = [
      'ลำดับ',
      'หมายเลขตู้คอนเทนเนอร์',
      'เลข B/L',
      'Booking No',
      'สายการเดินเรือ',
      'ชื่อเรือสินค้า',
      'เที่ยวเรือ',
      'ประเภทตู้',
      'ท่าเรือต้นทาง (POL)',
      'ท่าเรือปลายทาง (POD)',
      'วันเวลาออก (ETD)',
      'วันเวลาถึง (ETA)',
      'สถานะปัจจุบัน',
      'ความคืบหน้า (%)',
      'พิกัดตำแหน่งปัจจุบัน',
      'ความเร็วเรือ (นอต)',
      'สภาพอากาศ',
      'ตู้ Reefer แช่เย็น',
      'อุณหภูมิวัดได้ (C)',
      'อัปเดตล่าสุด'
    ];

    const rows = containers.map((c, idx) => [
      idx + 1,
      `"${c.containerNo}"`,
      `"${c.blNo}"`,
      `"${c.bookingNo}"`,
      `"${c.shippingLine}"`,
      `"${c.vesselName}"`,
      `"${c.voyage}"`,
      `"${c.containerType}"`,
      `"${c.pol}"`,
      `"${c.pod}"`,
      `"${c.etd}"`,
      `"${c.eta}"`,
      `"${c.currentStatus}"`,
      c.progressPercent,
      `"${c.currentLocationName}"`,
      c.speedKnots,
      `"${c.weatherStatus}"`,
      c.isReefer ? 'ใช่' : 'ไม่ใช่',
      c.temperatureCelsius !== undefined ? c.temperatureCelsius : '-',
      `"${c.updatedAt}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerCsvDownload(`SeaExport_Container_Tracking_${new Date().toISOString().split('T')[0]}.csv`, csvString);
  };

  // 3. Export Calculations Cost Analysis CSV
  const handleExportCalculationsCSV = () => {
    const headers = [
      'ลำดับ',
      'ชื่อโครงการประมาณการ',
      'ชื่อลูกค้า',
      'ท่าเรือปลายทาง',
      'เงื่อนไข Incoterm',
      'ประเภทตู้',
      'จำนวนตู้',
      'มูลค่าสินค้า (THB)',
      'อัตราแลกเปลี่ยน (USD/THB)',
      'ค่าระวางเรือ (USD/ตู้)',
      'ค่าระวางรวม (THB)',
      'ค่าภาระท่าเรือรวม (Local Charges THB)',
      'ประกันภัยทางทะเล (THB)',
      'ต้นทุนส่งออกรวม (Total Cost THB)',
      'ต้นทุนเฉลี่ยต่อตู้ (THB)',
      'เป้าหมาย Gross Margin (%)',
      'ราคาเสนอขายแนะนำ (THB)',
      'กำไรขั้นต้นรวม (THB)',
      'วันที่จัดทำ'
    ];

    const rows = calculations.map((c, idx) => [
      idx + 1,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.customerName.replace(/"/g, '""')}"`,
      `"${c.destinationPort.replace(/"/g, '""')}"`,
      c.incoterm,
      c.containerType,
      c.containerQuantity,
      c.cargoValueTHB.toFixed(2),
      c.exchangeRateUSDTHB.toFixed(2),
      c.oceanFreightUSD.toFixed(2),
      c.oceanFreightTHB.toFixed(2),
      (c.totalFreightAndLocalTHB - c.oceanFreightTHB).toFixed(2),
      c.insuranceTHB.toFixed(2),
      c.totalCostTHB.toFixed(2),
      c.costPerContainerTHB.toFixed(2),
      c.targetGrossMarginPercent,
      c.recommendedSellingPriceTHB.toFixed(2),
      c.grossProfitTHB.toFixed(2),
      `"${c.createdAt}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerCsvDownload(`SeaExport_Cost_Analysis_${new Date().toISOString().split('T')[0]}.csv`, csvString);
  };

  // Backup JSON
  const handleBackupJSON = async () => {
    const jsonStr = await exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SeaExport_IndexedDB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('สำรองข้อมูล IndexedDB (JSON) เรียบร้อย');
  };

  // Restore JSON
  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          await importDatabaseJSON(content);
          onDataResetOrImported();
          showToast('นำเข้าข้อมูลสำเร็จและปรับปรุงตารางเรียบร้อย');
        } catch (err) {
          alert('ไม่สามารถนำเข้าไฟล์ JSON ได้ รูปแบบไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset to Demo Data
  const handleResetDemoData = async () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตัวอย่างการส่งออกไทยหรือไม่?')) {
      await resetToDefaultData();
      onDataResetOrImported();
      showToast('รีเซ็ตฐานข้อมูลเป็นข้อมูลตัวอย่างเรียบร้อย');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header View */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-1">
              <span>Export Analytics & Data Management</span>
              <span aria-hidden="true">·</span>
              <span>IndexedDB Storage</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ระบบรายงานและดาวน์โหลดข้อมูล (Reports & CSV)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ส่งออกรายงานสรุปการส่งออก รายการตู้คอนเทนเนอร์ และการวิเคราะห์ต้นทุนเป็นไฟล์ CSV พร้อมรหัส UTF-8 BOM รองรับภาษาไทยใน Microsoft Excel 100%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBackupJSON}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>สำรองข้อมูล JSON</span>
            </button>

            <label className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>นำเข้า JSON</span>
              <input type="file" accept=".json" onChange={handleRestoreJSON} className="hidden" />
            </label>

            <button
              onClick={handleResetDemoData}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>รีเซ็ตข้อมูลตัวอย่าง</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Report Cards for 1-Click CSV Download */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Shipments */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">ทะเบียนรายการส่งออก (Shipments)</h3>
            <p className="text-xs text-slate-500 mt-1">
              ข้อมูล Invoice, B/L, ผู้ส่งออก, ผู้รับปลายทาง, รายการสินค้า, น้ำหนัก Gross Weight, CBM และมูลค่าสินค้าทั้งหมด
            </p>
            <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-900">{shipments.length}</span>
              <span>รายการบันทึกในระบบ</span>
            </div>
          </div>

          <button
            onClick={handleExportShipmentsCSV}
            className="mt-5 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[42px] shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด CSV ทะเบียนส่งออก</span>
          </button>
        </div>

        {/* Card 2: Containers */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">สถานะตู้คอนเทนเนอร์ (Fleet Tracking)</h3>
            <p className="text-xs text-slate-500 mt-1">
              สถานะตู้คอนเทนเนอร์, พิกัดละติจูด-ลองจิจูด, ความเร็วเรือ, วันที่คาดว่าจะถึง (ETA) และบันทึกอุณหภูมิตู้ Reefer
            </p>
            <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-900">{containers.length}</span>
              <span>ตู้สินค้ากำลังติดตาม</span>
            </div>
          </div>

          <button
            onClick={handleExportContainersCSV}
            className="mt-5 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[42px] shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด CSV สถานะตู้เรือ</span>
          </button>
        </div>

        {/* Card 3: Calculations */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">การวิเคราะห์ต้นทุน & กำไร (Cost Analysis)</h3>
            <p className="text-xs text-slate-500 mt-1">
              รายงานเปรียบเทียบค่าระวาง Ocean Freight, ค่า THC, ค่าพิธีการศุลกากร, ประกันภัย และกำไรขั้นต้นตาม Incoterms
            </p>
            <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-900">{calculations.length}</span>
              <span>แบบจำลองต้นทุนที่บันทึกไว้</span>
            </div>
          </div>

          <button
            onClick={handleExportCalculationsCSV}
            className="mt-5 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[42px] shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด CSV ประมาณการต้นทุน</span>
          </button>
        </div>

      </div>

      {/* Live Data Preview Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Sub-Tabs */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              พรีวิวข้อมูลในฐานข้อมูล (IndexedDB Data Explorer)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">เลือกตารางข้อมูลที่ต้องการตรวจสอบก่อนส่งออก</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setSelectedReportType('SHIPMENTS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedReportType === 'SHIPMENTS'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รายการส่งออก ({shipments.length})
            </button>
            <button
              onClick={() => setSelectedReportType('CONTAINERS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedReportType === 'CONTAINERS'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตู้สินค้า ({containers.length})
            </button>
            <button
              onClick={() => setSelectedReportType('CALCULATIONS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedReportType === 'CALCULATIONS'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ต้นทุน & กำไร ({calculations.length})
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {selectedReportType === 'SHIPMENTS' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-4">วันที่</th>
                  <th className="py-2.5 px-4">ผู้รับ (Consignee)</th>
                  <th className="py-2.5 px-4">ท่าเรือปลายทาง (POD)</th>
                  <th className="py-2.5 px-4">ตู้ / ขนาด</th>
                  <th className="py-2.5 px-4 text-right">ยอดรวม (USD)</th>
                  <th className="py-2.5 px-4 text-right">CBM</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{s.invoiceNo}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.date}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium truncate max-w-xs">{s.consigneeName}</td>
                    <td className="py-2.5 px-4 text-slate-700">{s.pod}</td>
                    <td className="py-2.5 px-4 font-mono text-sky-800">{s.containerNo} ({s.containerType})</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                      ${s.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{s.totalCBM.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-medium">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === 'CONTAINERS' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">หมายเลขตู้</th>
                  <th className="py-2.5 px-4">สายเรือ</th>
                  <th className="py-2.5 px-4">เรือสินค้า / Voyage</th>
                  <th className="py-2.5 px-4">เส้นทาง</th>
                  <th className="py-2.5 px-4">ตำแหน่งปัจจุบัน</th>
                  <th className="py-2.5 px-4 text-right">ETA</th>
                  <th className="py-2.5 px-4 text-center">ความคืบหน้า</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {containers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-sky-800">{c.containerNo}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{c.shippingLine}</td>
                    <td className="py-2.5 px-4 text-slate-700">{c.vesselName} ({c.voyage})</td>
                    <td className="py-2.5 px-4 text-slate-600">{c.pol.split(' ')[0]} → {c.pod.split(' ')[0]}</td>
                    <td className="py-2.5 px-4 text-slate-700">{c.currentLocationName}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{c.eta}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-slate-800">
                      {c.progressPercent}%
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-medium">{c.currentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === 'CALCULATIONS' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">โครงการ</th>
                  <th className="py-2.5 px-4">ลูกค้า</th>
                  <th className="py-2.5 px-4">ปลายทาง</th>
                  <th className="py-2.5 px-4">ตู้ / เงื่อนไข</th>
                  <th className="py-2.5 px-4 text-right">ต้นทุนรวม (THB)</th>
                  <th className="py-2.5 px-4 text-right">ราคาขายแนะนำ (THB)</th>
                  <th className="py-2.5 px-4 text-right">กำไรประมาณการ (THB)</th>
                  <th className="py-2.5 px-4 text-center">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{calc.title}</td>
                    <td className="py-2.5 px-4 text-slate-700">{calc.customerName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{calc.destinationPort.split(' ')[0]}</td>
                    <td className="py-2.5 px-4 font-mono">{calc.containerType} x {calc.containerQuantity} ({calc.incoterm})</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ฿{calc.totalCostTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      ฿{calc.recommendedSellingPriceTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800">
                      +฿{calc.grossProfitTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-sky-700">
                      {calc.targetGrossMarginPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};
