import React, { useState, useMemo } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { Shopkeeper, ShopkeeperStatus } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ShopkeeperCsvModal } from './ShopkeeperCsvModal';
import {
  Store,
  Plus,
  Search,
  Phone,
  MapPin,
  FileText,
  Receipt,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Milk,
  MessageCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface ShopkeepersProps {
  onOpenSaleModal: (date?: string, shopkeeperId?: string) => void;
  onOpenPaymentModal: (shopkeeperId?: string) => void;
  onNavigateToBill: (shopkeeperId: string) => void;
  onNavigateToLedger: (shopkeeperId: string) => void;
}

export const Shopkeepers: React.FC<ShopkeepersProps> = ({
  onOpenSaleModal,
  onOpenPaymentModal,
  onNavigateToBill,
  onNavigateToLedger,
}) => {
  const {
    shopkeepers,
    addShopkeeper,
    updateShopkeeper,
    deleteShopkeeper,
    getShopkeeperBalance,
    settings,
  } = useDairy();

  const { can, requireAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingShopkeeper, setEditingShopkeeper] = useState<Shopkeeper | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    shop_id: '',
    shop_name: '',
    owner_name: '',
    phone: '',
    address: '',
    opening_balance: 0,
    status: 'active' as ShopkeeperStatus,
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Filtered shopkeeper balances list
  const filteredShopkeepers = useMemo(() => {
    return shopkeepers
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.shop_name.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
        );
      })
      .map((sk) => {
        const balance = getShopkeeperBalance(sk.id);
        return {
          ...sk,
          balance,
        };
      });
  }, [shopkeepers, statusFilter, searchQuery, getShopkeeperBalance]);

  const totalOutstanding = useMemo(() => {
    return filteredShopkeepers.reduce((acc, s) => acc + Math.max(0, s.balance.remainingBalance), 0);
  }, [filteredShopkeepers]);

  const handleOpenAddModal = () => {
    requireAdmin(() => {
      const nextNumber = shopkeepers.length + 1;
      setFormData({
        shop_id: `S${nextNumber.toString().padStart(3, '0')}`,
        shop_name: '',
        owner_name: '',
        phone: '',
        address: '',
        opening_balance: 0,
        status: 'active',
        notes: '',
      });
      setFormError(null);
      setModalMode('add');
    });
  };

  const handleOpenEditModal = (sk: Shopkeeper) => {
    requireAdmin(() => {
      setEditingShopkeeper(sk);
      setFormData({
        shop_id: sk.id,
        shop_name: sk.shop_name,
        owner_name: sk.owner_name,
        phone: sk.phone,
        address: sk.address,
        opening_balance: sk.opening_balance,
        status: sk.status,
        notes: sk.notes,
      });
      setFormError(null);
      setModalMode('edit');
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.shop_name.trim()) {
      setFormError('Shop Name is required.');
      return;
    }
    if (!formData.owner_name.trim()) {
      setFormError('Owner Name is required.');
      return;
    }

    requireAdmin(() => {
      if (modalMode === 'add') {
        addShopkeeper({
          id: formData.shop_id || undefined,
          shop_name: formData.shop_name.trim(),
          owner_name: formData.owner_name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          opening_balance: Number(formData.opening_balance) || 0,
          status: formData.status,
          notes: formData.notes.trim(),
        });
      } else if (modalMode === 'edit' && editingShopkeeper) {
        updateShopkeeper(editingShopkeeper.id, {
          shop_name: formData.shop_name.trim(),
          owner_name: formData.owner_name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          opening_balance: Number(formData.opening_balance) || 0,
          status: formData.status,
          notes: formData.notes.trim(),
        });
      }

      setModalMode(null);
    });
  };

  const handleDelete = (id: string) => {
    requireAdmin(() => {
      deleteShopkeeper(id);
      setDeleteConfirmationId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Client Management</span>
            <span aria-hidden="true">·</span>
            <span>{shopkeepers.length} registered accounts</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Shopkeeper Accounts & Ledgers
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Manage daily milk clients, automated billing balances, and contact info.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => requireAdmin(() => setIsCsvModalOpen(true))}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs rounded-lg border border-neutral-300 shadow-xs transition-colors"
            title="Import shopkeepers in bulk from CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Shopkeeper</span>
          </button>
        </div>
      </div>

      {/* CSV Bulk Import Success Banner */}
      {csvSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{csvSuccessMessage}</span>
          </div>
          <button
            onClick={() => setCsvSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, owner, phone or ID..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status segmented control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shopkeeper Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShopkeepers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-neutral-200 rounded-xl">
            <Store className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-700">No shopkeepers found.</p>
            <p className="text-xs text-neutral-500 mt-1">Try adjusting your search or add a new shop.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              + Add Shopkeeper
            </button>
          </div>
        ) : (
          filteredShopkeepers.map((shop) => {
            const { balance } = shop;
            const hasPending = balance.remainingBalance > 0;

            return (
              <div
                key={shop.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-colors"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {shop.id}
                      </span>
                      <h3 className="text-base font-bold text-neutral-900 mt-1 leading-tight">
                        {shop.shop_name}
                      </h3>
                      <p className="text-xs text-neutral-600 font-medium">Owner: {shop.owner_name}</p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                        shop.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {shop.status}
                    </span>
                  </div>

                  {/* Contact & Address */}
                  <div className="space-y-1 my-3 text-xs text-neutral-500 border-y border-neutral-100 py-2.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <a href={`tel:${shop.phone}`} className="hover:text-emerald-700">
                        {shop.phone || 'No phone'}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="truncate">{shop.address || 'No address specified'}</span>
                    </div>
                  </div>

                  {/* Financial Balance Summary (Section 10 Requirement) */}
                  <div className="p-3 bg-neutral-50 rounded-lg space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Total Milk Supplied:</span>
                      <span className="font-mono font-semibold text-neutral-900">
                        {balance.totalMilkQty} {settings.default_unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Total Bills:</span>
                      <span className="font-mono font-semibold text-neutral-900">
                        {formatCurrency(balance.totalBills, settings.currency_symbol)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Payments Received:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {formatCurrency(balance.totalPayments, settings.currency_symbol)}
                      </span>
                    </div>

                    <div className="flex justify-between font-bold border-t border-neutral-200 pt-1.5 text-sm">
                      <span className="text-neutral-900">Remaining Balance:</span>
                      <span
                        className={`font-mono tabular-nums ${
                          hasPending ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(balance.remainingBalance, settings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  {shop.notes && (
                    <p className="mt-2 text-[11px] text-neutral-500 italic line-clamp-1">
                      "{shop.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => onOpenSaleModal(undefined, shop.id)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1"
                    title="Add Milk Sale"
                  >
                    <Milk className="w-3.5 h-3.5" />
                    <span>+ Sale</span>
                  </button>

                  <button
                    onClick={() => onOpenPaymentModal(shop.id)}
                    className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1"
                    title="Record Payment"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>

                  <button
                    onClick={() => onNavigateToBill(shop.id)}
                    className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-100 rounded-md transition-colors"
                    title="Generate Monthly Bill / Statement"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(shop)}
                    className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded-md transition-colors"
                    title="Edit Shopkeeper"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {can('manage_shopkeepers') && (
                    <button
                      onClick={() => setDeleteConfirmationId(shop.id)}
                      className="p-1.5 text-neutral-600 hover:text-rose-700 hover:bg-neutral-100 rounded-md transition-colors"
                      title="Delete Shopkeeper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Shopkeeper Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-base font-bold text-neutral-900">
                {modalMode === 'add' ? 'Add New Shopkeeper' : 'Edit Shopkeeper'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="py-4 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Shop ID *</label>
                  <input
                    type="text"
                    value={formData.shop_id}
                    onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                    required
                    placeholder="e.g. S001"
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ShopkeeperStatus })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  required
                  placeholder="e.g. Al Madina General Store"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Owner Name *</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  required
                  placeholder="e.g. Ahmed Khan"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Opening Balance ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) =>
                      setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Shop Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Shop 14, Main Market"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Morning 6 AM delivery preference"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 py-2.5 border rounded-lg font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                >
                  {modalMode === 'add' ? 'Add Shopkeeper' : 'Update Shopkeeper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm shadow-xl p-5">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-neutral-900 text-base">Delete Shopkeeper</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-4">
              Are you sure you want to delete this shopkeeper? Historical milk sales and payment records will be preserved in database logs.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 py-2 text-xs font-semibold border rounded-lg hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmationId)}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      <ShopkeeperCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={(count) => {
          setCsvSuccessMessage(`Successfully imported ${count} shopkeeper account${count > 1 ? 's' : ''}!`);
          setTimeout(() => {
            setCsvSuccessMessage(null);
          }, 6000);
        }}
      />
    </div>
  );
};
