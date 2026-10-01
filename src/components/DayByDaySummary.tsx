import React, { useState, useMemo } from 'react';
import { MilkSale, Payment, Shopkeeper, FarmSettings } from '../types';
import { formatCurrency, formatDate, getMonthName, getTodayDateString, getCurrentMonthString } from '../utils/formatters';
import { printElement } from '../utils/printHelper';
import {
  Calendar,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Store,
  Milk,
  ExternalLink,
  ChevronRight,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface DayByDaySummaryProps {
  milkSales: MilkSale[];
  payments: Payment[];
  shopkeepers: Shopkeeper[];
  settings: FarmSettings;
  onNavigate: (tab: string, params?: any) => void;
  onOpenQuickSale: () => void;
  onOpenPaymentModal: (shopkeeperId?: string) => void;
}

export type TimeRangeFilter = '7-days' | '14-days' | '30-days' | 'this-month' | 'custom-month' | 'all';

interface DaySummaryItem {
  date: string;
  isToday: boolean;
  dayName: string;
  milkQty: number;
  salesAmount: number;
  receivedAmount: number;
  difference: number;
  collectionRate: number;
  shopsCount: number;
  salesList: (MilkSale & { shopName: string; ownerName: string })[];
  paymentsList: (Payment & { shopName: string; ownerName: string })[];
}

export const DayByDaySummary: React.FC<DayByDaySummaryProps> = ({
  milkSales,
  payments,
  shopkeepers,
  settings,
  onNavigate,
  onOpenQuickSale,
  onOpenPaymentModal,
}) => {
  const todayStr = getTodayDateString();
  const currentMonthStr = getCurrentMonthString();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('this-month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [expandedDate, setExpandedDate] = useState<string | null>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'sales-desc' | 'received-desc'>('date-desc');

  // Shopkeeper lookup map
  const shopkeeperMap = useMemo(() => {
    const map = new Map<string, Shopkeeper>();
    shopkeepers.forEach((sk) => map.set(sk.id, sk));
    return map;
  }, [shopkeepers]);

  // Determine list of dates based on selected range
  const dateList = useMemo(() => {
    const datesSet = new Set<string>();
    const today = new Date(todayStr);

    if (timeRange === '7-days') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        datesSet.add(d.toISOString().split('T')[0]);
      }
    } else if (timeRange === '14-days') {
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        datesSet.add(d.toISOString().split('T')[0]);
      }
    } else if (timeRange === '30-days') {
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        datesSet.add(d.toISOString().split('T')[0]);
      }
    } else if (timeRange === 'this-month' || timeRange === 'custom-month') {
      const monthPrefix = timeRange === 'this-month' ? currentMonthStr : selectedMonth;
      // Include dates in this month that have sales or payments
      milkSales.forEach((s) => {
        if (s.sale_date.startsWith(monthPrefix)) datesSet.add(s.sale_date);
      });
      payments.forEach((p) => {
        if (p.payment_date.startsWith(monthPrefix)) datesSet.add(p.payment_date);
      });
      // If current month, also make sure today is present
      if (monthPrefix === currentMonthStr) {
        datesSet.add(todayStr);
      }
      // If empty month, add at least 1st of month
      if (datesSet.size === 0) {
        datesSet.add(`${monthPrefix}-01`);
      }
    } else if (timeRange === 'all') {
      milkSales.forEach((s) => datesSet.add(s.sale_date));
      payments.forEach((p) => datesSet.add(p.payment_date));
      datesSet.add(todayStr);
    }

    return Array.from(datesSet);
  }, [timeRange, selectedMonth, todayStr, currentMonthStr, milkSales, payments]);

  // Aggregate day-by-day stats
  const daySummaries: DaySummaryItem[] = useMemo(() => {
    return dateList.map((date) => {
      const isToday = date === todayStr;
      const dObj = new Date(date + 'T00:00:00');
      const dayName = isNaN(dObj.getTime())
        ? ''
        : dObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

      // Sales on this date
      const dateSales = milkSales
        .filter((s) => s.sale_date === date)
        .map((sale) => {
          const sk = shopkeeperMap.get(sale.shopkeeper_id);
          return {
            ...sale,
            shopName: sk?.shop_name || 'Unknown Shop',
            ownerName: sk?.owner_name || '',
          };
        });

      const milkQty = dateSales.reduce((acc, s) => acc + s.quantity, 0);
      const salesAmount = dateSales.reduce((acc, s) => acc + s.total_amount, 0);
      const shopsCount = new Set(dateSales.map((s) => s.shopkeeper_id)).size;

      // Payments received on this date
      const datePayments = payments
        .filter((p) => p.payment_date === date)
        .map((pmt) => {
          const sk = shopkeeperMap.get(pmt.shopkeeper_id);
          return {
            ...pmt,
            shopName: sk?.shop_name || 'Unknown Shop',
            ownerName: sk?.owner_name || '',
          };
        });

      const receivedAmount = datePayments.reduce((acc, p) => acc + p.amount, 0);
      const difference = salesAmount - receivedAmount;
      const collectionRate =
        salesAmount > 0
          ? Math.round((receivedAmount / salesAmount) * 100)
          : receivedAmount > 0
          ? 100
          : 0;

      return {
        date,
        isToday,
        dayName,
        milkQty,
        salesAmount,
        receivedAmount,
        difference,
        collectionRate,
        shopsCount,
        salesList: dateSales,
        paymentsList: datePayments,
      };
    });
  }, [dateList, todayStr, milkSales, payments, shopkeeperMap]);

  // Filter & Sort
  const filteredAndSortedDays = useMemo(() => {
    let result = daySummaries.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.date.includes(q) ||
        item.dayName.toLowerCase().includes(q) ||
        item.salesList.some((s) => s.shopName.toLowerCase().includes(q)) ||
        item.paymentsList.some((p) => p.shopName.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'sales-desc') return b.salesAmount - a.salesAmount;
      if (sortBy === 'received-desc') return b.receivedAmount - a.receivedAmount;
      return 0;
    });

    return result;
  }, [daySummaries, searchQuery, sortBy]);

  // Overall Totals for the selected time range
  const totalMetrics = useMemo(() => {
    const totalMilk = filteredAndSortedDays.reduce((acc, d) => acc + d.milkQty, 0);
    const totalSales = filteredAndSortedDays.reduce((acc, d) => acc + d.salesAmount, 0);
    const totalReceived = filteredAndSortedDays.reduce((acc, d) => acc + d.receivedAmount, 0);
    const netDifference = totalSales - totalReceived;
    const overallRate = totalSales > 0 ? Math.round((totalReceived / totalSales) * 100) : 0;
    const activeDaysCount = filteredAndSortedDays.filter((d) => d.salesAmount > 0 || d.receivedAmount > 0).length;

    return {
      totalMilk,
      totalSales,
      totalReceived,
      netDifference,
      overallRate,
      activeDaysCount,
      daysCount: filteredAndSortedDays.length,
    };
  }, [filteredAndSortedDays]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Milk Sold (Qty)', 'Sales Amount (Rs)', 'Received Amount (Rs)', 'Difference (Rs)', 'Collection %', 'Shops Count'];
    const rows = filteredAndSortedDays.map((d) => [
      d.date,
      `"${d.dayName}"`,
      d.milkQty,
      d.salesAmount,
      d.receivedAmount,
      d.difference,
      `${d.collectionRate}%`,
      d.shopsCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `day_by_day_dairy_summary_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    printElement('day-by-day-ledger-printable', { title: `Day_by_Day_Sales_Ledger_${todayStr}` });
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-neutral-200 bg-gradient-to-r from-white via-neutral-50/50 to-emerald-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium mb-1">
              <span className="p-1 rounded bg-emerald-100 text-emerald-800">
                <Receipt className="w-3.5 h-3.5" />
              </span>
              <span>Day-by-Day Financial Tracking</span>
              <span aria-hidden="true">·</span>
              <span>Daily Sales & Collections</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              Day-by-Day Sales & Money Received Ledger
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
              Daily summary of milk sold, revenue billed, and exact cash/bank money received day by day.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition"
              title="Print Day-by-Day Ledger"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-500" />
              <span>Print Ledger</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition"
              title="Download spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-200/80">
          {/* Time range pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTimeRange('this-month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === 'this-month'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              This Month ({getMonthName(currentMonthStr).split(' ')[0]})
            </button>
            <button
              onClick={() => setTimeRange('7-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === '7-days'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('14-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === '14-days'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Last 14 Days
            </button>
            <button
              onClick={() => setTimeRange('30-days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === '30-days'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === 'all'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              All Recorded Days
            </button>
          </div>

          {/* Month selector & Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="month"
                value={timeRange === 'this-month' ? currentMonthStr : selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setTimeRange('custom-month');
                }}
                className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none"
              />
            </div>

            <input
              type="text"
              placeholder="Search date or shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Aggregate KPI Strip for the chosen period */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 sm:p-5 bg-neutral-50 border-b border-neutral-200">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 tracking-wider">
            Total Milk Sold
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {totalMetrics.totalMilk.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">{settings.default_unit}</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {totalMetrics.activeDaysCount} active dispatch days
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 tracking-wider">
            Total Sales (Billed)
          </p>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums">
            {formatCurrency(totalMetrics.totalSales, settings.currency_symbol)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Billed milk value</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider flex items-center gap-1">
            <span>Money Received</span>
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </p>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatCurrency(totalMetrics.totalReceived, settings.currency_symbol)}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Cash & bank collections</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase text-rose-700 tracking-wider flex items-center gap-1">
            <span>Net Pending</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </p>
          <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {formatCurrency(Math.max(0, totalMetrics.netDifference), settings.currency_symbol)}
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Sales minus receipts</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-neutral-500 tracking-wider">
              Collection Efficiency
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                {totalMetrics.overallRate}%
              </span>
              <span className="text-[11px] font-semibold text-neutral-500">
                {totalMetrics.totalReceived >= totalMetrics.totalSales && totalMetrics.totalSales > 0 ? (
                  <span className="text-emerald-700">100% Cleared</span>
                ) : (
                  <span>Ratio</span>
                )}
              </span>
            </div>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalMetrics.overallRate >= 90
                  ? 'bg-emerald-600'
                  : totalMetrics.overallRate >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, totalMetrics.overallRate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Day-by-Day Table */}
      <div id="day-by-day-ledger-printable" className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100/80 text-neutral-700 font-bold border-b border-neutral-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Date / Calendar Day</th>
              <th className="py-3 px-4 text-center">Shops Served</th>
              <th className="py-3 px-4 text-right">Milk Sold ({settings.default_unit})</th>
              <th className="py-3 px-4 text-right">Total Sold (Bill Amount)</th>
              <th className="py-3 px-4 text-right">Money Received (Collected)</th>
              <th className="py-3 px-4 text-right">Day Difference</th>
              <th className="py-3 px-4 text-center">Collection Status</th>
              <th className="py-3 px-4 text-center no-print">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {filteredAndSortedDays.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-neutral-500">
                  <Receipt className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="font-semibold text-neutral-700">No records found for this period</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Try choosing a different timeframe or log new milk dispatches.
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <button
                      onClick={onOpenQuickSale}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                    >
                      + Add Milk Sale
                    </button>
                    <button
                      onClick={() => onOpenPaymentModal()}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
                    >
                      + Record Payment
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedDays.map((day) => {
                const isExpanded = expandedDate === day.date;
                const hasActivity = day.salesAmount > 0 || day.receivedAmount > 0;

                return (
                  <React.Fragment key={day.date}>
                    <tr
                      onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                      className={`cursor-pointer transition-colors ${
                        day.isToday
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70 font-medium'
                          : isExpanded
                          ? 'bg-neutral-50'
                          : 'hover:bg-neutral-50/80'
                      }`}
                    >
                      {/* Date & Day */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900">
                            {formatDate(day.date)}
                          </span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-600 text-white shadow-2xs">
                              Today
                            </span>
                          )}
                          <span className="text-neutral-400 font-normal">({day.dayName.split(' ')[0]})</span>
                        </div>
                      </td>

                      {/* Shops count */}
                      <td className="py-3 px-4 text-center font-mono">
                        {day.shopsCount > 0 ? (
                          <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-800 font-semibold">
                            {day.shopsCount} {day.shopsCount === 1 ? 'shop' : 'shops'}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Milk Sold Qty */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {day.milkQty > 0 ? (
                          <span>
                            {day.milkQty} {settings.default_unit}
                          </span>
                        ) : (
                          <span className="text-neutral-300 font-normal">0</span>
                        )}
                      </td>

                      {/* Total Sales (Billed) */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {day.salesAmount > 0 ? (
                          formatCurrency(day.salesAmount, settings.currency_symbol)
                        ) : (
                          <span className="text-neutral-300 font-normal">0</span>
                        )}
                      </td>

                      {/* Money Received (Collected) */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {day.receivedAmount > 0 ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                            {formatCurrency(day.receivedAmount, settings.currency_symbol)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-medium">0</span>
                        )}
                      </td>

                      {/* Day Difference */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {day.difference > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            +{formatCurrency(day.difference, settings.currency_symbol)}
                          </span>
                        ) : day.difference < 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {formatCurrency(day.difference, settings.currency_symbol)} (Adv)
                          </span>
                        ) : (
                          <span className="text-neutral-400">0 (Balanced)</span>
                        )}
                      </td>

                      {/* Collection Progress & Badge */}
                      <td className="py-3 px-4 text-center">
                        {day.salesAmount === 0 && day.receivedAmount === 0 ? (
                          <span className="text-neutral-400 text-[11px]">No activity</span>
                        ) : day.receivedAmount >= day.salesAmount ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>100% Cleared</span>
                          </span>
                        ) : day.receivedAmount > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">
                              {day.collectionRate}% Collected
                            </span>
                            <div className="w-16 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full"
                                style={{ width: `${day.collectionRate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Uncollected</span>
                          </span>
                        )}
                      </td>

                      {/* Expand / Collapse toggle */}
                      <td className="py-3 px-4 text-center no-print">
                        <button
                          type="button"
                          className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                          title={isExpanded ? 'Collapse breakdown' : 'View daily transactions breakdown'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <tr className="bg-neutral-50/80 border-b border-neutral-200 no-print animate-in fade-in duration-150">
                        <td colSpan={8} className="p-4 sm:p-5">
                          <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-2">
                                  <span>Transactions Breakdown for {formatDate(day.date)}</span>
                                  {day.isToday && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded">
                                      Today
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-neutral-500">
                                  {day.salesList.length} milk deliveries billed · {day.paymentsList.length} payment receipts received
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate('daily-sales', { date: day.date });
                                  }}
                                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                                >
                                  <span>Open Daily Sales Register</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Dual Grid: Deliveries Sold vs Payments Received */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Deliveries Sold */}
                              <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                                    <Milk className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Milk Deliveries Sold ({day.salesList.length})</span>
                                  </span>
                                  <span className="text-xs font-mono font-bold text-neutral-900">
                                    {formatCurrency(day.salesAmount, settings.currency_symbol)}
                                  </span>
                                </div>

                                {day.salesList.length === 0 ? (
                                  <p className="text-[11px] text-neutral-400 py-3 text-center italic">
                                    No milk dispatches logged on this day.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {day.salesList.map((s) => (
                                      <div
                                        key={s.id}
                                        className="bg-white p-2 rounded border border-neutral-200/80 flex items-center justify-between text-xs"
                                      >
                                        <div>
                                          <p className="font-semibold text-neutral-900">{s.shopName}</p>
                                          <p className="text-[11px] text-neutral-500">
                                            {s.quantity} {s.unit} @ {settings.currency_symbol}{s.rate}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-mono font-bold text-neutral-900">
                                            {formatCurrency(s.total_amount, settings.currency_symbol)}
                                          </p>
                                          <p className="text-[10px] text-neutral-500">
                                            {s.paid_amount > 0 ? (
                                              <span className="text-emerald-700 font-medium">
                                                Paid: {formatCurrency(s.paid_amount, settings.currency_symbol)}
                                              </span>
                                            ) : (
                                              <span className="text-rose-600 font-medium">Unpaid</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right: Payments Received */}
                              <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Money Collected & Received ({day.paymentsList.length})</span>
                                  </span>
                                  <span className="text-xs font-mono font-bold text-emerald-700">
                                    {formatCurrency(day.receivedAmount, settings.currency_symbol)}
                                  </span>
                                </div>

                                {day.paymentsList.length === 0 ? (
                                  <p className="text-[11px] text-neutral-400 py-3 text-center italic">
                                    No money collected on this day.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {day.paymentsList.map((p) => (
                                      <div
                                        key={p.id}
                                        className="bg-white p-2 rounded border border-neutral-200/80 flex items-center justify-between text-xs"
                                      >
                                        <div>
                                          <p className="font-semibold text-neutral-900">{p.shopName}</p>
                                          <p className="text-[11px] text-neutral-500">
                                            Method: <span className="font-medium text-neutral-700">{p.payment_method}</span> {p.reference ? `(${p.reference})` : ''}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-mono font-bold text-emerald-700">
                                            {formatCurrency(p.amount, settings.currency_symbol)}
                                          </p>
                                          <p className="text-[10px] text-neutral-400 font-mono">
                                            {p.id}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Grand Totals Footer */}
          {filteredAndSortedDays.length > 0 && (
            <tfoot className="bg-neutral-100 font-bold border-t-2 border-neutral-300 text-neutral-900 text-xs">
              <tr>
                <td className="py-3 px-4">
                  TOTAL ({filteredAndSortedDays.length} Days in view)
                </td>
                <td className="py-3 px-4 text-center font-mono">
                  {totalMetrics.activeDaysCount} active
                </td>
                <td className="py-3 px-4 text-right font-mono text-neutral-900">
                  {totalMetrics.totalMilk.toLocaleString()} {settings.default_unit}
                </td>
                <td className="py-3 px-4 text-right font-mono text-neutral-900">
                  {formatCurrency(totalMetrics.totalSales, settings.currency_symbol)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700">
                  {formatCurrency(totalMetrics.totalReceived, settings.currency_symbol)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-rose-700">
                  {formatCurrency(Math.max(0, totalMetrics.netDifference), settings.currency_symbol)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 bg-neutral-200 rounded font-mono text-neutral-800">
                    {totalMetrics.overallRate}% Collected
                  </span>
                </td>
                <td className="py-3 px-4 no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
