export type PreferenceKey =
  | 'translation'
  | 'canon'
  | 'density'
  | 'last-book'
  | 'last-chapter'
  | 'last-verse'
  | 'last-view-date'
  | 'readings-dismissed-date'
  | 'default-daily-view'
  | 'consecutive-dismissals'
  | 'recent-passages'
  | 'arc-focus-mode';

export interface RecentPassage {
  book: string;
  chapter: number | null;
  verse: number | null;
  timestamp: number;
}

const NAMESPACE = 'bible-atlas-';

// In-memory fallback for when localStorage is unavailable (QuotaExceededError etc.)
const memoryFallback = new Map<string, string>();

function storageKey(key: PreferenceKey): string {
  return `${NAMESPACE}${key}`;
}

export function getPreference<T>(key: PreferenceKey): T | null {
  if (typeof window === 'undefined') return null;
  const k = storageKey(key);
  try {
    const raw = localStorage.getItem(k);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    const fallback = memoryFallback.get(k);
    if (fallback === undefined) return null;
    try {
      return JSON.parse(fallback) as T;
    } catch {
      return null;
    }
  }
}

export function setPreference<T>(key: PreferenceKey, value: T | null): void {
  if (typeof window === 'undefined') return;
  const k = storageKey(key);
  if (value === null || value === undefined) {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
    memoryFallback.delete(k);
    return;
  }
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(k, serialized);
  } catch (err) {
    // QuotaExceededError: fall back to in-memory map for this session
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22)
    ) {
      memoryFallback.set(k, serialized);
    }
  }
}

const MAX_RECENT_PASSAGES = 10;
let recentPassagesCache: RecentPassage[] | null = null;
let recentPassagesWriteTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRecentPassagesFlush(passages: RecentPassage[]): void {
  if (recentPassagesWriteTimer) clearTimeout(recentPassagesWriteTimer);
  recentPassagesWriteTimer = setTimeout(() => {
    setPreference<RecentPassage[]>('recent-passages', passages);
    recentPassagesWriteTimer = null;
  }, 500);
}

export function getRecentPassages(limit = 5): RecentPassage[] {
  if (typeof window === 'undefined') return [];
  if (recentPassagesCache !== null) return recentPassagesCache.slice(0, limit);
  const raw = getPreference<RecentPassage[]>('recent-passages');
  if (!Array.isArray(raw)) {
    if (raw !== null) setPreference<RecentPassage[]>('recent-passages', null);
    recentPassagesCache = [];
    return [];
  }
  recentPassagesCache = raw;
  return raw.slice(0, limit);
}

export function addRecentPassage(passage: Omit<RecentPassage, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  getRecentPassages(MAX_RECENT_PASSAGES);
  const current = recentPassagesCache!;
  const filtered = current.filter(
    (p) => !(p.book === passage.book && p.chapter === passage.chapter && p.verse === passage.verse),
  );
  const updated = [{ ...passage, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_PASSAGES);
  recentPassagesCache = updated;
  scheduleRecentPassagesFlush(updated);
}

export function clearPreferences(): void {
  if (typeof window === 'undefined') return;
  const keys: PreferenceKey[] = [
    'translation',
    'canon',
    'density',
    'last-book',
    'last-chapter',
    'last-verse',
    'last-view-date',
    'readings-dismissed-date',
    'default-daily-view',
    'consecutive-dismissals',
    'recent-passages',
    'arc-focus-mode',
  ];
  keys.forEach((key) => {
    const k = storageKey(key);
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
    memoryFallback.delete(k);
  });
  recentPassagesCache = null;
  if (recentPassagesWriteTimer) {
    clearTimeout(recentPassagesWriteTimer);
    recentPassagesWriteTimer = null;
  }
}
