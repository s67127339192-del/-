import React, { useState, useEffect, useMemo } from 'react';
import { 
  initDB, 
  getBookings, 
  getVesselTrackings, 
  getBerths, 
  getContainers, 
  getTariffs, 
  getCalculations 
} from './services/db';
import { 
  VesselBooking, 
  VesselTracking, 
  BerthAssignment, 
  PortContainer, 
  TariffConfig, 
  ExportCalculationRecord, 
  PortCongestionMetrics 
} from './types';
import { calculatePortCongestion } from './services/portCongestion';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { VesselBookingView } from './components/VesselBookingView';
import { VesselTrackingView } from './components/VesselTrackingView';
import { BerthManagementView } from './components/BerthManagementView';
import { ContainerManagementView } from './components/ContainerManagementView';
import { PortCongestionView } from './components/PortCongestionView';
import { CostCalculatorView } from './components/CostCalculatorView';
import { ReportsView } from './components/ReportsView';
import { BackupModal } from './components/BackupModal';
import { Ship, Anchor, Database, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [selectedVesselForTracking, setSelectedVesselForTracking] = useState<string | undefined>(undefined);

  // IndexedDB State
  const [bookings, setBookings] = useState<VesselBooking[]>([]);
  const [trackings, setTrackings] = useState<VesselTracking[]>([]);
  const [berths, setBerths] = useState<BerthAssignment[]>([]);
  const [containers, setContainers] = useState<PortContainer[]>([]);
  const [tariffs, setTariffs] = useState<TariffConfig | null>(null);
  const [calculations, setCalculations] = useState<ExportCalculationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all tables from IndexedDB
  const refreshAllData = async () => {
    try {
      await initDB();
      const [bData, tData, berthData, cData, tariffData, calcData] = await Promise.all([
        getBookings(),
        getVesselTrackings(),
        getBerths(),
        getContainers(),
        getTariffs(),
        getCalculations(),
      ]);

      setBookings(bData);
      setTrackings(tData);
      setBerths(berthData);
      setContainers(cData);
      setTariffs(tariffData);
      setCalculations(calcData);
    } catch (err) {
      console.error('Failed to load IndexedDB data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Compute Congestion Metrics based on actual database records
  const congestion = useMemo(() => {
    return calculatePortCongestion(bookings, trackings, berths, containers);
  }, [bookings, trackings, berths, containers]);

  // Navigate to Vessel Tracking for a specific ship
  const handleNavigateToTracking = (vesselName: string) => {
    setSelectedVesselForTracking(vesselName);
    setActiveTab('tracking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 animate-pulse mb-4">
          <Ship className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-white tracking-wide">
          กำลังเริ่มต้นระบบ SeaExport Smart Port...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          IndexedDB Local Storage Initializing
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Smart Port Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenNewBooking={() => {
          setActiveTab('bookings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* 1. Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            bookings={bookings}
            trackings={trackings}
            berths={berths}
            containers={containers}
            congestion={congestion}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectBooking={(b) => {
              setActiveTab('bookings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectTracking={handleNavigateToTracking}
            onOpenNewBooking={() => {
              setActiveTab('bookings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* 2. Vessel Booking View */}
        {activeTab === 'bookings' && (
          <VesselBookingView
            bookings={bookings}
            onRefreshData={refreshAllData}
            onNavigateTracking={handleNavigateToTracking}
          />
        )}

        {/* 3. Vessel Tracking View */}
        {activeTab === 'tracking' && (
          <VesselTrackingView
            trackings={trackings}
            selectedVesselName={selectedVesselForTracking}
            onRefreshData={refreshAllData}
          />
        )}

        {/* 4. Berth Management View */}
        {activeTab === 'berths' && (
          <BerthManagementView
            berths={berths}
            bookings={bookings}
            onRefreshData={refreshAllData}
            onNavigateTracking={handleNavigateToTracking}
          />
        )}

        {/* 5. Container Yard Management View */}
        {activeTab === 'containers' && (
          <ContainerManagementView
            containers={containers}
            bookings={bookings}
            onRefreshData={refreshAllData}
          />
        )}

        {/* 6. Port Congestion Analysis View */}
        {activeTab === 'congestion' && (
          <PortCongestionView
            congestion={congestion}
            berths={berths}
            trackings={trackings}
            containers={containers}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* 7. Cost & Tariff Calculator View */}
        {activeTab === 'calculator' && (
          <CostCalculatorView
            bookings={bookings}
            onRefreshData={refreshAllData}
          />
        )}

        {/* 8. Reports & CSV Export View */}
        {activeTab === 'reports' && (
          <ReportsView
            bookings={bookings}
            berths={berths}
            trackings={trackings}
            containers={containers}
            calculations={calculations}
            congestion={congestion}
          />
        )}

      </main>

      {/* JSON Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={refreshAllData}
      />

      {/* Clean Domain Footer */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-800 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          <div className="flex items-center gap-2 text-slate-300">
            <Anchor className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white">SeaExport AI</span>
            <span>·</span>
            <span>ระบบบริหารจัดการการจองเรือและการดำเนินงานท่าเรืออัจฉริยะ</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>ฐานข้อมูล IndexedDB ในตัวเครื่อง (100% Client-Side)</span>
            </span>
            <span>·</span>
            <span>พร้อมใช้งานบน GitHub Pages & Safari iPad</span>
          </div>

          <div className="text-slate-500 font-mono">
            © 2026 SeaExport AI Smart Port Management System
          </div>

        </div>
      </footer>

    </div>
  );
}
