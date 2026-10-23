// Sample document assets and helpers for 1-click OCR demonstration
import sampleInvoiceJpg from '../assets/images/sample_shipping_invoice_1792726523529.jpg';

export interface SampleDoc {
  id: string;
  name: string;
  type: 'INVOICE' | 'PACKING_LIST' | 'COMBINED';
  description: string;
  category: string;
  getImageUrl: () => string;
  expectedData: {
    invoiceNo: string;
    date: string;
    shipper: string;
    consignee: string;
    hsCode: string;
    currency: string;
    totalAmount: number;
    containerNo: string;
    sealNo: string;
    grossWeight: number;
    netWeight: number;
  };
}

/**
 * Creates high-resolution canvas invoices for guaranteed authentic OCR testing
 */
export function generateSampleInvoiceCanvas(variant: 'RICE_AGRI' | 'AUTO_PARTS' | 'RICE_NO_WEIGHT'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1900;
  const ctx = canvas.getContext('2d')!;

  // Crisp White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Border
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  if (variant === 'RICE_AGRI' || variant === 'RICE_NO_WEIGHT') {
    // --- SAMPLE 2: Thai Agricultural Rice Export ---
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMMERCIAL INVOICE', canvas.width / 2, 100);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.', canvas.width / 2, 135);
    ctx.fillText('88/12 Rama III Road, Yannawa, Bangkok 10120 Thailand | TAX ID: 0105558129941', canvas.width / 2, 160);

    ctx.beginPath();
    ctx.moveTo(50, 185);
    ctx.lineTo(canvas.width - 50, 185);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('SHIPPER / EXPORTER:', 70, 225);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.', 70, 250);
    ctx.fillText('88/12 RAMA III RD, YANNAWA, BANGKOK 10120 THAILAND', 70, 275);
    ctx.fillText('TEL: +66 2 541 9000  EMAIL: export@siamagri.co.th', 70, 300);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('CONSIGNEE / BUYER:', 70, 345);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('PACIFIC GOLDEN GRAIN IMPORTS LLC', 70, 370);
    ctx.fillText('2400 HARBOR BLVD, SUITE 400, LONG BEACH, CA 90802, USA', 70, 395);
    ctx.fillText('ATTN: IMPORT PROCUREMENT DIVISION', 70, 420);

    // Meta box
    ctx.strokeRect(740, 205, 600, 230);
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('INVOICE NO: INV-2026-TH0891', 760, 240);
    ctx.fillText('INVOICE DATE: 18 OCTOBER 2026', 760, 272);
    ctx.fillText('B/L NO: MSKU2026TH9921', 760, 304);
    ctx.fillText('TERMS: CIF LOS ANGELES (INCOTERMS 2020)', 760, 336);
    ctx.fillText('VESSEL / VOYAGE: MSC ADRIATIC V.2610E', 760, 368);
    ctx.fillText('PORT OF LOADING: LAEM CHABANG (THLCH)', 760, 400);
    ctx.fillText('PORT OF DISCHARGE: LOS ANGELES (USLAX)', 760, 425);

    // Shipping container strip
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(50, 455, canvas.width - 100, 60);
    ctx.strokeRect(50, 455, canvas.width - 100, 60);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('CONTAINER NO: MSKU8843210 (40HC)', 70, 492);
    ctx.fillText('SEAL NO: TH-SL-884102', 550, 492);
    ctx.fillText('CURRENCY: USD', 1050, 492);

    // Table Header
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(50, 535, canvas.width - 100, 45);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText('ITEM', 70, 563);
    ctx.fillText('DESCRIPTION OF GOODS', 140, 563);
    ctx.fillText('HS CODE', 620, 563);
    ctx.fillText('QUANTITY', 760, 563);
    ctx.fillText('UNIT PRICE', 960, 563);
    ctx.fillText('TOTAL (USD)', 1160, 563);

    // Rows
    const rows = [
      { no: '1', desc: 'THAI HOM MALI JASMINE RICE 100% GRADE A (25KG BAGS)', hs: '1006.30.90', qty: '800 BAGS', price: 'USD 42.50', total: '34,000.00' },
      { no: '2', desc: 'ORGANIC THAI RED CARGO RICE VACUUM PACK (1KG X 20)', hs: '1006.30.30', qty: '200 CTNS', price: 'USD 38.00', total: '7,600.00' },
    ];

    let y = 625;
    ctx.fillStyle = '#0F172A';
    rows.forEach((r) => {
      ctx.font = '15px Arial, sans-serif';
      ctx.fillText(r.no, 70, y);
      ctx.fillText(r.desc, 140, y);
      ctx.fillText(r.hs, 620, y);
      ctx.fillText(r.qty, 760, y);
      ctx.fillText(r.price, 960, y);
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(r.total, 1160, y);

      ctx.beginPath();
      ctx.moveTo(50, y + 25);
      ctx.lineTo(canvas.width - 50, y + 25);
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      y += 70;
    });

    // Totals & Weights Box
    ctx.strokeRect(50, 800, canvas.width - 100, 200);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(50, 800, canvas.width - 100, 200);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillText('WEIGHTS & MEASUREMENT SPECIFICATION:', 70, 835);

    if (variant === 'RICE_NO_WEIGHT') {
      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('WEIGHTS SPECIFICATION: AS PER ATTACHED PACKING LIST', 70, 885);
      ctx.fillText('NET & GROSS WEIGHT: DETAILED ON OFFICIAL PACKING LIST', 70, 925);
    } else {
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('TOTAL PACKAGES: 1,000 PACKAGES / BAGS', 70, 875);
      ctx.fillText('TOTAL NET WEIGHT: 24,000.00 KGS', 70, 915);
      ctx.fillText('TOTAL GROSS WEIGHT: 24,700.00 KGS', 70, 955);
      ctx.fillText('TOTAL MEASUREMENT: 58.40 CBM', 70, 985);
    }

    // Total Amount Box
    ctx.strokeRect(740, 815, 600, 165);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('SUBTOTAL: USD 41,600.00', 760, 855);
    ctx.fillText('OCEAN FREIGHT & INSURANCE: INCLUDED', 760, 895);
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText('TOTAL AMOUNT: USD 41,600.00', 760, 950);

  } else {
    // --- SAMPLE 3: Precision Automotive Components Export ---
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXPORT COMMERCIAL INVOICE', canvas.width / 2, 100);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('EASTERN PRECISION AUTO PARTS THAILAND CO., LTD.', canvas.width / 2, 135);
    ctx.fillText('Amata City Industrial Estate, Chonburi 20000 Thailand | TAX ID: 0205562009181', canvas.width / 2, 160);

    ctx.beginPath();
    ctx.moveTo(50, 185);
    ctx.lineTo(canvas.width - 50, 185);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('SHIPPER / EXPORTER:', 70, 225);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('EASTERN PRECISION AUTO PARTS THAILAND CO., LTD.', 70, 250);
    ctx.fillText('AMATA CITY CHONBURI INDUSTRIAL ESTATE, CHONBURI 20000', 70, 275);
    ctx.fillText('TEL: +66 38 456 789  EMAIL: export-sales@easternprecision.co.th', 70, 300);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('CONSIGNEE / BUYER:', 70, 345);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('KANTO MOTOR ASSEMBLY PARTS LTD.', 70, 370);
    ctx.fillText('DAIKO-CHO, TSURUMI-KU, YOKOHAMA, KANAGAWA 230-0053, JAPAN', 70, 395);
    ctx.fillText('ATTN: GLOBAL SOURCING DIVISION', 70, 420);

    // Meta box
    ctx.strokeRect(740, 205, 600, 230);
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('INVOICE NO: INV-2026-JP0034', 760, 240);
    ctx.fillText('INVOICE DATE: 20 OCTOBER 2026', 760, 272);
    ctx.fillText('B/L NO: COSU88234120', 760, 304);
    ctx.fillText('TERMS: FOB BANGKOK (INCOTERMS 2020)', 760, 336);
    ctx.fillText('VESSEL / VOYAGE: COSCO PACIFIC V.114N', 760, 368);
    ctx.fillText('PORT OF LOADING: BANGKOK PORT (THBKK)', 760, 400);
    ctx.fillText('PORT OF DISCHARGE: TOKYO / YOKOHAMA (JPTYO)', 760, 425);

    // Shipping container strip
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(50, 455, canvas.width - 100, 60);
    ctx.strokeRect(50, 455, canvas.width - 100, 60);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('CONTAINER NO: COSU8823412 (20GP)', 70, 492);
    ctx.fillText('SEAL NO: CS-771239', 550, 492);
    ctx.fillText('CURRENCY: USD', 1050, 492);

    // Table Header
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(50, 535, canvas.width - 100, 45);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText('ITEM', 70, 563);
    ctx.fillText('DESCRIPTION OF GOODS', 140, 563);
    ctx.fillText('HS CODE', 620, 563);
    ctx.fillText('QUANTITY', 760, 563);
    ctx.fillText('UNIT PRICE', 960, 563);
    ctx.fillText('TOTAL (USD)', 1160, 563);

    // Rows
    const rows = [
      { no: '1', desc: 'ALUMINIUM DIE-CASTING TRANSMISSION BRACKETS', hs: '8708.29.90', qty: '600 UNITS', price: 'USD 81.00', total: '48,600.00' },
      { no: '2', desc: 'HIGH-PRESSURE OIL PUMP SEAL KITS TYPE-A', hs: '8484.10.00', qty: '300 SETS', price: 'USD 24.00', total: '7,200.00' },
    ];

    let y = 625;
    ctx.fillStyle = '#0F172A';
    rows.forEach((r) => {
      ctx.font = '15px Arial, sans-serif';
      ctx.fillText(r.no, 70, y);
      ctx.fillText(r.desc, 140, y);
      ctx.fillText(r.hs, 620, y);
      ctx.fillText(r.qty, 760, y);
      ctx.fillText(r.price, 960, y);
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(r.total, 1160, y);

      ctx.beginPath();
      ctx.moveTo(50, y + 25);
      ctx.lineTo(canvas.width - 50, y + 25);
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      y += 70;
    });

    // Totals & Weights Box
    ctx.strokeRect(50, 800, canvas.width - 100, 200);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(50, 800, canvas.width - 100, 200);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillText('CARGO WEIGHT & VOLUME SPECIFICATION:', 70, 835);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('TOTAL PACKAGES: 900 UNITS / 60 CRATES', 70, 875);
    ctx.fillText('TOTAL NET WEIGHT: 13,500.00 KGS', 70, 915);
    ctx.fillText('TOTAL GROSS WEIGHT: 14,200.00 KGS', 70, 955);
    ctx.fillText('TOTAL MEASUREMENT: 28.00 CBM', 70, 985);

    // Total Amount Box
    ctx.strokeRect(740, 815, 600, 165);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('SUBTOTAL: USD 55,800.00', 760, 855);
    ctx.fillText('TRADE DISCOUNT (SPECIAL): USD 0.00', 760, 895);
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText('TOTAL AMOUNT: USD 55,800.00', 760, 950);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Creates sample Ocean Export Packing List canvas
 */
export function generateSamplePackingListCanvas(variant: 'MATCH' | 'MISMATCH'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1900;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OCEAN EXPORT PACKING LIST', canvas.width / 2, 100);

  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.', canvas.width / 2, 135);
  ctx.fillText('88/12 Rama III Road, Yannawa, Bangkok 10120 Thailand | TAX ID: 0105558129941', canvas.width / 2, 160);

  ctx.beginPath();
  ctx.moveTo(50, 185);
  ctx.lineTo(canvas.width - 50, 185);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0F172A';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('SHIPPER / EXPORTER:', 70, 225);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.', 70, 250);
  ctx.fillText('88/12 RAMA III RD, YANNAWA, BANGKOK 10120 THAILAND', 70, 275);

  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('CONSIGNEE / BUYER:', 70, 345);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('PACIFIC GOLDEN GRAIN IMPORTS LLC', 70, 370);
  ctx.fillText('2400 HARBOR BLVD, SUITE 400, LONG BEACH, CA 90802, USA', 70, 395);

  // Meta Box
  ctx.strokeRect(740, 205, 600, 230);
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('PACKING LIST NO: PL-2026-TH0891', 760, 240);
  ctx.fillText('INVOICE REF: INV-2026-TH0891', 760, 272);
  ctx.fillText('DATE: 18 OCTOBER 2026', 760, 304);
  ctx.fillText('B/L NO: MSKU2026TH9921', 760, 336);
  ctx.fillText('VESSEL / VOYAGE: MSC ADRIATIC V.2610E', 760, 368);
  ctx.fillText('PORT OF LOADING: LAEM CHABANG (THLCH)', 760, 400);
  ctx.fillText('PORT OF DISCHARGE: LOS ANGELES (USLAX)', 760, 425);

  // Container Box
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(50, 455, canvas.width - 100, 60);
  ctx.strokeRect(50, 455, canvas.width - 100, 60);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px Arial, sans-serif';
  
  const containerNo = 'MSKU8843210 (40HC)';
  const sealNo = variant === 'MATCH' ? 'TH-SL-884102' : 'TH-SL-999999 (DISCREPANCY)';
  ctx.fillText(`CONTAINER NO: ${containerNo}`, 70, 492);
  ctx.fillText(`SEAL NO: ${sealNo}`, 650, 492);

  // Table
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(50, 535, canvas.width - 100, 45);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('ITEM', 70, 563);
  ctx.fillText('DESCRIPTION OF GOODS', 140, 563);
  ctx.fillText('PACKAGES', 600, 563);
  ctx.fillText('NET WT (KG)', 840, 563);
  ctx.fillText('GROSS WT (KG)', 1040, 563);
  ctx.fillText('MEASUREMENT', 1230, 563);

  const isMatch = variant === 'MATCH';
  const rows = [
    {
      no: '1',
      desc: 'THAI HOM MALI JASMINE RICE 100% GRADE A (25KG BAGS)',
      pkgs: isMatch ? '800 BAGS' : '850 BAGS (MISMATCH)',
      net: isMatch ? '20,000.00' : '21,250.00',
      gross: isMatch ? '20,500.00' : '21,700.00',
      cbm: '48.00 CBM',
    },
    {
      no: '2',
      desc: 'ORGANIC THAI RED CARGO RICE VACUUM PACK (1KG X 20)',
      pkgs: '200 CTNS',
      net: '4,000.00',
      gross: '4,200.00',
      cbm: '10.40 CBM',
    },
  ];

  let y = 625;
  ctx.fillStyle = '#0F172A';
  rows.forEach((r) => {
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(r.no, 70, y);
    ctx.fillText(r.desc, 140, y);
    ctx.fillText(r.pkgs, 600, y);
    ctx.fillText(r.net, 840, y);
    ctx.fillText(r.gross, 1040, y);
    ctx.fillText(r.cbm, 1230, y);

    ctx.beginPath();
    ctx.moveTo(50, y + 25);
    ctx.lineTo(canvas.width - 50, y + 25);
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    y += 70;
  });

  // Weights Summary Box
  ctx.strokeRect(50, 800, canvas.width - 100, 200);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(50, 800, canvas.width - 100, 200);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('CARGO WEIGHT & VOLUME CERTIFICATION:', 70, 835);

  const totalPkgs = isMatch ? '1,000 PACKAGES / BAGS' : '1,050 PACKAGES (MISMATCH)';
  const totalNet = isMatch ? '24,000.00 KGS' : '25,250.00 KGS (MISMATCH)';
  const totalGross = isMatch ? '24,700.00 KGS' : '25,900.00 KGS (MISMATCH)';

  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`TOTAL PACKAGES: ${totalPkgs}`, 70, 875);
  ctx.fillText(`TOTAL NET WEIGHT: ${totalNet}`, 70, 915);
  ctx.fillText(`TOTAL GROSS WEIGHT: ${totalGross}`, 70, 955);
  ctx.fillText('TOTAL MEASUREMENT: 58.40 CBM', 70, 985);

  return canvas.toDataURL('image/png');
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'sample-photo-invoice',
    name: 'ตัวอย่างที่ 1: Commercial Invoice ภาพถ่ายจริง (International Trade)',
    category: 'ภาพถ่ายเอกสารจริงจากโต๊ะทำงาน (Photo Scan)',
    type: 'COMBINED',
    description: 'ภาพถ่ายเอกสารขนส่งทางทะเลจริง ระบุหมายเลขตู้ MSCU8843210, B/L, จอภาพ LCD Displays, Net Wt, Gross Wt',
    getImageUrl: () => sampleInvoiceJpg,
    expectedData: {
      invoiceNo: 'GBH1234567',
      date: '2023-10-15',
      shipper: 'TransOcean Freight LLC, Hamburg, Germany',
      consignee: 'Swift Imparts Inc., New York, NY, USA',
      hsCode: '8528.52.00',
      currency: 'USD',
      totalAmount: 30000.00,
      containerNo: 'MSCU8843210',
      sealNo: 'A4589201',
      grossWeight: 383,
      netWeight: 250
    }
  },
  {
    id: 'sample-agri-rice',
    name: 'ตัวอย่างที่ 2: Commercial Invoice สินค้าเกษตรข้าวไทย (FCL 40HC)',
    category: 'ส่งออกข้าวหอมมะลิไทย (Agricultural Export)',
    type: 'COMBINED',
    description: 'ใบกำกับสินค้าส่งออกข้าวหอมมะลิไทย HS Code 1006.30, ตู้ 40HC, น้ำหนักรวม 24,700 KGS, เงื่อนไข CIF Los Angeles',
    getImageUrl: () => generateSampleInvoiceCanvas('RICE_AGRI'),
    expectedData: {
      invoiceNo: 'INV-2026-TH0891',
      date: '2026-10-18',
      shipper: 'SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.',
      consignee: 'PACIFIC GOLDEN GRAIN IMPORTS LLC',
      hsCode: '1006.30.90',
      currency: 'USD',
      totalAmount: 41600.00,
      containerNo: 'MSKU8843210',
      sealNo: 'TH-SL-884102',
      grossWeight: 24700,
      netWeight: 24000
    }
  },
  {
    id: 'sample-rice-no-weight',
    name: 'ตัวอย่างที่ 2.1: Commercial Invoice ข้าวไทย (ไม่มี Gross Weight เพื่อทดสอบ Auto-Fill)',
    category: 'ทดสอบการดึงค่าน้ำหนักข้ามเอกสาร (Cross-Fill Test)',
    type: 'INVOICE',
    description: 'Commercial Invoice ข้าวไทยที่ไม่มีระบุน้ำหนัก Gross Weight ในใบ เพื่อทดสอบว่าฟอร์มรวมจะดึง Gross Weight จาก Packing List มาเติมโดยอัตโนมัติ',
    getImageUrl: () => generateSampleInvoiceCanvas('RICE_NO_WEIGHT'),
    expectedData: {
      invoiceNo: 'INV-2026-TH0891',
      date: '2026-10-18',
      shipper: 'SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.',
      consignee: 'PACIFIC GOLDEN GRAIN IMPORTS LLC',
      hsCode: '1006.30.90',
      currency: 'USD',
      totalAmount: 41600.00,
      containerNo: 'MSKU8843210',
      sealNo: 'TH-SL-884102',
      grossWeight: 0,
      netWeight: 0
    }
  },
  {
    id: 'sample-auto-parts',
    name: 'ตัวอย่างที่ 3: Commercial Invoice ชิ้นส่วนยานยนต์ (Auto Components)',
    category: 'ชิ้นส่วนยานยนต์ส่งออกญี่ปุ่น (Automotive Export)',
    type: 'INVOICE',
    description: 'ใบกำกับสินค้าชิ้นส่วนยานยนต์ HS Code 8708.29, ตู้ 20GP, น้ำหนักรวม 14,200 KGS, เงื่อนไข FOB Bangkok',
    getImageUrl: () => generateSampleInvoiceCanvas('AUTO_PARTS'),
    expectedData: {
      invoiceNo: 'INV-2026-JP0034',
      date: '2026-10-20',
      shipper: 'EASTERN PRECISION AUTO PARTS THAILAND CO., LTD.',
      consignee: 'KANTO MOTOR ASSEMBLY PARTS LTD.',
      hsCode: '8708.29.90',
      currency: 'USD',
      totalAmount: 55800.00,
      containerNo: 'COSU8823412',
      sealNo: 'CS-771239',
      grossWeight: 14200,
      netWeight: 13500
    }
  },
  {
    id: 'sample-agri-pl-match',
    name: 'ตัวอย่างที่ 4: Packing List ข้าวไทย (ตรงกับ Invoice 100%)',
    category: 'ใบรายการบรรจุหีบห่อ (Matching Packing List)',
    type: 'PACKING_LIST',
    description: 'Packing List ข้าวไทยที่ข้อมูลตรงกับ Invoice ตัวอย่างที่ 2 ทุกฟิลด์ (น้ำหนักรวม 24,700 KGS, 1,000 หีบห่อ, ตู้ MSKU8843210)',
    getImageUrl: () => generateSamplePackingListCanvas('MATCH'),
    expectedData: {
      invoiceNo: 'PL-2026-TH0891',
      date: '2026-10-18',
      shipper: 'SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.',
      consignee: 'PACIFIC GOLDEN GRAIN IMPORTS LLC',
      hsCode: '1006.30.90',
      currency: 'USD',
      totalAmount: 0,
      containerNo: 'MSKU8843210',
      sealNo: 'TH-SL-884102',
      grossWeight: 24700,
      netWeight: 24000
    }
  },
  {
    id: 'sample-agri-pl-mismatch',
    name: 'ตัวอย่างที่ 5: Packing List ข้าวไทย (มีส่วนต่าง Discrepancy)',
    category: 'ทดสอบการตรวจพบข้อผิดพลาด (Mismatch Test)',
    type: 'PACKING_LIST',
    description: 'Packing List ที่มีน้ำหนักคลาดเคลื่อน (25,900 KGS vs 24,700 KGS) และจำนวน 1,050 หีบห่อ เพื่อทดสอบระบบแจ้งเตือนสีแดง',
    getImageUrl: () => generateSamplePackingListCanvas('MISMATCH'),
    expectedData: {
      invoiceNo: 'PL-2026-TH0891',
      date: '2026-10-18',
      shipper: 'SIAM AGRI-FOOD GLOBAL EXPORT CO., LTD.',
      consignee: 'PACIFIC GOLDEN GRAIN IMPORTS LLC',
      hsCode: '1006.30.90',
      currency: 'USD',
      totalAmount: 0,
      containerNo: 'MSKU8843210',
      sealNo: 'TH-SL-999999',
      grossWeight: 25900,
      netWeight: 25250
    }
  }
];
