import type {AuthTokens} from '../../entities/user/types';

const SERVICE = 'cabflo.auditor.tokens';

type KeychainModule = {
  setGenericPassword: (
    username: string,
    password: string,
    options?: {service?: string},
  ) => Promise<false | {service: string; storage: string}>;
  getGenericPassword: (options?: {
    service?: string;
  }) => Promise<false | {username: string; password: string; service: string}>;
  resetGenericPassword: (options?: {service?: string}) => Promise<boolean>;
};

let memoryFallback: AuthTokens | null = null;

function getKeychain(): KeychainModule | null {
  try {
    // Lazy require so Jest can run without native module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-keychain') as KeychainModule;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  const keychain = getKeychain();
  if (!keychain) {
    memoryFallback = tokens;
    return;
  }
  await keychain.setGenericPassword('cabflo', JSON.stringify(tokens), {
    service: SERVICE,
  });
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const keychain = getKeychain();
  if (!keychain) {
    return memoryFallback;
  }
  const result = await keychain.getGenericPassword({service: SERVICE});
  if (!result) {
    return null;
  }
  try {
    return JSON.parse(result.password) as AuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  memoryFallback = null;
  const keychain = getKeychain();
  if (!keychain) {
    return;
  }
  await keychain.resetGenericPassword({service: SERVICE});
}

/** Test helper */
export function __resetKeychainMemory(): void {
  memoryFallback = null;
}
