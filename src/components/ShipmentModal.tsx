import React, { useState } from 'react';
import { Shipment, ShipmentStatus } from '../types';
import { saveShipment, deleteShipment } from '../services/db';
import { 
  X, 
  Ship, 
  MapPin, 
  Calendar, 
  FileText, 
  Box, 
  Trash2, 
  Edit3, 
  Save, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface ShipmentModalProps {
  shipment: Shipment | null;
  onClose: () => void;
  onShipmentUpdated: () => void;
  onNavigateTracking: (containerNo: string) => void;
}

export const ShipmentModal: React.FC<ShipmentModalProps> = ({
  shipment,
  onClose,
  onShipmentUpdated,
  onNavigateTracking
}) => {
  if (!shipment) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState<ShipmentStatus>(shipment.status);
  const [editedNotes, setEditedNotes] = useState(shipment.notes || '');

  const handleSave = async () => {
    const updated: Shipment = {
      ...shipment,
      status: editedStatus,
      notes: editedNotes,
      updatedAt: new Date().toISOString()
    };
    await saveShipment(updated);
    setIsEditing(false);
    onShipmentUpdated();
  };

  const handleDelete = async () => {
    if (confirm(`ยืนยันการลบรายการส่งออก ${shipment.invoiceNo}?`)) {
      await deleteShipment(shipment.id);
      onShipmentUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-sky-600 uppercase">
                {shipment.documentType}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-mono text-slate-500">ID: {shipment.id}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <span>{shipment.invoiceNo}</span>
              <span className="text-xs font-normal text-slate-500">({shipment.date})</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs">
          
          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-700">ผู้ส่งออก (Shipper):</span>
              <div className="text-slate-800 font-medium mt-0.5">{shipment.shipperName}</div>
              {shipment.shipperAddress && (
                <div className="text-slate-500 text-[11px] mt-0.5">{shipment.shipperAddress}</div>
              )}
            </div>
            <div>
              <span className="font-semibold text-slate-700">ผู้รับปลายทาง (Consignee):</span>
              <div className="text-slate-800 font-medium mt-0.5">{shipment.consigneeName}</div>
              {shipment.consigneeAddress && (
                <div className="text-slate-500 text-[11px] mt-0.5">{shipment.consigneeAddress}</div>
              )}
            </div>
          </div>

          {/* Logistics Route */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-400">ท่าเรือต้นทาง (POL)</span>
              <div className="font-medium text-slate-800 mt-0.5">{shipment.pol}</div>
            </div>
            <div>
              <span className="text-slate-400">ท่าเรือปลายทาง (POD)</span>
              <div className="font-medium text-slate-800 mt-0.5">{shipment.pod}</div>
            </div>
            <div>
              <span className="text-slate-400">เรือสินค้า / Voyage</span>
              <div className="font-medium text-slate-800 mt-0.5">{shipment.vesselName} ({shipment.voyageNo})</div>
            </div>
            <div>
              <span className="text-slate-400">เงื่อนไขการส่งมอบ</span>
              <div className="font-semibold text-sky-700 mt-0.5">{shipment.incoterm}</div>
            </div>
          </div>

          {/* Container Details & Tracking Link */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-sky-800 font-semibold">ข้อมูลตู้คอนเทนเนอร์ & ซีล</div>
              <div className="text-sm font-bold font-mono text-sky-950 mt-0.5">
                {shipment.containerNo} <span className="font-normal text-xs text-sky-700">({shipment.containerType})</span>
              </div>
              <div className="text-[11px] text-sky-700 mt-0.5">
                Seal No: <span className="font-mono">{shipment.sealNo}</span> · B/L: <span className="font-mono">{shipment.blNo || '-'}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onNavigateTracking(shipment.containerNo);
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-center shrink-0 min-h-[36px]"
            >
              <span>ติดตามตำแหน่งตู้</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Line Items Table */}
          <div>
            <span className="font-bold text-slate-800 block mb-1.5">
              รายการสินค้า ({shipment.items?.length || 0} รายการ)
            </span>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2 px-3">คำอธิบาย</th>
                    <th className="py-2 px-3 text-right">จำนวน</th>
                    <th className="py-2 px-3 text-right">ราคา/หน่วย</th>
                    <th className="py-2 px-3 text-right">รวมเงิน (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipment.items?.map((itm, i) => (
                    <tr key={itm.id || i}>
                      <td className="py-2 px-3 font-medium text-slate-800">{itm.description}</td>
                      <td className="py-2 px-3 text-right font-mono">{itm.qty} {itm.unit}</td>
                      <td className="py-2 px-3 text-right font-mono">${itm.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        ${itm.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center font-mono">
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">มูลค่ารวม (USD)</span>
              <span className="text-sm font-bold text-sky-700">
                ${shipment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">น้ำหนักรวม (Gross Wt)</span>
              <span className="text-sm font-semibold text-slate-800">
                {shipment.totalGrossWeightKg.toLocaleString()} kgs
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">ปริมาตรรวม (CBM)</span>
              <span className="text-sm font-semibold text-slate-800">
                {shipment.totalCBM} CBM
              </span>
            </div>
          </div>

          {/* Editable Status & Notes */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">สถานะและบันทึกเพิ่มเติม</span>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขสถานะ/บันทึก</span>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">สถานะการส่งออก</label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as ShipmentStatus)}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="DRAFT">ร่างเอกสาร (DRAFT)</option>
                    <option value="BOOKED">จองระวางแล้ว (BOOKED)</option>
                    <option value="CUSTOMS_CLEARED">ตรวจปล่อยศุลกากรแล้ว (CUSTOMS_CLEARED)</option>
                    <option value="LOADED">โหลดขึ้นเรือสินค้าแล้ว (LOADED)</option>
                    <option value="IN_TRANSIT">กำลังเดินทางในทะเล (IN_TRANSIT)</option>
                    <option value="ARRIVED_PORT">ถึงท่าเรือปลายทาง (ARRIVED_PORT)</option>
                    <option value="DELIVERED">ส่งมอบสินค้าสำเร็จ (DELIVERED)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">บันทึกเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>สถานะปัจจุบัน: <span className="font-semibold text-slate-900">{shipment.status}</span></div>
                {shipment.notes && <div className="mt-1 text-slate-500">{shipment.notes}</div>}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบรายการนี้</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
