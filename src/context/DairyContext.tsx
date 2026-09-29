import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shopkeeper,
  MilkSale,
  Payment,
  MilkRate,
  Animal,
  AnimalSale,
  Expense,
  FarmSettings,
  DairyDatabase,
  UnitType,
} from '../types';
import { loadDatabase, saveDatabase, getInitialDatabase, importDatabaseBackup, exportDatabaseBackup } from '../services/storage';
import { api, BackendStatus } from '../services/api';
import { parseCleanNumber } from '../utils/formatters';

export interface ShopkeeperBalanceSummary {
  shopkeeperId: string;
  shopName: string;
  ownerName: string;
  openingBalance: number;
  totalBills: number;
  totalPayments: number;
  remainingBalance: number;
  totalMilkQty: number;
}

export interface DashboardMetrics {
  todayMilk: number;
  todaySales: number;
  todayDeliveriesCount: number;
  monthMilk: number;
  monthSales: number;
  monthReceived: number;
  totalOutstanding: number;
  activeShopkeepersCount: number;
}

interface DairyContextType {
  shopkeepers: Shopkeeper[];
  milkSales: MilkSale[];
  payments: Payment[];
  milkRates: MilkRate[];
  animals: Animal[];
  animalSales: AnimalSale[];
  expenses: Expense[];
  settings: FarmSettings;
  currentEffectiveRate: number;
  backendStatus: BackendStatus;
  syncWithBackend: () => Promise<void>;

  // Actions
  addShopkeeper: (shopkeeper: Omit<Shopkeeper, 'id' | 'created_at'> & { id?: string }) => Shopkeeper;
  addShopkeepersBulk: (shopkeepersList: Array<Omit<Shopkeeper, 'id' | 'created_at'> & { id?: string }>) => number;
  updateShopkeeper: (id: string, updates: Partial<Shopkeeper>) => void;
  deleteShopkeeper: (id: string) => void;

  addMilkSale: (saleData: {
    shopkeeper_id: string;
    sale_date: string;
    shift?: 'morning' | 'evening';
    quantity: number;
    unit: UnitType;
    rate: number;
    paid_amount?: number;
    notes?: string;
  }) => { sale: MilkSale; payment?: Payment };
  updateMilkSale: (id: string, updates: Partial<MilkSale>) => void;
  deleteMilkSale: (id: string) => void;

  addPayment: (paymentData: {
    shopkeeper_id: string;
    payment_date: string;
    amount: number;
    payment_method: Payment['payment_method'];
    reference?: string;
    notes?: string;
  }) => Payment;
  deletePayment: (id: string) => void;

  addMilkRate: (rate: number, effective_from: string, notes?: string) => void;
  getEffectiveRateForDate: (date: string) => number;

  addAnimal: (animal: Omit<Animal, 'id' | 'created_at'> & { id?: string }) => Animal;
  updateAnimal: (id: string, updates: Partial<Animal>) => void;
  deleteAnimal: (id: string) => void;

  recordAnimalSale: (saleData: Omit<AnimalSale, 'id' | 'created_at'>) => AnimalSale;

  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Expense;
  deleteExpense: (id: string) => void;

  updateSettings: (newSettings: Partial<FarmSettings>) => void;

  // Calculators
  getShopkeeperBalance: (shopkeeperId: string) => ShopkeeperBalanceSummary;
  getAllShopkeepersBalances: () => ShopkeeperBalanceSummary[];
  getDashboardMetrics: (referenceDate?: string) => DashboardMetrics;

  // Backup & reset
  resetToSampleData: () => void;
  exportBackup: () => string;
  importBackup: (jsonContent: string) => void;
}

const DairyContext = createContext<DairyContextType | undefined>(undefined);

export const DairyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DairyDatabase>(() => loadDatabase());
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: false,
  });

  const syncWithBackend = useCallback(async () => {
    try {
      const health = await api.checkHealth();
      setBackendStatus(health);

      if (health.connected) {
        const backendDb = await api.getDatabase();
        if (backendDb && backendDb.shopkeepers && backendDb.version === 3) {
          setDb(backendDb);
          saveDatabase(backendDb);
        } else {
          // Reset to clean database and push to backend
          const cleanDb = getInitialDatabase();
          setDb(cleanDb);
          saveDatabase(cleanDb);
          await api.saveDatabase(cleanDb);
        }
      }
    } catch (err: any) {
      setBackendStatus({
        connected: false,
        error: err?.message || 'Failed to connect to backend',
      });
    }
  }, [db]);

  // Initial sync with backend on mount
  useEffect(() => {
    syncWithBackend();
    // Periodic health check every 25 seconds
    const interval = setInterval(() => {
      api.checkHealth().then(setBackendStatus).catch(() => {
        setBackendStatus({ connected: false });
      });
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage and backend whenever db state changes
  useEffect(() => {
    saveDatabase(db);
    if (backendStatus.connected) {
      api.saveDatabase(db).catch((err) => {
        console.warn('Auto-save to backend failed:', err);
      });
    }
  }, [db, backendStatus.connected]);

  // Current effective rate as of today
  const getEffectiveRateForDate = useCallback(
    (dateStr: string): number => {
      // Find rates with effective_from <= dateStr, ordered descending by effective_from
      const sorted = [...db.milk_rates].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
      const applicable = sorted.find((r) => r.effective_from <= dateStr);
      return applicable ? applicable.rate : sorted[0]?.rate || 220;
    },
    [db.milk_rates]
  );

  const currentEffectiveRate = useMemo(() => {
    const today = '2026-09-28';
    return getEffectiveRateForDate(today);
  }, [getEffectiveRateForDate]);

  // Balance calculation for a single shopkeeper
  const getShopkeeperBalance = useCallback(
    (shopkeeperId: string): ShopkeeperBalanceSummary => {
      const sk = db.shopkeepers.find((s) => s.id === shopkeeperId);
      const openingBalance = sk?.opening_balance || 0;

      const sales = db.milk_sales.filter((s) => s.shopkeeper_id === shopkeeperId);
      const totalBills = sales.reduce((acc, s) => acc + s.total_amount, 0);
      const totalMilkQty = sales.reduce((acc, s) => acc + s.quantity, 0);

      const payments = db.payments.filter((p) => p.shopkeeper_id === shopkeeperId);
      const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);

      const remainingBalance = openingBalance + totalBills - totalPayments;

      return {
        shopkeeperId,
        shopName: sk?.shop_name || 'Unknown Shop',
        ownerName: sk?.owner_name || '',
        openingBalance,
        totalBills,
        totalPayments,
        remainingBalance,
        totalMilkQty,
      };
    },
    [db.shopkeepers, db.milk_sales, db.payments]
  );

  const getAllShopkeepersBalances = useCallback((): ShopkeeperBalanceSummary[] => {
    return db.shopkeepers.map((sk) => getShopkeeperBalance(sk.id));
  }, [db.shopkeepers, getShopkeeperBalance]);

  // Dashboard metrics calculator
  const getDashboardMetrics = useCallback(
    (referenceDate: string = '2026-09-28'): DashboardMetrics => {
      const targetMonth = referenceDate.substring(0, 7); // '2026-09'

      // Today's milk & sales
      const todaySales = db.milk_sales.filter((s) => s.sale_date === referenceDate);
      const todayMilk = todaySales.reduce((acc, s) => acc + s.quantity, 0);
      const todaySalesAmount = todaySales.reduce((acc, s) => acc + s.total_amount, 0);
      const todayDeliveriesCount = todaySales.length;

      // This month's milk & sales
      const monthSalesList = db.milk_sales.filter((s) => s.sale_date.startsWith(targetMonth));
      const monthMilk = monthSalesList.reduce((acc, s) => acc + s.quantity, 0);
      const monthSales = monthSalesList.reduce((acc, s) => acc + s.total_amount, 0);

      // This month's payments received
      const monthPaymentsList = db.payments.filter((p) => p.payment_date.startsWith(targetMonth));
      const monthReceived = monthPaymentsList.reduce((acc, p) => acc + p.amount, 0);

      // Total Outstanding across all shopkeepers
      const allBalances = db.shopkeepers.map((sk) => getShopkeeperBalance(sk.id));
      const totalOutstanding = allBalances.reduce((acc, b) => acc + Math.max(0, b.remainingBalance), 0);

      const activeShopkeepersCount = db.shopkeepers.filter((s) => s.status === 'active').length;

      return {
        todayMilk,
        todaySales: todaySalesAmount,
        todayDeliveriesCount,
        monthMilk,
        monthSales,
        monthReceived,
        totalOutstanding,
        activeShopkeepersCount,
      };
    },
    [db.milk_sales, db.payments, db.shopkeepers, getShopkeeperBalance]
  );

  // Shopkeeper Actions
  const addShopkeeper = (
    shopkeeperData: Omit<Shopkeeper, 'id' | 'created_at'> & { id?: string }
  ): Shopkeeper => {
    const nextNumber = db.shopkeepers.length + 1;
    const formattedId = shopkeeperData.id || `S${nextNumber.toString().padStart(3, '0')}`;
    const newSk: Shopkeeper = {
      ...shopkeeperData,
      id: formattedId,
      created_at: new Date().toISOString(),
    };
    setDb((prev) => ({
      ...prev,
      shopkeepers: [newSk, ...prev.shopkeepers],
    }));
    return newSk;
  };

  const addShopkeepersBulk = (
    shopkeepersList: Array<Omit<Shopkeeper, 'id' | 'created_at'> & { id?: string }>
  ): number => {
    if (!shopkeepersList || shopkeepersList.length === 0) return 0;
    
    // Existing IDs
    const existingIds = new Set(db.shopkeepers.map((s) => s.id));
    let nextCounter = db.shopkeepers.length + 1;

    const newShopkeepers: Shopkeeper[] = shopkeepersList.map((sk) => {
      let finalId = sk.id?.trim();
      if (!finalId || existingIds.has(finalId)) {
        while (existingIds.has(`S${nextCounter.toString().padStart(3, '0')}`)) {
          nextCounter++;
        }
        finalId = `S${nextCounter.toString().padStart(3, '0')}`;
        nextCounter++;
      }
      existingIds.add(finalId);

      return {
        ...sk,
        id: finalId,
        created_at: new Date().toISOString(),
      };
    });

    setDb((prev) => ({
      ...prev,
      shopkeepers: [...newShopkeepers, ...prev.shopkeepers],
    }));

    return newShopkeepers.length;
  };

  const updateShopkeeper = (id: string, updates: Partial<Shopkeeper>) => {
    setDb((prev) => ({
      ...prev,
      shopkeepers: prev.shopkeepers.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk)),
    }));
  };

  const deleteShopkeeper = (id: string) => {
    setDb((prev) => ({
      ...prev,
      shopkeepers: prev.shopkeepers.filter((sk) => sk.id !== id),
    }));
  };

  // Milk Sales Actions
  const addMilkSale = (saleData: {
    shopkeeper_id: string;
    sale_date: string;
    shift?: 'morning' | 'evening';
    quantity: number;
    unit: UnitType;
    rate: number;
    paid_amount?: number;
    notes?: string;
  }) => {
    // Generate sequential sale ID
    const nextSaleNum =
      db.milk_sales.length > 0
        ? Math.max(
            ...db.milk_sales.map((s) => {
              const m = s.id.match(/\d+/);
              return m ? parseInt(m[0], 10) : 1000;
            })
          ) + 1
        : 1001;
    const saleId = `MS-${nextSaleNum}`;

    // Ensure valid shopkeeper ID
    const validShopkeeperId =
      db.shopkeepers.find((s) => s.id === saleData.shopkeeper_id)?.id ||
      db.shopkeepers[0]?.id ||
      'S001';

    const safeQty = Math.max(0, parseCleanNumber(saleData.quantity));
    const safeRate = Math.max(0, parseCleanNumber(saleData.rate));
    const total_amount = Math.round(safeQty * safeRate);
    const paid_amount = Math.max(0, parseCleanNumber(saleData.paid_amount));
    const remaining_amount = Math.max(0, total_amount - paid_amount);

    const newSale: MilkSale = {
      id: saleId,
      shopkeeper_id: validShopkeeperId,
      sale_date: saleData.sale_date,
      shift: saleData.shift || 'morning',
      quantity: safeQty,
      unit: saleData.unit || 'KG',
      rate: safeRate,
      total_amount,
      paid_amount,
      remaining_amount,
      notes: saleData.notes || '',
      created_at: new Date().toISOString(),
    };

    let paymentRecord: Payment | undefined;
    if (paid_amount > 0) {
      const nextPayNum =
        db.payments.length > 0
          ? Math.max(
              ...db.payments.map((p) => {
                const m = p.id.match(/\d+/);
                return m ? parseInt(m[0], 10) : 2000;
              })
            ) + 1
          : 2001;
      paymentRecord = {
        id: `PAY-${nextPayNum}`,
        shopkeeper_id: validShopkeeperId,
        payment_date: saleData.sale_date,
        amount: paid_amount,
        payment_method: 'Cash',
        reference: `Sale #${saleId}`,
        notes: `Paid at milk delivery (${saleId})`,
        sale_id: saleId,
        created_at: new Date().toISOString(),
      };
    }

    setDb((prev) => ({
      ...prev,
      milk_sales: [newSale, ...prev.milk_sales],
      payments: paymentRecord ? [paymentRecord, ...prev.payments] : prev.payments,
    }));

    return { sale: newSale, payment: paymentRecord };
  };

  const updateMilkSale = (id: string, updates: Partial<MilkSale>) => {
    setDb((prev) => ({
      ...prev,
      milk_sales: prev.milk_sales.map((sale) => {
        if (sale.id !== id) return sale;
        const merged = { ...sale, ...updates };
        const safeQty = Math.max(0, parseCleanNumber(merged.quantity));
        const safeRate = Math.max(0, parseCleanNumber(merged.rate));
        merged.quantity = safeQty;
        merged.rate = safeRate;
        merged.total_amount = Math.round(safeQty * safeRate);
        const safePaid = Math.max(0, parseCleanNumber(merged.paid_amount));
        merged.paid_amount = safePaid;
        merged.remaining_amount = Math.max(0, merged.total_amount - safePaid);
        return merged;
      }),
    }));
  };

  const deleteMilkSale = (id: string) => {
    setDb((prev) => ({
      ...prev,
      milk_sales: prev.milk_sales.filter((sale) => sale.id !== id),
      // remove associated payment if created with sale
      payments: prev.payments.filter((p) => p.sale_id !== id),
    }));
  };

  // Payment Actions
  const addPayment = (paymentData: {
    shopkeeper_id: string;
    payment_date: string;
    amount: number;
    payment_method: Payment['payment_method'];
    reference?: string;
    notes?: string;
  }): Payment => {
    const payId = `PAY-${Date.now().toString().slice(-4)}`;
    const safeAmount = Math.max(0, parseCleanNumber(paymentData.amount));
    const newPayment: Payment = {
      id: payId,
      shopkeeper_id: paymentData.shopkeeper_id,
      payment_date: paymentData.payment_date,
      amount: safeAmount,
      payment_method: paymentData.payment_method,
      reference: paymentData.reference || 'Cash Voucher',
      notes: paymentData.notes || '',
      created_at: new Date().toISOString(),
    };

    setDb((prev) => ({
      ...prev,
      payments: [newPayment, ...prev.payments],
    }));

    return newPayment;
  };

  const deletePayment = (id: string) => {
    setDb((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p.id !== id),
    }));
  };

  // Milk Rate Management
  const addMilkRate = (rate: number, effective_from: string, notes: string = '') => {
    const newRate: MilkRate = {
      id: `RATE-${Date.now().toString().slice(-4)}`,
      rate,
      effective_from,
      notes,
      created_at: new Date().toISOString(),
    };
    setDb((prev) => ({
      ...prev,
      milk_rates: [newRate, ...prev.milk_rates],
    }));
  };

  // Animals Management
  const addAnimal = (animalData: Omit<Animal, 'id' | 'created_at'> & { id?: string }): Animal => {
    const newAnimal: Animal = {
      ...animalData,
      id: animalData.id || `ANM-${Date.now().toString().slice(-3)}`,
      created_at: new Date().toISOString(),
    };
    setDb((prev) => ({
      ...prev,
      animals: [newAnimal, ...prev.animals],
    }));
    return newAnimal;
  };

  const updateAnimal = (id: string, updates: Partial<Animal>) => {
    setDb((prev) => ({
      ...prev,
      animals: prev.animals.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const deleteAnimal = (id: string) => {
    setDb((prev) => ({
      ...prev,
      animals: prev.animals.filter((a) => a.id !== id),
    }));
  };

  // Animal Sales Management (updates animal status to 'Sold' automatically)
  const recordAnimalSale = (saleData: Omit<AnimalSale, 'id' | 'created_at'>): AnimalSale => {
    const newSale: AnimalSale = {
      ...saleData,
      id: `AS-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };

    setDb((prev) => ({
      ...prev,
      animal_sales: [newSale, ...prev.animal_sales],
      animals: prev.animals.map((a) =>
        a.id === saleData.animal_id ? { ...a, status: 'Sold' as const } : a
      ),
    }));

    return newSale;
  };

  // Expense Management
  const addExpense = (expenseData: Omit<Expense, 'id' | 'created_at'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: `EXP-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    setDb((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    setDb((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Settings
  const updateSettings = (newSettings: Partial<FarmSettings>) => {
    setDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  // Backup & Reset
  const resetToSampleData = async () => {
    const initial = getInitialDatabase();
    setDb(initial);
    saveDatabase(initial);
    try {
      await api.resetDatabase();
      const health = await api.checkHealth();
      setBackendStatus(health);
    } catch (err) {
      console.warn('Backend reset failed:', err);
    }
  };

  const exportBackup = (): string => {
    return exportDatabaseBackup(db);
  };

  const importBackup = (jsonContent: string) => {
    const imported = importDatabaseBackup(jsonContent);
    setDb(imported);
    if (backendStatus.connected) {
      api.saveDatabase(imported).catch(() => {});
    }
  };

  return (
    <DairyContext.Provider
      value={{
        shopkeepers: db.shopkeepers,
        milkSales: db.milk_sales,
        payments: db.payments,
        milkRates: db.milk_rates,
        animals: db.animals,
        animalSales: db.animal_sales,
        expenses: db.expenses,
        settings: db.settings,
        currentEffectiveRate,
        backendStatus,
        syncWithBackend,
        addShopkeeper,
        addShopkeepersBulk,
        updateShopkeeper,
        deleteShopkeeper,
        addMilkSale,
        updateMilkSale,
        deleteMilkSale,
        addPayment,
        deletePayment,
        addMilkRate,
        getEffectiveRateForDate,
        addAnimal,
        updateAnimal,
        deleteAnimal,
        recordAnimalSale,
        addExpense,
        deleteExpense,
        updateSettings,
        getShopkeeperBalance,
        getAllShopkeepersBalances,
        getDashboardMetrics,
        resetToSampleData,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </DairyContext.Provider>
  );
};

export const useDairy = () => {
  const context = useContext(DairyContext);
  if (!context) {
    throw new Error('useDairy must be used within a DairyProvider');
  }
  return context;
};
