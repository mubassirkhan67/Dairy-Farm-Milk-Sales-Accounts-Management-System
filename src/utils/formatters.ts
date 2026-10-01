export const formatCurrency = (amount: number, symbol: string = 'Rs.'): string => {
  return `${symbol} ${Math.round(amount).toLocaleString('en-US')}`;
};

export const formatQuantity = (qty: number, unit: string = 'KG'): string => {
  return `${Number(qty.toFixed(1))} ${unit}`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[mIndex] || month;
  return `${day} ${monthName} ${year}`;
};

export const getMonthName = (monthStr: string): string => {
  // input: '2026-09'
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} ${year}`;
};

export const generateWhatsAppBillText = (
  farmName: string,
  farmPhone: string,
  shopName: string,
  ownerName: string,
  monthStr: string,
  totalMilk: number,
  unit: string,
  totalBill: number,
  paidAmount: number,
  remainingAmount: number,
  currency: string = 'Rs.'
): string => {
  const monthTitle = getMonthName(monthStr);
  return encodeURIComponent(
`*${farmName.toUpperCase()}*
*MONTHLY MILK BILL - ${monthTitle.toUpperCase()}*
----------------------------------------
*Shop:* ${shopName}
*Owner:* ${ownerName}
*Month:* ${monthTitle}

*Total Milk Supplied:* ${totalMilk} ${unit}
*Total Bill Amount:* ${currency} ${totalBill.toLocaleString()}
*Total Payment Received:* ${currency} ${paidAmount.toLocaleString()}
*Net Outstanding Balance:* ${currency} ${remainingAmount.toLocaleString()}
----------------------------------------
*Farm Contact:* ${farmPhone}
Thank you for your valued business!`
  );
};

/**
 * Cleans user numeric input in real-time, preventing "invalid character" errors.
 * - Converts Urdu/Persian/Arabic numerals (۰۱۲۳۴۵۶۷۸۹) to standard digits (0123456789)
 * - Automatically converts commas to decimal points or removes thousands separators
 * - Strips any non-numeric letters, symbols, or spaces (e.g. "kg", "Rs", "/-")
 */
export const cleanNumericInput = (val: string, allowDecimals: boolean = true): string => {
  if (!val) return '';
  // Convert Urdu / Arabic numerals to ASCII
  let cleaned = val.replace(/[٠-٩۰-۹]/g, (d) => {
    return String(d.charCodeAt(0) & 0xf);
  });

  if (allowDecimals) {
    // If comma is typed/pasted, convert comma to dot if no dot exists yet
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    }
    // Allow digits and at most one decimal point
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    // Integer only
    cleaned = cleaned.replace(/[^0-9]/g, '');
  }
  return cleaned;
};

/**
 * Parses any user input into a reliable float number.
 * Gracefully handles numbers with commas, decimals, Urdu numbers, strings with units.
 */
export const parseCleanNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = cleanNumericInput(String(val), true);
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

/**
 * Returns today's standard calendar date in YYYY-MM-DD format based on local time.
 * Automatically updates when days change with the standard calendar.
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the current calendar month in YYYY-MM format.
 */
export const getCurrentMonthString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};
