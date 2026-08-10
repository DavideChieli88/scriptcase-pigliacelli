import { APP_CONFIG } from '@/app/config';
import { cacheRepo } from '@/persistence/repositories/CacheRepo';
import { logger } from '@/utils/logger';
import { debugLog } from '@/utils/debugLog';

export interface CacheStats {
  /** Approximate entry count (best-effort via list of known keys not available — use peek). */
  clearedAt?: number;
  lastKey?: string;
}

export class CacheService {
  private lastKey: string | undefined;
  private clearedAt: number | undefined;

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const value = await cacheRepo.get<T>(key);
    debugLog.push('cache', 'debug', value ? `hit ${key}` : `miss ${key}`);
    return value;
  }

  /** Read cache ignoring TTL — for offline fallback after a failed refresh. */
  async getStaleMetadata<T>(key: string): Promise<T | undefined> {
    const value = await cacheRepo.getStale<T>(key);
    debugLog.push('cache', 'debug', value ? `stale-hit ${key}` : `stale-miss ${key}`);
    return value;
  }

  async setMetadata(key: string, value: unknown, ttlMs = APP_CONFIG.cacheTtlMs): Promise<void> {
    await cacheRepo.set(key, value, { category: 'metadata', ttlMs });
    this.lastKey = key;
    logger.debug('Cache', `set ${key}`);
    debugLog.push('cache', 'info', `set ${key}`, { ttlMs });
  }

  /** Read-through helper: return cache or compute+store. */
  async getOrSetMetadata<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = APP_CONFIG.cacheTtlMs,
  ): Promise<{ value: T; cached: boolean }> {
    const cached = await this.getMetadata<T>(key);
    if (cached !== undefined) return { value: cached, cached: true };
    const value = await factory();
    await this.setMetadata(key, value, ttlMs);
    return { value, cached: false };
  }

  async invalidate(key: string): Promise<void> {
    await cacheRepo.delete(key);
    debugLog.push('cache', 'info', `invalidate ${key}`);
  }

  async clear(): Promise<void> {
    await cacheRepo.clear();
    this.clearedAt = Date.now();
    this.lastKey = undefined;
    logger.info('Cache', 'Cleared');
    debugLog.push('cache', 'warn', 'cleared all metadata');
  }

  stats(): CacheStats {
    return { clearedAt: this.clearedAt, lastKey: this.lastKey };
  }
}

export const cacheService = new CacheService();
