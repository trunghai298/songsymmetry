"use client";

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export interface CacheOptions {
  expiry?: number; // Time in milliseconds that cache items will live
}

export class LocalStorageCache {
  private prefix: string;
  private defaultExpiry: number;

  constructor(prefix = 'cache', options: CacheOptions = {}) {
    this.prefix = prefix;
    this.defaultExpiry = options.expiry || 1000 * 60 * 30; // 30 minutes default
  }

  /**
   * Creates a full key with prefix
   */
  private createKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    if (typeof window === 'undefined') return;
    
    const fullKey = this.createKey(key);
    const expiry = Date.now() + (options.expiry || this.defaultExpiry);
    const cacheItem: CacheItem<T> = { value, expiry };
    
    try {
      localStorage.setItem(fullKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error setting cache item', error);
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    const fullKey = this.createKey(key);
    try {
      const item = localStorage.getItem(fullKey);
      if (!item) return null;
      
      const cacheItem = JSON.parse(item) as CacheItem<T>;
      
      // Check if the item has expired
      if (cacheItem.expiry <= Date.now()) {
        this.remove(key);
        return null;
      }
      
      return cacheItem.value;
    } catch (error) {
      console.error('Error getting cache item', error);
      return null;
    }
  }

  /**
   * Remove a value from the cache
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    
    const fullKey = this.createKey(key);
    try {
      localStorage.setItem(fullKey, '');
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('Error removing cache item', error);
    }
  }

  /**
   * Check if a value exists in the cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache items with the current prefix
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing cache', error);
    }
  }

  /**
   * Remove all expired items from the cache
   */
  cleanup(): void {
    if (typeof window === 'undefined') return;
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          if (!item) return;
          
          try {
            const cacheItem = JSON.parse(item) as CacheItem<unknown>;
            if (cacheItem.expiry <= Date.now()) {
              localStorage.removeItem(key);
            }
          } catch {
            // If the item isn't properly formatted, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up cache', error);
    }
  }
}