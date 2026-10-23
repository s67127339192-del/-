import React, { useState, useEffect } from 'react';
import { ScannedDocumentItem, CrossCheckResult, CrossCheckFieldStatus } from '../types';
import { performCrossCheck } from '../services/crossCheck';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  ArrowRightLeft, 
  Download, 
  FileSpreadsheet,
  FileText,
  Layers,
  Scale
} from 'lucide-react';

interface CrossDocModalProps {
  documents: ScannedDocumentItem[];
  onClose: () => void;
  defaultInvoiceId?: string;
  defaultPackingListId?: string;
}

export const CrossDocModal: React.FC<CrossDocModalProps> = ({
  documents,
  onClose,
  defaultInvoiceId,
  defaultPackingListId,
}) => {
  const invoices = documents.filter((d) => d.docType === 'INVOICE' || d.docType === 'COMBINED');
  const packingLists = documents.filter((d) => d.docType === 'PACKING_LIST' || d.docType === 'COMBINED');

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    defaultInvoiceId || (invoices[0]?.id || '')
  );
  const [selectedPackingListId, setSelectedPackingListId] = useState<string>(
    defaultPackingListId || (packingLists[0]?.id || '')
  );

  const [result, setResult] = useState<CrossCheckResult | null>(null);

  // Recalculate cross-check when pairing changes
  useEffect(() => {
    const inv = documents.find((d) => d.id === selectedInvoiceId);
    const pl = documents.find((d) => d.id === selectedPackingListId);

    if (inv && pl) {
      const checkRes = performCrossCheck(inv, pl);
      setResult(checkRes);
    } else {
      setResult(null);
    }
  }, [selectedInvoiceId, selectedPackingListId, documents]);

  const getStatusBadge = (status: CrossCheckFieldStatus) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ตรงกัน</span>
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ไม่ตรงกัน (คลาดเคลื่อน)</span>
          </span>
        );
      case 'REQUIRES_MANUAL_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ต้องตรวจสอบด้วยตนเอง</span>
          </span>
        );
      case 'MISSING_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>ไม่มีข้อมูล</span>
          </span>
        );
    }
  };

  const handleExportReportCSV = () => {
    if (!result) return;
    const headers = ['ลำดับ', 'หัวข้อฟิลด์', 'ค่าใน Commercial Invoice', 'ค่าใน Packing List', 'ผลการตรวจสอบ', 'หมายเหตุ'];
    const rows = result.fields.map((f, idx) => [
      idx + 1,
      `"${f.labelThai}"`,
      `"${f.invoiceValue.toString().replace(/"/g, '""')}"`,
      `"${f.packingListValue.toString().replace(/"/g, '""')}"`,
      `"${f.status}"`,
      `"${(f.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SeaExport_CrossCheck_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-5 sm:p-7 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  ระบบตรวจสอบข้อมูลข้ามเอกสาร (Cross-Document Reconciliation)
                </h2>
                <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded">
                  Dual-Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบความสอดคล้องระหว่าง Commercial Invoice และ Packing List ก่อนยื่นพิธีการส่งออก
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pairing Bar: Select Invoice & Select Packing List */}
        <div className="py-4 border-b border-slate-100 shrink-0 bg-slate-50/80 -mx-5 sm:-mx-7 px-5 sm:px-7">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
            <span>จับคู่เอกสารที่ต้องการตรวจสอบ (Pair Documents):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                เอกสาร Commercial Invoice (ใบกำกับสินค้า)
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {invoices.length === 0 ? (
                  <option value="">(ไม่มีเอกสารประเภท Invoice)</option>
                ) : (
                  invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.fileName} ({inv.ocrData?.invoiceNo || 'ยังไม่ระบุเลขที่'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                เอกสาร Packing List (ใบรายการบรรจุหีบห่อ)
              </label>
              <select
                value={selectedPackingListId}
                onChange={(e) => setSelectedPackingListId(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 font-medium"
              >
                {packingLists.length === 0 ? (
                  <option value="">(ไม่มีเอกสารประเภท Packing List)</option>
                ) : (
                  packingLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.fileName} ({pl.ocrData?.invoiceNo || 'PL Reference'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Results Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!result ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <div className="text-sm font-semibold text-slate-700">กรุณาเลือกเอกสาร Invoice และ Packing List</div>
              <div className="text-xs text-slate-400 mt-1">
                ต้องมีเอกสาร Invoice และ Packing List อย่างน้อยอย่างละ 1 ฉบับในชุดส่งออกเพื่อทำการตรวจสอบ
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Summary KPIs Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result.overallStatus === 'PASSED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : result.overallStatus === 'FAILED'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      ผลการตรวจสอบความสอดคล้อง:
                    </span>
                    <span className="text-xs font-bold">
                      {result.overallStatus === 'PASSED'
                        ? '✅ เอกสารถูกต้องสมบูรณ์ (100% Passed)'
                        : result.overallStatus === 'FAILED'
                        ? '❌ พบข้อมูลไม่ตรงกัน (Discrepancy Detected)'
                        : '⚠️ มีข้อมูลบางส่วนที่ต้องตรวจสอบเพิ่มเติม'}
                    </span>
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    ตรวจเปรียบเทียบ {result.fields.length} ฟิลด์หลัก ณ เวลา {result.checkedAt}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-semibold">
                    ตรงกัน: {result.matchCount}
                  </span>
                  {result.mismatchCount > 0 && (
                    <span className="bg-rose-200 text-rose-900 px-2.5 py-1 rounded font-bold animate-pulse">
                      คลาดเคลื่อน: {result.mismatchCount}
                    </span>
                  )}
                  {result.missingCount > 0 && (
                    <span className="bg-slate-200 text-slate-800 px-2 py-1 rounded">
                      ไม่มีข้อมูล: {result.missingCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 w-40">หัวข้อข้อมูลที่ตรวจสอบ</th>
                      <th className="py-2.5 px-3">Commercial Invoice</th>
                      <th className="py-2.5 px-3">Packing List</th>
                      <th className="py-2.5 px-3 w-36 text-center">สถานะ</th>
                      <th className="py-2.5 px-3 w-44">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.fields.map((f, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          f.status === 'MISMATCH' ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {f.labelThai}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 font-mono">
                          {f.invoiceValue}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 font-mono">
                          {f.packingListValue}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {getStatusBadge(f.status)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {f.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Guidance Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <span className="font-semibold text-slate-800">คำแนะนำทางศุลกากรและสายเรือ:</span>
                  <p>
                    น้ำหนักรวม (Gross Weight) และจำนวนหีบห่อบน Invoice และ Packing List ต้องตรงกันทุกตัวอักษร หากพบผลต่างสีแดง อาจทำให้ศุลกากรท่าเรือกักตรวจ (Red Line Inspection) หรือสายเรือปฏิเสธการบรรทุกสินค้าขึ้นเรือได้
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          {result && (
            <button
              onClick={handleExportReportCSV}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>ดาวน์โหลดรายงาน Cross-Check (CSV)</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
