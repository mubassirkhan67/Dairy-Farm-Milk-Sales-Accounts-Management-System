import React, { useMemo, useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { formatCurrency, formatQuantity, formatDate } from '../utils/formatters';
import {
  Milk,
  TrendingUp,
  Receipt,
  Users,
  Plus,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  BarChart3,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string, params?: any) => void;
  onOpenQuickSale: () => void;
  onOpenPaymentModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenQuickSale,
  onOpenPaymentModal,
}) => {
  const {
    getDashboardMetrics,
    settings,
    milkSales,
    payments,
    shopkeepers,
    getAllShopkeepersBalances,
  } = useDairy();

  const [referenceDate, setReferenceDate] = useState('2026-09-28');
  const metrics = useMemo(() => getDashboardMetrics(referenceDate), [getDashboardMetrics, referenceDate]);

  // Today's milk sales deliveries
  const todayDeliveries = useMemo(() => {
    return milkSales
      .filter((s) => s.sale_date === referenceDate)
      .map((sale) => {
        const sk = shopkeepers.find((s) => s.id === sale.shopkeeper_id);
        return {
          ...sale,
          shopName: sk?.shop_name || 'Unknown Shop',
          ownerName: sk?.owner_name || '',
          phone: sk?.phone || '',
        };
      });
  }, [milkSales, referenceDate, shopkeepers]);

  // Top shopkeepers by outstanding balance
  const topPendingShopkeepers = useMemo(() => {
    return getAllShopkeepersBalances()
      .filter((b) => b.remainingBalance > 0)
      .sort((a, b) => b.remainingBalance - a.remainingBalance)
      .slice(0, 5);
  }, [getAllShopkeepersBalances]);

  // Calculate 7-day trend data
  const sevenDayTrend = useMemo(() => {
    const days: { date: string; label: string; milk: number; sales: number; paid: number }[] = [];
    const baseDate = new Date(referenceDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = milkSales.filter((s) => s.sale_date === dateStr);
      const milk = daySales.reduce((acc, s) => acc + s.quantity, 0);
      const sales = daySales.reduce((acc, s) => acc + s.total_amount, 0);

      const dayPayments = payments.filter((p) => p.payment_date === dateStr);
      const paid = dayPayments.reduce((acc, p) => acc + p.amount, 0);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      days.push({ date: dateStr, label: dayName, milk, sales, paid });
    }
    return days;
  }, [milkSales, payments, referenceDate]);

  const maxMilkTrend = Math.max(...sevenDayTrend.map((d) => d.milk), 100);

  // Dynamic monthly comparison calculated purely from real recorded sales
  const monthlySummary = useMemo(() => {
    const curMonth = referenceDate.slice(0, 7);
    const monthsSet = new Set<string>([curMonth]);
    milkSales.forEach((s) => {
      if (s.sale_date) monthsSet.add(s.sale_date.slice(0, 7));
    });
    const sortedMonths = Array.from(monthsSet).sort().slice(-4);

    return sortedMonths.map((mCode) => {
      const mSales = milkSales.filter((s) => s.sale_date?.startsWith(mCode));
      const mPayments = payments.filter((p) => p.payment_date?.startsWith(mCode));
      const milk = mSales.reduce((acc, s) => acc + s.quantity, 0);
      const sales = mSales.reduce((acc, s) => acc + s.total_amount, 0);
      const paid = mPayments.reduce((acc, p) => acc + p.amount, 0);

      const [y, m] = mCode.split('-').map(Number);
      const dateObj = new Date(y, m - 1, 1);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        code: mCode,
        name: mCode === curMonth ? `${monthLabel} (Current)` : monthLabel,
        milk,
        sales,
        paid,
      };
    });
  }, [milkSales, payments, referenceDate]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Dairy Operations Center</span>
            <span aria-hidden="true">·</span>
            <span>Date: {formatDate(referenceDate)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Farm Sales & Accounts Overview
          </h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Automated calculations for daily milk dispatches, shop balances & monthly ledgers.
          </p>
        </div>

        {/* Quick Action Touch Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenQuickSale}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Milk Sale</span>
          </button>

          <button
            onClick={onOpenPaymentModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm rounded-lg shadow-xs transition-colors"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => onNavigate('bill-generator')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-sm rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4 text-neutral-500" />
            <span>Generate Bill</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Section 2 of prompt) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Today's Milk */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Today's Milk
            </span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <Milk className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums">
              {metrics.todayMilk}
            </span>
            <span className="text-sm font-semibold text-neutral-600">{settings.default_unit}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-2">
            <span>Deliveries Today:</span>
            <span className="font-semibold text-neutral-800 font-mono tabular-nums">
              {metrics.todayDeliveriesCount} shops
            </span>
          </div>
        </div>

        {/* Metric 2: Today's Sales */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums">
              {formatCurrency(metrics.todaySales, settings.currency_symbol)}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-2">
            <span>Avg Rate:</span>
            <span className="font-semibold text-neutral-800 font-mono tabular-nums">
              {settings.currency_symbol} 220/{settings.default_unit}
            </span>
          </div>
        </div>

        {/* Metric 3: This Month Milk */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              This Month Milk
            </span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums">
              {metrics.monthMilk.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-neutral-600">{settings.default_unit}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-2">
            <span>Monthly Sales:</span>
            <span className="font-semibold text-neutral-800 font-mono tabular-nums">
              {formatCurrency(metrics.monthSales, settings.currency_symbol)}
            </span>
          </div>
        </div>

        {/* Metric 4: Total Outstanding */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Outstanding Amount
            </span>
            <span className="p-1.5 rounded-md bg-rose-50 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 font-mono tabular-nums">
              {formatCurrency(metrics.totalOutstanding, settings.currency_symbol)}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between border-t border-neutral-100 pt-2">
            <span>Total Received:</span>
            <span className="font-semibold text-emerald-700 font-mono tabular-nums">
              {formatCurrency(metrics.monthReceived, settings.currency_symbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Stats Sub-Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Active Shopkeepers</p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums">
              {metrics.activeShopkeepersCount} Shops
            </p>
          </div>
          <button
            onClick={() => onNavigate('shopkeepers')}
            className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
          >
            <span>View</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Current Milk Rate</p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums">
              {settings.currency_symbol} 220 / {settings.default_unit}
            </p>
          </div>
          <button
            onClick={() => onNavigate('milk-rates')}
            className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
          >
            <span>Manage</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Total Month Received</p>
            <p className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
              {formatCurrency(metrics.monthReceived, settings.currency_symbol)}
            </p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
          >
            <span>History</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Collection Ratio</p>
            <p className="text-lg font-bold text-neutral-900 font-mono tabular-nums">
              {metrics.monthSales > 0
                ? `${Math.round((metrics.monthReceived / metrics.monthSales) * 100)}%`
                : '100%'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('monthly-report')}
            className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
          >
            <span>Ledger</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Content Split: Charts & Today's Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): 7-Day Trend Chart & Monthly Bar Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-Day Milk Dispatches Visual Chart */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">7-Day Daily Milk Dispatches</h2>
                <p className="text-xs text-neutral-500">
                  Daily quantity supplied across all client shopkeepers
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                Unit: {settings.default_unit}
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="space-y-3 pt-2">
              {sevenDayTrend.map((day) => {
                const percentage = Math.min(100, Math.round((day.milk / maxMilkTrend) * 100));
                const isToday = day.date === referenceDate;
                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${isToday ? 'text-emerald-700 font-bold' : 'text-neutral-700'}`}>
                        {day.label} {isToday && '(Today)'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-neutral-500 tabular-nums">
                          {formatCurrency(day.sales, settings.currency_symbol)}
                        </span>
                        <span className="font-mono font-bold text-neutral-900 tabular-nums w-16 text-right">
                          {day.milk} {settings.default_unit}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isToday ? 'bg-emerald-600' : 'bg-neutral-800'
                        }`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Comparison Table & Graph (Section 15 of prompt) */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Monthly Milk Sales Trend</h2>
                <p className="text-xs text-neutral-500">Historical performance & revenue comparison</p>
              </div>
              <button
                onClick={() => onNavigate('monthly-report')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Full Monthly Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {monthlySummary.map((m) => {
                const maxSales = 1800000;
                const widthPercent = Math.min(100, Math.round((m.sales / maxSales) * 100));
                return (
                  <div key={m.code} className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-neutral-800">{m.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-neutral-600 tabular-nums">
                          {m.milk.toLocaleString()} {settings.default_unit}
                        </span>
                        <span className="font-mono font-bold text-neutral-900 tabular-nums">
                          {formatCurrency(m.sales, settings.currency_symbol)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Today's Deliveries & Top Outstanding */}
        <div className="space-y-6">
          {/* Today's Dispatches Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Today's Milk Deliveries</h2>
                <p className="text-xs text-neutral-500">
                  {todayDeliveries.length} records logged on {formatDate(referenceDate)}
                </p>
              </div>
              <button
                onClick={() => onNavigate('daily-sales', { date: referenceDate })}
                className="text-xs text-emerald-700 font-medium hover:underline"
              >
                View All
              </button>
            </div>

            {todayDeliveries.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg">
                <p className="text-xs text-neutral-500">No milk sales logged yet today.</p>
                <button
                  onClick={onOpenQuickSale}
                  className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  + Add first delivery
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {todayDeliveries.map((sale) => (
                  <div key={sale.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{sale.shopName}</p>
                      <p className="text-[11px] text-neutral-500">
                        {sale.quantity} {sale.unit} @ {settings.currency_symbol}{sale.rate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-900 font-mono tabular-nums">
                        {formatCurrency(sale.total_amount, settings.currency_symbol)}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums">
                        {sale.remaining_amount === 0 ? (
                          <span className="text-emerald-700 font-medium">Fully Paid</span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            Bal: {formatCurrency(sale.remaining_amount, settings.currency_symbol)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-neutral-100">
              <button
                onClick={onOpenQuickSale}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Dispatch</span>
              </button>
            </div>
          </div>

          {/* Highest Outstanding Balances */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Highest Outstanding</h2>
                <p className="text-xs text-neutral-500">Top pending balances requiring collection</p>
              </div>
              <button
                onClick={() => onNavigate('shopkeepers')}
                className="text-xs text-emerald-700 font-medium hover:underline"
              >
                All Shops
              </button>
            </div>

            <div className="divide-y divide-neutral-100">
              {topPendingShopkeepers.map((item) => (
                <div key={item.shopkeeperId} className="py-2.5 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{item.shopName}</p>
                    <p className="text-[11px] text-neutral-500">{item.ownerName}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-xs font-bold text-rose-600 font-mono tabular-nums">
                      {formatCurrency(item.remainingBalance, settings.currency_symbol)}
                    </p>
                    <button
                      onClick={() => onNavigate('bill-generator', { shopkeeperId: item.shopkeeperId })}
                      className="text-[11px] text-neutral-500 hover:text-emerald-700 hover:underline"
                    >
                      Make Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
