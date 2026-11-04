import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {cabFloSchema} from './schema';
import {migrations} from './migrations';
import {AuditModel} from './models/AuditModel';

/**
 * Factory for WatermelonDB. Prefer SQLite on device; LokiJS for Jest / when
 * native SQLite is unavailable. App repositories currently use MemoryDatabase
 * for a unified testable surface — call createWatermelonDatabase() when ready
 * to cut over the repository adapters.
 */
export function createWatermelonDatabase(options?: {
  useLoki?: boolean;
}): Database {
  const nodeEnv = (globalThis as {process?: {env?: {NODE_ENV?: string}}})
    .process?.env?.NODE_ENV;
  const useLoki = options?.useLoki ?? nodeEnv === 'test';

  const adapter = useLoki
    ? new LokiJSAdapter({
        schema: cabFloSchema,
        migrations,
        useWebWorker: false,
        useIncrementalIndexedDB: false,
      })
    : new SQLiteAdapter({
        schema: cabFloSchema,
        migrations,
        jsi: true,
        onSetUpError: error => {
          // eslint-disable-next-line no-console
          console.error('WatermelonDB setup failed', error);
        },
      });

  return new Database({
    adapter,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelClasses: [AuditModel as any],
  });
}
