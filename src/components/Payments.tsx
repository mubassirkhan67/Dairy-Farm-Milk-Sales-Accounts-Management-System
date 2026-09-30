import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod, Payment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { printElement, downloadPrintableHtml } from '../utils/printHelper';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  MoreHorizontal,
  Trash2,
  FileText,
  X,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface PaymentsProps {
  initialShopkeeperId?: string;
  onOpenPaymentModal: (shopkeeperId?: string) => void;
  onNavigateToBill: (shopkeeperId: string) => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  initialShopkeeperId,
  onOpenPaymentModal,
  onNavigateToBill,
}) => {
  const { payments, shopkeepers, deletePayment, settings, getShopkeeperBalance } = useDairy();
  const { can, requireAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedShopkeeperFilter, setSelectedShopkeeperFilter] = useState<string>(
    initialShopkeeperId || 'all'
  );
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        if (selectedShopkeeperFilter !== 'all' && p.shopkeeper_id !== selectedShopkeeperFilter)
          return false;
        if (selectedMethod !== 'all' && p.payment_method !== selectedMethod) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const sk = shopkeepers.find((s) => s.id === p.shopkeeper_id);
        return (
          p.id.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          sk?.shop_name.toLowerCase().includes(q) ||
          sk?.owner_name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }, [payments, selectedShopkeeperFilter, selectedMethod, searchQuery, shopkeepers]);

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const methodBreakdown = useMemo(() => {
    const cash = filteredPayments.filter((p) => p.payment_method === 'Cash').reduce((a, b) => a + b.amount, 0);
    const bank = filteredPayments.filter((p) => p.payment_method === 'Bank').reduce((a, b) => a + b.amount, 0);
    const online = filteredPayments
      .filter((p) => p.payment_method === 'Online Transfer')
      .reduce((a, b) => a + b.amount, 0);
    const other = filteredPayments.filter((p) => p.payment_method === 'Other').reduce((a, b) => a + b.amount, 0);
    return { cash, bank, online, other };
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Financial Accounts</span>
            <span aria-hidden="true">·</span>
            <span>{payments.length} total payments on record</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Payments & Collections Ledger
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Record customer cash receipts, bank deposits, and online transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              printElement('payments-ledger-container', {
                title: 'Payments_Ledger',
              })
            }
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Print Payments Ledger"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={() => requireAdmin(() => onOpenPaymentModal())}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Collection Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Total Filtered Collections</p>
          <p className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {formatCurrency(totalCollected, settings.currency_symbol)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Cash Received</p>
          <p className="text-xl font-bold text-neutral-900 font-mono tabular-nums mt-1">
            {formatCurrency(methodBreakdown.cash, settings.currency_symbol)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Bank Deposits</p>
          <p className="text-xl font-bold text-neutral-900 font-mono tabular-nums mt-1">
            {formatCurrency(methodBreakdown.bank, settings.currency_symbol)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-neutral-500">Online Transfers</p>
          <p className="text-xl font-bold text-neutral-900 font-mono tabular-nums mt-1">
            {formatCurrency(methodBreakdown.online, settings.currency_symbol)}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payments by receipt, shop or notes..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Shopkeeper filter */}
          <select
            value={selectedShopkeeperFilter}
            onChange={(e) => setSelectedShopkeeperFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Shopkeepers</option>
            {shopkeepers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shop_name} ({s.id})
              </option>
            ))}
          </select>

          {/* Payment Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Deposit</option>
            <option value="Online Transfer">Online Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div id="payments-ledger-container" className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Shopkeeper</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <p className="text-sm">No payment records found.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const sk = shopkeepers.find((s) => s.id === p.shopkeeper_id);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-500">{p.id}</td>
                      <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{sk?.shop_name || 'Unknown'}</div>
                        <div className="text-[11px] text-neutral-500">{sk?.owner_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-700">
                          {p.payment_method === 'Cash' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                          {p.payment_method === 'Bank' && <Building2 className="w-3.5 h-3.5 text-blue-600" />}
                          {p.payment_method === 'Online Transfer' && (
                            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>{p.payment_method}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{p.reference || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums text-sm">
                        {formatCurrency(p.amount, settings.currency_symbol)}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 max-w-xs truncate">{p.notes || '—'}</td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingReceipt(p)}
                            className="p-1 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-100 rounded"
                            title="View / Print Payment Voucher"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              requireAdmin(() => {
                                if (window.confirm(`Delete payment record ${p.id}?`)) {
                                  deletePayment(p.id);
                                }
                              });
                            }}
                            className="p-1 text-neutral-600 hover:text-rose-700 hover:bg-neutral-100 rounded"
                            title="Delete Payment (Admin only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipt Voucher Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            id="payment-voucher-card"
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative print-container"
          >
            <button
              onClick={() => setViewingReceipt(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg no-print"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-neutral-200">
              <h2 className="text-lg font-bold uppercase">{settings.farm_name}</h2>
              <p className="text-xs text-neutral-500">Official Payment Receipt Voucher</p>
              <p className="text-xs font-mono font-bold mt-1 text-emerald-700">Voucher #{viewingReceipt.id}</p>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Date Received:</span>
                <span className="font-semibold text-neutral-800">{formatDate(viewingReceipt.payment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Paid By Shop:</span>
                <span className="font-semibold text-neutral-800">
                  {shopkeepers.find((s) => s.id === viewingReceipt.shopkeeper_id)?.shop_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Proprietor:</span>
                <span className="font-semibold text-neutral-800">
                  {shopkeepers.find((s) => s.id === viewingReceipt.shopkeeper_id)?.owner_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Mode:</span>
                <span className="font-bold text-neutral-800">{viewingReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Transaction Ref:</span>
                <span className="font-mono text-neutral-800">{viewingReceipt.reference}</span>
              </div>

              <div className="border-t border-neutral-100 my-2 pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Amount Credited:</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(viewingReceipt.amount, settings.currency_symbol)}
                  </span>
                </div>
              </div>

              {viewingReceipt.notes && (
                <div className="pt-2 text-[11px] text-neutral-500 italic">
                  Note: {viewingReceipt.notes}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-wrap gap-2 no-print">
              <button
                onClick={() =>
                  printElement('payment-voucher-card', {
                    title: `Payment_Voucher_${viewingReceipt.id}`,
                  })
                }
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() =>
                  downloadPrintableHtml(
                    'payment-voucher-card',
                    `Payment_Voucher_${viewingReceipt.id}.html`
                  )
                }
                className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs"
                title="Download voucher as HTML/PDF"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  const skId = viewingReceipt.shopkeeper_id;
                  setViewingReceipt(null);
                  onNavigateToBill(skId);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Monthly Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
