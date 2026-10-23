import React, { useState } from 'react';
import { 
  exportFullDatabaseJson, 
  importFullDatabaseJson, 
  resetToDemoData 
} from '../services/db';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileJson, 
  ShieldCheck 
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // 1. Export JSON
  const handleExportJson = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportFullDatabaseJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SeaExport_SmartPort_Backup_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({ text: 'ดาวน์โหลดไฟล์สำรอง JSON สำเร็จเรียบร้อยแล้ว!', isError: false });
    } catch (err: any) {
      setStatusMessage({ text: 'การสำรองข้อมูลล้มเหลว: ' + err.message, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Import JSON
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        const success = await importFullDatabaseJson(content);
        if (success) {
          setStatusMessage({ text: 'กู้คืนฐานข้อมูลจากไฟล์ JSON สำเร็จเรียบร้อย!', isError: false });
          await onDataRestored();
        } else {
          setStatusMessage({ text: 'ไฟล์ JSON ไม่ถูกต้องหรือไม่ตรงตามโครงสร้างฐานข้อมูล', isError: true });
        }
      } catch (err: any) {
        setStatusMessage({ text: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + err.message, isError: true });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 3. Reset to DEMO Data
  const handleResetDemo = async () => {
    try {
      setIsProcessing(true);
      await resetToDemoData();
      await onDataRestored();
      setStatusMessage({ text: 'รีเซ็ตข้อมูลเป็นชุดเริ่มต้น DEMO สำเร็จเรียบร้อยแล้ว!', isError: false });
    } catch (err: any) {
      setStatusMessage({ text: 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล: ' + err.message, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">
              สำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.isError
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Section 1: Export JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <Download className="w-4 h-4 text-sky-600" />
              <span>1. สำรองข้อมูลทั้งหมดเป็นไฟล์ JSON (Export Backup)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ส่งออกข้อมูลการจองเรือ ท่าเทียบเรือ ตู้คอนเทนเนอร์ในลาน และอัตราค่าบริการทั้งหมดเป็นไฟล์ .json ไว้ในเครื่อง
            </p>
            <button
              onClick={handleExportJson}
              disabled={isProcessing}
              className="mt-2 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์สำรอง .JSON</span>
            </button>
          </div>

          {/* Section 2: Import JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>2. กู้คืนข้อมูลจากไฟล์ JSON (Restore from JSON)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              เลือกไฟล์สำรอง .json ที่เคยบันทึกไว้ เพื่อนำเข้าข้อมูลกลับสู่ระบบ IndexedDB
            </p>
            <label className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[38px]">
              <Upload className="w-4 h-4" />
              <span>เลือกไฟล์ .JSON เพื่อกู้คืน</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 3: Reset to DEMO */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>3. รีเซ็ตเป็นข้อมูลตัวอย่างเริ่มต้น (Reset to Default DEMO)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              ล้างข้อมูลปัจจุบันและโหลดชุดข้อมูลสาธิตตัวอย่าง 5 การจองเรือ, 5 ท่าเทียบเรือ, 8 ตู้คอนเทนเนอร์ และพิกัดเรือจำลอง
            </p>
            <button
              onClick={handleResetDemo}
              disabled={isProcessing}
              className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs min-h-[38px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ตกลับเป็นข้อมูล DEMO</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
