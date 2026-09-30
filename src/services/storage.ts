import type {
  DairyDatabase,
  Shopkeeper,
  MilkSale,
  Payment,
  MilkRate,
  Animal,
  AnimalSale,
  Expense,
  FarmSettings,
  User,
} from '../types/index.ts';

const STORAGE_KEY = 'haji_zafeer_gul_awan_dairy_db_v3';

export const INITIAL_SETTINGS: FarmSettings = {
  farm_name: 'Haji Zafeer Gul Awan Dairy Farm',
  owner_name: 'Haji Zafeer Gul Awan',
  phone: '03181906768',
  address: 'Haji Zafeer Gul Dairy Farm, Katlang Road Mardan',
  currency_symbol: 'Rs.',
  default_unit: 'KG',
  admin_password: 'admin123',
};

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-01',
    name: 'Haji Zafeer Gul Awan (Owner)',
    username: 'admin',
    role: 'admin',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'USR-02',
    name: 'Farm Supervisor (Employee)',
    username: 'employee',
    role: 'employee',
    created_at: '2026-09-01T08:00:00Z',
  },
];

// Active client/shopkeeper
export const INITIAL_SHOPKEEPERS: Shopkeeper[] = [
  {
    id: 'S001',
    shop_name: 'Fawad Awan',
    owner_name: 'Fawad Awan',
    phone: '03369106781',
    address: 'Haji Abad',
    opening_balance: 0,
    status: 'active',
    notes: '',
    created_at: '2026-09-28T16:25:11.138Z',
  },
];

export const INITIAL_RATES: MilkRate[] = [
  {
    id: 'RATE-01',
    rate: 220,
    effective_from: '2026-09-01',
    notes: 'Current farm gate rate',
    created_at: '2026-09-01T00:00:00Z',
  },
];

// Zero mock data - Clean empty production datasets
export const INITIAL_ANIMALS: Animal[] = [];
export const INITIAL_ANIMAL_SALES: AnimalSale[] = [];
export const INITIAL_EXPENSES: Expense[] = [];

export const getInitialDatabase = (): DairyDatabase => {
  return {
    users: INITIAL_USERS,
    shopkeepers: INITIAL_SHOPKEEPERS,
    milk_sales: [],
    payments: [],
    milk_rates: INITIAL_RATES,
    animals: [],
    animal_sales: [],
    expenses: [],
    settings: INITIAL_SETTINGS,
    version: 3,
    updated_at: new Date().toISOString(),
  };
};

export const loadDatabase = (): DairyDatabase => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy keys if available to preserve any previously entered records
      const legacyKey = localStorage.getItem('haji_zafeer_gul_awan_dairy_db_v2') || localStorage.getItem('dairy_farm_db_v1');
      if (legacyKey) {
        try {
          const legacyParsed = JSON.parse(legacyKey);
          if (legacyParsed && Array.isArray(legacyParsed.shopkeepers)) {
            legacyParsed.version = 3;
            legacyParsed.updated_at = legacyParsed.updated_at || new Date().toISOString();
            saveDatabase(legacyParsed);
            return legacyParsed;
          }
        } catch (_) {}
      }
      const initial = getInitialDatabase();
      saveDatabase(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.shopkeepers) || !Array.isArray(parsed.milk_sales)) {
      const initial = getInitialDatabase();
      saveDatabase(initial);
      return initial;
    }
    
    // Ensure all tables exist without wiping user records
    parsed.version = 3;
    parsed.users = Array.isArray(parsed.users) ? parsed.users : INITIAL_USERS;
    parsed.shopkeepers = Array.isArray(parsed.shopkeepers) ? parsed.shopkeepers : INITIAL_SHOPKEEPERS;
    parsed.milk_sales = Array.isArray(parsed.milk_sales) ? parsed.milk_sales : [];
    parsed.payments = Array.isArray(parsed.payments) ? parsed.payments : [];
    parsed.milk_rates = Array.isArray(parsed.milk_rates) ? parsed.milk_rates : INITIAL_RATES;
    parsed.animals = Array.isArray(parsed.animals) ? parsed.animals : [];
    parsed.animal_sales = Array.isArray(parsed.animal_sales) ? parsed.animal_sales : [];
    parsed.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    parsed.settings = parsed.settings && parsed.settings.farm_name ? parsed.settings : INITIAL_SETTINGS;
    return parsed;
  } catch (err) {
    console.error('Failed to load database from localStorage:', err);
    return getInitialDatabase();
  }
};

export const saveDatabase = (db: DairyDatabase): void => {
  try {
    db.version = 3;
    db.updated_at = db.updated_at || new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
};

export const exportDatabaseBackup = (db: DairyDatabase): string => {
  return JSON.stringify(db, null, 2);
};

export const importDatabaseBackup = (jsonString: string): DairyDatabase => {
  const parsed = JSON.parse(jsonString);
  if (!parsed.shopkeepers || !Array.isArray(parsed.shopkeepers)) {
    throw new Error('Invalid backup: Missing shopkeepers array');
  }
  if (!parsed.milk_sales || !Array.isArray(parsed.milk_sales)) {
    throw new Error('Invalid backup: Missing milk_sales array');
  }
  parsed.version = 3;
  saveDatabase(parsed);
  return parsed;
};
