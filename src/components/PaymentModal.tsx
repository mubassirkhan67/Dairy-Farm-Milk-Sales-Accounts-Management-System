import React, { useState, useEffect, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { PaymentMethod } from '../types';
import { formatCurrency, cleanNumericInput, parseCleanNumber, getTodayDateString } from '../utils/formatters';
import { X, Check, AlertCircle, Receipt } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShopkeeperId?: string;
  initialDate?: string;
  onSuccess?: (paymentId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  initialShopkeeperId,
  initialDate,
  onSuccess,
}) => {
  const { shopkeepers, addPayment, getShopkeeperBalance, settings } = useDairy();

  const [shopkeeperId, setShopkeeperId] = useState(initialShopkeeperId || '');
  const [paymentDate, setPaymentDate] = useState(() => initialDate || getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState<string>('Cash Payment');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(initialDate || getTodayDateString());
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (initialShopkeeperId) {
      setShopkeeperId(initialShopkeeperId);
    } else if (!shopkeeperId && shopkeepers.length > 0) {
      const activeOne = shopkeepers.find((s) => s.status === 'active') || shopkeepers[0];
      setShopkeeperId(activeOne.id);
    }
  }, [initialShopkeeperId, shopkeepers, shopkeeperId]);

  const shopkeeperBalance = useMemo(() => {
    if (!shopkeeperId) return null;
    return getShopkeeperBalance(shopkeeperId);
  }, [shopkeeperId, getShopkeeperBalance]);

  // If opening for a shopkeeper with pending balance, pre-fill or give quick button
  const handleClearBalance = () => {
    if (shopkeeperBalance && shopkeeperBalance.remainingBalance > 0) {
      setAmount(shopkeeperBalance.remainingBalance.toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseCleanNumber(amount);
    if (!shopkeeperId) {
      setError('Please select a shopkeeper.');
      return;
    }
    if (numAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    try {
      const newPay = addPayment({
        shopkeeper_id: shopkeeperId,
        payment_date: paymentDate,
        amount: numAmount,
        payment_method: paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
      });

      setSuccessMessage(
        `Payment of ${formatCurrency(numAmount, settings.currency_symbol)} recorded successfully!`
      );

      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess(newPay.id);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-neutral-800 rounded-lg text-emerald-400 font-bold">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold leading-tight">Record Customer Payment</h2>
              <p className="text-xs text-neutral-300">Instantly update client ledger & remaining balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Select Shopkeeper *</label>
            <select
              value={shopkeeperId}
              onChange={(e) => setShopkeeperId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {shopkeepers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name} ({s.owner_name} · {s.id})
                </option>
              ))}
            </select>

            {shopkeeperBalance && (
              <div className="mt-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-500 block">Current Outstanding Balance:</span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      shopkeeperBalance.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrency(shopkeeperBalance.remainingBalance, settings.currency_symbol)}
                  </span>
                </div>
                {shopkeeperBalance.remainingBalance > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBalance}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded transition-colors"
                  >
                    Pay Full Pending
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as PaymentMethod;
                  setPaymentMethod(m);
                  if (m === 'Cash') setReference('Cash Payment');
                  else if (m === 'Bank') setReference('Bank Cheque / Deposit');
                  else if (m === 'Online Transfer') setReference('Online Trx ID');
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Deposit / Cheque</option>
                <option value="Online Transfer">Online Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Amount Received ({settings.currency_symbol}) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(cleanNumericInput(e.target.value, true))}
              placeholder="e.g. 5500"
              required
              className="w-full px-3 py-2.5 text-base font-bold font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Reference / Receipt Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Cash Voucher #102, Trx #8829"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or remarks"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-300 rounded-xl font-semibold hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
