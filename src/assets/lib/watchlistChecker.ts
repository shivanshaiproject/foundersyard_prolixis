/**
 * Watchlist Checker - Politics & Extremism Filter
 * Checks content against the supreme_watchlist in the database
 */

import { supabase } from '@/integrations/supabase/client';

export interface WatchlistMatch {
  phrase: string;
  category: string;
  severity_level: number;
}

export interface WatchlistResult {
  isBlocked: boolean;
  isShadowBanned: boolean;
  isFlagged: boolean;
  matches: WatchlistMatch[];
  totalSeverity: number;
  highestSeverity: number;
  reason?: string;
}

// Cache for watchlist to avoid repeated DB calls
let watchlistCache: WatchlistMatch[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function loadWatchlist(): Promise<WatchlistMatch[]> {
  const now = Date.now();
  
  // Return cached version if still valid
  if (watchlistCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return watchlistCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('supreme_watchlist')
      .select('phrase, category, severity_level')
      .order('severity_level', { ascending: false });
    
    if (error) {
      console.error('Failed to load watchlist:', error);
      // Return empty array instead of failing - use local fallback
      return getLocalFallbackWatchlist();
    }
    
    watchlistCache = data || [];
    cacheTimestamp = now;
    return watchlistCache;
  } catch (err) {
    console.error('Error loading watchlist:', err);
    return getLocalFallbackWatchlist();
  }
}

// Local fallback watchlist for critical terms (used if DB is unavailable)
function getLocalFallbackWatchlist(): WatchlistMatch[] {
  return [
    // Terror (severity 5)
    { phrase: 'isis', category: 'terror', severity_level: 5 },
    { phrase: 'al-qaeda', category: 'terror', severity_level: 5 },
    { phrase: 'terrorist', category: 'terror', severity_level: 5 },
    { phrase: 'bomb making', category: 'terror', severity_level: 5 },
    
    // Violence (severity 5)
    { phrase: 'kill you', category: 'violence', severity_level: 5 },
    { phrase: 'death threat', category: 'violence', severity_level: 5 },
    { phrase: 'gun deals', category: 'violence', severity_level: 5 },
    
    // Extremism (severity 4)
    { phrase: 'join the movement', category: 'extremism', severity_level: 4 },
    { phrase: 'overthrow', category: 'extremism', severity_level: 4 },
    
    // Hate (severity 5)
    { phrase: 'supremacy', category: 'hate', severity_level: 5 },
    { phrase: 'genocide', category: 'hate', severity_level: 5 },
    { phrase: 'ethnic cleansing', category: 'hate', severity_level: 5 },
    
    // Harassment (severity 5)
    { phrase: 'doxxing', category: 'harassment', severity_level: 5 },
  ];
}

export async function checkAgainstWatchlist(text: string): Promise<WatchlistResult> {
  if (!text || text.trim().length === 0) {
    return {
      isBlocked: false,
      isShadowBanned: false,
      isFlagged: false,
      matches: [],
      totalSeverity: 0,
      highestSeverity: 0,
    };
  }

  const watchlist = await loadWatchlist();
  const normalizedText = text.toLowerCase();
  const matches: WatchlistMatch[] = [];
  
  for (const item of watchlist) {
    // Use word boundary matching for more accurate detection
    const escapedPhrase = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
    
    if (regex.test(normalizedText)) {
      matches.push(item);
    }
  }
  
  if (matches.length === 0) {
    return {
      isBlocked: false,
      isShadowBanned: false,
      isFlagged: false,
      matches: [],
      totalSeverity: 0,
      highestSeverity: 0,
    };
  }
  
  const totalSeverity = matches.reduce((sum, m) => sum + m.severity_level, 0);
  const highestSeverity = Math.max(...matches.map(m => m.severity_level));
  
  // Decision logic:
  // - Severity 5 match = BLOCK immediately
  // - 3+ matches OR total severity >= 10 = SHADOW BAN
  // - 1-2 matches with severity < 5 = FLAG for review
  
  let isBlocked = false;
  let isShadowBanned = false;
  let isFlagged = false;
  let reason = '';
  
  if (highestSeverity >= 5) {
    isBlocked = true;
    const blockingMatch = matches.find(m => m.severity_level >= 5);
    reason = `Prohibited content detected: ${blockingMatch?.category}`;
  } else if (matches.length >= 3 || totalSeverity >= 10) {
    isShadowBanned = true;
    reason = `Multiple policy violations detected (${matches.length} matches)`;
  } else {
    isFlagged = true;
    reason = `Content flagged for review: ${matches.map(m => m.category).join(', ')}`;
  }
  
  return {
    isBlocked,
    isShadowBanned,
    isFlagged,
    matches,
    totalSeverity,
    highestSeverity,
    reason,
  };
}

// Clear cache (useful for admin updates)
export function clearWatchlistCache(): void {
  watchlistCache = null;
  cacheTimestamp = 0;
}
