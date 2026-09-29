/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DairyProvider } from './context/DairyContext';
import { Navbar } from './components/Navbar';
import { ModuleNav } from './components/ModuleNav';
import { Dashboard } from './components/Dashboard';
import { DailySales } from './components/DailySales';
import { Shopkeepers } from './components/Shopkeepers';
import { Payments } from './components/Payments';
import { MonthlyReport } from './components/MonthlyReport';
import { BillGenerator } from './components/BillGenerator';
import { MilkRates } from './components/MilkRates';
import { Animals } from './components/Animals';
import { AnimalSales } from './components/AnimalSales';
import { Expenses } from './components/Expenses';
import { ProfitLoss } from './components/ProfitLoss';
import { Settings } from './components/Settings';
import { MilkSaleModal } from './components/MilkSaleModal';
import { PaymentModal } from './components/PaymentModal';
import { GlobalSearch } from './components/GlobalSearch';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [navParams, setNavParams] = useState<any>({});

  // Global modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleModalDate, setSaleModalDate] = useState('2026-09-28');
  const [saleModalShopkeeperId, setSaleModalShopkeeperId] = useState<string | undefined>(undefined);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalShopkeeperId, setPaymentModalShopkeeperId] = useState<string | undefined>(undefined);

  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleNavigate = (tab: string, params: any = {}) => {
    setActiveTab(tab);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSaleModal = (date?: string, shopkeeperId?: string) => {
    setSaleModalDate(date || '2026-09-28');
    setSaleModalShopkeeperId(shopkeeperId);
    setSaleModalOpen(true);
  };

  const handleOpenPaymentModal = (shopkeeperId?: string) => {
    setPaymentModalShopkeeperId(shopkeeperId);
    setPaymentModalOpen(true);
  };

  return (
    <AuthProvider>
      <DairyProvider>
        <div className="min-h-screen bg-neutral-100 flex flex-col text-neutral-900">
          {/* Top Bar (Follows Top Bar Contract) */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenQuickSale={() => handleOpenSaleModal()}
            onOpenSearch={() => setSearchModalOpen(true)}
          />

          {/* Module Sub-Navigation Bar */}
          <ModuleNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Main Viewport Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigate={handleNavigate}
                onOpenQuickSale={() => handleOpenSaleModal()}
                onOpenPaymentModal={() => handleOpenPaymentModal()}
              />
            )}

            {activeTab === 'daily-sales' && (
              <DailySales
                initialDate={navParams?.date || '2026-09-28'}
                onOpenSaleModal={handleOpenSaleModal}
                onNavigateToBill={(skId) => handleNavigate('bill-generator', { shopkeeperId: skId })}
              />
            )}

            {activeTab === 'shopkeepers' && (
              <Shopkeepers
                onOpenSaleModal={handleOpenSaleModal}
                onOpenPaymentModal={handleOpenPaymentModal}
                onNavigateToBill={(skId) => handleNavigate('bill-generator', { shopkeeperId: skId })}
                onNavigateToLedger={(skId) => handleNavigate('bill-generator', { shopkeeperId: skId })}
              />
            )}

            {activeTab === 'payments' && (
              <Payments
                initialShopkeeperId={navParams?.shopkeeperId}
                onOpenPaymentModal={handleOpenPaymentModal}
                onNavigateToBill={(skId) => handleNavigate('bill-generator', { shopkeeperId: skId })}
              />
            )}

            {activeTab === 'monthly-report' && (
              <MonthlyReport
                onNavigateToBill={(skId, monthStr) =>
                  handleNavigate('bill-generator', { shopkeeperId: skId, month: monthStr })
                }
                onNavigateToShopkeeperReport={(skId, monthStr) =>
                  handleNavigate('bill-generator', { shopkeeperId: skId, month: monthStr })
                }
              />
            )}

            {activeTab === 'bill-generator' && (
              <BillGenerator
                initialShopkeeperId={navParams?.shopkeeperId}
                initialMonth={navParams?.month || '2026-09'}
                onBack={() => handleNavigate('dashboard')}
              />
            )}

            {activeTab === 'milk-rates' && <MilkRates />}

            {activeTab === 'animals' && (
              <Animals
                onOpenSellAnimalModal={(animalId) =>
                  handleNavigate('animal-sales', { animalId, openSellModal: true })
                }
              />
            )}

            {activeTab === 'animal-sales' && (
              <AnimalSales
                initialAnimalId={navParams?.animalId}
                isOpenModalImmediately={navParams?.openSellModal}
              />
            )}

            {activeTab === 'expenses' && <Expenses />}

            {activeTab === 'profit-loss' && <ProfitLoss />}

            {activeTab === 'settings' && <Settings />}
          </main>

          {/* Quiet Clean Footer */}
          <footer className="mt-auto py-5 border-t border-neutral-200/80 bg-white text-center text-xs text-neutral-500 no-print">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="font-medium text-neutral-700">
                © 2026 <strong className="text-emerald-800">Haji Zafeer Gul Awan Dairy Farm</strong> · Wholesale Clients: Jawad Awan & Fawad Awan
              </p>
              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Backend Storage: data/dairy-db.json</span>
              </div>
            </div>
          </footer>

          {/* Global Milk Sale Entry Modal */}
          <MilkSaleModal
            isOpen={saleModalOpen}
            onClose={() => setSaleModalOpen(false)}
            initialDate={saleModalDate}
            initialShopkeeperId={saleModalShopkeeperId}
            onSuccess={() => {
              // Stay on current tab or refresh
            }}
          />

          {/* Global Payment Entry Modal */}
          <PaymentModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            initialShopkeeperId={paymentModalShopkeeperId}
            onSuccess={() => {
              // Stay on current tab or refresh
            }}
          />

          {/* Universal Search Modal (Ctrl+K or Header icon) */}
          <GlobalSearch
            isOpen={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            onNavigate={handleNavigate}
          />
        </div>
      </DairyProvider>
    </AuthProvider>
  );
}
