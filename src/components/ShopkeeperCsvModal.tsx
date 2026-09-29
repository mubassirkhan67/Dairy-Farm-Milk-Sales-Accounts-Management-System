import React, { useState, useRef } from 'react';
import { useDairy } from '../context/DairyContext';
import { ShopkeeperStatus } from '../types';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';

interface ShopkeeperCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedShopkeeperRow {
  rowIndex: number;
  shop_id?: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  opening_balance: number;
  status: ShopkeeperStatus;
  notes: string;
  isValid: boolean;
  errors: string[];
}

export const ShopkeeperCsvModal: React.FC<ShopkeeperCsvModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addShopkeepersBulk, shopkeepers, settings } = useDairy();

  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedShopkeeperRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Split a CSV line respecting double quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        let field = line.substring(start, i).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.substring(1, field.length - 1).replace(/""/g, '"');
        }
        result.push(field.trim());
        start = i + 1;
      }
    }

    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.substring(1, lastField.length - 1).replace(/""/g, '"');
    }
    result.push(lastField.trim());

    return result;
  };

  const validatePhone = (phoneStr: string): boolean => {
    if (!phoneStr) return false;
    // Strip common non-digits like spaces, dashes, plus signs, brackets
    const cleanDigits = phoneStr.replace(/[^0-9]/g, '');
    // Standard mobile numbers usually have between 7 and 15 digits
    return cleanDigits.length >= 7 && cleanDigits.length <= 15;
  };

  const processCsvContent = (content: string) => {
    setParseError(null);
    setParsedRows([]);

    if (!content.trim()) {
      setParseError('The CSV content is empty. Please provide data.');
      return;
    }

    // Split into lines
    const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) {
      setParseError('The file contains no readable rows.');
      return;
    }

    // Header extraction
    const headerLine = rawLines[0];
    const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    // Check header mappings
    const getColumnIndex = (possibleNames: string[]): number => {
      return headers.findIndex((h) => possibleNames.includes(h));
    };

    const shopNameIdx = getColumnIndex(['shopname', 'shop_name', 'storename', 'store', 'shop']);
    const ownerNameIdx = getColumnIndex(['ownername', 'owner_name', 'owner', 'proprietor', 'name']);
    const phoneIdx = getColumnIndex(['phone', 'phonenumber', 'phone_number', 'mobile', 'cell', 'contact']);
    const idIdx = getColumnIndex(['shopid', 'shop_id', 'id']);
    const addressIdx = getColumnIndex(['address', 'location', 'shopaddress']);
    const openingBalIdx = getColumnIndex(['openingbalance', 'opening_balance', 'balance', 'startingbalance']);
    const statusIdx = getColumnIndex(['status', 'active', 'state']);
    const notesIdx = getColumnIndex(['notes', 'note', 'remarks', 'comment']);

    // Validate that required header columns can be identified
    if (shopNameIdx === -1 || phoneIdx === -1) {
      setParseError(
        'CSV must contain "Shop Name" (or shop_name) and "Phone" (or mobile) column headers. Click "Download Sample CSV" for the expected format.'
      );
      return;
    }

    const dataLines = rawLines.slice(1);
    if (dataLines.length === 0) {
      setParseError('No data rows found below the header line.');
      return;
    }

    // Track phone numbers within the imported file to detect duplicates inside batch
    const batchPhones = new Set<string>();
    const existingPhones = new Set(
      shopkeepers.map((s) => s.phone.replace(/[^0-9]/g, '')).filter((p) => p.length > 0)
    );

    const rows: ParsedShopkeeperRow[] = [];

    dataLines.forEach((line, index) => {
      const lineCols = parseCsvLine(line);
      // Skip completely empty columns line
      if (lineCols.every((c) => !c)) return;

      const shop_name = (shopNameIdx !== -1 && lineCols[shopNameIdx]) ? lineCols[shopNameIdx].trim() : '';
      const owner_name = (ownerNameIdx !== -1 && lineCols[ownerNameIdx]) ? lineCols[ownerNameIdx].trim() : '';
      const phone = (phoneIdx !== -1 && lineCols[phoneIdx]) ? lineCols[phoneIdx].trim() : '';
      const shop_id = (idIdx !== -1 && lineCols[idIdx]) ? lineCols[idIdx].trim() : undefined;
      const address = (addressIdx !== -1 && lineCols[addressIdx]) ? lineCols[addressIdx].trim() : '';
      const rawBalance = (openingBalIdx !== -1 && lineCols[openingBalIdx]) ? lineCols[openingBalIdx].trim() : '0';
      const rawStatus = (statusIdx !== -1 && lineCols[statusIdx]) ? lineCols[statusIdx].trim().toLowerCase() : 'active';
      const notes = (notesIdx !== -1 && lineCols[notesIdx]) ? lineCols[notesIdx].trim() : '';

      const errors: string[] = [];

      // Required field validation: Shop Name
      if (!shop_name) {
        errors.push('Shop Name is required');
      } else if (shop_name.length < 2) {
        errors.push('Shop Name is too short');
      }

      // Required field validation: Phone Number
      if (!phone) {
        errors.push('Phone number is required');
      } else if (!validatePhone(phone)) {
        errors.push('Invalid phone format (minimum 7 digits required)');
      }

      // Owner Name recommendation
      const finalOwner = owner_name || (shop_name ? `${shop_name} Owner` : 'Store Owner');

      // Phone duplicate check
      const cleanDigits = phone.replace(/[^0-9]/g, '');
      if (cleanDigits) {
        if (batchPhones.has(cleanDigits)) {
          errors.push('Duplicate phone number within this CSV batch');
        } else {
          batchPhones.add(cleanDigits);
        }

        if (existingPhones.has(cleanDigits)) {
          errors.push('Phone number already exists in your current shopkeeper accounts');
        }
      }

      // Opening balance validation
      const opening_balance = parseFloat(rawBalance.replace(/[^0-9.-]/g, '')) || 0;
      if (isNaN(opening_balance)) {
        errors.push('Opening balance must be a valid number');
      }

      // Status
      let status: ShopkeeperStatus = 'active';
      if (rawStatus === 'inactive' || rawStatus === '0' || rawStatus === 'false') {
        status = 'inactive';
      }

      rows.push({
        rowIndex: index + 2, // 1-based, +1 for header
        shop_id,
        shop_name,
        owner_name: finalOwner,
        phone,
        address,
        opening_balance,
        status,
        notes,
        isValid: errors.length === 0,
        errors,
      });
    });

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      processCsvContent(text);
    };
    reader.onerror = () => {
      setParseError('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCsvText(val);
    if (val.trim()) {
      processCsvContent(val);
    } else {
      setParsedRows([]);
      setParseError(null);
    }
  };

  const handleDownloadTemplate = () => {
    const templateContent = [
      'Shop ID,Shop Name,Owner Name,Phone,Address,Opening Balance,Status,Notes',
      'S010,Gulshan Milk Corner,Chaudhry Nadeem,0300-4455667,"Main Bazaar, Shop #12",0,Active,"Morning 6 AM delivery"',
      'S011,Madina Dairy & Khoya Center,Haji Rafiq,0321-9988771,"Circular Road Near Gate 2",5000,Active,"Prefers high-fat buffalo milk"',
      'S012,Faisal Bakers & Sweets,Sheikh Usman,0333-1122334,"Railway Station Road",12000,Active,"Bulk daily consumer"',
      'S013,Al-Rehman Tea Stall,Munir Ahmed,0345-5566778,"Grain Market Chowk",0,Active,"Daily cash collection"',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'shopkeepers_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleImportValid = () => {
    if (validRows.length === 0) return;
    setIsProcessing(true);

    try {
      const toAdd = validRows.map((r) => ({
        id: r.shop_id,
        shop_name: r.shop_name,
        owner_name: r.owner_name,
        phone: r.phone,
        address: r.address,
        opening_balance: r.opening_balance,
        status: r.status,
        notes: r.notes,
      }));

      const addedCount = addShopkeepersBulk(toAdd);
      setIsProcessing(false);
      onSuccess(addedCount);
      onClose();
    } catch (err: any) {
      setIsProcessing(false);
      setParseError(err?.message || 'Failed to save shopkeepers.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-emerald-600 rounded-lg text-white font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold leading-tight">Bulk Upload Shopkeepers (CSV)</h2>
              <p className="text-xs text-neutral-300">
                Import client stores with strict validation for Shop Name & Phone
              </p>
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

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Instructions and Download Template Bar */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
            <div className="space-y-0.5">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Required Columns: Shop Name & Phone Number</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                Optional columns: Shop ID, Owner Name, Address, Opening Balance, Status, Notes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV</span>
            </button>
          </div>

          {/* Upload Drop Zone & Text Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Drag/Drop or Picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-neutral-50 hover:bg-emerald-50/40 cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-800 text-xs">Click to browse CSV file</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">or drop your .csv spreadsheet here</p>
              </div>
              {fileName && (
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md mt-1">
                  <Check className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Direct Paste CSV Text */}
            <div className="flex flex-col">
              <label className="font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                <span>Or Paste CSV Content Directly:</span>
                {csvText && (
                  <button
                    type="button"
                    onClick={() => {
                      setCsvText('');
                      setFileName(null);
                      setParsedRows([]);
                      setParseError(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-700 text-[11px]"
                  >
                    Clear
                  </button>
                )}
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={handleTextareaChange}
                placeholder="Shop ID,Shop Name,Owner Name,Phone,Address,Opening Balance,Status&#10;S010,Al-Madina Milk,Ahmed Khan,0300-1122334,Main Market,0,Active"
                className="flex-1 w-full p-2.5 border border-neutral-300 rounded-xl font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Parse Errors */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Validation Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-neutral-900 text-xs">Validation Summary:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-700" />
                    {validRows.length} Valid Ready
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-rose-700" />
                      {invalidRows.length} Issues Found
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-neutral-500">
                  Total {parsedRows.length} rows processed
                </span>
              </div>

              {/* Table of Parsed Rows */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Shop Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Owner</th>
                      <th className="py-2 px-3 text-right">Opening Bal</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Validation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={row.isValid ? 'hover:bg-neutral-50/50' : 'bg-rose-50/60'}
                      >
                        <td className="py-2 px-3 font-mono text-neutral-500 font-medium">
                          #{row.rowIndex}
                        </td>
                        <td className="py-2 px-3 font-semibold text-neutral-900">
                          {row.shop_name || <span className="text-rose-600 italic">Missing</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-neutral-800">
                          {row.phone || <span className="text-rose-600 italic">Missing</span>}
                        </td>
                        <td className="py-2 px-3 text-neutral-600">{row.owner_name}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {settings.currency_symbol} {row.opening_balance.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 capitalize">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              row.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <div className="text-[11px] text-rose-700 font-medium space-y-0.5">
                              {row.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                  Notice: Invalid rows with missing Shop Name or Phone will be automatically skipped during import. Only the {validRows.length} valid accounts will be added.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border border-neutral-300 rounded-xl text-neutral-700 font-semibold text-xs hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validRows.length === 0 || isProcessing}
              onClick={handleImportValid}
              className={`py-2 px-5 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                validRows.length > 0 && !isProcessing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Importing...'
                  : validRows.length > 0
                  ? `Upload ${validRows.length} Shopkeepers`
                  : 'Upload Shopkeepers'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
