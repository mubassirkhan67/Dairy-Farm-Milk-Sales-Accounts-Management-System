import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { printElement, downloadPrintableHtml } from '../utils/printHelper';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Printer,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Milk,
  Store,
  Download,
} from 'lucide-react';

export const ProfitLoss: React.FC = () => {
  const { milkSales, animalSales, expenses, settings } = useDairy();

  const [periodFilter, setPeriodFilter] = useState<string>('2026-09');

  // Filter records by month
  const periodMilkSales = useMemo(() => {
    return milkSales.filter((s) => !periodFilter || s.sale_date.startsWith(periodFilter));
  }, [milkSales, periodFilter]);

  const periodAnimalSales = useMemo(() => {
    return animalSales.filter((s) => !periodFilter || s.sale_date.startsWith(periodFilter));
  }, [animalSales, periodFilter]);

  const periodExpenses = useMemo(() => {
    return expenses.filter((e) => !periodFilter || e.expense_date.startsWith(periodFilter));
  }, [expenses, periodFilter]);

  // Calculations (Section 19 formula)
  const milkRevenue = useMemo(() => {
    return periodMilkSales.reduce((acc, s) => acc + s.total_amount, 0);
  }, [periodMilkSales]);

  const animalRevenue = useMemo(() => {
    return periodAnimalSales.reduce((acc, s) => acc + s.sale_price, 0);
  }, [periodAnimalSales]);

  const totalIncome = milkRevenue + animalRevenue;

  const totalExpenses = useMemo(() => {
    return periodExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [periodExpenses]);

  const netProfit = totalIncome - totalExpenses;
  const isProfit = netProfit >= 0;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Financial Statements</span>
            <span aria-hidden="true">·</span>
            <span>{periodFilter ? getMonthName(periodFilter) : 'All Time'}</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Farm Profit & Loss Statement
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Automated net operating profit calculation combining milk revenue, livestock sales and farm costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 text-xs font-mono font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <button
            onClick={() =>
              printElement('profit-loss-statement', {
                title: `Profit_Loss_Statement_${periodFilter}`,
              })
            }
            className="px-3.5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Print Profit & Loss Statement"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
          <button
            onClick={() =>
              downloadPrintableHtml(
                'profit-loss-statement',
                `Profit_Loss_Statement_${periodFilter}.html`
              )
            }
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Download printable statement HTML/PDF"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Save (PDF/HTML)</span>
          </button>
        </div>
      </div>

      {/* Primary Profit & Loss Statement Card (Matches Section 19 Example) */}
      <div
        id="profit-loss-statement"
        className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm max-w-4xl mx-auto print-container"
      >
        <div className="text-center pb-6 border-b border-neutral-200">
          <h2 className="text-2xl font-black uppercase text-neutral-900">{settings.farm_name}</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mt-0.5">
            Operating Profit & Loss Statement
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Period: {periodFilter ? getMonthName(periodFilter) : 'Full Fiscal Year'}
          </p>
        </div>

        {/* Breakdown Grid */}
        <div className="py-6 space-y-6">
          {/* 1. Revenues Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>1. Farm Revenues & Incomes</span>
            </h3>

            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-900 block text-sm">Milk Sales Revenue</span>
                  <span className="text-neutral-500 text-[11px]">
                    Total {periodMilkSales.reduce((a, b) => a + b.quantity, 0)} {settings.default_unit} supplied across {periodMilkSales.length} dispatches
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-neutral-900">
                  {formatCurrency(milkRevenue, settings.currency_symbol)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-900 block text-sm">Animal / Livestock Sales</span>
                  <span className="text-neutral-500 text-[11px]">
                    {periodAnimalSales.length} cattle sold to registered buyers
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-neutral-900">
                  {formatCurrency(animalRevenue, settings.currency_symbol)}
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 flex items-center justify-between font-bold">
                <span className="text-sm text-neutral-900">Total Farm Income:</span>
                <span className="font-mono text-emerald-700 text-lg">
                  {formatCurrency(totalIncome, settings.currency_symbol)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Expenses Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              <span>2. Farm Operating Expenditures</span>
            </h3>

            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-xs">
              {periodExpenses.length === 0 ? (
                <div className="p-4 text-center text-neutral-500">No expenses recorded for this period.</div>
              ) : (
                periodExpenses.slice(0, 6).map((exp) => (
                  <div key={exp.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-neutral-900">{exp.description}</span>
                      <span className="text-neutral-400 text-[11px] block">{exp.category}</span>
                    </div>
                    <span className="font-mono font-semibold text-neutral-800">
                      {formatCurrency(exp.amount, settings.currency_symbol)}
                    </span>
                  </div>
                ))
              )}

              <div className="p-3.5 bg-neutral-50 flex items-center justify-between font-bold">
                <span className="text-sm text-neutral-900">Total Operating Expenses:</span>
                <span className="font-mono text-rose-600 text-lg">
                  {formatCurrency(totalExpenses, settings.currency_symbol)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bottom Net Estimated Profit Box (Section 19 Specification) */}
          <div
            className={`p-6 rounded-2xl border-2 ${
              isProfit
                ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                : 'bg-rose-50/70 border-rose-500 text-rose-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  {isProfit ? 'Estimated Net Operating Profit' : 'Operating Deficit / Net Loss'}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  Calculation: Total Income ({formatCurrency(totalIncome, settings.currency_symbol)}) — Expenses ({formatCurrency(totalExpenses, settings.currency_symbol)})
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums">
                  {formatCurrency(netProfit, settings.currency_symbol)}
                </div>
                <div className="text-xs font-bold mt-1">
                  Profit Margin: {profitMargin}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 text-center text-xs text-neutral-500">
          Generated automatically by {settings.farm_name} Accounts System
        </div>
      </div>
    </div>
  );
};
