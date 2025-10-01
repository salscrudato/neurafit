// Robust data persistence manager
// Replaces session storage with secure, memory-efficient data persistence

import { openDB, type IDBPDatabase } from 'idb';
// import { useAppStore } from '../store'; // Unused import
import type { WorkoutHistoryItem, PendingOperation } from '../store';

// Type for cached data
interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

// Type for user preferences
interface UserPreference<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
}

interface NeuraFitDB {
  workouts: {
    key: string;
    value: WorkoutHistoryItem;
    indexes: { timestamp: number; type: string };
  };
  pendingOperations: {
    key: string;
    value: PendingOperation;
  };
  cache: {
    key: string;
    value: CacheItem;
  };
  userPreferences: {
    key: string;
    value: UserPreference;
  };
}

class DataManager {
  private db: IDBPDatabase<NeuraFitDB> | null = null;
  private readonly DB_NAME = 'NeuraFitDB';
  private readonly DB_VERSION = 1;
  private readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB
  private currentStorageSize = 0;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
    this.setupStorageMonitoring();
    this.setupPeriodicCleanup();
  }

  private async init(): Promise<void> {
    try {
      this.db = await openDB<NeuraFitDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Workouts store
          const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
          workoutStore.createIndex('timestamp', 'timestamp');
          workoutStore.createIndex('type', 'workoutType');

          // Pending operations store
          db.createObjectStore('pendingOperations', { keyPath: 'id' });

          // Cache store
          db.createObjectStore('cache', { keyPath: 'key' });

          // User preferences store
          db.createObjectStore('userPreferences', { keyPath: 'key' });
        },
      });

      await this.calculateStorageSize();
      console.log('DataManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DataManager:', error);
      // Fallback to memory-only storage
      this.db = null;
      throw new Error('Failed to initialize IndexedDB');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // Workout data management
  async saveWorkout(workout: WorkoutHistoryItem): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('workouts', 'readwrite');
      await tx.store.put(workout);
      await tx.done;

      this.currentStorageSize += this.estimateSize(workout);
      await this.enforceStorageLimit();
    } catch (error) {
      console.error('Failed to save workout:', error);
      throw new Error('Failed to save workout data');
    }
  }

  async getWorkouts(limit = 50, offset = 0): Promise<WorkoutHistoryItem[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('workouts', 'readonly');
      const index = tx.store.index('timestamp');
      const workouts = await index.getAll();

      // Sort by timestamp descending and apply pagination
      return workouts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get workouts:', error);
      return [];
    }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('workouts', 'readwrite');
      await tx.store.delete(workoutId);
      await tx.done;
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  }

  // Pending operations management
  async savePendingOperation(operation: PendingOperation): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('pendingOperations', 'readwrite');
      await tx.store.put(operation);
      await tx.done;
    } catch (error) {
      console.error('Failed to save pending operation:', error);
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('pendingOperations', 'readonly');
      return await tx.store.getAll();
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      return [];
    }
  }

  async deletePendingOperation(operationId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('pendingOperations', 'readwrite');
      await tx.store.delete(operationId);
      await tx.done;
    } catch (error) {
      console.error('Failed to delete pending operation:', error);
    }
  }

  // Cache management
  async setCache<T>(key: string, data: T, ttl = 5 * 60 * 1000): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size: this.estimateSize(data),
    };

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      await tx.store.put({ key, value: cacheItem });
      await tx.done;

      this.currentStorageSize += cacheItem.size;
      await this.enforceStorageLimit();
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    try {
      const tx = this.db.transaction('cache', 'readonly');
      const record = await tx.store.get(key);

      if (!record) return null;

      const item = record.value as CacheItem<T>;

      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        // Delete expired item
        const deleteTx = this.db.transaction('cache', 'readwrite');
        await deleteTx.store.delete(key);
        await deleteTx.done;
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      await tx.store.clear();
      await tx.done;
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // User preferences management
  async setPreference<T>(key: string, value: T): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const preference: UserPreference<T> = {
      key,
      value,
      timestamp: Date.now(),
    };

    try {
      const tx = this.db.transaction('userPreferences', 'readwrite');
      await tx.store.put({ key, value: preference });
      await tx.done;
    } catch (error) {
      console.error('Failed to set preference:', error);
    }
  }

  async getPreference<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    try {
      const tx = this.db.transaction('userPreferences', 'readonly');
      const record = await tx.store.get(key);
      const preference = record?.value as UserPreference<T>;
      return preference?.value ?? null;
    } catch (error) {
      console.error('Failed to get preference:', error);
      return null;
    }
  }

  // Storage management
  private async calculateStorageSize(): Promise<void> {
    if (!this.db) return;

    try {
      let totalSize = 0;

      // Calculate workouts size
      const workoutsTx = this.db.transaction('workouts', 'readonly');
      const workouts = await workoutsTx.store.getAll();
      totalSize += workouts.reduce((sum, workout) => sum + this.estimateSize(workout), 0);

      // Calculate cache size
      const cacheTx = this.db.transaction('cache', 'readonly');
      const cacheItems = await cacheTx.store.getAll();
      totalSize += cacheItems.reduce((sum, item) => sum + (item.value as CacheItem).size, 0);

      this.currentStorageSize = totalSize;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }
  }

  private async enforceStorageLimit(): Promise<void> {
    if (this.currentStorageSize <= this.MAX_STORAGE_SIZE) return;

    try {
      // First, clean expired cache items
      await this.cleanExpiredCache();
      await this.calculateStorageSize();

      // If still over limit, remove oldest workouts
      if (this.currentStorageSize > this.MAX_STORAGE_SIZE) {
        await this.removeOldestWorkouts();
      }
    } catch (error) {
      console.error('Failed to enforce storage limit:', error);
    }
  }

  private async cleanExpiredCache(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const items = await tx.store.getAll();
      const now = Date.now();

      for (const item of items) {
        const cacheItem = item.value as CacheItem;
        if (now - cacheItem.timestamp > cacheItem.ttl) {
          await tx.store.delete(item.key);
        }
      }
      await tx.done;
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
    }
  }

  private async removeOldestWorkouts(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('workouts', 'readwrite');
      const index = tx.store.index('timestamp');
      const workouts = await index.getAll();

      // Sort by timestamp ascending (oldest first)
      workouts.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25% of workouts
      const toRemove = Math.ceil(workouts.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        await tx.store.delete(workouts[i].id);
      }
      await tx.done;
    } catch (error) {
      console.error('Failed to remove oldest workouts:', error);
    }
  }

  private estimateSize(obj: unknown): number {
    const str = JSON.stringify(obj);
    return new TextEncoder().encode(str).length;
  }

  private setupStorageMonitoring(): void {
    // Monitor storage usage every 5 minutes
    setInterval(async () => {
      await this.calculateStorageSize();
    }, 5 * 60 * 1000);
  }

  private setupPeriodicCleanup(): void {
    // Clean up expired items every hour
    setInterval(async () => {
      await this.cleanExpiredCache();
      await this.calculateStorageSize();
    }, 60 * 60 * 1000);
  }

  // Utility methods
  async exportData(): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) return '{}';

    try {
      const workouts = await this.getWorkouts(1000); // Export up to 1000 workouts
      const preferences = await this.getAllPreferences();

      return JSON.stringify({
        workouts,
        preferences,
        exportDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      return '{}';
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData) as { workouts?: WorkoutHistoryItem[]; preferences?: Record<string, unknown> };

      if (data.workouts) {
        for (const workout of data.workouts) {
          await this.saveWorkout(workout);
        }
      }

      if (data.preferences) {
        for (const [key, value] of Object.entries(data.preferences)) {
          await this.setPreference(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }

  private async getAllPreferences(): Promise<Record<string, unknown>> {
    if (!this.db) return {};

    try {
      const tx = this.db.transaction('userPreferences', 'readonly');
      const records = await tx.store.getAll();

      const preferences: Record<string, unknown> = {};
      for (const record of records) {
        const preference = record.value as UserPreference;
        preferences[preference.key] = preference.value;
      }

      return preferences;
    } catch (error) {
      console.error('Failed to get all preferences:', error);
      return {};
    }
  }

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['workouts', 'pendingOperations', 'cache', 'userPreferences'], 'readwrite');
      await Promise.all([
        tx.objectStore('workouts').clear(),
        tx.objectStore('pendingOperations').clear(),
        tx.objectStore('cache').clear(),
        tx.objectStore('userPreferences').clear(),
      ]);
      await tx.done;

      this.currentStorageSize = 0;
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }
}

// Create singleton instance
export const dataManager = new DataManager();

// Export types for use in other modules
export type { NeuraFitDB };