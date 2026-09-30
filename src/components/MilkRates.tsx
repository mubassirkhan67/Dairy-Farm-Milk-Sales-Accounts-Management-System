import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, cleanNumericInput, parseCleanNumber } from '../utils/formatters';
import { Tag, Plus, ShieldCheck, AlertCircle, Clock, Info, Check } from 'lucide-react';

export const MilkRates: React.FC = () => {
  const { milkRates, addMilkRate, currentEffectiveRate, settings } = useDairy();
  const { can, requireAdmin } = useAuth();

  const [rate, setRate] = useState<string>('230');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-10-01');
  const [notes, setNotes] = useState<string>('Winter rate adjustment');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numRate = parseCleanNumber(rate);
    if (!numRate || numRate <= 0) return;
    if (!effectiveDate) return;

    requireAdmin(() => {
      addMilkRate(numRate, effectiveDate, notes);
      setSuccessMessage(`New rate of ${formatCurrency(numRate, settings.currency_symbol)} effective from ${formatDate(effectiveDate)} added.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    });
  };

  const sortedRates = [...milkRates].sort((a, b) => b.effective_from.localeCompare(a.effective_from));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Price Control</span>
            <span aria-hidden="true">·</span>
            <span>Historical rate preservation</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Milk Rate Management
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Configure current and scheduled future milk rates while preserving historical transaction prices.
          </p>
        </div>
      </div>

      {/* Critical Historical Invariance Banner (Section 12 requirement) */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 space-y-1">
          <p className="font-bold text-sm">Historical Price Protection Active</p>
          <p>
            When a new milk rate is added (e.g. Rs. 230/KG from 01 October 2026), all previously recorded sales (e.g. September sales at Rs. 220/KG) remain strictly preserved at their original rate and total bill amount. Old sales are never modified.
          </p>
        </div>
      </div>

      {/* Main Grid: Current Rate Card & Add New Rate Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Current Active Rate Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wider">
              Current Farm Gate Rate
            </span>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold font-mono text-neutral-900">
                {formatCurrency(currentEffectiveRate, settings.currency_symbol)}
              </span>
              <span className="text-sm font-semibold text-neutral-600">/ {settings.default_unit}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Default rate applied to all daily milk dispatch calculations.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-600 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Immutable transaction rate locking</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>Supports scheduled future rate dates</span>
            </div>
          </div>
        </div>

        {/* Center & Right (2 Cols): Add New Rate Form */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-neutral-900 mb-1">Schedule or Update Milk Rate</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Enter the new unit price and effective date. New dispatches from this date onwards will use the new rate.
          </p>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {can('manage_rates') ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    New Rate ({settings.currency_symbol} / {settings.default_unit}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(cleanNumericInput(e.target.value, true))}
                    required
                    placeholder="e.g. 230"
                    className="w-full px-3 py-2.5 text-base font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Effective From Date *
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm font-semibold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Reason / Revision Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Increase in fodder and cattle feed prices"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Effective Rate</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-lg text-neutral-600 text-xs">
              <p className="font-semibold text-neutral-800">Admin Permission Required</p>
              <p className="mt-1">
                You are currently signed in as an Employee. Only the Farm Owner (Admin) has permission to revise milk pricing. Switch role in the top-right menu to test this feature.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Rates Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-sm font-bold text-neutral-900">Milk Rate Timeline & History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Rate ID</th>
                <th className="py-3 px-4">Rate / {settings.default_unit}</th>
                <th className="py-3 px-4">Effective From</th>
                <th className="py-3 px-4">Notes / Justification</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedRates.map((r) => {
                const isCurrent = r.rate === currentEffectiveRate;
                return (
                  <tr key={r.id} className="hover:bg-neutral-50/80">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-500">{r.id}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-neutral-900">
                      {formatCurrency(r.rate, settings.currency_symbol)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-700">
                      {formatDate(r.effective_from)}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{r.notes || '—'}</td>
                    <td className="py-3 px-4">
                      {isCurrent ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Active Current
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-500">Scheduled / Past</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
