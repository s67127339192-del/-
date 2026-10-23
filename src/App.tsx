import React, { useState, useEffect } from 'react';
import { 
  initDB, 
  getShipments, 
  getContainers, 
  getCalculations 
} from './services/db';
import { Shipment, ContainerTracking, ExportCalculation } from './types';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { OcrScanner } from './components/OcrScanner';
import { ContainerTrackingView } from './components/ContainerTrackingView';
import { CostCalculator } from './components/CostCalculator';
import { ReportsView } from './components/ReportsView';
import { ShipmentModal } from './components/ShipmentModal';
import { Ship, Anchor, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Data states from IndexedDB
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [containers, setContainers] = useState<ContainerTracking[]>([]);
  const [calculations, setCalculations] = useState<ExportCalculation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active detail modal
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedContainerNoForTracking, setSelectedContainerNoForTracking] = useState<string | undefined>(undefined);

  // Load IndexedDB on mount
  const refreshAllData = async () => {
    try {
      await initDB();
      const [sData, cData, kData] = await Promise.all([
        getShipments(),
        getContainers(),
        getCalculations()
      ]);
      setShipments(sData);
      setContainers(cData);
      setCalculations(kData);
    } catch (err) {
      console.error('Failed to initialize or fetch IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleOpenTrackingForContainer = (containerNo: string) => {
    setSelectedContainerNoForTracking(containerNo);
    setActiveTab('tracking');
  };

  const handleShipmentSaved = async (newShipment: Shipment) => {
    await refreshAllData();
    // Prompt to view
    setSelectedShipment(newShipment);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 animate-pulse mb-4">
          <Ship className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-white tracking-wide">
          กำลังเตรียมฐานข้อมูล SeaExport AI...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          IndexedDB Local Storage Initializing
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Strict 3-Zone Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenQuickScan={() => {
          setActiveTab('ocr');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            shipments={shipments}
            containers={containers}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectShipment={(shp) => setSelectedShipment(shp)}
            onSelectContainer={(cntNo) => handleOpenTrackingForContainer(cntNo)}
          />
        )}

        {activeTab === 'ocr' && (
          <OcrScanner
            onShipmentSaved={handleShipmentSaved}
          />
        )}

        {activeTab === 'tracking' && (
          <ContainerTrackingView
            containers={containers}
            selectedContainerNo={selectedContainerNoForTracking}
            onRefreshData={refreshAllData}
          />
        )}

        {activeTab === 'calculator' && (
          <CostCalculator
            savedCalculations={calculations}
            onCalculationSaved={refreshAllData}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            shipments={shipments}
            containers={containers}
            calculations={calculations}
            onDataResetOrImported={refreshAllData}
          />
        )}

      </main>

      {/* Shipment Details & Edit Modal */}
      {selectedShipment && (
        <ShipmentModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onShipmentUpdated={refreshAllData}
          onNavigateTracking={handleOpenTrackingForContainer}
        />
      )}

      {/* Clean Domain Footer (No AI Slop / No fake telemetry) */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-800 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          <div className="flex items-center gap-2 text-slate-300">
            <Anchor className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white">SeaExport AI</span>
            <span>·</span>
            <span>ระบบบริหารจัดการการส่งออกทางทะเลและ OCR สากล</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>ฐานข้อมูล IndexedDB ในตัวเครื่อง (100% Client-Side)</span>
            <span>·</span>
            <span>พร้อมใช้งานบน GitHub Pages</span>
          </div>

          <div className="text-slate-500">
            © 2026 SeaExport AI Logistics Suite
          </div>

        </div>
      </footer>

    </div>
  );
}
