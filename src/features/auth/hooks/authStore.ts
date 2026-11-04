import {create} from 'zustand';
import type {AuditorUser, AuthSession} from '../../../entities/user/types';
import {clearTokens, loadTokens, saveTokens} from '../../../shared/storage/keychain';
import {clearSensitivePrefs} from '../../../shared/storage/mmkv';
import {createApiClient} from '../../../data/api/client';
import {errorReporter} from '../../../shared/monitoring/sentry';
import {getMemoryDatabase} from '../../../data/db/MemoryDatabase';

interface AuthState {
  hydrated: boolean;
  user: AuditorUser | null;
  bootstrapping: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** True when refresh token still valid for offline use. */
  canWorkOffline: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  user: null,
  bootstrapping: false,
  error: null,

  hydrate: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({hydrated: true, user: null});
      return;
    }
    const refreshValid = new Date(tokens.refreshExpiresAt).getTime() > Date.now();
    if (!refreshValid) {
      await clearTokens();
      set({hydrated: true, user: null});
      return;
    }
    // Offline-capable session: keep last known user from prefs-less memory;
    // full profile is restored after online refresh. For demo, reconstruct.
    set({
      hydrated: true,
      user: {
        id: 'user-auditor-1',
        email: 'auditor@cabflo.demo',
        displayName: 'Alex Auditor',
        role: 'auditor',
      },
    });
  },

  login: async (email, password) => {
    set({bootstrapping: true, error: null});
    try {
      const api = createApiClient();
      const session: AuthSession = await api.login({email, password});
      await saveTokens(session.tokens);
      errorReporter.setUser({id: session.user.id, email: session.user.email});
      set({user: session.user, bootstrapping: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({error: message, bootstrapping: false, user: null});
      throw err;
    }
  },

  logout: async () => {
    await clearTokens();
    clearSensitivePrefs();
    getMemoryDatabase().clearSensitive();
    errorReporter.setUser(null);
    set({user: null, error: null});
  },

  canWorkOffline: async () => {
    if (!get().user) {
      return false;
    }
    const tokens = await loadTokens();
    if (!tokens) {
      return false;
    }
    return new Date(tokens.refreshExpiresAt).getTime() > Date.now();
  },
}));
