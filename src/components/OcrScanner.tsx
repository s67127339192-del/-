import React, { useState, useRef, useEffect } from 'react';
import { 
  performOcr, 
  ExtractedShippingData, 
  convertOcrToShipment 
} from '../services/ocr';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../services/sampleDocs';
import { isPdfSource } from '../services/pdfHelper';
import { saveShipment, saveContainer, saveScannedDocument, getScannedDocuments, deleteScannedDocument } from '../services/db';
import { Shipment, ContainerTracking, LineItem, DocumentType, ScannedDocumentItem, UnifiedShipmentSummary } from '../types';
import { buildUnifiedShipmentSummary } from '../services/docMerge';
import { UnifiedSummaryForm } from './UnifiedSummaryForm';
import { CrossDocModal } from './CrossDocModal';
import { 
  UploadCloud, 
  FileText, 
  Check, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Eye,
  FileCheck,
  ZoomIn,
  ZoomOut,
  Terminal,
  Copy,
  Scale,
  Layers,
  ArrowRightLeft,
  FileUp,
  FolderPlus,
  Play,
  Sliders,
  Calculator,
  ChevronDown,
  AlertTriangle,
  ShieldCheck,
  X
} from 'lucide-react';

interface OcrScannerProps {
  onShipmentSaved: (shipment: Shipment) => void;
}

export const OcrScanner: React.FC<OcrScannerProps> = ({ onShipmentSaved }) => {
  // Multi-Document State (Requirements 2, 4, 8)
  const [documents, setDocuments] = useState<ScannedDocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Keep a ref to documents to avoid stale closures during asynchronous OCR queue loops
  const documentsRef = useRef<ScannedDocumentItem[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  // Set of deleted document IDs to cancel/abort any in-flight OCR results (Requirement 5)
  const deletedDocIdsRef = useRef<Set<string>>(new Set());

  // Delete Document Confirmation Modal State (Requirements 1-5)
  const [docToDelete, setDocToDelete] = useState<ScannedDocumentItem | null>(null);

  // Automated Unified Shipment Document Summary State (Requirements 15-24)
  const [unifiedSummary, setUnifiedSummary] = useState<UnifiedShipmentSummary>(() => buildUnifiedShipmentSummary([]));

  // Right Panel View: 'SUMMARY' (Unified Shipment Document Summary) vs 'RAW_OCR' (Single Doc Fields)
  const [rightPanelView, setRightPanelView] = useState<'SUMMARY' | 'RAW_OCR'>('SUMMARY');

  // Queue Processing State (Requirement 7)
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueStatusText, setQueueStatusText] = useState('');
  const [queueProgressPercent, setQueueProgressPercent] = useState(0);

  // Cross-Check Modal State (Requirements 10, 11, 12)
  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);

  // Document Viewer Settings
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode, setViewMode] = useState<'ORIGINAL' | 'PREPROCESSED'>('ORIGINAL');
  const [showDebugView, setShowDebugView] = useState(false);

  // Preprocessing Settings
  const [enableDeskew, setEnableDeskew] = useState(true);
  const [enableSharpen, setEnableSharpen] = useState(true);
  const [enableContrast, setEnableContrast] = useState(true);

  // UI Notices
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoCreateContainer, setAutoCreateContainer] = useState(true);
  const [activeBundleName, setActiveBundleName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistent documents on mount (Requirement 17: refresh preserves data)
  useEffect(() => {
    const loadSavedDocs = async () => {
      try {
        const saved = await getScannedDocuments();
        if (saved && saved.length > 0) {
          setDocuments(saved);
          documentsRef.current = saved;
          setActiveDocId(saved[0].id || saved[0].documentId || null);
        }
      } catch (err) {
        console.error('Failed to load saved scanned documents:', err);
      }
    };
    loadSavedDocs();
  }, []);

  // Currently inspected active document
  const activeDoc = documents.find((d) => (d.id === activeDocId || d.documentId === activeDocId)) || documents[0] || null;

  // Handle Multi-file Upload (Requirements 2 & 14)
  const handleMultipleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: ScannedDocumentItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Safeguard for iPad/Safari: check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 25MB ซึ่งอาจทำให้ Safari บน iPad ขัดข้อง กรุณาลดขนาดไฟล์`);
        continue;
      }

      // Guess initial document type from filename
      let initialType: DocumentType = 'INVOICE';
      const nameLower = file.name.toLowerCase();
      if (nameLower.includes('pack') || nameLower.includes('pl') || nameLower.includes('packing')) {
        initialType = 'PACKING_LIST';
      } else if (nameLower.includes('bl') || nameLower.includes('bill') || nameLower.includes('lading')) {
        initialType = 'BILL_OF_LADING';
      }

      const docId = 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const url = URL.createObjectURL(file);

      newDocs.push({
        id: docId,
        documentId: docId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || (isPdfSource(file) ? 'application/pdf' : 'image/jpeg'),
        file: file,
        docType: initialType,
        documentType: initialType,
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: url,
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      });
    }

    if (newDocs.length > 0) {
      setDocuments((prev) => {
        const next = [...prev, ...newDocs];
        documentsRef.current = next;
        return next;
      });
      if (!activeDocId) {
        setActiveDocId(newDocs[0].id);
      }
      // Save metadata to IndexedDB
      newDocs.forEach((d) => saveScannedDocument(d));
    }

    // Reset input value so same files can be re-selected if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Change Document Type for a specific document (Requirement 3)
  const handleChangeDocType = async (docId: string, newType: DocumentType) => {
    setDocuments((prev) => {
      const next = prev.map((doc) => {
        if (doc.id === docId || doc.documentId === docId) {
          const updated = { ...doc, docType: newType, documentType: newType };
          saveScannedDocument(updated);
          return updated;
        }
        return doc;
      });
      documentsRef.current = next;
      return next;
    });
  };

  // Trigger Delete Confirmation Modal (Requirements 1, 2, 3)
  const handleDeleteDoc = (doc: ScannedDocumentItem) => {
    setDocToDelete(doc);
  };

  // Execute Confirmed Document Deletion (Requirements 3, 4, 5, 6)
  const handleConfirmDelete = async (docId: string) => {
    // 1. Mark in deletedDocIdsRef so any in-flight OCR callback will be discarded immediately (Requirement 5)
    deletedDocIdsRef.current.add(docId);

    // 2. Remove from IndexedDB
    await deleteScannedDocument(docId);

    // 3. Update documents state
    const remaining = documentsRef.current.filter((d) => d.id !== docId && d.documentId !== docId);
    documentsRef.current = remaining;
    setDocuments(remaining);

    // 4. Update activeDocId if the deleted doc was currently selected
    if (activeDocId === docId) {
      setActiveDocId(remaining[0]?.id || remaining[0]?.documentId || null);
    }

    // 5. Recompute Unified Summary immediately with remaining documents (Requirement 6)
    setUnifiedSummary((prev) => buildUnifiedShipmentSummary(remaining, prev));

    // 6. Close delete confirmation modal
    setDocToDelete(null);
  };

  // Process a single document through OCR
  const processSingleDoc = async (doc: ScannedDocumentItem): Promise<ScannedDocumentItem> => {
    const docId = doc.id || doc.documentId || ('doc-' + Date.now());
    const docType = doc.docType || doc.documentType || 'INVOICE';

    // Guard: if user deleted document before processing, abort immediately (Requirement 5)
    if (deletedDocIdsRef.current.has(docId)) {
      return doc;
    }

    try {
      const ocrRes = await performOcr(
        doc.file || doc.originalUrl,
        (prog) => {
          if (deletedDocIdsRef.current.has(docId)) return;
          setDocuments((prev) => {
            const next = prev.map((d) =>
              d.id === docId || d.documentId === docId
                ? { ...d, progress: Math.round(prog.progress * 100), statusMessage: prog.status }
                : d
            );
            documentsRef.current = next;
            return next;
          });
        },
        { enableDeskew, enableSharpen, enableContrast },
        doc.currentPage || 1,
        doc.fileName,
        docType
      );

      // Guard: if user deleted document while OCR was processing (Requirement 5)
      if (deletedDocIdsRef.current.has(docId)) {
        console.log('Document was deleted during OCR execution, discarding result:', docId);
        return doc;
      }

      // Force document type on extracted result if specified by user
      const updatedOcrData: ExtractedShippingData = {
        ...ocrRes.data,
        documentType: docType,
      };

      const updatedDoc: ScannedDocumentItem = {
        ...doc,
        id: docId,
        documentId: docId,
        docType,
        documentType: docType,
        status: 'COMPLETED',
        ocrStatus: 'COMPLETED',
        progress: 100,
        ocrData: updatedOcrData,
        extractedFields: updatedOcrData,
        rawText: ocrRes.data.rawText,
        thumbnailUrl: ocrRes.processedImageUrl,
        statusMessage: 'OCR เสร็จสมบูรณ์',
        totalPages: ocrRes.totalPages || doc.totalPages || 1,
      };

      // Guard before saving
      if (deletedDocIdsRef.current.has(docId)) {
        return doc;
      }

      await saveScannedDocument(updatedDoc);
      return updatedDoc;
    } catch (err: any) {
      if (deletedDocIdsRef.current.has(docId)) {
        return doc;
      }
      console.error('OCR failed on document:', doc.fileName, err);
      const failedDoc: ScannedDocumentItem = {
        ...doc,
        id: docId,
        documentId: docId,
        status: 'ERROR',
        ocrStatus: 'ERROR',
        progress: 0,
        error: err?.message || 'เกิดข้อผิดพลาดในการประมวลผล',
        statusMessage: 'การอ่านข้อความล้มเหลว',
      };
      await saveScannedDocument(failedDoc);
      return failedDoc;
    }
  };

  // Run Sequential OCR Queue for all uploaded documents (Requirements 8-14)
  const runOcrQueue = async (customList?: ScannedDocumentItem[]) => {
    if (isQueueRunning) return;
    setIsQueueRunning(true);
    setSaveSuccess(false);

    const sourceList = customList && customList.length > 0 ? customList : [...documentsRef.current];
    if (sourceList.length === 0) {
      setIsQueueRunning(false);
      return;
    }

    const pendingDocs = sourceList.filter((d) => d.status === 'WAITING' || d.status === 'ERROR');
    const docsToProcess = pendingDocs.length > 0 ? pendingDocs : sourceList;

    console.log(`Starting OCR Queue for ${docsToProcess.length} document(s)...`);

    for (let i = 0; i < docsToProcess.length; i++) {
      const target = docsToProcess[i];
      const targetId = target.id || target.documentId!;

      // Skip if deleted during queue (Requirement 5)
      if (deletedDocIdsRef.current.has(targetId)) {
        continue;
      }

      setQueueStatusText(`กำลังประมวลผลเอกสารที่ ${i + 1} จาก ${docsToProcess.length}: ${target.fileName}...`);
      setQueueProgressPercent(Math.round((i / docsToProcess.length) * 100));

      // Mark processing in state
      setDocuments((prev) => {
        const next = prev.map((d) =>
          d.id === targetId || d.documentId === targetId
            ? { ...d, status: 'PROCESSING' as const, ocrStatus: 'PROCESSING' as const, progress: 10 }
            : d
        );
        documentsRef.current = next;
        return next;
      });

      // Run OCR sequentially with await to prevent memory overload on iPad (Requirement 10)
      const finished = await processSingleDoc(target);

      // Only save to state if not deleted (Requirement 5)
      if (!deletedDocIdsRef.current.has(targetId)) {
        setDocuments((prev) => {
          const next = prev.map((d) =>
            d.id === targetId || d.documentId === targetId ? finished : d
          );
          documentsRef.current = next;
          return next;
        });

        if (i === 0 || !activeDocId) {
          setActiveDocId(targetId);
        }

        // Incrementally update unified summary as documents finish
        setUnifiedSummary((prev) => buildUnifiedShipmentSummary(documentsRef.current, prev));
      }
    }

    setQueueStatusText(`ประมวลผลเอกสารทั้ง ${docsToProcess.length} ฉบับเสร็จสมบูรณ์`);
    setQueueProgressPercent(100);
    setIsQueueRunning(false);

    // Final unified summary synchronization (Requirement 15)
    setUnifiedSummary((prev) => buildUnifiedShipmentSummary(documentsRef.current, prev));
  };

  // Retry OCR for a single failed document (Requirement 14)
  const handleRetrySingleDoc = async (docId: string) => {
    const target = documentsRef.current.find((d) => d.id === docId || d.documentId === docId);
    if (!target || isQueueRunning) return;

    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === docId || d.documentId === docId
          ? { ...d, status: 'PROCESSING' as const, ocrStatus: 'PROCESSING' as const, progress: 10, error: undefined }
          : d
      );
      documentsRef.current = next;
      return next;
    });

    const finished = await processSingleDoc(target);

    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === docId || d.documentId === docId ? finished : d
      );
      documentsRef.current = next;
      return next;
    });

    setUnifiedSummary((prev) => buildUnifiedShipmentSummary(documentsRef.current, prev));
  };

  // Process just the active document
  const handleProcessActiveDocOnly = async () => {
    if (!activeDoc || isQueueRunning) return;
    setIsQueueRunning(true);
    const targetId = activeDoc.id || activeDoc.documentId!;

    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === targetId || d.documentId === targetId
          ? { ...d, status: 'PROCESSING' as const, ocrStatus: 'PROCESSING' as const, progress: 10 }
          : d
      );
      documentsRef.current = next;
      return next;
    });

    const finished = await processSingleDoc(activeDoc);
    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === targetId || d.documentId === targetId ? finished : d
      );
      documentsRef.current = next;
      return next;
    });

    setUnifiedSummary((prev) => buildUnifiedShipmentSummary(documentsRef.current, prev));
    setIsQueueRunning(false);
  };

  // Unified Shipment Summary Handlers (Requirements 18-24)
  const handleUpdateUnifiedField = <K extends keyof UnifiedShipmentSummary>(field: K, value: any) => {
    setUnifiedSummary((prev) => {
      const current = prev[field] as any;
      const updated = {
        ...prev,
        [field]: {
          ...current,
          value,
          isUserEdited: true,
          userVerified: true,
          sourceDocType: 'USER_MANUAL' as const,
          sourceDocName: 'แก้ไข/ยืนยันโดยผู้ใช้',
          hasConflict: false,
        },
      };
      return updated;
    });
  };

  const handleResolveConflict = <K extends keyof UnifiedShipmentSummary>(
    field: K,
    chosenValue: any,
    chosenDocName?: string
  ) => {
    setUnifiedSummary((prev) => {
      const current = prev[field] as any;
      const updated = {
        ...prev,
        [field]: {
          ...current,
          value: chosenValue,
          isUserEdited: true,
          userVerified: true,
          sourceDocType: 'USER_MANUAL' as const,
          sourceDocName: `ผู้ใช้เลือกค่าจาก ${chosenDocName || 'เอกสาร'}`,
          hasConflict: false,
        },
      };

      // Recalculate conflict total
      const fieldsToCheck: (keyof UnifiedShipmentSummary)[] = [
        'invoiceNo', 'invoiceDate', 'shipperName', 'consigneeName',
        'description', 'quantity', 'totalNetWeightKg', 'totalGrossWeightKg', 'containerNo'
      ];
      let confCount = 0;
      for (const f of fieldsToCheck) {
        const fObj = updated[f] as any;
        if (fObj?.hasConflict && !fObj.isUserEdited && !fObj.userVerified) {
          confCount++;
        }
      }
      updated.hasConflicts = confCount > 0;
      updated.conflictCount = confCount;

      return updated;
    });
  };

  // Save Complete Unified Shipment to IndexedDB (Requirements 24 & 26)
  const handleSaveUnifiedShipment = async () => {
    try {
      const now = new Date().toISOString();
      const shipmentId = 'shp-' + Date.now().toString(36);

      const shipment: Shipment = {
        id: shipmentId,
        invoiceNo: unifiedSummary.invoiceNo.value || ('INV-' + Date.now().toString(36).toUpperCase()),
        blNo: unifiedSummary.blNo.value || (unifiedSummary.containerNo.value ? `BL-${unifiedSummary.containerNo.value}` : ''),
        bookingNo: `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
        date: unifiedSummary.invoiceDate.value || now.split('T')[0],
        documentType: 'COMBINED',
        shipperName: unifiedSummary.shipperName.value || 'ไม่ระบุผู้ส่งออก',
        shipperAddress: '',
        consigneeName: unifiedSummary.consigneeName.value || 'ไม่ระบุผู้รับปลายทาง',
        consigneeAddress: '',
        pol: unifiedSummary.pol.value || 'Laem Chabang Port (THLCH)',
        pod: unifiedSummary.pod.value || 'Port of Discharge',
        vesselName: unifiedSummary.vesselName.value || 'MSC ADRIATIC',
        voyageNo: unifiedSummary.voyageNo.value || 'V.2610E',
        containerNo: unifiedSummary.containerNo.value || '',
        containerType: '40HC',
        sealNo: unifiedSummary.sealNo.value || '',
        currency: unifiedSummary.currency.value || 'USD',
        totalAmount: unifiedSummary.totalAmount.value || 0,
        totalGrossWeightKg: unifiedSummary.totalGrossWeightKg.value || 0,
        totalNetWeightKg: unifiedSummary.totalNetWeightKg.value || 0,
        totalCBM: 58.4,
        incoterm: 'CIF',
        status: 'BOOKED',
        notes: `ผสานข้อมูลจาก ${documents.length} เอกสารส่งออก (Invoice & Packing List) เมื่อ ${new Date().toLocaleDateString('th-TH')}`,
        documentIds: documents.map((d) => d.id),
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: 'itm-' + Date.now(),
            itemNo: 1,
            description: unifiedSummary.description.value || 'สินค้าส่งออก',
            qty: unifiedSummary.quantity.value || 1,
            unit: unifiedSummary.unit.value || 'Bags',
            unitPrice: unifiedSummary.unitPrice.value || 0,
            totalAmount: unifiedSummary.totalAmount.value || 0,
            packageCount: unifiedSummary.packageCount.value || 0,
            netWeightKg: unifiedSummary.totalNetWeightKg.value || 0,
            grossWeightKg: unifiedSummary.totalGrossWeightKg.value || 0,
          },
        ],
      };

      await saveShipment(shipment);

      // Auto create container tracking if requested
      if (autoCreateContainer && unifiedSummary.containerNo.value) {
        const newTracking: ContainerTracking = {
          id: 'cnt-' + Date.now().toString(36),
          containerNo: unifiedSummary.containerNo.value,
          blNo: shipment.blNo || `BL-${unifiedSummary.containerNo.value}`,
          bookingNo: shipment.bookingNo || '',
          shippingLine: 'MSC',
          vesselName: unifiedSummary.vesselName.value || 'MSC ADRIATIC',
          voyage: unifiedSummary.voyageNo.value || 'V.2610E',
          containerType: '40HC',
          pol: unifiedSummary.pol.value || 'Laem Chabang Port (THLCH)',
          pod: unifiedSummary.pod.value || 'Port of Discharge',
          etd: `${unifiedSummary.invoiceDate.value || now.split('T')[0]} 18:00`,
          eta: '2026-11-20 08:00',
          currentStatus: 'CUSTOMS_CLEARED',
          progressPercent: 20,
          currentLocationName: `ลานตรวจปล่อยท่าเรือ ${unifiedSummary.pol.value || 'Laem Chabang'}`,
          currentCoordinates: { lat: 13.08, lng: 100.88 },
          speedKnots: 0,
          weatherStatus: 'พร้อมโหลดขึ้นเรือสินค้า',
          isReefer: false,
          updatedAt: new Date().toLocaleTimeString('th-TH'),
          seaRoute: [
            { name: unifiedSummary.pol.value || 'ท่าเรือต้นทาง', lat: 13.08, lng: 100.88, status: 'current', timestamp: 'ตรวจปล่อย' },
            { name: unifiedSummary.pod.value || 'ท่าเรือปลายทาง', lat: 33.74, lng: -118.26, status: 'upcoming', timestamp: 'ETA' },
          ],
          milestones: [
            { id: 'm-new-1', title: 'ตรวจปล่อยพิธีการศุลกากรเรียบร้อย', location: unifiedSummary.pol.value || 'Laem Chabang', timestamp: 'เสร็จสมบูรณ์', status: 'completed' },
            { id: 'm-new-2', title: 'ตู้เข้าลานรอขึ้นเรือ', location: unifiedSummary.pol.value || 'Terminal Yard', timestamp: 'กำลังดำเนินการ', status: 'in_progress' },
          ],
        };
        await saveContainer(newTracking);
      }

      setSaveSuccess(true);
      onShipmentSaved(shipment);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Error saving unified shipment to IndexedDB:', err);
    }
  };

  // 1-Click Multi-Document Bundles (Requirements 28, 29, 30)
  const handleLoadSampleBundle = async (bundleType: 'MATCHING_RICE' | 'NO_WEIGHT_TEST' | 'DISCREPANCY_TEST') => {
    setActiveBundleName(bundleType);

    if (bundleType === 'MATCHING_RICE') {
      // Test 1: Invoice + Packing List matching 100%
      const invSample = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-agri-rice')!;
      const plSample = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-agri-pl-match')!;

      const id1 = 'doc-inv-' + Date.now();
      const id2 = 'doc-pl-' + (Date.now() + 1);

      const doc1: ScannedDocumentItem = {
        id: id1,
        documentId: id1,
        fileName: 'Commercial_Invoice_TH0891.png',
        fileSize: 420000,
        fileType: 'image/png',
        docType: 'INVOICE',
        documentType: 'INVOICE',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: invSample.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const doc2: ScannedDocumentItem = {
        id: id2,
        documentId: id2,
        fileName: 'Packing_List_TH0891.png',
        fileSize: 395000,
        fileType: 'image/png',
        docType: 'PACKING_LIST',
        documentType: 'PACKING_LIST',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: plSample.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const bundle = [doc1, doc2];
      setDocuments(bundle);
      documentsRef.current = bundle;
      setActiveDocId(id1);

      await saveScannedDocument(doc1);
      await saveScannedDocument(doc2);

      // Execute sequential OCR on both documents immediately
      runOcrQueue(bundle);

    } else if (bundleType === 'NO_WEIGHT_TEST') {
      // Test 2 (Requirement 29): Invoice has NO Gross Weight, Packing List HAS Gross Weight
      const invSample = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-rice-no-weight')!;
      const plSample = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-agri-pl-match')!;

      const id1 = 'doc-inv-' + Date.now();
      const id2 = 'doc-pl-' + (Date.now() + 1);

      const doc1: ScannedDocumentItem = {
        id: id1,
        documentId: id1,
        fileName: 'Invoice_TH0891_NoGrossWeight.png',
        fileSize: 410000,
        fileType: 'image/png',
        docType: 'INVOICE',
        documentType: 'INVOICE',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: invSample.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const doc2: ScannedDocumentItem = {
        id: id2,
        documentId: id2,
        fileName: 'Packing_List_TH0891.png',
        fileSize: 395000,
        fileType: 'image/png',
        docType: 'PACKING_LIST',
        documentType: 'PACKING_LIST',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: plSample.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const bundle = [doc1, doc2];
      setDocuments(bundle);
      documentsRef.current = bundle;
      setActiveDocId(id1);

      await saveScannedDocument(doc1);
      await saveScannedDocument(doc2);

      runOcrQueue(bundle);

    } else if (bundleType === 'DISCREPANCY_TEST') {
      // Test 3 (Requirement 30): Quantity Mismatch between Invoice and Packing List
      const invSample = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-agri-rice')!;
      const plMismatch = SAMPLE_DOCUMENTS.find((d) => d.id === 'sample-agri-pl-mismatch')!;

      const id1 = 'doc-inv-' + Date.now();
      const id2 = 'doc-pl-' + (Date.now() + 1);

      const doc1: ScannedDocumentItem = {
        id: id1,
        documentId: id1,
        fileName: 'Invoice_TH0891_Original.png',
        fileSize: 420000,
        fileType: 'image/png',
        docType: 'INVOICE',
        documentType: 'INVOICE',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: invSample.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const doc2: ScannedDocumentItem = {
        id: id2,
        documentId: id2,
        fileName: 'Packing_List_TH0891_Discrepant.png',
        fileSize: 398000,
        fileType: 'image/png',
        docType: 'PACKING_LIST',
        documentType: 'PACKING_LIST',
        status: 'WAITING',
        ocrStatus: 'WAITING',
        progress: 0,
        originalUrl: plMismatch.getImageUrl(),
        uploadedAt: new Date().toLocaleTimeString('th-TH'),
      };

      const bundle = [doc1, doc2];
      setDocuments(bundle);
      documentsRef.current = bundle;
      setActiveDocId(id1);

      await saveScannedDocument(doc1);
      await saveScannedDocument(doc2);

      runOcrQueue(bundle);
    }
  };

  // Modify Active Document's Extracted Fields
  const updateActiveDocField = <K extends keyof ExtractedShippingData>(key: K, value: ExtractedShippingData[K]) => {
    if (!activeDoc || !activeDoc.ocrData) return;
    const updatedData: ExtractedShippingData = {
      ...activeDoc.ocrData,
      [key]: value,
    };
    const updatedDoc: ScannedDocumentItem = {
      ...activeDoc,
      ocrData: updatedData,
    };
    setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d)));
    saveScannedDocument(updatedDoc);
  };

  // Update Line Items for Active Document
  const updateActiveDocItem = (index: number, field: keyof LineItem, val: any) => {
    if (!activeDoc || !activeDoc.ocrData) return;
    const items = [...activeDoc.ocrData.items];
    items[index] = { ...items[index], [field]: val };

    if (field === 'qty' || field === 'unitPrice') {
      const q = field === 'qty' ? parseFloat(val) || 0 : items[index].qty;
      const p = field === 'unitPrice' ? parseFloat(val) || 0 : items[index].unitPrice;
      items[index].totalAmount = Number((q * p).toFixed(2));
    }

    const newItemsSum = items.reduce((s, itm) => s + (itm.totalAmount || 0), 0);
    const diff = Math.abs(newItemsSum - activeDoc.ocrData.totalAmount);

    const updatedData: ExtractedShippingData = {
      ...activeDoc.ocrData,
      items,
      mathValidation: {
        ...activeDoc.ocrData.mathValidation,
        itemsSum: Number(newItemsSum.toFixed(2)),
        difference: Number(diff.toFixed(2)),
        isMatch: diff <= 0.05,
      },
    };

    const updatedDoc: ScannedDocumentItem = {
      ...activeDoc,
      ocrData: updatedData,
    };

    setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d)));
    saveScannedDocument(updatedDoc);
  };

  // Add / Remove items in active document
  const addActiveDocItemRow = () => {
    if (!activeDoc || !activeDoc.ocrData) return;
    const newItem: LineItem = {
      id: 'itm-' + (activeDoc.ocrData.items.length + 1),
      itemNo: activeDoc.ocrData.items.length + 1,
      description: 'สินค้าส่งออกเพิ่มเติม (New Cargo Item)',
      hsCode: '1006.30.90',
      qty: 100,
      unit: 'Bags',
      unitPrice: 25.0,
      totalAmount: 2500.0,
      packageCount: 100,
      netWeightKg: 2500,
      grossWeightKg: 2550,
    };
    const items = [...activeDoc.ocrData.items, newItem];
    const newItemsSum = items.reduce((s, itm) => s + itm.totalAmount, 0);

    const updatedData: ExtractedShippingData = {
      ...activeDoc.ocrData,
      items,
      mathValidation: {
        ...activeDoc.ocrData.mathValidation,
        itemsSum: Number(newItemsSum.toFixed(2)),
      },
    };
    const updatedDoc: ScannedDocumentItem = { ...activeDoc, ocrData: updatedData };
    setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d)));
    saveScannedDocument(updatedDoc);
  };

  const removeActiveDocItemRow = (index: number) => {
    if (!activeDoc || !activeDoc.ocrData) return;
    const items = activeDoc.ocrData.items.filter((_, i) => i !== index);
    const newItemsSum = items.reduce((s, itm) => s + itm.totalAmount, 0);
    const updatedData: ExtractedShippingData = {
      ...activeDoc.ocrData,
      items,
      mathValidation: {
        ...activeDoc.ocrData.mathValidation,
        itemsSum: Number(newItemsSum.toFixed(2)),
      },
    };
    const updatedDoc: ScannedDocumentItem = { ...activeDoc, ocrData: updatedData };
    setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? updatedDoc : d)));
    saveScannedDocument(updatedDoc);
  };

  // Save Complete Dossier to Shipment Register in IndexedDB (Requirement 13)
  const handleSaveDossierToShipment = async () => {
    if (!activeDoc || !activeDoc.ocrData) return;

    try {
      const shipment = convertOcrToShipment(activeDoc.ocrData, activeDoc.thumbnailUrl || activeDoc.originalUrl);
      shipment.documentIds = documents.map((d) => d.id);
      await saveShipment(shipment);

      // Auto create container tracking if requested
      if (autoCreateContainer && activeDoc.ocrData.containerNo) {
        const newTracking: ContainerTracking = {
          id: 'cnt-' + Date.now().toString(36),
          containerNo: activeDoc.ocrData.containerNo,
          blNo: activeDoc.ocrData.blNo || `BL-${activeDoc.ocrData.containerNo}`,
          bookingNo: activeDoc.ocrData.bookingNo || `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
          shippingLine: 'MSC',
          vesselName: activeDoc.ocrData.vesselName || 'MSC ADRIATIC',
          voyage: activeDoc.ocrData.voyageNo || 'V.2610E',
          containerType: shipment.containerType,
          pol: activeDoc.ocrData.pol || 'Laem Chabang Port (THLCH)',
          pod: activeDoc.ocrData.pod || 'Port of Discharge',
          etd: `${activeDoc.ocrData.invoiceDate || new Date().toISOString().split('T')[0]} 18:00`,
          eta: '2026-11-20 08:00',
          currentStatus: 'CUSTOMS_CLEARED',
          progressPercent: 20,
          currentLocationName: `ลานตรวจปล่อยท่าเรือ ${activeDoc.ocrData.pol || 'Laem Chabang'}`,
          currentCoordinates: { lat: 13.08, lng: 100.88 },
          speedKnots: 0,
          weatherStatus: 'พร้อมโหลดขึ้นเรือสินค้า',
          isReefer: false,
          updatedAt: new Date().toLocaleTimeString('th-TH'),
          seaRoute: [
            { name: activeDoc.ocrData.pol || 'ท่าเรือต้นทาง', lat: 13.08, lng: 100.88, status: 'current', timestamp: 'ตรวจปล่อย' },
            { name: activeDoc.ocrData.pod || 'ท่าเรือปลายทาง', lat: 33.74, lng: -118.26, status: 'upcoming', timestamp: 'ETA' },
          ],
          milestones: [
            { id: 'm-new-1', title: 'ตรวจปล่อยพิธีการศุลกากรเรียบร้อย', location: activeDoc.ocrData.pol || 'Laem Chabang', timestamp: 'เสร็จสมบูรณ์', status: 'completed' },
            { id: 'm-new-2', title: 'ตู้เข้าลานรอขึ้นเรือ', location: activeDoc.ocrData.pol || 'Terminal Yard', timestamp: 'กำลังดำเนินการ', status: 'in_progress' },
          ],
        };
        await saveContainer(newTracking);
      }

      setSaveSuccess(true);
      onShipmentSaved(shipment);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving shipment to IndexedDB:', err);
    }
  };

  const renderConfidenceBadge = (confidence: number, isMissing: boolean) => {
    if (isMissing) {
      return (
        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>ไม่พบข้อมูล</span>
        </span>
      );
    }
    if (confidence >= 80) {
      return (
        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          {confidence}% แม่นยำสูง
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
        <span>{confidence}% แนะนำตรวจสอบ</span>
      </span>
    );
  };

  // Check if cross-check can be performed (at least 1 invoice and 1 packing list)
  const hasInvoices = documents.some((d) => d.docType === 'INVOICE' || d.docType === 'COMBINED');
  const hasPackingLists = documents.some((d) => d.docType === 'PACKING_LIST' || d.docType === 'COMBINED');
  const canCrossCheck = hasInvoices && hasPackingLists && documents.some((d) => d.status === 'COMPLETED');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Hidden File Input supporting multiple files (Requirements 2 & 15) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
        onChange={handleMultipleFilesSelected}
        className="hidden"
      />

      {/* Top Banner and Multi-Doc Action Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-1">
              <span>Multi-Document Maritime OCR Suite</span>
              <span aria-hidden="true">·</span>
              <span>Sequential Tesseract Queue</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ระบบสแกนหลายเอกสารและการตรวจสอบข้อมูลข้ามเอกสาร
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              อัปโหลดเอกสารได้หลายไฟล์พร้อมกัน (Invoice, Packing List, B/L) ประมวลผลแยกอิสระ และตรวจสอบความสอดคล้องของน้ำหนัก จำนวนตู้ และรายการสินค้าข้ามเอกสารได้ทันที
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Button 1: Add More Documents (Requirement 2) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs min-h-[44px]"
            >
              <FolderPlus className="w-4 h-4 text-sky-400" />
              <span>+ เพิ่มเอกสาร (เลือกได้หลายไฟล์)</span>
            </button>

            {/* Button 2: Process All OCR Queue (Requirement 4 & 5) */}
            <button
              onClick={() => runOcrQueue()}
              disabled={documents.length === 0 || isQueueRunning}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs min-h-[44px]"
            >
              {isQueueRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Play className="w-4 h-4 fill-current text-white" />
              )}
              <span>{isQueueRunning ? 'กำลังอ่าน OCR ในคิว...' : 'อ่านเอกสารทั้งหมด'}</span>
            </button>

            {/* Button 3: Cross-Document Reconciliation (Requirement 10) */}
            <button
              onClick={() => setShowCrossCheckModal(true)}
              disabled={!canCrossCheck}
              className={`px-4 py-2.5 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs min-h-[44px] ${
                canCrossCheck
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white ring-2 ring-emerald-300'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>ตรวจสอบข้อมูลข้ามเอกสาร (Cross-Check)</span>
            </button>

          </div>
        </div>

        {/* 1-Click Multi-Document Testing Bundles (Requirements 28, 29, 30) */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">ชุดทดสอบหลายเอกสารสำเร็จรูป:</span>
            
            <button
              onClick={() => handleLoadSampleBundle('MATCHING_RICE')}
              disabled={isQueueRunning}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                activeBundleName === 'MATCHING_RICE'
                  ? 'bg-emerald-900 text-emerald-200 border-emerald-800'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ชุดที่ 1: ข้าวไทย (ตรงกัน 100%)</span>
            </button>

            <button
              onClick={() => handleLoadSampleBundle('NO_WEIGHT_TEST')}
              disabled={isQueueRunning}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                activeBundleName === 'NO_WEIGHT_TEST'
                  ? 'bg-sky-900 text-sky-200 border-sky-800'
                  : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>ชุดที่ 2: ทดสอบ Auto-Fill (Invoice ขาด Gross Wt -&gt; ดึงจาก Packing List)</span>
            </button>

            <button
              onClick={() => handleLoadSampleBundle('DISCREPANCY_TEST')}
              disabled={isQueueRunning}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                activeBundleName === 'DISCREPANCY_TEST'
                  ? 'bg-rose-900 text-rose-200 border-rose-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>ชุดที่ 3: ทดสอบแจ้งเตือนส่วนต่าง (Quantity Mismatch Alert)</span>
            </button>
          </div>

          <div className="text-slate-500">
            เอกสารทั้งหมดในชุด: <strong className="font-mono text-slate-900">{documents.length}</strong> ฉบับ
          </div>
        </div>

        {/* Queue Progress Bar if running */}
        {isQueueRunning && (
          <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between font-medium text-sky-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                <span>{queueStatusText}</span>
              </span>
              <span className="font-mono font-bold">{queueProgressPercent}%</span>
            </div>
            <div className="w-full bg-sky-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-600 h-full transition-all duration-300"
                style={{ width: `${queueProgressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents Management Strip (Requirement 5) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span className="text-sm font-bold text-slate-900">
              รายการเอกสารการส่งออกในชุดนี้ (Export Dossier Documents - {documents.length})
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มเอกสารอีก</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-sky-50/30 transition-all flex flex-col items-center justify-center min-h-[160px]"
          >
            <UploadCloud className="w-10 h-10 text-sky-600 mb-2" />
            <div className="text-sm font-semibold text-slate-800">
              ยังไม่มีเอกสารในชุดนี้ คลิกเพื่อเลือกไฟล์ได้หลายไฟล์พร้อมกัน
            </div>
            <div className="text-xs text-slate-500 mt-1">
              รองรับไฟล์ PDF, JPG, PNG หรือคลิกปุ่มชุดทดสอบด้านบน
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.map((doc) => {
              const isSelected = activeDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-50/60 border-sky-500 ring-2 ring-sky-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-xs text-slate-900 truncate" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                      </div>
                      
                      {/* Delete button (Requirements 1-3) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="ลบเอกสารนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>ขนาด: {(doc.fileSize / 1024).toFixed(0)} KB</span>
                      <span>{doc.uploadedAt}</span>
                    </div>

                    {/* Document Type Selector (Requirement 3) */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] font-semibold text-slate-600">ประเภท:</span>
                      <select
                        value={doc.docType}
                        onChange={(e) => handleChangeDocType(doc.id, e.target.value as DocumentType)}
                        className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800"
                      >
                        <option value="INVOICE">Commercial Invoice</option>
                        <option value="PACKING_LIST">Packing List</option>
                        <option value="BILL_OF_LADING">Bill of Lading (B/L)</option>
                        <option value="OTHER">Other Document</option>
                      </select>
                    </div>
                  </div>

                  {/* OCR Status Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      {doc.status === 'COMPLETED' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OCR สำเร็จ ({doc.ocrData?.confidence || 90}%)</span>
                        </span>
                      ) : doc.status === 'PROCESSING' ? (
                        <span className="text-sky-700 font-medium flex items-center gap-1 text-[11px]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>กำลังอ่าน ({doc.progress}%)</span>
                        </span>
                      ) : doc.status === 'ERROR' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>ข้อผิดพลาด</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetrySingleDoc(doc.id);
                            }}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition-colors"
                          >
                            ลองใหม่
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium text-[11px]">
                          รอการประมวลผล (Waiting)
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-sky-700">
                      {isSelected ? 'กำลังดู' : 'คลิกเพื่อดู'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Two-Column Viewport for Selected Document */}
      {activeDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 Cols): Selected Document Viewer */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 truncate max-w-[240px]">
                  <span className="text-xs font-semibold text-slate-800 truncate" title={activeDoc.fileName}>
                    {activeDoc.fileName}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {activeDoc.docType}
                  </span>
                </div>

                {activeDoc.thumbnailUrl && (
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded">
                    <button
                      onClick={() => setViewMode('ORIGINAL')}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                        viewMode === 'ORIGINAL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                      }`}
                    >
                      เดิม
                    </button>
                    <button
                      onClick={() => setViewMode('PREPROCESSED')}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                        viewMode === 'PREPROCESSED' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                      }`}
                    >
                      Preprocessed
                    </button>
                  </div>
                )}
              </div>

              {/* Zoom Toolbar */}
              <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-700"
                    title="ย่อ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] w-12 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 20))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-700"
                    title="ขยาย"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="text-[11px] text-sky-600 hover:text-sky-800 px-1 font-medium"
                  >
                    Fit
                  </button>
                </div>

                <button
                  onClick={handleProcessActiveDocOnly}
                  disabled={isQueueRunning}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>อ่าน OCR เฉพาะไฟล์นี้</span>
                </button>
              </div>

              {/* Viewport Frame */}
              <div className="relative rounded-lg overflow-auto border border-slate-200 bg-slate-900 max-h-[520px] flex items-center justify-center p-2 mt-2">
                <img
                  src={viewMode === 'ORIGINAL' ? activeDoc.originalUrl : activeDoc.thumbnailUrl || activeDoc.originalUrl}
                  alt={activeDoc.fileName}
                  className="max-w-none transition-all duration-200 object-contain shadow-md"
                  style={{ width: `${zoomLevel}%` }}
                />

                {activeDoc.status === 'PROCESSING' && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white z-10">
                    <RefreshCw className="w-9 h-9 text-sky-400 animate-spin mb-3" />
                    <div className="text-sm font-semibold text-white">กำลังอ่านข้อความ OCR...</div>
                    <div className="text-xs text-slate-400 mt-1 tabular-nums">{activeDoc.progress}%</div>
                  </div>
                )}
              </div>

              {/* Debug Toggle */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>ขนาด: {(activeDoc.fileSize / 1024).toFixed(0)} KB</span>
                {activeDoc.ocrData && (
                  <button
                    onClick={() => setShowDebugView(!showDebugView)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{showDebugView ? 'ซ่อน Debug' : 'Debug View'}</span>
                  </button>
                )}
              </div>

              {/* Debug Panel */}
              {showDebugView && activeDoc.ocrData && (
                <div className="mt-3 bg-slate-950 text-slate-200 rounded-lg p-3 text-xs space-y-2 border border-slate-800 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-sky-400 border-b border-slate-800 pb-1">
                    <span>ความมั่นใจรวม: {activeDoc.ocrData.confidence}%</span>
                    <span>มุมเอียง: {activeDoc.ocrData.preprocessingStats.deskewAngle}°</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto text-[10px] text-slate-300 whitespace-pre-wrap">
                    {activeDoc.ocrData.rawText}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column (7 Cols): Editable Fields for Selected Document */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ข้อมูลของเอกสาร: <span className="text-sky-700">{activeDoc.fileName}</span>
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>ประเภท: <strong className="text-slate-800">{activeDoc.docType}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>สถานะ: <strong>{activeDoc.status}</strong></span>
                  </div>
                </div>

                {activeDoc.ocrData && (
                  <button
                    onClick={handleSaveDossierToShipment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 min-h-[40px]"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกทั้งชุดส่งออกลง IndexedDB</span>
                  </button>
                )}
              </div>

              {saveSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>บันทึกชุดเอกสารการส่งออกและตู้คอนเทนเนอร์เข้า IndexedDB เรียบร้อยแล้ว!</span>
                </div>
              )}

              {!activeDoc.ocrData ? (
                <div className="py-16 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-semibold text-slate-700">เอกสารนี้ยังไม่ได้อ่าน OCR</div>
                  <div className="text-xs text-slate-400 mt-1 mb-4">
                    กดปุ่มด้านล่างเพื่อเริ่มอ่านข้อมูลเฉพาะไฟล์นี้ หรือกด "ประมวลผล OCR ทั้งหมด" ที่ด้านบน
                  </div>
                  <button
                    onClick={handleProcessActiveDocOnly}
                    disabled={isQueueRunning}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    เริ่มอ่าน OCR ไฟล์นี้
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  
                  {/* Math Cross-Check Card if Invoice */}
                  {activeDoc.docType === 'INVOICE' && (
                    <div className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      activeDoc.ocrData.mathValidation.isMatch
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <Calculator className="w-4 h-4" />
                          <span>ตรวจสอบ Qty × Unit Price เทียบกับ Total Amount</span>
                        </div>
                        <div className="text-[11px] leading-relaxed">
                          {activeDoc.ocrData.mathValidation.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          {activeDoc.docType === 'PACKING_LIST' ? 'เลขที่ Packing List' : 'เลขที่ Invoice No.'}
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.invoiceNo, !activeDoc.ocrData.invoiceNo)}
                      </div>
                      <input
                        type="text"
                        value={activeDoc.ocrData.invoiceNo}
                        placeholder="ไม่พบข้อมูล - กรุณาระบุ"
                        onChange={(e) => updateActiveDocField('invoiceNo', e.target.value)}
                        className={`w-full text-xs font-mono font-medium border rounded-lg p-2 ${
                          !activeDoc.ocrData.invoiceNo ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          วันที่ออกเอกสาร (Date)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.invoiceDate, !activeDoc.ocrData.invoiceDate)}
                      </div>
                      <input
                        type="text"
                        value={activeDoc.ocrData.invoiceDate}
                        placeholder="ไม่พบข้อมูล - กรุณาระบุ"
                        onChange={(e) => updateActiveDocField('invoiceDate', e.target.value)}
                        className={`w-full text-xs border rounded-lg p-2 ${
                          !activeDoc.ocrData.invoiceDate ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        สกุลเงิน
                      </label>
                      <select
                        value={activeDoc.ocrData.currency}
                        onChange={(e) => updateActiveDocField('currency', e.target.value as any)}
                        className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="THB">THB (฿)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                    </div>
                  </div>

                  {/* Shipper & Consignee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          ผู้ส่งออก (Shipper / Exporter)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.shipperName, !activeDoc.ocrData.shipperName)}
                      </div>
                      <textarea
                        rows={2}
                        value={activeDoc.ocrData.shipperName}
                        placeholder="ไม่พบข้อมูล - กรุณาระบุชื่อผู้ส่งออก"
                        onChange={(e) => updateActiveDocField('shipperName', e.target.value)}
                        className={`w-full text-xs border rounded-lg p-2 ${
                          !activeDoc.ocrData.shipperName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          ผู้รับปลายทาง (Consignee / Buyer)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.consigneeName, !activeDoc.ocrData.consigneeName)}
                      </div>
                      <textarea
                        rows={2}
                        value={activeDoc.ocrData.consigneeName}
                        placeholder="ไม่พบข้อมูล - กรุณาระบุชื่อผู้รับปลายทาง"
                        onChange={(e) => updateActiveDocField('consigneeName', e.target.value)}
                        className={`w-full text-xs border rounded-lg p-2 ${
                          !activeDoc.ocrData.consigneeName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Container & Seal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-sky-50/60 p-3.5 rounded-lg border border-sky-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-sky-950 uppercase">
                          หมายเลขตู้ (Container No.)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.containerNo, !activeDoc.ocrData.containerNo)}
                      </div>
                      <input
                        type="text"
                        value={activeDoc.ocrData.containerNo}
                        placeholder="ไม่พบหมายเลขตู้"
                        onChange={(e) => updateActiveDocField('containerNo', e.target.value.toUpperCase())}
                        className="w-full text-xs font-mono font-bold text-sky-950 border border-sky-300 rounded-lg p-2 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-sky-950 uppercase">
                          หมายเลขซีล (Seal No.)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.sealNo, !activeDoc.ocrData.sealNo)}
                      </div>
                      <input
                        type="text"
                        value={activeDoc.ocrData.sealNo}
                        placeholder="ไม่พบหมายเลขซีล"
                        onChange={(e) => updateActiveDocField('sealNo', e.target.value)}
                        className="w-full text-xs font-mono border border-sky-300 rounded-lg p-2 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-sky-950 uppercase mb-1">
                        เลข B/L หรือ Booking
                      </label>
                      <input
                        type="text"
                        value={activeDoc.ocrData.blNo}
                        placeholder="ไม่พบเลข B/L"
                        onChange={(e) => updateActiveDocField('blNo', e.target.value)}
                        className="w-full text-xs font-mono border border-sky-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">
                        รายการสินค้า ({activeDoc.ocrData.items.length} รายการ)
                      </span>
                      <button
                        onClick={addActiveDocItemRow}
                        className="text-xs font-medium text-sky-700 hover:text-sky-900 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มรายการสินค้า</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                            <th className="py-2 px-2.5 w-8 text-center">#</th>
                            <th className="py-2 px-2.5">คำอธิบายสินค้า</th>
                            <th className="py-2 px-2.5 w-24">HS Code</th>
                            <th className="py-2 px-2.5 w-20">จำนวน</th>
                            <th className="py-2 px-2.5 w-20">หน่วย</th>
                            {activeDoc.docType !== 'PACKING_LIST' && (
                              <>
                                <th className="py-2 px-2.5 w-24 text-right">ราคา/หน่วย</th>
                                <th className="py-2 px-2.5 w-28 text-right">รวมเงิน</th>
                              </>
                            )}
                            <th className="py-2 px-2.5 w-10 text-center">ลบ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeDoc.ocrData.items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateActiveDocItem(idx, 'description', e.target.value)}
                                  className="w-full p-1 text-xs border border-transparent hover:border-slate-300 rounded"
                                />
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={item.hsCode || ''}
                                  onChange={(e) => updateActiveDocItem(idx, 'hsCode', e.target.value)}
                                  className="w-full p-1 text-xs font-mono border border-transparent hover:border-slate-300 rounded"
                                />
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateActiveDocItem(idx, 'qty', e.target.value)}
                                  className="w-full p-1 text-xs font-mono border border-transparent hover:border-slate-300 rounded"
                                />
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => updateActiveDocItem(idx, 'unit', e.target.value)}
                                  className="w-full p-1 text-xs border border-transparent hover:border-slate-300 rounded"
                                />
                              </td>
                              {activeDoc.docType !== 'PACKING_LIST' && (
                                <>
                                  <td className="py-1.5 px-2.5 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => updateActiveDocItem(idx, 'unitPrice', e.target.value)}
                                      className="w-full p-1 text-xs text-right font-mono border border-transparent hover:border-slate-300 rounded"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-900">
                                    {activeDoc.ocrData?.currency} {item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </>
                              )}
                              <td className="py-1.5 px-2.5 text-center">
                                <button
                                  onClick={() => removeActiveDocItemRow(idx)}
                                  className="text-slate-400 hover:text-red-600 p-1"
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

                  {/* Weights, Packages and Totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          Net Weight (กก.)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.netWeight, activeDoc.ocrData.totalNetWeightKg === 0)}
                      </div>
                      <input
                        type="number"
                        value={activeDoc.ocrData.totalNetWeightKg || ''}
                        placeholder="0"
                        onChange={(e) => updateActiveDocField('totalNetWeightKg', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          Gross Weight (กก.)
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.grossWeight, activeDoc.ocrData.totalGrossWeightKg === 0)}
                      </div>
                      <input
                        type="number"
                        value={activeDoc.ocrData.totalGrossWeightKg || ''}
                        placeholder="0"
                        onChange={(e) => updateActiveDocField('totalGrossWeightKg', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 uppercase">
                          จำนวนหีบห่อ (Packages)
                        </label>
                      </div>
                      <input
                        type="number"
                        value={activeDoc.ocrData.packageCount || ''}
                        placeholder="0"
                        onChange={(e) => updateActiveDocField('packageCount', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-900 uppercase">
                          ยอดรวม ({activeDoc.ocrData.currency})
                        </label>
                        {renderConfidenceBadge(activeDoc.ocrData.fieldConfidences.totalAmount, activeDoc.ocrData.totalAmount === 0)}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={activeDoc.ocrData.totalAmount || ''}
                        placeholder="0.00"
                        onChange={(e) => updateActiveDocField('totalAmount', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono font-bold text-sky-800 border border-sky-300 rounded p-1.5 bg-white"
                      />
                    </div>
                  </div>

                  {/* Auto Container Tracking Checkbox */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="autoTrackBox2"
                      checked={autoCreateContainer}
                      onChange={(e) => setAutoCreateContainer(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                    />
                    <label htmlFor="autoTrackBox2" className="text-xs text-slate-700 cursor-pointer">
                      สร้างข้อมูลจำลองเพื่อติดตามตู้คอนเทนเนอร์นี้ในระบบ Container Tracking ทันที
                    </label>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSaveDossierToShipment}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      <span>บันทึกชุดเอกสารส่งออกนี้เข้าสู่ระบบ SeaExport AI (IndexedDB)</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* Cross-Document Reconciliation Modal (Requirement 10, 11, 12) */}
      {showCrossCheckModal && (
        <CrossDocModal
          documents={documents}
          onClose={() => setShowCrossCheckModal(false)}
        />
      )}

    </div>
  );
};
