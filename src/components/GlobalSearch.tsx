import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Search,
  Store,
  Milk,
  Receipt,
  PiggyBank,
  X,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, params?: any) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { shopkeepers, milkSales, payments, animals, settings } = useDairy();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();

    // 1. Search Shopkeepers
    const matchedShops = shopkeepers.filter(
      (s) =>
        s.shop_name.toLowerCase().includes(q) ||
        s.owner_name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );

    // 2. Search Milk Sales
    const matchedSales = milkSales
      .filter((s) => {
        const sk = shopkeepers.find((sh) => sh.id === s.shopkeeper_id);
        return (
          s.id.toLowerCase().includes(q) ||
          s.sale_date.includes(q) ||
          s.notes.toLowerCase().includes(q) ||
          sk?.shop_name.toLowerCase().includes(q) ||
          sk?.owner_name.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);

    // 3. Search Payments
    const matchedPayments = payments
      .filter((p) => {
        const sk = shopkeepers.find((sh) => sh.id === p.shopkeeper_id);
        return (
          p.id.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          p.payment_date.includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          sk?.shop_name.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);

    // 4. Search Animals
    const matchedAnimals = animals
      .filter(
        (a) =>
          a.animal_code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.breed.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      )
      .slice(0, 6);

    return {
      shops: matchedShops,
      sales: matchedSales,
      payments: matchedPayments,
      animals: matchedAnimals,
      total:
        matchedShops.length +
        matchedSales.length +
        matchedPayments.length +
        matchedAnimals.length,
    };
  }, [query, shopkeepers, milkSales, payments, animals]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 sm:pt-16">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by shop name, owner, phone, date, invoice or sale ID..."
            className="w-full text-sm font-medium text-neutral-900 focus:outline-none placeholder:text-neutral-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 bg-neutral-100 rounded"
          >
            Esc
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4 text-xs">
          {!query.trim() ? (
            <div className="py-8 text-center text-neutral-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-neutral-600">Global Dairy Search</p>
              <p className="text-xs text-neutral-400 mt-1">
                Type a shop name, proprietor, phone number (e.g. 0300), date, or sale ID (e.g. MS-1030).
              </p>
            </div>
          ) : results?.total === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              <p className="text-sm font-medium">No results found for "{query}".</p>
              <p className="text-xs text-neutral-400 mt-1">Check spelling or search by another keyword.</p>
            </div>
          ) : (
            <>
              {/* Matched Shopkeepers */}
              {results && results.shops.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>Shopkeepers ({results.shops.length})</span>
                  </h3>
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                    {results.shops.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onNavigate('bill-generator', { shopkeeperId: s.id });
                          onClose();
                        }}
                        className="p-3 hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">{s.shop_name}</div>
                          <div className="text-[11px] text-neutral-500">
                            Owner: {s.owner_name} · Phone: {s.phone} · ID: {s.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 font-medium">
                          <span>View Account</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Milk Sales */}
              {results && results.sales.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Milk className="w-3.5 h-3.5" />
                    <span>Milk Sales Dispatches ({results.sales.length})</span>
                  </h3>
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                    {results.sales.map((sale) => {
                      const sk = shopkeepers.find((s) => s.id === sale.shopkeeper_id);
                      return (
                        <div
                          key={sale.id}
                          onClick={() => {
                            onNavigate('daily-sales', { date: sale.sale_date });
                            onClose();
                          }}
                          className="p-3 hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-neutral-900">
                              {sk?.shop_name || 'Shop'} — {sale.quantity} {sale.unit} @ {sale.rate}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Sale ID: {sale.id} · Date: {formatDate(sale.sale_date)} · {sale.notes}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-neutral-900">
                              {formatCurrency(sale.total_amount, settings.currency_symbol)}
                            </span>
                            <span className="block text-[11px] text-neutral-400">View Date</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Payments */}
              {results && results.payments.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Payments ({results.payments.length})</span>
                  </h3>
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                    {results.payments.map((p) => {
                      const sk = shopkeepers.find((s) => s.id === p.shopkeeper_id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            onNavigate('payments', { shopkeeperId: p.shopkeeper_id });
                            onClose();
                          }}
                          className="p-3 hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-neutral-900">
                              {sk?.shop_name} — {p.payment_method}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Ref: {p.reference} · Date: {formatDate(p.payment_date)} · ID: {p.id}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-700">
                              {formatCurrency(p.amount, settings.currency_symbol)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Animals */}
              {results && results.animals.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <PiggyBank className="w-3.5 h-3.5" />
                    <span>Livestock ({results.animals.length})</span>
                  </h3>
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                    {results.animals.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => {
                          onNavigate('animals');
                          onClose();
                        }}
                        className="p-3 hover:bg-neutral-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">
                            {a.name} ({a.animal_code})
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {a.type} · {a.breed} · Status: {a.status}
                          </div>
                        </div>
                        <div className="font-mono font-semibold text-neutral-700">
                          {a.milk_production} L/day
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
