export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  created_at: string;
}

export type UnitType = 'KG' | 'Liter';

export type ShopkeeperStatus = 'active' | 'inactive';

export interface Shopkeeper {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  opening_balance: number;
  status: ShopkeeperStatus;
  notes: string;
  created_at: string;
}

export interface MilkSale {
  id: string;
  shopkeeper_id: string;
  sale_date: string; // YYYY-MM-DD
  shift?: 'morning' | 'evening';
  quantity: number;
  unit: UnitType;
  rate: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  notes: string;
  created_at: string;
}

export type PaymentMethod = 'Cash' | 'Bank' | 'Online Transfer' | 'Other';

export interface Payment {
  id: string;
  shopkeeper_id: string;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_method: PaymentMethod;
  reference: string;
  notes: string;
  sale_id?: string; // If paid as part of a sale
  created_at: string;
}

export interface MilkRate {
  id: string;
  rate: number;
  effective_from: string; // YYYY-MM-DD
  notes: string;
  created_at: string;
}

export type AnimalType = 'Cow' | 'Buffalo' | 'Goat' | 'Other';
export type AnimalStatus = 'Active' | 'Sold' | 'Sick' | 'Deceased' | 'Other';
export type Gender = 'Female' | 'Male';

export interface Animal {
  id: string;
  animal_code: string;
  name: string;
  type: AnimalType;
  breed: string;
  age: string;
  gender: Gender;
  purchase_date: string;
  purchase_price: number;
  status: AnimalStatus;
  milk_production: number; // liters or kg per day
  photo?: string;
  notes: string;
  created_at: string;
}

export interface AnimalSale {
  id: string;
  animal_id: string;
  buyer_name: string;
  buyer_phone: string;
  sale_date: string;
  sale_price: number;
  paid_amount: number;
  remaining_amount: number;
  notes: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'Animal Feed'
  | 'Medicine'
  | 'Electricity'
  | 'Employee Salary'
  | 'Transportation'
  | 'Maintenance'
  | 'Equipment'
  | 'Other';

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
  created_at: string;
}

export interface FarmSettings {
  farm_name: string;
  owner_name: string;
  phone: string;
  address: string;
  currency_symbol: string;
  default_unit: UnitType;
  admin_password?: string;
}

export interface DairyDatabase {
  users: User[];
  shopkeepers: Shopkeeper[];
  milk_sales: MilkSale[];
  payments: Payment[];
  milk_rates: MilkRate[];
  animals: Animal[];
  animal_sales: AnimalSale[];
  expenses: Expense[];
  settings: FarmSettings;
  version: number;
  updated_at?: string;
}
