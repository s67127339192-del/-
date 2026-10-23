import React from 'react';
import { 
  Ship, 
  Anchor, 
  LayoutDashboard, 
  Navigation, 
  Box, 
  Activity, 
  Calculator, 
  FileSpreadsheet, 
  Database, 
  Plus, 
  Menu, 
  X 
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenNewBooking: () => void;
  onOpenBackupModal: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewBooking,
  onOpenBackupModal,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'จองเรือ (Booking)', icon: Ship },
    { id: 'tracking', label: 'ติดตามเรือ (Tracking)', icon: Navigation },
    { id: 'berths', label: 'ท่าเทียบเรือ (Berths)', icon: Anchor },
    { id: 'containers', label: 'ลานตู้สินค้า (Yard)', icon: Box },
    { id: 'congestion', label: 'วิเคราะห์ความแออัด', icon: Activity },
    { id: 'calculator', label: 'คำนวณค่าระวาง & ท่าเรือ', icon: Calculator },
    { id: 'reports', label: 'รายงาน & CSV', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 -ml-2 text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:bg-sky-500/30 transition-colors">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white whitespace-nowrap leading-tight">
                SeaExport AI
              </div>
              <div className="text-[10px] text-sky-400 font-medium tracking-wide">
                Smart Port & Vessel Management
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-medium overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1.5 border-b-2 font-medium ${
                  isActive
                    ? 'border-sky-400 text-white font-semibold'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBackupModal}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium min-h-[40px]"
            title="สำรองข้อมูล JSON / กู้คืนฐานข้อมูล"
          >
            <Database className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">สำรอง JSON</span>
          </button>

          <button
            onClick={onOpenNewBooking}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 active:bg-sky-200 transition-colors rounded-lg shadow-sm whitespace-nowrap flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>+ จองเรือใหม่</span>
          </button>
        </div>

      </div>

      {/* iPad / Tablet Subnav Bar for medium screens */}
      <div className="hidden md:flex xl:hidden border-t border-slate-800 bg-slate-950/70 px-4 py-2 overflow-x-auto gap-4 text-xs font-medium">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-sky-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
