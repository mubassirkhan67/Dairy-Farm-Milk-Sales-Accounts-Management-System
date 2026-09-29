import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDairy } from '../context/DairyContext';
import {
  Plus,
  Search,
  User,
  ShieldCheck,
  Menu,
  X,
  FileSpreadsheet,
  Coins,
  Store,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickSale: () => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickSale,
  onOpenSearch,
}) => {
  const { currentUser, switchRole, logout } = useAuth();
  const { settings, backendStatus, syncWithBackend } = useDairy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'daily-sales', label: 'Daily Sales' },
    { id: 'shopkeepers', label: 'Shopkeepers' },
    { id: 'payments', label: 'Payments' },
    { id: 'monthly-report', label: 'Monthly Report' },
    { id: 'bill-generator', label: 'Generate Bill' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-emerald-900/20">
                🥛
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 group-hover:text-emerald-700 transition-colors leading-tight">
                  {settings.farm_name || 'Haji Zafeer Gul Awan Dairy Farm'}
                </span>
                <span className="text-[10px] text-neutral-500 font-medium tracking-wide">
                  Milk Sales & Accounts Ledger
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-neutral-600">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`transition-colors whitespace-nowrap py-1 ${
                  activeTab === link.id
                    ? 'text-emerald-700 font-bold border-b-2 border-emerald-700'
                    : 'hover:text-neutral-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2">
            {/* Live Backend Connection Indicator */}
            <button
              onClick={() => setActiveTab('settings')}
              title={`Database: ${backendStatus.storagePath || 'data/dairy-db.json'} - Click to manage`}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 rounded-lg text-[11px] text-neutral-700 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-neutral-800">
                {backendStatus.connected ? 'Backend Active' : 'Local Storage'}
              </span>
              {backendStatus.latencyMs !== undefined && (
                <span className="text-[10px] text-neutral-400 font-mono">
                  {backendStatus.latencyMs}ms
                </span>
              )}
            </button>

            {/* Global Search trigger */}
            <button
              onClick={onOpenSearch}
              className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Search everything (Ctrl+K)"
              aria-label="Search records"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Add Milk Sale Button */}
            <button
              onClick={onOpenQuickSale}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Milk Sale</span>
              <span className="sm:hidden">Sale</span>
            </button>

            {/* Role & User Switcher */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="hidden sm:inline capitalize font-semibold">{currentUser?.role || 'Guest'}</span>
                <User className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-xs text-neutral-500">Logged in as</p>
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {currentUser?.name || 'Administrator'}
                    </p>
                    <p className="text-xs text-emerald-600 uppercase font-bold tracking-wide mt-0.5">
                      Role: {currentUser?.role}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        switchRole('admin');
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${
                        currentUser?.role === 'admin'
                          ? 'bg-neutral-50 text-emerald-700 font-semibold'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Switch to Admin (Full Access)
                      </span>
                      {currentUser?.role === 'admin' && '✓'}
                    </button>

                    <button
                      onClick={() => {
                        switchRole('employee');
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${
                        currentUser?.role === 'employee'
                          ? 'bg-neutral-50 text-emerald-700 font-semibold'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Switch to Employee (Sales Entry)
                      </span>
                      {currentUser?.role === 'employee' && '✓'}
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 pt-1">
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      Farm Settings & Backup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === link.id
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveTab('animals');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Animals
            </button>
            <button
              onClick={() => {
                setActiveTab('animal-sales');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Animal Sales
            </button>
            <button
              onClick={() => {
                setActiveTab('expenses');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Expenses
            </button>
            <button
              onClick={() => {
                setActiveTab('profit-loss');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Profit & Loss
            </button>
            <button
              onClick={() => {
                setActiveTab('milk-rates');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Milk Rates
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className="text-xs text-neutral-600 hover:text-emerald-700 px-2 py-1 rounded bg-neutral-100"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
