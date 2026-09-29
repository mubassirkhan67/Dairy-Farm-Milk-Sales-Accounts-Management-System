import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { MilkSale } from '../types';
import { formatCurrency, formatDate, getMonthName, cleanNumericInput, parseCleanNumber } from '../utils/formatters';
import { printElement, downloadPrintableHtml } from '../utils/printHelper';
import {
  Calendar,
  Printer,
  Download,
  Store,
  Milk,
  Receipt,
  AlertCircle,
  FileText,
  Filter,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
  ListFilter,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface MonthlyReportProps {
  onNavigateToBill: (shopkeeperId: string, monthStr?: string) => void;
  onNavigateToShopkeeperReport: (shopkeeperId: string, monthStr?: string) => void;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  onNavigateToBill,
  onNavigateToShopkeeperReport,
}) => {
  const { milkSales, payments, shopkeepers, settings, getShopkeeperBalance, updateMilkSale, deleteMilkSale, addMilkSale } = useDairy();
  const { can } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [viewMode, setViewMode] = useState<'summary' | 'itemized'>('summary');
  const [filterShopkeeperId, setFilterShopkeeperId] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<'all' | 'morning' | 'evening'>('all');

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<MilkSale | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editShopId, setEditShopId] = useState('');
  const [editShift, setEditShift] = useState<'morning' | 'evening'>('morning');
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Add Sale State for Month
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [newDate, setNewDate] = useState(`${selectedMonth}-01`);
  const [newShopId, setNewShopId] = useState(shopkeepers[0]?.id || '');
  const [newShift, setNewShift] = useState<'morning' | 'evening'>('morning');
  const [newQty, setNewQty] = useState('');
  const [newRate, setNewRate] = useState('220');
  const [newPaid, setNewPaid] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Month-filtered sales and payments
  const monthSales = useMemo(() => {
    return milkSales
      .filter((s) => s.sale_date.startsWith(selectedMonth))
      .sort((a, b) => b.sale_date.localeCompare(a.sale_date));
  }, [milkSales, selectedMonth]);

  const monthPayments = useMemo(() => {
    return payments.filter((p) => p.payment_date.startsWith(selectedMonth));
  }, [payments, selectedMonth]);

  // Overall calculations for this month
  const totalMilkSold = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + s.quantity, 0);
  }, [monthSales]);

  const totalSalesAmount = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + s.total_amount, 0);
  }, [monthSales]);

  const totalReceivedAmount = useMemo(() => {
    return monthPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [monthPayments]);

  const totalOutstandingAmount = Math.max(0, totalSalesAmount - totalReceivedAmount);

  // Shopkeeper-wise breakdown for this month
  const shopkeeperBreakdown = useMemo(() => {
    return shopkeepers.map((sk) => {
      const skSales = monthSales.filter((s) => s.shopkeeper_id === sk.id);
      const skMilk = skSales.reduce((acc, s) => acc + s.quantity, 0);
      const skBill = skSales.reduce((acc, s) => acc + s.total_amount, 0);

      const skPayments = monthPayments.filter((p) => p.shopkeeper_id === sk.id);
      const skPaid = skPayments.reduce((acc, p) => acc + p.amount, 0);

      const skRemaining = skBill - skPaid;
      const totalAllTimeBalance = getShopkeeperBalance(sk.id).remainingBalance;

      return {
        id: sk.id,
        shopName: sk.shop_name,
        ownerName: sk.owner_name,
        phone: sk.phone,
        deliveriesCount: skSales.length,
        milkQuantity: skMilk,
        totalBill: skBill,
        amountPaid: skPaid,
        monthlyRemaining: skRemaining,
        totalAllTimeBalance,
      };
    });
  }, [shopkeepers, monthSales, monthPayments, getShopkeeperBalance]);

  // Filtered Itemized Deliveries
  const filteredItemizedSales = useMemo(() => {
    return monthSales.filter((s) => {
      if (filterShopkeeperId !== 'all' && s.shopkeeper_id !== filterShopkeeperId) return false;
      if (filterShift !== 'all' && s.shift !== filterShift) return false;
      return true;
    });
  }, [monthSales, filterShopkeeperId, filterShift]);

  // Handlers for Editing
  const handleStartEdit = (sale: MilkSale) => {
    setEditingSale(sale);
    setEditDate(sale.sale_date);
    setEditShopId(sale.shopkeeper_id);
    setEditShift(sale.shift || 'morning');
    setEditQty(sale.quantity.toString());
    setEditRate(sale.rate.toString());
    setEditPaid((sale.paid_amount || 0).toString());
    setEditNotes(sale.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    const qty = parseCleanNumber(editQty);
    const rate = parseCleanNumber(editRate);
    const paid = parseCleanNumber(editPaid);

    updateMilkSale(editingSale.id, {
      sale_date: editDate || editingSale.sale_date,
      shopkeeper_id: editShopId || editingSale.shopkeeper_id,
      shift: editShift,
      quantity: qty,
      rate: rate,
      paid_amount: paid,
      notes: editNotes,
    });
    setEditingSale(null);
  };

  const handleDeleteSale = (sale: MilkSale) => {
    if (!can('delete_financial')) return;
    const shop = shopkeepers.find((s) => s.id === sale.shopkeeper_id);
    if (
      window.confirm(
        `Are you sure you want to delete the record for ${shop?.shop_name || sale.shopkeeper_id} on ${formatDate(
          sale.sale_date
        )} (${sale.quantity} ${sale.unit})?`
      )
    ) {
      deleteMilkSale(sale.id);
    }
  };

  const handleAddNewSale = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseCleanNumber(newQty);
    const rate = parseCleanNumber(newRate);
    const paid = parseCleanNumber(newPaid);
    if (qty <= 0 || rate <= 0 || !newShopId) return;

    addMilkSale({
      shopkeeper_id: newShopId,
      sale_date: newDate,
      shift: newShift,
      quantity: qty,
      unit: settings.default_unit,
      rate: rate,
      paid_amount: paid,
      notes: newNotes,
    });

    setIsAddingSale(false);
    setNewQty('');
    setNewPaid('');
    setNewNotes('');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (viewMode === 'summary') {
      const headers = ['Shop ID', 'Shop Name', 'Owner', 'Milk Qty', 'Total Bill', 'Paid', 'Outstanding'];
      const rows = shopkeeperBreakdown.map((s) => [
        s.id,
        `"${s.shopName}"`,
        `"${s.ownerName}"`,
        s.milkQuantity,
        s.totalBill,
        s.amountPaid,
        s.monthlyRemaining,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Dairy_Monthly_Summary_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Date', 'Shift', 'Shop ID', 'Shop Name', 'Quantity', 'Unit', 'Rate', 'Total', 'Paid', 'Balance', 'Notes'];
      const rows = filteredItemizedSales.map((s) => {
        const sk = shopkeepers.find((shp) => shp.id === s.shopkeeper_id);
        return [
          s.sale_date,
          s.shift || 'morning',
          s.shopkeeper_id,
          `"${sk?.shop_name || s.shopkeeper_id}"`,
          s.quantity,
          s.unit,
          s.rate,
          s.total_amount,
          s.paid_amount,
          s.remaining_amount,
          `"${s.notes || ''}"`,
        ];
      });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Dairy_Itemized_Sales_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Automated Accounting</span>
            <span aria-hidden="true">·</span>
            <span>Month: {getMonthName(selectedMonth)}</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Monthly Milk Sales & Revenue Report
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Full monthly record ledger. View aggregate totals or modify/change individual entries anytime.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setNewDate(`${e.target.value}-01`);
              }}
              className="text-xs font-semibold text-neutral-900 bg-transparent focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() =>
              printElement('printable-monthly-report', {
                title: `Dairy_Monthly_Report_${selectedMonth}`,
              })
            }
            className="px-3 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Open clean print dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() =>
              downloadPrintableHtml(
                'printable-monthly-report',
                `Dairy_Monthly_Report_${selectedMonth}.html`
              )
            }
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Download printable report (PDF/HTML)"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Save Report (PDF/HTML)</span>
          </button>
        </div>
      </div>

      {/* Main Printable Section */}
      <div id="printable-monthly-report" className="space-y-6">
        {/* Printable Report Header */}
        <div className="hidden print-only mb-6 text-center border-b pb-4">
          <h1 className="text-2xl font-bold uppercase">{settings.farm_name}</h1>
          <p className="text-sm font-semibold">MONTHLY AUDIT REPORT — {getMonthName(selectedMonth).toUpperCase()}</p>
          <p className="text-xs text-neutral-600">Contact: {settings.phone} · Address: {settings.address}</p>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Milk Sold</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <Milk className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums">
              {totalMilkSold.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-neutral-600">{settings.default_unit}</span>
          </div>
          <p className="text-xs text-neutral-500 mt-2 border-t border-neutral-100 pt-1.5">
            Month of {getMonthName(selectedMonth)}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Value</span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums">
            {formatCurrency(totalSalesAmount, settings.currency_symbol)}
          </div>
          <p className="text-xs text-neutral-500 mt-2 border-t border-neutral-100 pt-1.5">
            Gross revenue calculated
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatCurrency(totalReceivedAmount, settings.currency_symbol)}
          </div>
          <p className="text-xs text-neutral-500 mt-2 border-t border-neutral-100 pt-1.5">
            Payments collected this month
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Outstanding</span>
            <span className="p-1.5 rounded-md bg-rose-50 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 font-mono tabular-nums">
            {formatCurrency(totalOutstandingAmount, settings.currency_symbol)}
          </div>
          <p className="text-xs text-neutral-500 mt-2 border-t border-neutral-100 pt-1.5">
            Net month unpaid balance
          </p>
        </div>
      </div>

      {/* Main Table Container with Switcher */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        {/* Navigation & Filter Bar */}
        <div className="p-4 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/50 no-print">
          {/* View Mode Toggle Buttons */}
          <div className="inline-flex p-1 bg-neutral-200/70 rounded-xl">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'summary'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Shopkeeper Summary</span>
            </button>
            <button
              onClick={() => setViewMode('itemized')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'itemized'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-600" />
              <span>Itemized Deliveries (Editable List)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                {monthSales.length}
              </span>
            </button>
          </div>

          {/* Quick Actions / Filters in Itemized Mode */}
          {viewMode === 'itemized' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs">
                <Store className="w-3.5 h-3.5 text-neutral-400" />
                <select
                  value={filterShopkeeperId}
                  onChange={(e) => setFilterShopkeeperId(e.target.value)}
                  className="bg-transparent font-medium text-neutral-800 focus:outline-none"
                >
                  <option value="all">All Shopkeepers</option>
                  {shopkeepers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shop_name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-neutral-400" />
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value as any)}
                  className="bg-transparent font-medium text-neutral-800 focus:outline-none"
                >
                  <option value="all">All Shifts</option>
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              {can('add_sale') && (
                <button
                  onClick={() => setIsAddingSale(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Delivery to Month</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Click <strong className="text-neutral-700">"Edit Entries"</strong> or switch tabs to change monthly data
            </p>
          )}
        </div>

        {/* View 1: Shopkeeper-Wise Summary */}
        {viewMode === 'summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Shop ID</th>
                  <th className="py-3 px-4">Shop / Proprietor</th>
                  <th className="py-3 px-4 text-center">Deliveries</th>
                  <th className="py-3 px-4 text-right">Milk Supplied</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Month Balance</th>
                  <th className="py-3 px-4 text-right">Total Outstanding</th>
                  <th className="py-3 px-4 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {shopkeeperBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-neutral-500">
                      No shopkeepers registered.
                    </td>
                  </tr>
                ) : (
                  shopkeeperBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-500">{row.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{row.shopName}</div>
                        <div className="text-[11px] text-neutral-500">{row.ownerName}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-neutral-700">
                        {row.deliveriesCount} days
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {row.milkQuantity} {settings.default_unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900 tabular-nums">
                        {formatCurrency(row.totalBill, settings.currency_symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                        {formatCurrency(row.amountPaid, settings.currency_symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {row.monthlyRemaining <= 0 ? (
                          <span className="text-emerald-700 font-medium">Cleared</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            {formatCurrency(row.monthlyRemaining, settings.currency_symbol)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {row.totalAllTimeBalance <= 0 ? (
                          <span className="text-emerald-700">Nil</span>
                        ) : (
                          <span className="text-rose-600">
                            {formatCurrency(row.totalAllTimeBalance, settings.currency_symbol)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setFilterShopkeeperId(row.id);
                              setViewMode('itemized');
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-medium text-[11px] flex items-center gap-1 border border-amber-200 transition-colors"
                            title="Edit & Change monthly records for this shopkeeper"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit Entries</span>
                          </button>
                          <button
                            onClick={() => onNavigateToShopkeeperReport(row.id, selectedMonth)}
                            className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-[11px]"
                            title="View day-by-day delivery breakdown"
                          >
                            Ledger
                          </button>
                          <button
                            onClick={() => onNavigateToBill(row.id, selectedMonth)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] flex items-center gap-1"
                            title="Generate Printable Monthly Bill"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Bill</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Footer Summary Row */}
              <tfoot className="bg-neutral-900 text-white font-bold">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-xs tracking-wider uppercase">
                    MONTH TOTAL
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                    {totalMilkSold.toLocaleString()} {settings.default_unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                    {formatCurrency(totalSalesAmount, settings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                    {formatCurrency(totalReceivedAmount, settings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-300 text-sm">
                    {formatCurrency(totalOutstandingAmount, settings.currency_symbol)}
                  </td>
                  <td colSpan={2} className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* View 2: Itemized Monthly Deliveries (Changeable & Editable List) */}
        {viewMode === 'itemized' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Shopkeeper / Client</th>
                  <th className="py-3 px-4 text-right">Milk ({settings.default_unit})</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-4 text-right">Paid on Delivery</th>
                  <th className="py-3 px-4 text-right">Day Balance</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-center no-print">Actions (Change Data)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItemizedSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-neutral-500">
                      <div className="max-w-sm mx-auto">
                        <Milk className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="font-semibold text-neutral-700">No delivery records found for this selection.</p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          You can click "Add Delivery to Month" to add records directly to {getMonthName(selectedMonth)}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItemizedSales.map((sale) => {
                    const shop = shopkeepers.find((s) => s.id === sale.shopkeeper_id);
                    return (
                      <tr key={sale.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-neutral-800">
                          {formatDate(sale.sale_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              sale.shift === 'evening'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {sale.shift || 'morning'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900">{shop?.shop_name || sale.shopkeeper_id}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">{sale.shopkeeper_id}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                          {sale.quantity} {sale.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-neutral-600 tabular-nums">
                          {sale.rate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                          {formatCurrency(sale.total_amount, settings.currency_symbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                          {sale.paid_amount > 0 ? formatCurrency(sale.paid_amount, settings.currency_symbol) : '0'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {sale.remaining_amount <= 0 ? (
                            <span className="text-neutral-400">0</span>
                          ) : (
                            <span className="text-amber-700 font-bold">
                              {formatCurrency(sale.remaining_amount, settings.currency_symbol)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 text-[11px] max-w-[150px] truncate">
                          {sale.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(sale)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] flex items-center gap-1 border border-amber-300 transition-colors shadow-2xs"
                              title="Edit/Change this record"
                            >
                              <Pencil className="w-3 h-3 text-amber-700" />
                              <span>Edit</span>
                            </button>
                            {can('delete_financial') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSale(sale)}
                                className="p-1.5 hover:bg-rose-100 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredItemizedSales.length > 0 && (
                <tfoot className="bg-neutral-900 text-white font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-xs">
                      Filtered Deliveries Total ({filteredItemizedSales.length} Entries)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                      {filteredItemizedSales.reduce((a, b) => a + b.quantity, 0).toLocaleString()} {settings.default_unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">—</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                      {formatCurrency(
                        filteredItemizedSales.reduce((a, b) => a + b.total_amount, 0),
                        settings.currency_symbol
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                      {formatCurrency(
                        filteredItemizedSales.reduce((a, b) => a + (b.paid_amount || 0), 0),
                        settings.currency_symbol
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-300 text-sm">
                      {formatCurrency(
                        filteredItemizedSales.reduce((a, b) => a + b.remaining_amount, 0),
                        settings.currency_symbol
                      )}
                    </td>
                    <td colSpan={2} className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Change Monthly Delivery Data</h3>
                <p className="text-xs text-neutral-500 font-mono">Record ID: {editingSale.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Customer / Shopkeeper *</label>
                <select
                  value={editShopId}
                  onChange={(e) => setEditShopId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {shopkeepers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shop_name} ({s.owner_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Shift</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value as 'morning' | 'evening')}
                    className="w-full px-3 py-2 border rounded-lg font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="morning">Morning (صبح)</option>
                    <option value="evening">Evening (شام)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Milk Quantity ({settings.default_unit}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editQty}
                    onChange={(e) => setEditQty(cleanNumericInput(e.target.value, true))}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Rate ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editRate}
                    onChange={(e) => setEditRate(cleanNumericInput(e.target.value, true))}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Paid Amount on Delivery ({settings.currency_symbol})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editPaid}
                  onChange={(e) => setEditPaid(cleanNumericInput(e.target.value, true))}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Calculated Summary Preview */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-500">Recalculated Total:</span>
                  <p className="font-mono font-bold text-neutral-900 text-sm">
                    {formatCurrency(Math.round(parseCleanNumber(editQty) * parseCleanNumber(editRate)), settings.currency_symbol)}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Day Remaining:</span>
                  <p className="font-mono font-bold text-amber-700 text-sm">
                    {formatCurrency(
                      Math.max(0, Math.round(parseCleanNumber(editQty) * parseCleanNumber(editRate)) - parseCleanNumber(editPaid)),
                      settings.currency_symbol
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional delivery notes"
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-2.5 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Sale Modal for Month */}
      {isAddingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Add Delivery to Monthly List</h3>
                <p className="text-xs text-neutral-500 font-mono">Month: {getMonthName(selectedMonth)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingSale(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewSale} noValidate className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Customer / Shopkeeper *</label>
                <select
                  value={newShopId}
                  onChange={(e) => setNewShopId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {shopkeepers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shop_name} ({s.owner_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value as 'morning' | 'evening')}
                    className="w-full px-3 py-2 border rounded-lg font-medium border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="morning">Morning (صبح)</option>
                    <option value="evening">Evening (شام)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Milk Quantity ({settings.default_unit}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newQty}
                    onChange={(e) => setNewQty(cleanNumericInput(e.target.value, true))}
                    placeholder="e.g. 30"
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Rate ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newRate}
                    onChange={(e) => setNewRate(cleanNumericInput(e.target.value, true))}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Paid Amount on Delivery ({settings.currency_symbol})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newPaid}
                  onChange={(e) => setNewPaid(cleanNumericInput(e.target.value, true))}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-sm border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional delivery notes"
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSale(false)}
                  className="flex-1 py-2.5 text-xs font-semibold border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Add Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
