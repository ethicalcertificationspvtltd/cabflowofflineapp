type MMKVLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | number | boolean) => void;
  delete: (key: string) => void;
  clearAll: () => void;
  getAllKeys: () => string[];
};

class MemoryMMKV implements MMKVLike {
  private store = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string | number | boolean): void {
    this.store.set(key, String(value));
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clearAll(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return [...this.store.keys()];
  }
}

let prefs: MMKVLike | null = null;

export function getPrefs(): MMKVLike {
  if (prefs) {
    return prefs;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {MMKV} = require('react-native-mmkv') as {
      MMKV: new (options?: {id?: string}) => MMKVLike;
    };
    prefs = new MMKV({id: 'cabflo.prefs'});
  } catch {
    prefs = new MemoryMMKV();
  }
  return prefs;
}

export function getPrefString(key: string, fallback = ''): string {
  return getPrefs().getString(key) ?? fallback;
}

export function setPrefString(key: string, value: string): void {
  getPrefs().set(key, value);
}

export function getPrefBool(key: string, fallback = false): boolean {
  const raw = getPrefs().getString(key);
  if (raw === undefined) {
    return fallback;
  }
  return raw === 'true' || raw === '1';
}

export function setPrefBool(key: string, value: boolean): void {
  getPrefs().set(key, value);
}

export function clearSensitivePrefs(): void {
  const p = getPrefs();
  // Wipe all prefs on logout (session + sync cursors). Re-seed defaults after login.
  p.clearAll();
}

/** Test helper */
export function __resetPrefsMemory(): void {
  prefs = new MemoryMMKV();
}

export const PrefKeys = {
  lastSyncAt: 'sync.lastAt',
  lastSyncError: 'sync.lastError',
  retentionDays: 'sync.retentionDays',
  onboardingDone: 'ui.onboardingDone',
} as const;
