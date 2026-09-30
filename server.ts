import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getInitialDatabase } from './src/services/storage.ts';
import type { DairyDatabase } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'dairy-db.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database helper functions
function readDbFromFile(): DairyDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.shopkeepers)) {
        parsed.version = 3;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading DB_FILE, creating fresh database:', err);
  }

  // Initialize with Haji Zafeer Gul Awan Dairy Farm data (Jawad Awan & Fawad Awan)
  const initial = getInitialDatabase();
  writeDbToFile(initial);
  return initial;
}

function writeDbToFile(db: DairyDatabase): void {
  try {
    db.version = 3;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

// In-memory cache synced with disk
let currentDb: DairyDatabase = readDbFromFile();

// ======================== API ROUTES ========================

// Health check & Server Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    farmName: currentDb.settings?.farm_name || 'Haji Zafeer Gul Awan Dairy Farm',
    storagePath: DB_FILE,
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    shopkeepersCount: currentDb.shopkeepers.length,
    salesCount: currentDb.milk_sales.length,
    paymentsCount: currentDb.payments.length,
  });
});

// Full database access (CRUD)
app.get('/api/database', (req: Request, res: Response) => {
  res.json(currentDb);
});

app.post('/api/database', (req: Request, res: Response) => {
  const newDb = req.body;
  if (!newDb || !Array.isArray(newDb.shopkeepers) || !Array.isArray(newDb.milk_sales)) {
    return res.status(400).json({ error: 'Invalid database payload' });
  }
  newDb.version = 3;
  newDb.updated_at = newDb.updated_at || new Date().toISOString();
  currentDb = newDb;
  writeDbToFile(currentDb);
  res.json({ success: true, message: 'Database saved successfully' });
});

// Reset database to Haji Zafeer Gul Awan default state
app.post('/api/database/reset', (req: Request, res: Response) => {
  currentDb = getInitialDatabase();
  writeDbToFile(currentDb);
  res.json(currentDb);
});

// Settings endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(currentDb.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  currentDb.settings = { ...currentDb.settings, ...req.body };
  writeDbToFile(currentDb);
  res.json(currentDb.settings);
});

// Shopkeepers endpoints
app.get('/api/shopkeepers', (req: Request, res: Response) => {
  res.json(currentDb.shopkeepers);
});

app.post('/api/shopkeepers', (req: Request, res: Response) => {
  const shopkeeper = req.body;
  if (!shopkeeper.shop_name || !shopkeeper.phone) {
    return res.status(400).json({ error: 'Shop name and phone are required' });
  }
  const nextNum = currentDb.shopkeepers.length + 1;
  const newShopkeeper = {
    ...shopkeeper,
    id: shopkeeper.id || `S${nextNum.toString().padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  currentDb.shopkeepers.push(newShopkeeper);
  writeDbToFile(currentDb);
  res.status(201).json(newShopkeeper);
});

app.put('/api/shopkeepers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const index = currentDb.shopkeepers.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Shopkeeper not found' });
  }
  currentDb.shopkeepers[index] = { ...currentDb.shopkeepers[index], ...req.body };
  writeDbToFile(currentDb);
  res.json(currentDb.shopkeepers[index]);
});

app.delete('/api/shopkeepers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  currentDb.shopkeepers = currentDb.shopkeepers.filter((s) => s.id !== id);
  writeDbToFile(currentDb);
  res.json({ success: true });
});

// Bulk shopkeepers upload
app.post('/api/shopkeepers/bulk', (req: Request, res: Response) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Expected an array of shopkeepers' });
  }
  let addedCount = 0;
  list.forEach((item) => {
    if (item.shop_name && item.phone) {
      const nextNum = currentDb.shopkeepers.length + 1;
      const formatted = {
        ...item,
        id: item.id || `S${nextNum.toString().padStart(3, '0')}`,
        created_at: new Date().toISOString(),
      };
      currentDb.shopkeepers.push(formatted);
      addedCount++;
    }
  });
  writeDbToFile(currentDb);
  res.json({ success: true, count: addedCount });
});

// Milk sales endpoints
app.get('/api/sales', (req: Request, res: Response) => {
  res.json(currentDb.milk_sales);
});

app.post('/api/sales', (req: Request, res: Response) => {
  const sale = req.body;
  const newSale = {
    ...sale,
    id: sale.id || `MS-${Date.now().toString().slice(-4)}`,
    created_at: new Date().toISOString(),
  };
  currentDb.milk_sales.push(newSale);
  writeDbToFile(currentDb);
  res.status(201).json(newSale);
});

app.put('/api/sales/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const index = currentDb.milk_sales.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sale record not found' });
  }
  currentDb.milk_sales[index] = { ...currentDb.milk_sales[index], ...req.body };
  writeDbToFile(currentDb);
  res.json(currentDb.milk_sales[index]);
});

app.delete('/api/sales/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  currentDb.milk_sales = currentDb.milk_sales.filter((s) => s.id !== id);
  writeDbToFile(currentDb);
  res.json({ success: true });
});

// Payments endpoints
app.get('/api/payments', (req: Request, res: Response) => {
  res.json(currentDb.payments);
});

app.post('/api/payments', (req: Request, res: Response) => {
  const payment = req.body;
  const newPayment = {
    ...payment,
    id: payment.id || `PAY-${Date.now().toString().slice(-4)}`,
    created_at: new Date().toISOString(),
  };
  currentDb.payments.push(newPayment);
  writeDbToFile(currentDb);
  res.status(201).json(newPayment);
});

app.delete('/api/payments/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  currentDb.payments = currentDb.payments.filter((p) => p.id !== id);
  writeDbToFile(currentDb);
  res.json({ success: true });
});

// Milk Rates
app.get('/api/rates', (req: Request, res: Response) => {
  res.json(currentDb.milk_rates);
});

app.post('/api/rates', (req: Request, res: Response) => {
  const rate = req.body;
  const newRate = {
    ...rate,
    id: `RATE-${(currentDb.milk_rates.length + 1).toString().padStart(2, '0')}`,
    created_at: new Date().toISOString(),
  };
  currentDb.milk_rates.push(newRate);
  writeDbToFile(currentDb);
  res.status(201).json(newRate);
});

// Expenses endpoints
app.get('/api/expenses', (req: Request, res: Response) => {
  res.json(currentDb.expenses);
});

app.post('/api/expenses', (req: Request, res: Response) => {
  const expense = req.body;
  const newExpense = {
    ...expense,
    id: expense.id || `EXP-${Date.now().toString().slice(-4)}`,
    created_at: new Date().toISOString(),
  };
  currentDb.expenses.push(newExpense);
  writeDbToFile(currentDb);
  res.status(201).json(newExpense);
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  currentDb.expenses = currentDb.expenses.filter((e) => e.id !== id);
  writeDbToFile(currentDb);
  res.json({ success: true });
});

// Animals endpoints
app.get('/api/animals', (req: Request, res: Response) => {
  res.json({
    animals: currentDb.animals,
    sales: currentDb.animal_sales,
  });
});

app.post('/api/animals', (req: Request, res: Response) => {
  const animal = req.body;
  const newAnimal = {
    ...animal,
    id: animal.id || `ANM-${(currentDb.animals.length + 1).toString().padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  currentDb.animals.push(newAnimal);
  writeDbToFile(currentDb);
  res.status(201).json(newAnimal);
});

app.put('/api/animals/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const index = currentDb.animals.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Animal not found' });
  }
  currentDb.animals[index] = { ...currentDb.animals[index], ...req.body };
  writeDbToFile(currentDb);
  res.json(currentDb.animals[index]);
});

// ======================== STATIC & VITE MIDDLEWARE ========================

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production' || !fs.existsSync(path.join(__dirname, 'dist'));

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dairy Backend] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[Dairy Backend] Farm Name: ${currentDb.settings.farm_name}`);
    console.log(`[Dairy Backend] Database file: ${DB_FILE}`);
  });
}

startServer().catch((err) => {
  console.error('[Dairy Backend] Failed to start server:', err);
  process.exit(1);
});
