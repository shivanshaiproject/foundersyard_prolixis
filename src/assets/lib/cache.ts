// Cache service with expiry rules for performance optimization

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

// Expiry rules (in milliseconds)
export const CACHE_EXPIRY = {
  FEED: 60 * 1000,           // 60 seconds
  PROFILE: 10 * 60 * 1000,   // 10 minutes
  FORUMS: 30 * 60 * 1000,    // 30 minutes
  THREAD_PREVIEW: 5 * 60 * 1000, // 5 minutes
  USER_SEARCH: 30 * 1000,    // 30 seconds
} as const;

export function getCached<T>(key: string): T | null {
  // Check memory cache first
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < memEntry.expiry) {
    return memEntry.data;
  }
  
  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem(`cache_${key}`);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() - entry.timestamp < entry.expiry) {
        // Restore to memory cache
        memoryCache.set(key, entry);
        return entry.data;
      } else {
        // Expired, remove it
        sessionStorage.removeItem(`cache_${key}`);
      }
    }
  } catch {
    // Ignore storage errors
  }
  
  return null;
}

export function setCache<T>(key: string, data: T, expiry: number): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiry,
  };
  
  // Store in memory
  memoryCache.set(key, entry);
  
  // Store in sessionStorage
  try {
    sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch {
    // Storage might be full, ignore
  }
}

export function invalidateCache(keyPattern: string): void {
  // Clear from memory
  for (const key of memoryCache.keys()) {
    if (key.includes(keyPattern)) {
      memoryCache.delete(key);
    }
  }
  
  // Clear from sessionStorage
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.includes(`cache_${keyPattern}`)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore
  }
}

export function clearAllCache(): void {
  memoryCache.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('cache_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore
  }
}

// Cache-first fetch wrapper
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  expiry: number
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const data = await fetcher();
  setCache(key, data, expiry);
  return data;
}
