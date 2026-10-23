import React from 'react';
import { 
  UnifiedShipmentSummary, 
  MergedFieldSource, 
  FieldSourceType,
  ScannedDocumentItem 
} from '../types';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Save, 
  Edit3, 
  Layers, 
  Scale, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface UnifiedSummaryFormProps {
  summary: UnifiedShipmentSummary;
  onUpdateField: <K extends keyof UnifiedShipmentSummary>(field: K, value: any) => void;
  onResolveConflict: <K extends keyof UnifiedShipmentSummary>(field: K, chosenValue: any, chosenDocName?: string) => void;
  onSaveShipment: () => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  documents: ScannedDocumentItem[];
  autoCreateContainer: boolean;
  setAutoCreateContainer: (val: boolean) => void;
}

export const UnifiedSummaryForm: React.FC<UnifiedSummaryFormProps> = ({
  summary,
  onUpdateField,
  onResolveConflict,
  onSaveShipment,
  isSaving,
  saveSuccess,
  documents,
  autoCreateContainer,
  setAutoCreateContainer,
}) => {
  const completedDocs = documents.filter((d) => d.status === 'COMPLETED');

  // Render Source Badge for each field (Requirement 19, 23)
  const renderSourceBadge = (field: MergedFieldSource<any>) => {
    if (field.isUserEdited || field.sourceDocType === 'USER_MANUAL') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
          <Edit3 className="w-2.5 h-2.5" />
          <span>กรอก/ยืนยันโดยผู้ใช้</span>
        </span>
      );
    }
    if (field.sourceDocType === 'AGREED_BOTH') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          <span>ตรงกันทั้ง 2 เอกสาร</span>
        </span>
      );
    }
    if (field.sourceDocType === 'INVOICE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded" title={field.sourceDocName}>
          <FileText className="w-2.5 h-2.5 text-sky-600" />
          <span>มาจาก Commercial Invoice</span>
        </span>
      );
    }
    if (field.sourceDocType === 'PACKING_LIST') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded" title={field.sourceDocName}>
          <Layers className="w-2.5 h-2.5 text-purple-600" />
          <span>มาจาก Packing List</span>
        </span>
      );
    }
    if (field.sourceDocType === 'BILL_OF_LADING') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
          <FileText className="w-2.5 h-2.5 text-indigo-600" />
          <span>มาจาก Bill of Lading</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
        <span>ไม่พบข้อมูล</span>
      </span>
    );
  };

  // Conflict Resolution Box (Requirement 21 & 30)
  const renderConflictCard = <K extends keyof UnifiedShipmentSummary>(
    fieldKey: K,
    labelThai: string,
    field: MergedFieldSource<any>
  ) => {
    if (!field.hasConflict || field.isUserEdited || field.userVerified) return null;

    return (
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-3.5 space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>ตรวจพบข้อมูลไม่ตรงกันในฟิลด์: {labelThai} (ต้องเลือกยืนยัน)</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Invoice และ Packing List ระบุค่าไม่ตรงกัน ระบบจะไม่เดาหรือเลือกเองโดยอัตโนมัติ กรุณาคลิกเลือกค่าที่ถูกต้อง:
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {field.conflictOptions?.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onResolveConflict(fieldKey, opt.value, opt.docName)}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 hover:border-amber-400 text-amber-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-amber-600" />
              <span>
                ใช้ค่าจาก {opt.docType === 'INVOICE' ? 'Invoice' : 'Packing List'}:{' '}
                <strong className="font-mono text-slate-900">
                  {typeof opt.value === 'number' ? opt.value.toLocaleString() : String(opt.value)}
                </strong>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-5">
      
      {/* Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ฟอร์มข้อมูลรวมการส่งออก (Shipment Document Summary)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                รวมข้อมูลจาก Commercial Invoice และ Packing List อัตโนมัติ พร้อมระบุแหล่งที่มาของแต่ละฟิลด์
              </p>
            </div>
          </div>
        </div>

        {/* Global Conflict Status Badge */}
        <div className="flex items-center gap-2">
          {summary.hasConflicts ? (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>พบข้อขัดแย้ง {summary.conflictCount} จุด (รอผู้ใช้ยืนยัน)</span>
            </span>
          ) : completedDocs.length >= 2 ? (
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ผสานข้อมูลข้ามเอกสารสำเร็จสมบูรณ์</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
              รวบรวมจาก {completedDocs.length} เอกสาร
            </span>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            บันทึกข้อมูลรวมทั้งชุดส่งออก (Shipment ID & Linked Documents) ลง IndexedDB เรียบร้อยแล้ว!
          </span>
        </div>
      )}

      {/* Conflict Resolution Cards if any */}
      {renderConflictCard('quantity', 'จำนวนสินค้า/หีบห่อ (Quantity / Packages)', summary.quantity)}
      {renderConflictCard('shipperName', 'ผู้ส่งออก (Shipper / Exporter)', summary.shipperName)}
      {renderConflictCard('consigneeName', 'ผู้รับปลายทาง (Consignee / Buyer)', summary.consigneeName)}
      {renderConflictCard('description', 'คำอธิบายสินค้า (Description of Goods)', summary.description)}

      {/* Row 1: Invoice Identifiers & Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              เลขที่ใบกำกับสินค้า (Invoice No.)
            </label>
            {renderSourceBadge(summary.invoiceNo)}
          </div>
          <input
            type="text"
            value={summary.invoiceNo.value}
            placeholder="ไม่พบข้อมูล - กรุณาระบุ"
            onChange={(e) => onUpdateField('invoiceNo', e.target.value)}
            className={`w-full text-xs font-mono font-medium border rounded-lg p-2.5 ${
              !summary.invoiceNo.value ? 'border-rose-300 bg-rose-50/20' : 'border-slate-300 bg-white'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              วันที่เอกสาร (Invoice Date)
            </label>
            {renderSourceBadge(summary.invoiceDate)}
          </div>
          <input
            type="text"
            value={summary.invoiceDate.value}
            placeholder="ไม่พบข้อมูล - กรุณาระบุ"
            onChange={(e) => onUpdateField('invoiceDate', e.target.value)}
            className={`w-full text-xs border rounded-lg p-2.5 ${
              !summary.invoiceDate.value ? 'border-rose-300 bg-rose-50/20' : 'border-slate-300 bg-white'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              สกุลเงิน (Currency)
            </label>
            {renderSourceBadge(summary.currency)}
          </div>
          <select
            value={summary.currency.value}
            onChange={(e) => onUpdateField('currency', e.target.value)}
            className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-white"
          >
            <option value="USD">USD ($)</option>
            <option value="THB">THB (฿)</option>
            <option value="EUR">EUR (€)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>
      </div>

      {/* Row 2: Shipper & Consignee (Cross-Checked) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              ผู้ส่งออก (Shipper / Exporter)
            </label>
            {renderSourceBadge(summary.shipperName)}
          </div>
          <textarea
            rows={2}
            value={summary.shipperName.value}
            placeholder="ไม่พบข้อมูล - กรุณาระบุชื่อผู้ส่งออก"
            onChange={(e) => onUpdateField('shipperName', e.target.value)}
            className={`w-full text-xs border rounded-lg p-2.5 ${
              summary.shipperName.hasConflict
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : !summary.shipperName.value
                ? 'border-rose-300 bg-rose-50/20'
                : 'border-slate-300 bg-white'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              ผู้รับปลายทาง (Consignee / Buyer)
            </label>
            {renderSourceBadge(summary.consigneeName)}
          </div>
          <textarea
            rows={2}
            value={summary.consigneeName.value}
            placeholder="ไม่พบข้อมูล - กรุณาระบุชื่อผู้รับปลายทาง"
            onChange={(e) => onUpdateField('consigneeName', e.target.value)}
            className={`w-full text-xs border rounded-lg p-2.5 ${
              summary.consigneeName.hasConflict
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : !summary.consigneeName.value
                ? 'border-rose-300 bg-rose-50/20'
                : 'border-slate-300 bg-white'
            }`}
          />
        </div>
      </div>

      {/* Row 3: Description of Goods & Quantities */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              คำอธิบายสินค้า (Description of Goods)
            </label>
            {renderSourceBadge(summary.description)}
          </div>
          <input
            type="text"
            value={summary.description.value}
            placeholder="ไม่พบคำอธิบายสินค้า"
            onChange={(e) => onUpdateField('description', e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
          />
        </div>

        <div className="sm:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              จำนวนสินค้า (Quantity)
            </label>
            {renderSourceBadge(summary.quantity)}
          </div>
          <input
            type="number"
            value={summary.quantity.value || ''}
            placeholder="0"
            onChange={(e) => onUpdateField('quantity', parseFloat(e.target.value) || 0)}
            className={`w-full text-xs font-mono font-semibold border rounded-lg p-2.5 ${
              summary.quantity.hasConflict
                ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-200'
                : 'border-slate-300 bg-white'
            }`}
          />
        </div>

        <div className="sm:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              หน่วย (Unit)
            </label>
            {renderSourceBadge(summary.unit)}
          </div>
          <input
            type="text"
            value={summary.unit.value}
            placeholder="Bags, CTNS, Pkgs"
            onChange={(e) => onUpdateField('unit', e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
          />
        </div>
      </div>

      {/* Row 4: Weights, Packages & Financial Totals (Rules 16, 17, 19, 29) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              จำนวนหีบห่อรวม (Packages)
            </label>
            {renderSourceBadge(summary.packageCount)}
          </div>
          <input
            type="number"
            value={summary.packageCount.value || ''}
            placeholder="0"
            onChange={(e) => onUpdateField('packageCount', parseInt(e.target.value, 10) || 0)}
            className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
          />
          <div className="text-[10px] text-slate-400 mt-1">แหล่งข้อมูลหลัก: Packing List</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              Net Weight (กก.)
            </label>
            {renderSourceBadge(summary.totalNetWeightKg)}
          </div>
          <input
            type="number"
            value={summary.totalNetWeightKg.value || ''}
            placeholder="0"
            onChange={(e) => onUpdateField('totalNetWeightKg', parseFloat(e.target.value) || 0)}
            className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
          />
          <div className="text-[10px] text-slate-400 mt-1">แหล่งข้อมูลหลัก: Packing List</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-800 uppercase">
              Gross Weight (กก.)
            </label>
            {renderSourceBadge(summary.totalGrossWeightKg)}
          </div>
          <input
            type="number"
            value={summary.totalGrossWeightKg.value || ''}
            placeholder="0"
            onChange={(e) => onUpdateField('totalGrossWeightKg', parseFloat(e.target.value) || 0)}
            className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
          />
          <div className="text-[10px] text-slate-400 mt-1">แหล่งข้อมูลหลัก: Packing List</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-900 uppercase">
              ยอดรวมทั้งสิ้น ({summary.currency.value})
            </label>
            {renderSourceBadge(summary.totalAmount)}
          </div>
          <input
            type="number"
            step="0.01"
            value={summary.totalAmount.value || ''}
            placeholder="0.00"
            onChange={(e) => onUpdateField('totalAmount', parseFloat(e.target.value) || 0)}
            className="w-full text-xs font-mono font-bold text-sky-800 border border-sky-300 rounded-lg p-2.5 bg-white"
          />
          <div className="text-[10px] text-slate-400 mt-1">แหล่งข้อมูลหลัก: Commercial Invoice</div>
        </div>
      </div>

      {/* Row 5: Maritime Equipment & Logistics (Container, Seal, BL, Ports) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-sky-50/50 p-4 rounded-xl border border-sky-200">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-sky-950 uppercase">
              หมายเลขตู้ (Container No.)
            </label>
            {renderSourceBadge(summary.containerNo)}
          </div>
          <input
            type="text"
            value={summary.containerNo.value}
            placeholder="เช่น MSKU8843210"
            onChange={(e) => onUpdateField('containerNo', e.target.value.toUpperCase())}
            className="w-full text-xs font-mono font-bold text-sky-950 border border-sky-300 rounded-lg p-2.5 bg-white uppercase"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-sky-950 uppercase">
              หมายเลขซีล (Seal No.)
            </label>
            {renderSourceBadge(summary.sealNo)}
          </div>
          <input
            type="text"
            value={summary.sealNo.value}
            placeholder="เช่น TH-SL-884102"
            onChange={(e) => onUpdateField('sealNo', e.target.value)}
            className="w-full text-xs font-mono border border-sky-300 rounded-lg p-2.5 bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-sky-950 uppercase">
              ท่าเรือต้นทาง (POL)
            </label>
            {renderSourceBadge(summary.pol)}
          </div>
          <input
            type="text"
            value={summary.pol.value || 'Laem Chabang Port (THLCH)'}
            placeholder="Laem Chabang (THLCH)"
            onChange={(e) => onUpdateField('pol', e.target.value)}
            className="w-full text-xs border border-sky-300 rounded-lg p-2.5 bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-sky-950 uppercase">
              ท่าเรือปลายทาง (POD)
            </label>
            {renderSourceBadge(summary.pod)}
          </div>
          <input
            type="text"
            value={summary.pod.value || 'Port of Discharge'}
            placeholder="Port of Discharge"
            onChange={(e) => onUpdateField('pod', e.target.value)}
            className="w-full text-xs border border-sky-300 rounded-lg p-2.5 bg-white"
          />
        </div>
      </div>

      {/* Save Action & Auto-Track Container Checkbox (Requirement 24 & 26) */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoTrackBoxSummary"
            checked={autoCreateContainer}
            onChange={(e) => setAutoCreateContainer(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
          />
          <label htmlFor="autoTrackBoxSummary" className="text-xs text-slate-700 cursor-pointer">
            สร้างข้อมูลจำลองเพื่อติดตามตู้คอนเทนเนอร์นี้ในระบบ Container Tracking ทันที
          </label>
        </div>

        <button
          type="button"
          onClick={onSaveShipment}
          disabled={isSaving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Save className="w-4 h-4" />
          <span>บันทึกข้อมูลรวมทั้งชุดส่งออกลง IndexedDB (Save Shipment)</span>
        </button>
      </div>

    </div>
  );
};
