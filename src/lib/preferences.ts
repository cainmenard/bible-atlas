export type PreferenceKey =
  | 'translation'
  | 'canon'
  | 'density'
  | 'last-book'
  | 'last-chapter'
  | 'last-verse'
  | 'last-view-date'
  | 'readings-dismissed-date'     // for 6B
  | 'default-daily-view'          // for 6B
  | 'consecutive-dismissals';     // for 6B

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
}
