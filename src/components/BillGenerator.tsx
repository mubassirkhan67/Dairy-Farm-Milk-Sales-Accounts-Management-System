import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { MilkSale } from '../types';
import { formatCurrency, formatDate, getMonthName, generateWhatsAppBillText, cleanNumericInput, parseCleanNumber, getCurrentMonthString } from '../utils/formatters';
import { printElement, downloadPrintableHtml } from '../utils/printHelper';
import {
  Printer,
  Share2,
  Calendar,
  Store,
  FileText,
  ChevronLeft,
  Phone,
  CheckCircle,
  Receipt,
  Download,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

interface BillGeneratorProps {
  initialShopkeeperId?: string;
  initialMonth?: string;
  onBack?: () => void;
}

export const BillGenerator: React.FC<BillGeneratorProps> = ({
  initialShopkeeperId,
  initialMonth,
  onBack,
}) => {
  const { shopkeepers, milkSales, payments, settings, getShopkeeperBalance, updateMilkSale, deleteMilkSale } = useDairy();
  const { can, requireAdmin } = useAuth();

  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState<string>(
    initialShopkeeperId || (shopkeepers[0]?.id ?? '')
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => initialMonth || getCurrentMonthString());
  const [editingSale, setEditingSale] = useState<MilkSale | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editShift, setEditShift] = useState<'morning' | 'evening'>('morning');
  const [editNotes, setEditNotes] = useState('');

  const currentShopkeeper = useMemo(() => {
    return shopkeepers.find((s) => s.id === selectedShopkeeperId);
  }, [shopkeepers, selectedShopkeeperId]);

  // Daily records for this shopkeeper in this month
  const monthSales = useMemo(() => {
    return milkSales
      .filter((s) => s.shopkeeper_id === selectedShopkeeperId && s.sale_date.startsWith(selectedMonth))
      .sort((a, b) => a.sale_date.localeCompare(b.sale_date));
  }, [milkSales, selectedShopkeeperId, selectedMonth]);

  // Payments for this shopkeeper in this month
  const monthPayments = useMemo(() => {
    return payments
      .filter((p) => p.shopkeeper_id === selectedShopkeeperId && p.payment_date.startsWith(selectedMonth))
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  }, [payments, selectedShopkeeperId, selectedMonth]);

  // Summaries
  const totalMilk = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + s.quantity, 0);
  }, [monthSales]);

  const totalBill = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + s.total_amount, 0);
  }, [monthSales]);

  const totalPaid = useMemo(() => {
    return monthPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [monthPayments]);

  const monthOutstanding = totalBill - totalPaid;
  const overallBalance = selectedShopkeeperId
    ? getShopkeeperBalance(selectedShopkeeperId).remainingBalance
    : 0;

  // Average rate
  const avgRate = totalMilk > 0 ? Math.round(totalBill / totalMilk) : 220;

  // WhatsApp link
  const whatsAppText = useMemo(() => {
    if (!currentShopkeeper) return '';
    return generateWhatsAppBillText(
      settings.farm_name,
      settings.phone,
      currentShopkeeper.shop_name,
      currentShopkeeper.owner_name,
      selectedMonth,
      totalMilk,
      settings.default_unit,
      totalBill,
      totalPaid,
      monthOutstanding,
      settings.currency_symbol
    );
  }, [
    settings,
    currentShopkeeper,
    selectedMonth,
    totalMilk,
    totalBill,
    totalPaid,
    monthOutstanding,
  ]);

  const cleanPhone = currentShopkeeper?.phone?.replace(/[^0-9]/g, '') || '';
  const whatsAppLink = `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${whatsAppText}`;

  const handleStartEdit = (sale: MilkSale) => {
    setEditingSale(sale);
    setEditQty(sale.quantity.toString());
    setEditRate(sale.rate.toString());
    setEditPaid((sale.paid_amount || 0).toString());
    setEditDate(sale.sale_date);
    setEditShift(sale.shift || 'morning');
    setEditNotes(sale.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    const qty = parseCleanNumber(editQty);
    const rate = parseCleanNumber(editRate);
    const paid = parseCleanNumber(editPaid);

    requireAdmin(() => {
      updateMilkSale(editingSale.id, {
        sale_date: editDate || editingSale.sale_date,
        shift: editShift,
        quantity: qty,
        rate: rate,
        paid_amount: paid,
        notes: editNotes,
      });
      setEditingSale(null);
    });
  };

  if (!currentShopkeeper) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
          <Store className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-neutral-900 mb-1">No Shopkeeper Registered</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Please register a shopkeeper or customer first to view and generate their monthly bill.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>Customer Invoicing</span>
              <span aria-hidden="true">·</span>
              <span>Professional Milk Bill</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Generate Monthly Bill & Statement
            </h1>
          </div>
        </div>

        {/* Shopkeeper and Month Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedShopkeeperId}
            onChange={(e) => setSelectedShopkeeperId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {shopkeepers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shop_name} ({s.owner_name})
              </option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
          />

          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send WhatsApp Bill</span>
          </a>

          <button
            onClick={() =>
              printElement('printable-monthly-bill', {
                title: `Milk_Bill_${currentShopkeeper?.shop_name || 'Customer'}_${selectedMonth}`,
              })
            }
            className="px-3.5 py-2 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Open clean print dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill</span>
          </button>

          <button
            onClick={() =>
              downloadPrintableHtml(
                'printable-monthly-bill',
                `Milk_Bill_${currentShopkeeper?.shop_name || 'Customer'}_${selectedMonth}.html`
              )
            }
            className="px-3 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Download printable invoice document for offline print / PDF"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Save Invoice (PDF/HTML)</span>
          </button>
        </div>
      </div>

      {/* Printable Professional Monthly Bill Container */}
      <div
        id="printable-monthly-bill"
        className="bg-white border border-neutral-200 rounded-2xl shadow-md max-w-3xl mx-auto p-8 print-container font-sans"
      >
        {/* Farm Header (Section 11 requirement) */}
        <div className="text-center pb-6 border-b-2 border-neutral-900">
          <h1 className="text-2xl font-black uppercase tracking-wider text-neutral-900">
            {settings.farm_name}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800 mt-1">
            MONTHLY MILK BILL & ACCOUNT STATEMENT
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            {settings.address} · Farm Contact: {settings.phone}
          </p>
        </div>

        {/* Bill Meta Data */}
        <div className="grid grid-cols-2 gap-4 py-5 border-b border-neutral-200 text-xs">
          <div>
            <p className="text-neutral-500 font-medium">Billed To (Shopkeeper):</p>
            <p className="text-base font-bold text-neutral-900 mt-0.5">
              {currentShopkeeper?.shop_name}
            </p>
            <p className="text-neutral-700 font-medium">
              Proprietor: <strong>{currentShopkeeper?.owner_name}</strong>
            </p>
            <p className="text-neutral-600 font-mono">
              Phone: {currentShopkeeper?.phone || 'N/A'}
            </p>
            <p className="text-neutral-600">{currentShopkeeper?.address}</p>
          </div>

          <div className="text-right">
            <p className="text-neutral-500 font-medium">Billing Period:</p>
            <p className="text-base font-bold text-neutral-900 mt-0.5">
              {getMonthName(selectedMonth).toUpperCase()}
            </p>
            <p className="text-neutral-600 font-mono">
              Shop Account ID: <strong>{currentShopkeeper?.id}</strong>
            </p>
            <p className="text-neutral-600">
              Generated On: {formatDate(new Date().toISOString().split('T')[0])}
            </p>
          </div>
        </div>

        {/* Bill Executive Summary Box (Section 11 Example) */}
        <div className="my-6 p-5 bg-neutral-50 border border-neutral-200 rounded-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Total Milk</p>
              <p className="text-lg font-bold font-mono text-neutral-900 mt-1">
                {totalMilk} {settings.default_unit}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Avg Milk Rate</p>
              <p className="text-lg font-bold font-mono text-neutral-900 mt-1">
                {settings.currency_symbol} {avgRate}/{settings.default_unit}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Total Bill</p>
              <p className="text-lg font-bold font-mono text-neutral-900 mt-1">
                {formatCurrency(totalBill, settings.currency_symbol)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-500">Paid Amount</p>
              <p className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {formatCurrency(totalPaid, settings.currency_symbol)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-sm">
            <span className="font-bold text-neutral-900 uppercase">
              Current Outstanding Balance:
            </span>
            <span
              className={`font-mono text-xl font-black ${
                monthOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(monthOutstanding, settings.currency_symbol)}
            </span>
          </div>
        </div>

        {/* Section 8: Day-by-Day Itemized Register */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase text-neutral-700 mb-2 tracking-wider">
            Daily Milk Supply & Payment Audit Log:
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Shift</th>
                  <th className="py-2.5 px-3 text-right">Milk ({settings.default_unit})</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid on Delivery</th>
                  <th className="py-2.5 px-3 text-right">Day Balance</th>
                  <th className="py-2.5 px-3 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {monthSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-neutral-500">
                      No milk supplies recorded for this shopkeeper in {getMonthName(selectedMonth)}.
                    </td>
                  </tr>
                ) : (
                  monthSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-neutral-50/50">
                      <td className="py-2 px-3 font-mono font-medium">{formatDate(sale.sale_date)}</td>
                      <td className="py-2 px-3 font-medium capitalize text-neutral-600">{sale.shift || 'morning'}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {sale.quantity} {sale.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-neutral-600">{sale.rate}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {formatCurrency(sale.total_amount, settings.currency_symbol)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">
                        {sale.paid_amount > 0
                          ? formatCurrency(sale.paid_amount, settings.currency_symbol)
                          : '0'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {sale.remaining_amount === 0 ? (
                          <span className="text-neutral-400">0</span>
                        ) : (
                          <span className="text-neutral-800">
                            {formatCurrency(sale.remaining_amount, settings.currency_symbol)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => requireAdmin(() => handleStartEdit(sale))}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-medium text-[11px] flex items-center gap-1 border border-amber-200 transition-colors"
                            title="Edit this delivery entry (Admin only)"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              requireAdmin(() => {
                                if (window.confirm(`Delete milk delivery record on ${formatDate(sale.sale_date)}?`)) {
                                  deleteMilkSale(sale.id);
                                }
                              });
                            }}
                            className="p-1 hover:bg-rose-100 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete Record (Admin only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthSales.length > 0 && (
                <tfoot className="bg-neutral-100 font-bold border-t border-neutral-200 text-neutral-900">
                  <tr>
                    <td className="py-2.5 px-3">TOTAL ({monthSales.length} Days)</td>
                    <td className="py-2.5 px-3">—</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {totalMilk} {settings.default_unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">—</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {formatCurrency(totalBill, settings.currency_symbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {formatCurrency(
                        monthSales.reduce((a, b) => a + (b.paid_amount || 0), 0),
                        settings.currency_symbol
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                      {formatCurrency(monthOutstanding, settings.currency_symbol)}
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Separate Payments Record (if any standalone bank or cash payments made) */}
        {monthPayments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase text-neutral-700 mb-2 tracking-wider">
              Payments & Clearances Received This Month:
            </h3>
            <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2 px-3">Receipt / Trx #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Remarks</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {monthPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 px-3 font-mono">{p.id}</td>
                      <td className="py-1.5 px-3 font-mono">{formatDate(p.payment_date)}</td>
                      <td className="py-1.5 px-3 font-medium">{p.payment_method}</td>
                      <td className="py-1.5 px-3 text-neutral-500">{p.notes || p.reference}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(p.amount, settings.currency_symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer & Signature (Section 11 specification) */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          <div>
            <p className="font-semibold text-neutral-800">Farm Contact: {settings.phone}</p>
            <p className="mt-0.5">Thank you for your business. Quality fresh milk guaranteed daily.</p>
          </div>

          <div className="text-center sm:text-right">
            <div className="w-40 border-b border-neutral-400 mb-1 mx-auto sm:ml-auto"></div>
            <p className="text-[11px] font-semibold text-neutral-700 uppercase">Authorized Farm Signatory</p>
          </div>
        </div>
      </div>

      {/* Edit Milk Sale Modal for Monthly Bill */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Edit Milk Delivery Entry</h3>
                <p className="text-xs text-neutral-500 font-mono">{editingSale.id} · {currentShopkeeper?.shop_name}</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Delivery Date</label>
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

              {/* Live Preview calculation */}
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
    </div>
  );
};
