import React, { useState, useEffect, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { UnitType } from '../types';
import { formatCurrency, cleanNumericInput, parseCleanNumber, getTodayDateString } from '../utils/formatters';
import { X, Check, Calculator, AlertCircle, Sparkles } from 'lucide-react';

interface MilkSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShopkeeperId?: string;
  initialDate?: string;
  onSuccess?: (saleId: string) => void;
}

export const MilkSaleModal: React.FC<MilkSaleModalProps> = ({
  isOpen,
  onClose,
  initialShopkeeperId,
  initialDate,
  onSuccess,
}) => {
  const {
    shopkeepers,
    addMilkSale,
    getEffectiveRateForDate,
    getShopkeeperBalance,
    settings,
  } = useDairy();

  const [date, setDate] = useState(() => initialDate || getTodayDateString());
  const [shopkeeperId, setShopkeeperId] = useState(initialShopkeeperId || '');
  const [quantity, setQuantity] = useState<string>('25');
  const [unit, setUnit] = useState<UnitType>(settings.default_unit || 'KG');
  const [rate, setRate] = useState<string>('220');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Guaranteed initialization whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || getTodayDateString());
      const defaultSk =
        (initialShopkeeperId && shopkeepers.find((s) => s.id === initialShopkeeperId)?.id) ||
        shopkeepers.find((s) => s.id === shopkeeperId)?.id ||
        (shopkeepers.find((s) => s.status === 'active') || shopkeepers[0])?.id ||
        'S001';
      setShopkeeperId(defaultSk);
      setQuantity('25');
      setPaidAmount('0');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialDate, initialShopkeeperId, shopkeepers]);

  // When date changes, update the recommended rate
  useEffect(() => {
    if (date) {
      const effRate = getEffectiveRateForDate(date);
      setRate(effRate.toString());
    }
  }, [date, getEffectiveRateForDate]);

  // Active shopkeeper data & current balance
  const currentShopkeeper = useMemo(() => {
    return shopkeepers.find((s) => s.id === shopkeeperId) || shopkeepers[0];
  }, [shopkeepers, shopkeeperId]);

  const effectiveShopkeeperId = currentShopkeeper?.id || shopkeeperId || 'S001';

  const shopkeeperBalance = useMemo(() => {
    if (!effectiveShopkeeperId) return null;
    return getShopkeeperBalance(effectiveShopkeeperId);
  }, [effectiveShopkeeperId, getShopkeeperBalance]);

  // Calculations
  const numQuantity = parseCleanNumber(quantity);
  const numRate = parseCleanNumber(rate);
  const totalAmount = Math.round(numQuantity * numRate);
  const numPaid = parseCleanNumber(paidAmount);
  const remainingAmount = Math.max(0, totalAmount - numPaid);

  if (!isOpen) return null;

  const handleQuickAddQty = (increment: number) => {
    const cur = parseCleanNumber(quantity);
    setQuantity((Math.max(0, cur + increment)).toString());
  };

  const handleSetExactQty = (val: number) => {
    setQuantity(val.toString());
  };

  const handleFullPayment = () => {
    setPaidAmount(totalAmount.toString());
  };

  const handleZeroPayment = () => {
    setPaidAmount('0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetShopId = effectiveShopkeeperId;

    // Validation
    if (!targetShopId) {
      setError('Please select a shopkeeper.');
      return;
    }
    if (!date) {
      setError('Please specify a valid dispatch date.');
      return;
    }
    if (numQuantity <= 0) {
      setError('Milk quantity must be greater than zero.');
      return;
    }
    if (numRate <= 0) {
      setError('Milk rate must be greater than zero.');
      return;
    }
    if (numPaid < 0) {
      setError('Payment amount cannot be negative.');
      return;
    }

    try {
      const result = addMilkSale({
        shopkeeper_id: targetShopId,
        sale_date: date,
        quantity: numQuantity,
        unit,
        rate: numRate,
        paid_amount: numPaid,
        notes: notes.trim(),
      });

      setSuccessMessage(
        `Milk sale of ${numQuantity} ${unit} (Total: ${formatCurrency(totalAmount, settings.currency_symbol)}) saved successfully!`
      );

      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess(result.sale.id);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to save milk sale. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-emerald-600 rounded-lg text-white font-bold">🥛</span>
            <div>
              <h2 className="text-base font-bold leading-tight">Add Daily Milk Sale</h2>
              <p className="text-xs text-neutral-300">Fast entry for daily shopkeeper milk dispatches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Row 1: Date & Shopkeeper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Dispatch Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Unit Preferred *
              </label>
              <div className="flex rounded-lg border border-neutral-300 p-0.5 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setUnit('KG')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    unit === 'KG' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  KG
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('Liter')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    unit === 'Liter' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Liter
                </button>
              </div>
            </div>
          </div>

          {/* Shopkeeper Selection with 1-Click Cards & Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Select Shopkeeper / Client *
            </label>

            {/* Quick 1-click Cards for the registered shops */}
            {shopkeepers.length === 0 ? (
              <div className="p-3 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-xs text-neutral-500 text-center mb-2">
                No shopkeepers registered yet. Please add a customer first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {shopkeepers.map((s) => {
                  const isSelected = effectiveShopkeeperId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShopkeeperId(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 text-emerald-950 font-bold shadow-xs'
                          : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold leading-tight">{s.shop_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                          {s.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{s.owner_name}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <select
              value={effectiveShopkeeperId}
              onChange={(e) => setShopkeeperId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-neutral-50"
            >
              {shopkeepers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name} ({s.owner_name} · {s.id})
                </option>
              ))}
            </select>

            {shopkeeperBalance && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500 px-1">
                <span>
                  Owner: <strong className="text-neutral-800">{shopkeeperBalance.ownerName}</strong>
                </span>
                <span>
                  Current Outstanding:{' '}
                  <strong className={shopkeeperBalance.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {formatCurrency(shopkeeperBalance.remainingBalance, settings.currency_symbol)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Quantity & Rate with Quick Preset Chips */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">
                  Milk Quantity ({unit}) *
                </label>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(cleanNumericInput(e.target.value, true))}
                required
                placeholder="e.g. 25"
                className="w-full px-3 py-2.5 text-base font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Milk Rate ({settings.currency_symbol}/{unit}) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(cleanNumericInput(e.target.value, true))}
                required
                className="w-full px-3 py-2.5 text-base font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Large Quick-Tap Quantity Presets for Farm Mobile Touch */}
          <div>
            <p className="text-[11px] font-medium text-neutral-500 mb-1">Quick Select Quantity ({unit}):</p>
            <div className="flex flex-wrap gap-1.5">
              {[10, 20, 25, 30, 40, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetExactQty(preset)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    numQuantity === preset
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                  }`}
                >
                  {preset} {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Automatic Calculation Display Box (Section 4 of prompt) */}
          <div className="p-3.5 bg-neutral-900 text-white rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span>Automatic Calculation:</span>
              <span className="font-mono">
                {numQuantity || 0} {unit} × {settings.currency_symbol}{numRate || 0}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
              <span className="text-sm font-medium text-neutral-200">Total Amount:</span>
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {formatCurrency(totalAmount, settings.currency_symbol)}
              </span>
            </div>
          </div>

          {/* Payment Collected on the Spot (Optional instant payment) */}
          <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-800">
                Payment Received Now (Optional)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFullPayment}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition-colors"
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={handleZeroPayment}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 transition-colors"
                >
                  0 Paid
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(cleanNumericInput(e.target.value, true))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="text-right">
                <span className="text-[11px] text-neutral-500 block">Remaining for this sale:</span>
                <span className="text-sm font-bold font-mono text-rose-600 tabular-nums">
                  {formatCurrency(remainingAmount, settings.currency_symbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning 6 AM batch, cash paid"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons: Large Touch Save Sale Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-neutral-300 rounded-xl text-neutral-700 font-semibold text-sm hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>SAVE SALE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
