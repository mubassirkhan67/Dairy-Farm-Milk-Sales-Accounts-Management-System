import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { Plus, Search, Tag, DollarSign, Phone, User, Check, X, AlertCircle } from 'lucide-react';

interface AnimalSalesProps {
  initialAnimalId?: string;
  isOpenModalImmediately?: boolean;
}

export const AnimalSales: React.FC<AnimalSalesProps> = ({
  initialAnimalId,
  isOpenModalImmediately = false,
}) => {
  const { animals, animalSales, recordAnimalSale, settings } = useDairy();
  const { requireAdmin } = useAuth();

  const [modalOpen, setModalOpen] = useState(isOpenModalImmediately);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [animalId, setAnimalId] = useState(initialAnimalId || '');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [saleDate, setSaleDate] = useState(() => getTodayDateString());
  const [salePrice, setSalePrice] = useState<string>('300000');
  const [paidAmount, setPaidAmount] = useState<string>('300000');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Available animals to sell (Active or currently selected)
  const availableAnimals = useMemo(() => {
    return animals.filter((a) => a.status === 'Active' || a.id === animalId);
  }, [animals, animalId]);

  const numSalePrice = parseFloat(salePrice) || 0;
  const numPaid = parseFloat(paidAmount) || 0;
  const numRemaining = Math.max(0, numSalePrice - numPaid);

  const totalAnimalRevenue = useMemo(() => {
    return animalSales.reduce((acc, s) => acc + s.sale_price, 0);
  }, [animalSales]);

  const totalAnimalCashCollected = useMemo(() => {
    return animalSales.reduce((acc, s) => acc + s.paid_amount, 0);
  }, [animalSales]);

  const handleOpenAddModal = (targetAnimalId?: string) => {
    requireAdmin(() => {
      if (targetAnimalId) setAnimalId(targetAnimalId);
      else if (availableAnimals.length > 0) setAnimalId(availableAnimals[0].id);

      setBuyerName('');
      setBuyerPhone('');
      setSaleDate(getTodayDateString());
      setSalePrice('280000');
      setPaidAmount('280000');
      setNotes('');
      setError(null);
      setModalOpen(true);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!animalId) {
      setError('Please select an animal to sell.');
      return;
    }
    if (!buyerName.trim()) {
      setError('Buyer name is required.');
      return;
    }
    if (numSalePrice <= 0) {
      setError('Sale price must be greater than zero.');
      return;
    }

    requireAdmin(() => {
      try {
        recordAnimalSale({
          animal_id: animalId,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim(),
          sale_date: saleDate,
          sale_price: numSalePrice,
          paid_amount: numPaid,
          remaining_amount: numRemaining,
          notes: notes.trim(),
        });
        setModalOpen(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to record animal sale.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Livestock Revenue</span>
            <span aria-hidden="true">·</span>
            <span>{animalSales.length} animals sold</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Animal Sales Register
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Log cattle sales to buyers and automatically update livestock herd status to Sold.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Animal Sale</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Total Animal Sales Value</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalAnimalRevenue, settings.currency_symbol)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Total Cash Received</p>
          <p className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {formatCurrency(totalAnimalCashCollected, settings.currency_symbol)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs text-neutral-500 font-medium">Animals Disposed / Sold</p>
          <p className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {animalSales.length} Heads
          </p>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Recorded Animal Sales History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Sale ID</th>
                <th className="py-3 px-4">Animal Details</th>
                <th className="py-3 px-4">Sale Date</th>
                <th className="py-3 px-4">Buyer Name & Phone</th>
                <th className="py-3 px-4 text-right">Sale Price</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {animalSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No animal sales logged yet.
                  </td>
                </tr>
              ) : (
                animalSales.map((sale) => {
                  const animal = animals.find((a) => a.id === sale.animal_id);
                  return (
                    <tr key={sale.id} className="hover:bg-neutral-50/80">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-500">{sale.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">
                          {animal?.name || 'Animal'} ({animal?.animal_code})
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {animal?.breed} · {animal?.type}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{sale.buyer_name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{sale.buyer_phone}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(sale.sale_price, settings.currency_symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(sale.paid_amount, settings.currency_symbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {sale.remaining_amount === 0 ? (
                          <span className="text-emerald-700 font-medium">Cleared</span>
                        ) : (
                          <span className="font-bold text-rose-600">
                            {formatCurrency(sale.remaining_amount, settings.currency_symbol)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">{sale.notes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Animal Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base font-bold text-neutral-900">Record Animal Sale</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Select Animal to Sell *
                </label>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg font-medium"
                >
                  {availableAnimals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.animal_code} · {a.type} · {a.breed})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                  Note: Animal status will automatically change to SOLD upon saving.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Buyer Name *</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    placeholder="e.g. Chaudhry Akram"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Buyer Phone</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Sale Price ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Payment Received</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-neutral-50 rounded-lg flex items-center justify-between font-mono">
                <span className="text-neutral-600">Remaining Balance:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(numRemaining, settings.currency_symbol)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Notes / Terms</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Handover completed, medical certificates provided"
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
                  Confirm Animal Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
