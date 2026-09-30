import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import { useAuth } from '../context/AuthContext';
import { UnitType } from '../types';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RefreshCw,
  Shield,
  ShieldCheck,
  Check,
  AlertCircle,
  Database,
  Smartphone,
  Save,
  Radio,
  FileCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportBackup,
    importBackup,
    resetToSampleData,
    backendStatus,
    syncWithBackend,
    shopkeepers,
    milkSales,
    payments,
  } = useDairy();
  const { currentUser, isAdmin, isAdminUnlocked, lockAdmin, openPasswordModal, changeAdminPassword, requireAdmin } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({
    farm_name: settings.farm_name,
    owner_name: settings.owner_name,
    phone: settings.phone,
    address: settings.address,
    currency_symbol: settings.currency_symbol,
    default_unit: settings.default_unit,
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreBox, setShowRestoreBox] = useState(false);

  // Admin password change form state
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: '',
  });
  const [showPassFields, setShowPassFields] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    requireAdmin(() => {
      updateSettings(formData);
      setStatusMessage('Farm configuration saved successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dairy_farm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Backup file downloaded successfully!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    requireAdmin(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          importBackup(content);
          setStatusMessage('Database restored successfully from file!');
          setTimeout(() => setStatusMessage(null), 3500);
        } catch (err: any) {
          setErrorMessage(err?.message || 'Invalid backup file structure.');
        }
      };
      reader.readAsText(file);
    });
  };

  const handleManualRestore = () => {
    if (!restoreJson.trim()) return;
    requireAdmin(() => {
      try {
        importBackup(restoreJson.trim());
        setShowRestoreBox(false);
        setRestoreJson('');
        setStatusMessage('Database restored successfully!');
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to restore database. Invalid JSON.');
      }
    });
  };

  const handleResetData = () => {
    requireAdmin(() => {
      if (
        window.confirm(
          'Are you sure you want to reset all records to the original demonstration sample data?'
        )
      ) {
        resetToSampleData();
        setStatusMessage('Database has been reset to pristine initial demo records.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwords.newPass !== passwords.confirmPass) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    const res = changeAdminPassword(passwords.current, passwords.newPass);
    if (!res.success) {
      setPasswordError(res.error || 'Failed to update admin password.');
    } else {
      setPasswordSuccess('Admin password changed successfully!');
      setPasswords({ current: '', newPass: '', confirmPass: '' });
      setTimeout(() => setPasswordSuccess(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span>Administration</span>
            <span aria-hidden="true">·</span>
            <span>Configuration & Backups</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            System Settings & Data Vault
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Configure farm contact details, default milk measurement unit, and full database backups.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Backend & Live Persistence Control Center */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                {backendStatus.connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    backendStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                {backendStatus.connected
                  ? 'Express Backend Server Active (data/dairy-db.json)'
                  : 'Local Storage Database Active'}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Data is persistently saved on the backend disk at{' '}
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-neutral-800">
                data/dairy-db.json
              </code>{' '}
              and synced across all client requests.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              setIsSyncing(true);
              await syncWithBackend();
              setIsSyncing(false);
              setStatusMessage('Backend database synchronized successfully!');
              setTimeout(() => setStatusMessage(null), 3000);
            }}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs rounded-lg transition-colors border border-neutral-300 shadow-xs whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Server Now'}</span>
          </button>
        </div>

        {/* Database Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <p className="text-[11px] text-neutral-500 uppercase font-semibold">Registered Shops</p>
            <p className="text-lg font-bold text-neutral-900 mt-0.5">{shopkeepers.length} Shops</p>
            <p className="text-[10px] text-emerald-600 font-medium truncate">Jawad Awan & Fawad Awan</p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <p className="text-[11px] text-neutral-500 uppercase font-semibold">Milk Sales Records</p>
            <p className="text-lg font-bold text-neutral-900 mt-0.5">{milkSales.length} Records</p>
            <p className="text-[10px] text-neutral-500">September 2026 logs</p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <p className="text-[11px] text-neutral-500 uppercase font-semibold">Payment Records</p>
            <p className="text-lg font-bold text-neutral-900 mt-0.5">{payments.length} Payments</p>
            <p className="text-[10px] text-neutral-500">Auto-balanced ledger</p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <p className="text-[11px] text-neutral-500 uppercase font-semibold">Server Latency</p>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {backendStatus.latencyMs ? `${backendStatus.latencyMs} ms` : 'Local Fast'}
            </p>
            <p className="text-[10px] text-neutral-500">Direct HTTP JSON API</p>
          </div>
        </div>
      </div>

      {/* Farm Details Form (Section 5 & 24) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1">Farm Information & Units</h2>
        <p className="text-xs text-neutral-500 mb-5">
          These details appear on printed monthly bills, customer vouchers, and WhatsApp share notes.
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Dairy Farm Name *</label>
              <input
                type="text"
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg font-semibold text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Farm Owner Name *</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Currency Symbol *</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
              />
            </div>

            {/* Section 5 Milk Unit Preference */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Default Milk Unit *
              </label>
              <div className="flex rounded-lg border border-neutral-300 p-0.5 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, default_unit: 'KG' })}
                  className={`flex-1 py-1.5 font-bold rounded text-xs transition-colors ${
                    formData.default_unit === 'KG'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  KG (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, default_unit: 'Liter' })}
                  className={`flex-1 py-1.5 font-bold rounded text-xs transition-colors ${
                    formData.default_unit === 'Liter'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Liter
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Farm Location Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup and Restore Section (Section 26 requirement) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Database Backup & Disaster Recovery</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Regularly download copies of your farm data. Backups include all shopkeepers, milk sales, payments, livestock, and expenses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Action 1: Download Backup */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-neutral-900 text-xs">Download Backup</h3>
              <p className="text-[11px] text-neutral-500 mt-1">
                Save complete JSON file containing all relational tables to your device.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="mt-4 w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
          </div>

          {/* Action 2: Restore from File */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-2">
                <Upload className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-neutral-900 text-xs">Restore Backup</h3>
              <p className="text-[11px] text-neutral-500 mt-1">
                Upload a previously saved database file to restore all records.
              </p>
            </div>
            <label className="mt-4 w-full py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Backup File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Action 3: Reset to Initial Demo Data */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-neutral-900 text-xs">Reset Farm Data</h3>
              <p className="text-[11px] text-neutral-500 mt-1">
                Restores clean Haji Zafeer Gul Awan Dairy Farm records with the two official shops (Jawad Awan & Fawad Awan).
              </p>
            </div>
            <button
              onClick={handleResetData}
              className="mt-4 w-full py-2 bg-white border border-neutral-300 hover:bg-amber-50 hover:text-amber-800 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Clean Farm Data</span>
            </button>
          </div>
        </div>

        {/* Paste JSON directly toggle */}
        <div className="pt-2 text-right">
          <button
            onClick={() => setShowRestoreBox(!showRestoreBox)}
            className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
          >
            {showRestoreBox ? 'Hide manual text restore' : 'Or paste backup JSON directly'}
          </button>
        </div>

        {showRestoreBox && (
          <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50 space-y-2 text-xs">
            <label className="block font-semibold text-neutral-700">Paste Backup JSON Content</label>
            <textarea
              rows={4}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder="Paste raw JSON here..."
              className="w-full p-2.5 border rounded-lg font-mono text-[11px] bg-white"
            />
            <button
              onClick={handleManualRestore}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-semibold hover:bg-neutral-800"
            >
              Restore Pasted JSON
            </button>
          </div>
        )}
      </div>

      {/* Admin Password & Security Access Control */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Admin Security & Password Protection</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Restricts all data entry, modification, and deletion strictly to the Administrator
              </p>
            </div>
          </div>

          <div>
            {isAdminUnlocked ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Admin Unlocked</span>
                </span>
                <button
                  type="button"
                  onClick={lockAdmin}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                >
                  Lock Now
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPasswordModal()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Admin Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Security Policy Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <p className="font-bold text-neutral-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Administrator Privileges (Unlocked)</span>
            </p>
            <ul className="space-y-1 text-neutral-600 list-disc list-inside">
              <li>Enter daily milk dispatches and bulk dispatches</li>
              <li>Record cash payments and bank collections</li>
              <li>Create, edit, and delete shopkeeper accounts</li>
              <li>Erase / delete any incorrect transactions</li>
              <li>Configure milk pricing rates and farm settings</li>
              <li>Download and restore database backups</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <p className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-neutral-500" />
              <span>Staff / Viewer Mode (Locked)</span>
            </p>
            <ul className="space-y-1 text-neutral-600 list-disc list-inside">
              <li>View real-time dashboard analytics and herd statistics</li>
              <li>Browse daily delivery registers and shopkeeper balances</li>
              <li>Generate, print, and WhatsApp monthly bills</li>
              <li>View customer vouchers and payment receipts</li>
              <li><strong>Blocked:</strong> Cannot add, edit, or delete any data</li>
              <li>Requires Admin password prompt to perform changes</li>
            </ul>
          </div>
        </div>

        {/* Change Admin Password Form */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-neutral-700" />
              <span>Change Admin Password</span>
            </h3>
            <span className="text-[11px] text-neutral-400 font-mono">
              Default password: <strong className="text-neutral-700">admin123</strong>
            </span>
          </div>

          {passwordSuccess && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Current Password
              </label>
              <input
                type={showPassFields ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Current password"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                New Password
              </label>
              <input
                type={showPassFields ? 'text' : 'password'}
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                placeholder="New password (min 4 chars)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassFields ? 'text' : 'password'}
                value={passwords.confirmPass}
                onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPassFields(!showPassFields)}
                className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
              >
                {showPassFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassFields ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Save New Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 28: Future Architectural Expansion Roadmap */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1">
          Farm Expansion & System Roadmap (Section 28)
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Built-in readiness for upcoming dairy farm digital integrations:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-neutral-700">
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>WhatsApp Bill Sharing</span>
          </div>
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>PDF Print Bill Invoicing</span>
          </div>
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-neutral-400">○</span>
            <span>SMS Notifications Gateway</span>
          </div>
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-neutral-400">○</span>
            <span>Customer Online Portal</span>
          </div>
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-neutral-400">○</span>
            <span>QR Code Delivery Vouchers</span>
          </div>
          <div className="p-2.5 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2">
            <span className="text-neutral-400">○</span>
            <span>Multi-Farm Branch Hubs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
