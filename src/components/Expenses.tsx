import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { formatCurrency, formatDate, cleanNumericInput, parseCleanNumber } from '../utils/formatters';
import {
  CircleDollarSign,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  TrendingDown,
  PieChart,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, addExpense, deleteExpense, settings } = useDairy();
  const { can } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('2026-09');

  const [formData, setFormData] = useState({
    expense_date: '2026-09-28',
    category: 'Animal Feed' as ExpenseCategory,
    description: '',
    amount: 15000,
    payment_method: 'Cash' as PaymentMethod,
    notes: '',
  });

  const categories: ExpenseCategory[] = [
    'Animal Feed',
    'Medicine',
    'Electricity',
    'Employee Salary',
    'Transportation',
    'Maintenance',
    'Equipment',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (monthFilter && !e.expense_date.startsWith(monthFilter)) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    });
  }, [expenses, monthFilter, categoryFilter, searchQuery]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  // Breakdown by category
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c] = 0));
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return categories
      .map((cat) => ({
        category: cat,
        amount: map[cat],
        percentage: totalExpenseAmount > 0 ? Math.round((map[cat] / totalExpenseAmount) * 100) : 0,
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categories, filteredExpenses, totalExpenseAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || formData.amount <= 0) return;

    addExpense({
      ...formData,
      amount: Number(formData.amount),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Farm Cost Center</span>
            <span aria-hidden="true">·</span>
            <span>Operating Expenditures</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Farm Expense Management
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Record fodder, cattle feed, medicines, utilities, salaries and maintenance costs.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expense Stats & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Expense KPI */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                Total Expenses
              </span>
              <span className="p-1.5 rounded-md bg-rose-50 text-rose-700">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-bold font-mono text-neutral-900">
              {formatCurrency(totalExpenseAmount, settings.currency_symbol)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              For period: {monthFilter || 'All Time'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-500">
            Recorded items: <strong>{filteredExpenses.length}</strong>
          </div>
        </div>

        {/* Category Breakdown Visual Bars */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase text-neutral-700 mb-3 tracking-wider">
            Expenses By Category
          </h2>
          <div className="space-y-2.5">
            {categoryTotals.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4">No categorized expenses in this filter.</p>
            ) : (
              categoryTotals.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-mono text-[11px]">{cat.percentage}%</span>
                      <span className="font-mono font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(cat.amount, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-800 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description, category or voucher..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-neutral-50/80">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900 max-w-sm">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{exp.payment_method}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums text-sm">
                      {formatCurrency(exp.amount, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">{exp.notes || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {can('delete_financial') && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete expense record ${exp.description}?`)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-neutral-500 hover:text-rose-700 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base font-bold text-neutral-900">Record Farm Expense</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full px-3 py-2 border rounded-lg font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="e.g. Silage 10 Tons, Tube-well electricity bill"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Amount ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseCleanNumber(e.target.value) })
                    }
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-base"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Online Transfer">Online (JazzCash/EasyPaisa)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Notes / Voucher Reference</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Paid to Supreme Feeds supplier"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-lg font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
