export type AppEnvironment = 'development' | 'staging' | 'production';

export interface AppConfig {
  env: AppEnvironment;
  apiBaseUrl: string;
  useMockApi: boolean;
  syncIntervalMs: number;
  /** Days to retain synced audits locally before purge. */
  auditRetentionDays: number;
  mediaMaxWidth: number;
  mediaJpegQuality: number;
  sentryDsn?: string;
}

const DEFAULTS: Record<AppEnvironment, AppConfig> = {
  development: {
    env: 'development',
    apiBaseUrl: 'http://localhost:3000/api/v1',
    useMockApi: true,
    syncIntervalMs: 30_000,
    auditRetentionDays: 30,
    mediaMaxWidth: 1600,
    mediaJpegQuality: 0.7,
    sentryDsn: undefined,
  },
  staging: {
    env: 'staging',
    apiBaseUrl: 'https://staging-api.cabflo.example/api/v1',
    useMockApi: false,
    syncIntervalMs: 60_000,
    auditRetentionDays: 45,
    mediaMaxWidth: 1600,
    mediaJpegQuality: 0.7,
    sentryDsn: undefined,
  },
  production: {
    env: 'production',
    apiBaseUrl: 'https://api.cabflo.example/api/v1',
    useMockApi: false,
    syncIntervalMs: 60_000,
    auditRetentionDays: 60,
    mediaMaxWidth: 1600,
    mediaJpegQuality: 0.65,
    sentryDsn: undefined,
  },
};

function resolveEnvName(): AppEnvironment {
  // react-native-config injects at build time; fall back for Jest/metro.
  const raw =
    (globalThis as {process?: {env?: Record<string, string | undefined>}}).process
      ?.env?.CABFLO_ENV ??
    (globalThis as {process?: {env?: Record<string, string | undefined>}}).process
      ?.env?.NODE_ENV;

  if (raw === 'production' || raw === 'staging' || raw === 'development') {
    return raw;
  }
  return 'development';
}

export function getAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  const base = DEFAULTS[resolveEnvName()];
  return {
    ...base,
    ...overrides,
    apiBaseUrl:
      overrides?.apiBaseUrl ??
      (globalThis as {process?: {env?: Record<string, string | undefined>}}).process
        ?.env?.CABFLO_API_BASE_URL ??
      base.apiBaseUrl,
    useMockApi:
      overrides?.useMockApi ??
      ((globalThis as {process?: {env?: Record<string, string | undefined>}}).process
        ?.env?.CABFLO_USE_MOCK_API === 'false'
        ? false
        : base.useMockApi),
    sentryDsn:
      overrides?.sentryDsn ??
      (globalThis as {process?: {env?: Record<string, string | undefined>}}).process
        ?.env?.CABFLO_SENTRY_DSN ??
      base.sentryDsn,
  };
}
