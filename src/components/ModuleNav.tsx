import React from 'react';
import { useDairy } from '../context/DairyContext';
import {
  LayoutDashboard,
  Store,
  Milk,
  Receipt,
  FileText,
  TrendingUp,
  CircleDollarSign,
  PiggyBank,
  Settings as SettingsIcon,
  Tag,
  Search,
} from 'lucide-react';

interface ModuleNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ModuleNav: React.FC<ModuleNavProps> = ({ activeTab, setActiveTab }) => {
  const { shopkeepers } = useDairy();

  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily-sales', label: 'Milk Sales', icon: Milk },
    { id: 'shopkeepers', label: 'Shopkeepers', icon: Store, count: shopkeepers.length },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'monthly-report', label: 'Monthly Report', icon: TrendingUp },
    { id: 'bill-generator', label: 'Generate Bill', icon: FileText },
    { id: 'milk-rates', label: 'Milk Rates', icon: Tag },
    { id: 'animals', label: 'Animals', icon: PiggyBank },
    { id: 'animal-sales', label: 'Animal Sales', icon: Store },
    { id: 'expenses', label: 'Expenses', icon: CircleDollarSign },
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'settings', label: 'Backend & Settings', icon: SettingsIcon },
  ];

  return (
    <div className="bg-white border-b border-neutral-200/80 shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-2.5 scrollbar-thin scrollbar-thumb-neutral-200">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-emerald-900 text-emerald-100' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
