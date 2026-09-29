import { DairyDatabase, FarmSettings, Shopkeeper, MilkSale, Payment, Expense, Animal, MilkRate } from '../types';

const API_BASE = '/api';

export interface BackendStatus {
  connected: boolean;
  latencyMs?: number;
  serverTime?: string;
  storagePath?: string;
  farmName?: string;
  error?: string;
}

export const api = {
  async checkHealth(): Promise<BackendStatus> {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);
      return {
        connected: true,
        latencyMs,
        serverTime: data.serverTime,
        storagePath: data.storagePath,
        farmName: data.farmName,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err.message || 'Server unreachable',
      };
    }
  },

  async getDatabase(): Promise<DairyDatabase | null> {
    try {
      const res = await fetch(`${API_BASE}/database`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to fetch database: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Backend API getDatabase failed, falling back to local storage:', err);
      return null;
    }
  },

  async saveDatabase(db: DairyDatabase): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveDatabase failed:', err);
      return false;
    }
  },

  async resetDatabase(): Promise<DairyDatabase | null> {
    try {
      const res = await fetch(`${API_BASE}/database/reset`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error('Reset failed');
      return await res.json();
    } catch (err) {
      console.warn('Backend API resetDatabase failed:', err);
      return null;
    }
  },

  async updateSettings(settings: Partial<FarmSettings>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  },
};
