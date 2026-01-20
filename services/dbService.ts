
import { openDB, IDBPDatabase } from 'https://esm.sh/idb@^8.0.0';
import { BusinessPlanData } from '../types';

const DB_NAME = 'FamaBusinessDB';
const STORE_NAME = 'plans';
const CACHE_STORE = 'ai_cache';
const VERSION = 2; // Incremented version to trigger upgrade for new store

export interface PlanRecord {
  id: string;
  name: string;
  lastModified: number;
  data: BusinessPlanData;
}

export interface AICacheRecord {
  summaryHash: string;
  generatedData: any;
  timestamp: number;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'summaryHash' });
      }
    },
  });
}

export const dbService = {
  // Plan management
  async savePlan(plan: PlanRecord): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, {
      ...plan,
      lastModified: Date.now()
    });
  },

  async getPlan(id: string): Promise<PlanRecord | undefined> {
    const db = await getDB();
    return db.get(STORE_NAME, id);
  },

  async getAllPlans(): Promise<PlanRecord[]> {
    const db = await getDB();
    const plans = await db.getAll(STORE_NAME);
    return plans.sort((a, b) => b.lastModified - a.lastModified);
  },

  async deletePlan(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  },

  // AI Caching for consistency
  async getCachedResponse(summary: string): Promise<any | null> {
    const db = await getDB();
    const hash = this.generateHash(summary);
    const cached = await db.get(CACHE_STORE, hash);
    return cached ? cached.generatedData : null;
  },

  async setCachedResponse(summary: string, data: any): Promise<void> {
    const db = await getDB();
    const hash = this.generateHash(summary);
    await db.put(CACHE_STORE, {
      summaryHash: hash,
      generatedData: data,
      timestamp: Date.now()
    });
  },

  generateHash(text: string): string {
    // Basic hash to normalize keys (removing spaces and lowercasing)
    return text.trim().toLowerCase().replace(/\s+/g, '_');
  }
};
