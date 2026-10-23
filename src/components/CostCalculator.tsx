import React, { useState, useEffect } from 'react';
import { ExportCalculation, ContainerType, Incoterm, LocalCharges } from '../types';
import { saveCalculation, deleteCalculation } from '../services/db';
import { 
  Calculator, 
  DollarSign, 
  Ship, 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Layers
} from 'lucide-react';

interface CostCalculatorProps {
  savedCalculations: ExportCalculation[];
  onCalculationSaved: () => void;
}

const DEFAULT_FREIGHT_RATES: Record<string, { desc: string; usd20: number; usd40: number; usd40hc: number }> = {
  'USLAX': { desc: 'Port of Los Angeles (USA West Coast)', usd20: 2400, usd40: 3100, usd40hc: 3300 },
  'USNYC': { desc: 'Port of New York / New Jersey (USA East Coast)', usd20: 3400, usd40: 4400, usd40hc: 4600 },
  'NLRTM': { desc: 'Port of Rotterdam (Europe Hub)', usd20: 2100, usd40: 2800, usd40hc: 3000 },
  'DEHAM': { desc: 'Port of Hamburg (Germany)', usd20: 2200, usd40: 2900, usd40hc: 3100 },
  'JPTYO': { desc: 'Port of Tokyo / Yokohama (Japan)', usd20: 650, usd40: 950, usd40hc: 1050 },
  'SGSIN': { desc: 'Port of Singapore (ASEAN Hub)', usd20: 220, usd40: 380, usd40hc: 420 },
  'CNSHA': { desc: 'Port of Shanghai (China)', usd20: 450, usd40: 680, usd40hc: 750 },
};

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  savedCalculations,
  onCalculationSaved
}) => {
  // Form Inputs
  const [title, setTitle] = useState('ประมาณการต้นทุนส่งออก - ข้าวหอมมะลิ FCL');
  const [customerName, setCustomerName] = useState('Pacific Golden Grain Imports LLC');
  const [destinationPortKey, setDestinationPortKey] = useState('USLAX');
  const [incoterm, setIncoterm] = useState<Incoterm>('CIF');
  const [containerType, setContainerType] = useState<ContainerType>('40HC');
  const [containerQuantity, setContainerQuantity] = useState(2);
  const [cargoValueTHB, setCargoValueTHB] = useState(2400000);
  const [exchangeRateUSDTHB, setExchangeRateUSDTHB] = useState(35.50);
  const [oceanFreightUSD, setOceanFreightUSD] = useState(3300);
  const [bunkerAdjustmentUSD, setBunkerAdjustmentUSD] = useState(250);
  const [marineInsuranceRatePercent, setMarineInsuranceRatePercent] = useState(0.25);
  const [dutyTariffPercent, setDutyTariffPercent] = useState(0);
  const [targetGrossMarginPercent, setTargetGrossMarginPercent] = useState(18);

  // Local charges
  const [localCharges, setLocalCharges] = useState<LocalCharges>({
    thc: 4800,
    blFee: 1200,
    sealFee: 300,
    customsPaperwork: 2500,
    portEntry: 600,
    inlandTrucking: 7500,
    terminalSecurity: 400
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auto update rates when destination or container type changes
  const handleDestinationChange = (portKey: string) => {
    setDestinationPortKey(portKey);
    const preset = DEFAULT_FREIGHT_RATES[portKey];
    if (preset) {
      if (containerType === '20GP' || containerType === '20RF') {
        setOceanFreightUSD(preset.usd20);
      } else if (containerType === '40GP') {
        setOceanFreightUSD(preset.usd40);
      } else {
        setOceanFreightUSD(preset.usd40hc);
      }
    }
  };

  const handleContainerTypeChange = (newType: ContainerType) => {
    setContainerType(newType);
    const preset = DEFAULT_FREIGHT_RATES[destinationPortKey];
    if (preset) {
      if (newType === '20GP' || newType === '20RF') {
        setOceanFreightUSD(preset.usd20);
        setLocalCharges(prev => ({ ...prev, thc: 2800 }));
      } else if (newType === '40GP') {
        setOceanFreightUSD(preset.usd40);
        setLocalCharges(prev => ({ ...prev, thc: 4500 }));
      } else {
        setOceanFreightUSD(preset.usd40hc);
        setLocalCharges(prev => ({ ...prev, thc: 4800 }));
      }
    }
  };

  // Calculations
  const oceanFreightPerUnitTHB = (oceanFreightUSD + bunkerAdjustmentUSD) * exchangeRateUSDTHB;
  const totalOceanFreightTHB = oceanFreightPerUnitTHB * containerQuantity;

  // Local charges sum per container or shipment
  // THC is per container, Seal is per container, Inland Trucking is per container
  // B/L fee and customs are per shipment
  const localChargesPerContainer = localCharges.thc + localCharges.sealFee + localCharges.portEntry + localCharges.inlandTrucking;
  const localChargesFixedShipment = localCharges.blFee + localCharges.customsPaperwork + localCharges.terminalSecurity;
  const totalLocalChargesTHB = (localChargesPerContainer * containerQuantity) + localChargesFixedShipment;

  // Insurance CIF (usually CIF value * 110% * rate)
  const baseValueForIns = cargoValueTHB + totalOceanFreightTHB;
  const insuranceTHB = (baseValueForIns * 1.1) * (marineInsuranceRatePercent / 100);

  // Tariff if DDP
  const cifValueTHB = cargoValueTHB + totalOceanFreightTHB + insuranceTHB;
  const tariffTHB = incoterm === 'DDP' ? (cifValueTHB * (dutyTariffPercent / 100)) : 0;

  // Total export cost based on selected Incoterm
  let relevantExportExpensesTHB = 0;
  if (incoterm === 'EXW') {
    relevantExportExpensesTHB = 0;
  } else if (incoterm === 'FOB') {
    relevantExportExpensesTHB = totalLocalChargesTHB;
  } else if (incoterm === 'CFR') {
    relevantExportExpensesTHB = totalLocalChargesTHB + totalOceanFreightTHB;
  } else if (incoterm === 'CIF') {
    relevantExportExpensesTHB = totalLocalChargesTHB + totalOceanFreightTHB + insuranceTHB;
  } else if (incoterm === 'DDP') {
    relevantExportExpensesTHB = totalLocalChargesTHB + totalOceanFreightTHB + insuranceTHB + tariffTHB;
  }

  const totalCostTHB = cargoValueTHB + relevantExportExpensesTHB;
  const costPerContainerTHB = totalCostTHB / containerQuantity;

  // Selling Price based on Target Gross Margin: SellingPrice = Cost / (1 - Margin%)
  const marginDecimal = targetGrossMarginPercent / 100;
  const recommendedSellingPriceTHB = marginDecimal < 1 ? totalCostTHB / (1 - marginDecimal) : totalCostTHB;
  const grossProfitTHB = recommendedSellingPriceTHB - totalCostTHB;
  const grossProfitPerContainerTHB = grossProfitTHB / containerQuantity;

  // Save to IndexedDB
  const handleSaveCalculation = async () => {
    const calcRecord: ExportCalculation = {
      id: 'calc-' + Date.now().toString(36),
      title,
      customerName,
      destinationPort: DEFAULT_FREIGHT_RATES[destinationPortKey]?.desc || destinationPortKey,
      incoterm,
      containerType,
      containerQuantity,
      cargoValueTHB,
      exchangeRateUSDTHB,
      oceanFreightUSD,
      bunkerAdjustmentUSD,
      localChargesTHB: localCharges,
      marineInsuranceRatePercent,
      dutyTariffPercent,
      targetGrossMarginPercent,
      oceanFreightTHB: totalOceanFreightTHB,
      totalFreightAndLocalTHB: totalOceanFreightTHB + totalLocalChargesTHB,
      insuranceTHB,
      cifValueTHB,
      tariffTHB,
      totalCostTHB,
      costPerContainerTHB,
      recommendedSellingPriceTHB,
      grossProfitTHB,
      grossProfitPerContainerTHB,
      createdAt: new Date().toISOString()
    };

    await saveCalculation(calcRecord);
    setSavedSuccess(true);
    onCalculationSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDeleteSavedCalc = async (id: string) => {
    if (confirm('ยืนยันลบการคำนวณนี้?')) {
      await deleteCalculation(id);
      onCalculationSaved();
    }
  };

  // Download Quote CSV
  const handleDownloadQuotationCSV = () => {
    const lines = [
      'ใบประมาณการต้นทุนค่าระวางและเสนอราคาส่งออกทางทะเล (Ocean Export Cost Sheet)',
      `ชื่อโครงการ,${title}`,
      `ลูกค้า / ผู้ซื้อ,${customerName}`,
      `ท่าเรือปลายทาง,${DEFAULT_FREIGHT_RATES[destinationPortKey]?.desc}`,
      `เงื่อนไขการส่งมอบ (Incoterm),${incoterm}`,
      `ประเภทและจำนวนตู้,${containerType} x ${containerQuantity} ตู้`,
      `อัตราแลกเปลี่ยน (USD/THB),${exchangeRateUSDTHB.toFixed(2)} บาท`,
      '',
      'หมวดรายการต้นทุน,หน่วยนับ,จำนวนเงิน (THB)',
      `มูลค่าสินค้าส่งออก (Cargo Value),สินค้ารวม,${cargoValueTHB.toFixed(2)}`,
      `ค่าระวางเรือ (Ocean Freight & BAF),${containerQuantity} ตู้ ($${(oceanFreightUSD + bunkerAdjustmentUSD) * containerQuantity} USD),${totalOceanFreightTHB.toFixed(2)}`,
      `ค่าภาระยกตู้ท่าเรือ (THC),${containerQuantity} ตู้,${(localCharges.thc * containerQuantity).toFixed(2)}`,
      `ค่าธรรมเนียมใบตราส่ง (B/L Fee),1 ฉบับ,${localCharges.blFee.toFixed(2)}`,
      `ค่าซีลล็อคตู้ (Container Seal),${containerQuantity} ชิ้น,${(localCharges.sealFee * containerQuantity).toFixed(2)}`,
      `ค่าพิธีการศุลกากรและเอกสารไร้กระดาษ,1 ชุด,${localCharges.customsPaperwork.toFixed(2)}`,
      `ค่าผ่านท่าเรือ (Port Entry Gate),${containerQuantity} ตู้,${(localCharges.portEntry * containerQuantity).toFixed(2)}`,
      `ค่ารถหัวลากขนส่งเข้าท่าเรือ (Inland Trucking),${containerQuantity} คัน,${(localCharges.inlandTrucking * containerQuantity).toFixed(2)}`,
      `ค่าประกันภัยทางทะเล (Marine Cargo Insurance),${marineInsuranceRatePercent}%,${insuranceTHB.toFixed(2)}`,
      '',
      `ต้นทุนส่งออกรวมทั้งสิ้น (Total Export Cost),,${totalCostTHB.toFixed(2)}`,
      `ต้นทุนเฉลี่ยต่อตู้ (Cost per Container),,${costPerContainerTHB.toFixed(2)}`,
      `เป้าหมายกำไรขั้นต้น (Gross Margin),,${targetGrossMarginPercent}%`,
      `ราคาเสนอขายแนะนำ (Recommended Selling Price),,${recommendedSellingPriceTHB.toFixed(2)}`,
      `กำไรขั้นต้นประมาณการ (Estimated Gross Profit),,${grossProfitTHB.toFixed(2)}`,
      `กำไรต่อตู้คอนเทนเนอร์,,${grossProfitPerContainerTHB.toFixed(2)}`
    ];

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ocean_Export_Cost_Quote_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-1">
              <span>Ocean Freight & Local Charges Analysis</span>
              <span aria-hidden="true">·</span>
              <span>Incoterms 2020</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              เครื่องคำนวณต้นทุนการส่งออกทางเรือ (Export Freight & Cost Calculator)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              จำลองต้นทุนค่าระวางเรือ ค่าภาระท่าเรือ (THC) พิธีการศุลกากร ประกันภัย และคำนวณกำไรขั้นต้นตามเงื่อนไข Incoterm
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQuotationCSV}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>ดาวน์โหลดใบประมาณการ CSV</span>
            </button>

            <button
              onClick={handleSaveCalculation}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px] shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการคำนวณ</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>บันทึกแบบจำลองต้นทุนเข้าฐานข้อมูล IndexedDB เรียบร้อยแล้ว!</span>
          </div>
        )}
      </div>

      {/* Main Split: Input Forms & Real-time Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 Cols): Parameter Controls */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* General & Shipment Meta */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. ข้อมูลพื้นฐานการส่งออก (Basic Shipment Info)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อโครงการ / รายการสินค้า
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อลูกค้า / ผู้ซื้อต่างประเทศ
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ท่าเรือปลายทาง (POD)
                </label>
                <select
                  value={destinationPortKey}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {Object.entries(DEFAULT_FREIGHT_RATES).map(([key, val]) => (
                    <option key={key} value={key}>{val.desc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เงื่อนไขการส่งมอบ (Incoterm)
                </label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as Incoterm)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-semibold text-sky-800"
                >
                  <option value="EXW">EXW (Ex Works - โรงงาน)</option>
                  <option value="FOB">FOB (Free on Board - ท่าเรือไทย)</option>
                  <option value="CFR">CFR (Cost & Freight - ท่าเรือปลายทาง)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="DDP">DDP (Delivered Duty Paid)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อัตราแลกเปลี่ยน (USD/THB)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={exchangeRateUSDTHB}
                  onChange={(e) => setExchangeRateUSDTHB(parseFloat(e.target.value) || 35.5)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภทตู้คอนเทนเนอร์
                </label>
                <select
                  value={containerType}
                  onChange={(e) => handleContainerTypeChange(e.target.value as ContainerType)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="20GP">20' Dry Standard (20GP)</option>
                  <option value="40GP">40' Dry Standard (40GP)</option>
                  <option value="40HC">40' High Cube (40HC)</option>
                  <option value="20RF">20' Reefer แช่เย็น (20RF)</option>
                  <option value="40RF">40' Reefer แช่เย็น (40RF)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนตู้คอนเทนเนอร์
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={containerQuantity}
                  onChange={(e) => setContainerQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  มูลค่าราคาสินค้าส่งออก (บาท)
                </label>
                <input
                  type="number"
                  value={cargoValueTHB}
                  onChange={(e) => setCargoValueTHB(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Ocean Freight Details */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>2. ค่าระวางเรือมหาสมุทร (Ocean Freight)</span>
              <span className="text-xs font-normal text-slate-500">
                {incoterm === 'EXW' || incoterm === 'FOB' ? '(ผู้ซื้อจ่ายตามเงื่อนไข)' : '(ผู้ขายรวมในต้นทุน)'}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าระวางเรือต่อตู้ (USD / Container)
                </label>
                <input
                  type="number"
                  value={oceanFreightUSD}
                  onChange={(e) => setOceanFreightUSD(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าน้ำมันส่วนเพิ่ม BAF / Surcharges (USD)
                </label>
                <input
                  type="number"
                  value={bunkerAdjustmentUSD}
                  onChange={(e) => setBunkerAdjustmentUSD(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Local Port & Documentation Charges (THB) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. ค่าธรรมเนียมท่าเรือและท้องถิ่น (Local Charges in Thailand - THB)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">THC ท่าเรือ/ตู้ (บาท)</label>
                <input
                  type="number"
                  value={localCharges.thc}
                  onChange={(e) => setLocalCharges({ ...localCharges, thc: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">ค่า B/L Fee /ฉบับ (บาท)</label>
                <input
                  type="number"
                  value={localCharges.blFee}
                  onChange={(e) => setLocalCharges({ ...localCharges, blFee: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">ค่าซีลตู้ Seal /ตู้ (บาท)</label>
                <input
                  type="number"
                  value={localCharges.sealFee}
                  onChange={(e) => setLocalCharges({ ...localCharges, sealFee: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">พิธีการศุลกากร (บาท)</label>
                <input
                  type="number"
                  value={localCharges.customsPaperwork}
                  onChange={(e) => setLocalCharges({ ...localCharges, customsPaperwork: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">ค่าผ่านท่า Port Entry (บาท)</label>
                <input
                  type="number"
                  value={localCharges.portEntry}
                  onChange={(e) => setLocalCharges({ ...localCharges, portEntry: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">รถลากไปท่าเรือ /ตู้ (บาท)</label>
                <input
                  type="number"
                  value={localCharges.inlandTrucking}
                  onChange={(e) => setLocalCharges({ ...localCharges, inlandTrucking: parseFloat(e.target.value) || 0 })}
                  className="w-full font-mono p-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Insurance & Margin Target */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              4. ประกันภัยและเป้าหมายกำไร (Insurance & Profit Margin)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อัตราเบี้ยประกันทางทะเล (% Marine Cargo Insurance)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={marineInsuranceRatePercent}
                  onChange={(e) => setMarineInsuranceRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg"
                />
                <div className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน Institute Cargo Clauses (A) ~0.25%</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เป้าหมายกำไรขั้นต้น (% Target Gross Margin)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="80"
                  value={targetGrossMarginPercent}
                  onChange={(e) => setTargetGrossMarginPercent(parseFloat(e.target.value) || 15)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                />
                <div className="text-[11px] text-slate-400 mt-0.5">ใช้เพื่อแนะนำราคาขายส่งออกที่ครอบคลุมกำไร</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (5 Cols): Real-time Export Cost & Profit Summary */}
        <div className="lg:col-span-5 space-y-5 sticky top-20">
          
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 text-white shadow-lg space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  สรุปผลต้นทุนและราคาขาย
                </span>
                <span className="text-xs bg-sky-950 text-sky-300 border border-sky-800/80 px-2 py-0.5 rounded font-mono">
                  {incoterm} 2020
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                การวิเคราะห์ต้นทุนส่งออกทางทะเล
              </h2>
            </div>

            {/* Total Cost Highlight */}
            <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700/80">
              <div className="text-xs text-slate-400">ต้นทุนรวมทั้งสิ้น (Total Export Cost)</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums mt-1">
                ฿{totalCostTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                เฉลี่ยต่อตู้: <span className="font-mono text-slate-300">฿{costPerContainerTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Recommended Selling Price & Profit */}
            <div className="p-4 bg-emerald-950/40 rounded-lg border border-emerald-800/50">
              <div className="text-xs text-emerald-400 flex items-center justify-between">
                <span>ราคาขายส่งออกแนะนำ ({targetGrossMarginPercent}% Margin)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums mt-1">
                ฿{recommendedSellingPriceTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-200/80 mt-1.5 flex items-center justify-between">
                <span>กำไรขั้นต้นรวม:</span>
                <span className="font-mono font-semibold">
                  +฿{grossProfitTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-xs text-emerald-200/80 mt-0.5 flex items-center justify-between">
                <span>กำไรต่อตู้:</span>
                <span className="font-mono">
                  +฿{grossProfitPerContainerTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} / ตู้
                </span>
              </div>
            </div>

            {/* Itemized Cost Breakdown Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="text-slate-400 font-semibold mb-2">สัดส่วนค่าใช้จ่าย:</div>
              
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">มูลค่าสินค้า (Cargo Base):</span>
                <span className="font-mono text-white tabular-nums">฿{cargoValueTHB.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">ค่าระวางเรือ Ocean Freight:</span>
                <span className="font-mono text-white tabular-nums">
                  ฿{totalOceanFreightTHB.toLocaleString()}
                  <span className="text-slate-500 text-[11px] ml-1">
                    (${((oceanFreightUSD + bunkerAdjustmentUSD) * containerQuantity).toLocaleString()} USD)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">ค่าภาระท่าเรือ & ขนส่งไทย (Local):</span>
                <span className="font-mono text-white tabular-nums">฿{totalLocalChargesTHB.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">ประกันภัยทางทะเล (Insurance):</span>
                <span className="font-mono text-white tabular-nums">฿{insuranceTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleSaveCalculation}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการคำนวณ</span>
              </button>
              <button
                onClick={handleDownloadQuotationCSV}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition-colors flex items-center justify-center"
                title="ดาวน์โหลดใบเสนอราคา CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Past Saved Calculations */}
          {savedCalculations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  รายการประมาณการที่บันทึกไว้ ({savedCalculations.length})
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedCalculations.map((calc) => (
                  <div
                    key={calc.id}
                    className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{calc.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {calc.destinationPort.split(' ')[0]} · {calc.containerType} x {calc.containerQuantity} ตู้ · {calc.incoterm}
                      </div>
                      <div className="font-mono text-sky-700 font-semibold mt-0.5">
                        ฿{calc.totalCostTHB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSavedCalc(calc.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
