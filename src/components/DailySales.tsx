import React, { useState, useMemo, useEffect } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, cleanNumericInput, parseCleanNumber, getTodayDateString } from '../utils/formatters';
import { printElement, downloadPrintableHtml } from '../utils/printHelper';
import { MilkSale, UnitType } from '../types';
import {
  Calendar,
  Search,
  Plus,
  Printer,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,
  Receipt,
  X,
  Check,
  CheckCircle,
  Milk,
  Store,
  Download,
} from 'lucide-react';

interface DailySalesProps {
  initialDate?: string;
  onOpenSaleModal: (date?: string, shopkeeperId?: string) => void;
  onNavigateToBill: (shopkeeperId: string) => void;
}

export const DailySales: React.FC<DailySalesProps> = ({
  initialDate,
  onOpenSaleModal,
  onNavigateToBill,
}) => {
  const {
    milkSales,
    shopkeepers,
    addMilkSale,
    deleteMilkSale,
    updateMilkSale,
    getEffectiveRateForDate,
    settings,
  } = useDairy();
  const { can, requireAdmin, isAdmin } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(() => initialDate || getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<MilkSale | null>(null);
  const [editingSale, setEditingSale] = useState<MilkSale | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Automatically update to today's date when day turns on the standard calendar
  useEffect(() => {
    const syncStandardCalendarDay = () => {
      const today = getTodayDateString();
      // If user is currently looking at today or initial load, keep it synchronized
      const lastSavedDay = sessionStorage.getItem('dairy_current_calendar_day');
      if (lastSavedDay && lastSavedDay !== today) {
        setSelectedDate(today);
      }
      sessionStorage.setItem('dairy_current_calendar_day', today);
    };

    syncStandardCalendarDay();
    const interval = setInterval(syncStandardCalendarDay, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Quick Inline Sale Entry State
  const [quickShopId, setQuickShopId] = useState<string>(shopkeepers[0]?.id || 'S001');
  const [quickQty, setQuickQty] = useState<string>('25');
  const [quickRate, setQuickRate] = useState<string>('220');
  const [quickPaid, setQuickPaid] = useState<string>('0');
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Update quick rate whenever date changes
  useEffect(() => {
    if (selectedDate) {
      const eff = getEffectiveRateForDate(selectedDate);
      setQuickRate(eff.toString());
    }
  }, [selectedDate, getEffectiveRateForDate]);

  // Keep shopkeeper ID valid
  useEffect(() => {
    if (shopkeepers.length > 0 && !shopkeepers.find((s) => s.id === quickShopId)) {
      setQuickShopId(shopkeepers[0].id);
    }
  }, [shopkeepers, quickShopId]);

  // Calculated values for quick entry
  const numQuickQty = parseCleanNumber(quickQty);
  const numQuickRate = parseCleanNumber(quickRate);
  const quickTotal = Math.round(numQuickQty * numQuickRate);
  const numQuickPaid = parseCleanNumber(quickPaid);
  const quickRemaining = Math.max(0, quickTotal - numQuickPaid);

  const handleRecordQuickSale = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);

    const targetShop = shopkeepers.find((s) => s.id === quickShopId) || shopkeepers[0];
    if (!targetShop) {
      setQuickError('Please select a valid shopkeeper.');
      return;
    }
    if (numQuickQty <= 0) {
      setQuickError('Milk quantity must be greater than zero.');
      return;
    }
    if (numQuickRate <= 0) {
      setQuickError('Milk rate must be greater than zero.');
      return;
    }

    requireAdmin(() => {
      try {
        addMilkSale({
          shopkeeper_id: targetShop.id,
          sale_date: selectedDate,
          quantity: numQuickQty,
          unit: (settings.default_unit as UnitType) || 'KG',
          rate: numQuickRate,
          paid_amount: numQuickPaid,
          notes: quickNotes.trim(),
        });

        setQuickSuccess(
          `Added ${numQuickQty} ${settings.default_unit || 'KG'} milk sale for ${targetShop.shop_name} (Total: ${formatCurrency(quickTotal, settings.currency_symbol)}) to the list!`
        );
        setQuickQty('25');
        setQuickPaid('0');
        setQuickNotes('');
        setTimeout(() => setQuickSuccess(null), 4000);
      } catch (err: any) {
        setQuickError(err?.message || 'Failed to add sale record.');
      }
    });
  };

  // Navigate dates
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayDateString());
  };

  // Filter sales for the selected date
  const salesForDate = useMemo(() => {
    return milkSales
      .filter((s) => s.sale_date === selectedDate)
      .map((sale) => {
        const sk = shopkeepers.find((sh) => sh.id === sale.shopkeeper_id);
        return {
          ...sale,
          shopName: sk?.shop_name || 'Unknown Shop',
          ownerName: sk?.owner_name || '',
          phone: sk?.phone || '',
          address: sk?.address || '',
        };
      })
      .filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.shopName.toLowerCase().includes(q) ||
          item.ownerName.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      });
  }, [milkSales, selectedDate, shopkeepers, searchQuery]);

  // Totals for this date
  const totals = useMemo(() => {
    const totalMilk = salesForDate.reduce((acc, s) => acc + s.quantity, 0);
    const totalAmount = salesForDate.reduce((acc, s) => acc + s.total_amount, 0);
    const totalPaid = salesForDate.reduce((acc, s) => acc + (s.paid_amount || 0), 0);
    const totalRemaining = salesForDate.reduce((acc, s) => acc + (s.remaining_amount || 0), 0);
    return { totalMilk, totalAmount, totalPaid, totalRemaining };
  }, [salesForDate]);

  const handleDelete = (id: string) => {
    requireAdmin(() => {
      deleteMilkSale(id);
      setDeleteConfirmationId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Daily Register</span>
            <span aria-hidden="true">·</span>
            <span>Date: {formatDate(selectedDate)}</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Daily Milk Sales Register
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            View, edit, search, and print daily milk dispatches to shopkeepers.
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-neutral-300 bg-white">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1.5 text-xs font-semibold text-neutral-900 font-mono focus:outline-none border-x border-neutral-200"
            />
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSetToday}
            className="px-3 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
          >
            Today
          </button>

          <button
            onClick={() =>
              printElement('daily-sales-sheet', {
                title: `Daily_Milk_Sales_${selectedDate}`,
              })
            }
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Print daily sales sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={() => onOpenSaleModal(selectedDate)}
            className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sale</span>
          </button>
        </div>
      </div>

      <div id="daily-sales-sheet">
        {/* Printable Sheet Header (Visible during Print) */}
        <div className="hidden print-only mb-6 text-center">
          <h1 className="text-2xl font-bold uppercase">{settings.farm_name}</h1>
          <p className="text-sm">Daily Milk Sales Record Sheet</p>
          <p className="text-xs font-bold mt-1">DATE: {formatDate(selectedDate)}</p>
          <p className="text-xs text-neutral-600">Contact: {settings.phone} · {settings.address}</p>
        </div>

      {/* Direct Quick Milk Sale Entry Form (Right inside Sales List) */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 sm:p-5 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Milk className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 leading-tight">
                Quick Milk Sale Entry ({formatDate(selectedDate)})
              </h2>
              <p className="text-[11px] text-neutral-500">
                Directly enter delivery details into the sales list below
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 self-start sm:self-auto">
            Rate: {settings.currency_symbol} {quickRate}/{settings.default_unit || 'KG'}
          </span>
        </div>

        {quickSuccess && (
          <div className="mb-3.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{quickSuccess}</span>
            </div>
            <button
              onClick={() => setQuickSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {quickError && (
          <div className="mb-3.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{quickError}</span>
            </div>
            <button
              onClick={() => setQuickError(null)}
              className="text-rose-700 hover:text-rose-900 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleRecordQuickSale} noValidate className="space-y-3.5">
          {/* Shop Selection Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              1. Choose Shopkeeper / Client
            </label>
            {shopkeepers.length === 0 ? (
              <div className="p-3 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-xs text-neutral-500 text-center">
                No shopkeepers registered yet. Please add a customer first in the Shopkeepers tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shopkeepers.map((sk) => {
                  const isSelected = quickShopId === sk.id;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => setQuickShopId(sk.id)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30 font-bold text-emerald-950 shadow-2xs'
                          : 'bg-neutral-50 hover:bg-white border-neutral-200 text-neutral-800'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold leading-tight">{sk.shop_name}</p>
                        <p className="text-[10px] text-neutral-500">{sk.owner_name} · {sk.phone}</p>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-neutral-600">
                        {sk.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Numerical Inputs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Milk Quantity */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Quantity ({settings.default_unit || 'KG'}) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quickQty}
                onChange={(e) => setQuickQty(cleanNumericInput(e.target.value, true))}
                required
                className="w-full px-3 py-2 text-sm font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-1 mt-1">
                {[10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuickQty(q.toString())}
                    className="flex-1 py-0.5 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Milk Rate */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Rate ({settings.currency_symbol}) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quickRate}
                onChange={(e) => setQuickRate(cleanNumericInput(e.target.value, true))}
                required
                className="w-full px-3 py-2 text-sm font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">Auto: {settings.currency_symbol} {quickRate}</p>
            </div>

            {/* Total Calculated Amount */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Total Bill</span>
              <span className="text-base font-extrabold text-emerald-950 font-mono">
                {formatCurrency(quickTotal, settings.currency_symbol)}
              </span>
              <span className="text-[9px] text-emerald-700 font-medium">
                {numQuickQty} × {numQuickRate}
              </span>
            </div>

            {/* Paid Amount */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Paid Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quickPaid}
                onChange={(e) => setQuickPaid(cleanNumericInput(e.target.value, true))}
                className="w-full px-3 py-2 text-sm font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setQuickPaid(quickTotal.toString())}
                  className="flex-1 py-0.5 text-[10px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded"
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPaid('0')}
                  className="flex-1 py-0.5 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded"
                >
                  Zero
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Remaining + Notes + Submit Button */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="text-neutral-500">Remaining Balance: </span>
                <strong className={`font-mono ${quickRemaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(quickRemaining, settings.currency_symbol)}
                </strong>
              </div>
              <input
                type="text"
                placeholder="Optional notes / batch info..."
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="flex-1 min-w-[200px] px-2.5 py-1 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Record Sale to List</span>
            </button>
          </div>
        </form>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-4 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, owner or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          Showing <strong>{salesForDate.length}</strong> dispatches
        </div>
      </div>

      {/* Main Table: Matches Section 6 specification */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Sale ID</th>
                <th className="py-3 px-4">Shopkeeper / Store</th>
                <th className="py-3 px-4 text-right">Milk Quantity</th>
                <th className="py-3 px-4 text-right">Rate ({settings.currency_symbol})</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid Now</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {salesForDate.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <p className="text-sm">No milk deliveries recorded for {formatDate(selectedDate)}.</p>
                    <button
                      onClick={() => onOpenSaleModal(selectedDate)}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      + Record sale for this date
                    </button>
                  </td>
                </tr>
              ) : (
                salesForDate.map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-500">{sale.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{sale.shopName}</div>
                      <div className="text-[11px] text-neutral-500">
                        {sale.ownerName} {sale.phone && `· ${sale.phone}`}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                      {sale.quantity} {sale.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-700 tabular-nums">
                      {sale.rate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(sale.total_amount, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                      {formatCurrency(sale.paid_amount || 0, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {sale.remaining_amount === 0 ? (
                        <span className="text-neutral-400">0</span>
                      ) : (
                        <span className="font-bold text-rose-600">
                          {formatCurrency(sale.remaining_amount, settings.currency_symbol)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 max-w-xs truncate">
                      {sale.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="p-1 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-100 rounded"
                          title="View Invoice Receipt"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requireAdmin(() => setEditingSale(sale))}
                          className="p-1 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded"
                          title="Edit Sale (Admin only)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requireAdmin(() => setDeleteConfirmationId(sale.id))}
                          className="p-1 text-neutral-600 hover:text-rose-700 hover:bg-neutral-100 rounded"
                          title="Delete Sale (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer Totals: Matches Section 6 */}
            {salesForDate.length > 0 && (
              <tfoot className="bg-neutral-900 text-white font-semibold">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-xs font-bold tracking-wider uppercase">
                    TOTAL ({salesForDate.length} Shops)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-400 text-sm">
                    {totals.totalMilk} {settings.default_unit}
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-400 text-sm">
                    {formatCurrency(totals.totalAmount, settings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-400 text-sm">
                    {formatCurrency(totals.totalPaid, settings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-rose-300 text-sm">
                    {formatCurrency(totals.totalRemaining, settings.currency_symbol)}
                  </td>
                  <td colSpan={2} className="py-3 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </div>

      {/* Invoice Receipt Modal */}
      {selectedSaleForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            id="daily-sale-receipt-card"
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative print-container"
          >
            <button
              onClick={() => setSelectedSaleForInvoice(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg no-print"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-neutral-200">
              <h2 className="text-lg font-bold uppercase">{settings.farm_name}</h2>
              <p className="text-xs text-neutral-500">Daily Milk Delivery Voucher</p>
              <p className="text-xs font-mono font-bold mt-1 text-emerald-700">
                Invoice #{selectedSaleForInvoice.id}
              </p>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Date:</span>
                <span className="font-semibold text-neutral-800">{formatDate(selectedSaleForInvoice.sale_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Shop Name:</span>
                <span className="font-semibold text-neutral-800">
                  {shopkeepers.find((s) => s.id === selectedSaleForInvoice.shopkeeper_id)?.shop_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Owner Name:</span>
                <span className="font-semibold text-neutral-800">
                  {shopkeepers.find((s) => s.id === selectedSaleForInvoice.shopkeeper_id)?.owner_name}
                </span>
              </div>
              <div className="border-t border-neutral-100 my-2"></div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Quantity Supplied:</span>
                <span className="font-bold text-neutral-900 font-mono">
                  {selectedSaleForInvoice.quantity} {selectedSaleForInvoice.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Rate:</span>
                <span className="font-semibold text-neutral-800 font-mono">
                  {settings.currency_symbol} {selectedSaleForInvoice.rate} / {selectedSaleForInvoice.unit}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(selectedSaleForInvoice.total_amount, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Amount Paid:</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(selectedSaleForInvoice.paid_amount || 0, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-rose-600">
                <span>Remaining Balance:</span>
                <span className="font-mono">
                  {formatCurrency(selectedSaleForInvoice.remaining_amount || 0, settings.currency_symbol)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-200 flex flex-wrap gap-2 no-print">
              <button
                onClick={() =>
                  printElement('daily-sale-receipt-card', {
                    title: `Milk_Receipt_${selectedSaleForInvoice.id}`,
                  })
                }
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() =>
                  downloadPrintableHtml(
                    'daily-sale-receipt-card',
                    `Milk_Receipt_${selectedSaleForInvoice.id}.html`
                  )
                }
                className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs"
                title="Download voucher HTML/PDF"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>Save</span>
              </button>
              <button
                onClick={() => {
                  const skId = selectedSaleForInvoice.shopkeeper_id;
                  setSelectedSaleForInvoice(null);
                  onNavigateToBill(skId);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Monthly Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm shadow-xl p-5">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-neutral-900 text-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-neutral-600">
              Are you sure you want to delete milk sale <strong>{deleteConfirmationId}</strong>? This will remove the sale record and any linked immediate payment.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmationId)}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-xl p-5">
            <h3 className="font-bold text-neutral-900 text-base mb-3">Edit Milk Sale ({editingSale.id})</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Quantity ({editingSale.unit})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingSale.quantity}
                  onChange={(e) =>
                    setEditingSale({ ...editingSale, quantity: parseCleanNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Rate ({settings.currency_symbol})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingSale.rate}
                  onChange={(e) =>
                    setEditingSale({ ...editingSale, rate: parseCleanNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Paid Now</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingSale.paid_amount || 0}
                  onChange={(e) =>
                    setEditingSale({ ...editingSale, paid_amount: parseCleanNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={editingSale.notes}
                  onChange={(e) => setEditingSale({ ...editingSale, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditingSale(null)}
                className="flex-1 py-2 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  requireAdmin(() => {
                    updateMilkSale(editingSale.id, {
                      quantity: editingSale.quantity,
                      rate: editingSale.rate,
                      paid_amount: editingSale.paid_amount,
                      notes: editingSale.notes,
                    });
                    setEditingSale(null);
                  });
                }}
                className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
