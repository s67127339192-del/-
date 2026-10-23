import React from 'react';
import { Ship, ScanText, Navigation, Calculator, FileSpreadsheet, Menu, X } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenQuickScan: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickScan,
  mobileMenuOpen,
  setMobileMenuOpen
}) => {
  const navItems = [
    { id: 'dashboard', label: 'ภาพรวมส่งออก', icon: Ship },
    { id: 'ocr', label: 'สแกนเอกสาร OCR', icon: ScanText },
    { id: 'tracking', label: 'ติดตามตู้สินค้า', icon: Navigation },
    { id: 'calculator', label: 'คำนวณต้นทุนค่าระวาง', icon: Calculator },
    { id: 'reports', label: 'รายงาน & CSV', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      {/* Strict 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark (Single Text Element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Ship className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              SeaExport AI
            </span>
          </button>
        </div>

        {/* Zone 2: 4-5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 font-medium ${
                  isActive
                    ? 'border-sky-400 text-white font-semibold'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenQuickScan}
            className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 active:bg-sky-200 transition-colors rounded-lg shadow-sm whitespace-nowrap shrink-0 flex items-center gap-2 min-h-[40px]"
          >
            <ScanText className="w-4 h-4" />
            <span>สแกนเอกสาร OCR</span>
          </button>
        </div>

      </div>

      {/* Mobile / iPad Portrait Drawer Menu */}
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
