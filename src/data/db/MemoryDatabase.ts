import type {Audit} from '../../entities/audit/types';
import type {MediaAsset} from '../../entities/media/types';
import type {
  ConflictRecord,
  OutboxItem,
  SyncRecordStatus,
} from '../../shared/types/sync';

/**
 * In-memory local DB used for Jest and as the runtime store when WatermelonDB
 * native modules are unavailable. Same repository surface as production.
 */
export class MemoryDatabase {
  audits = new Map<string, Audit>();
  outbox = new Map<string, OutboxItem>();
  media = new Map<string, MediaAsset>();
  conflicts = new Map<string, ConflictRecord>();
  meta = new Map<string, string>();

  clearSensitive(): void {
    this.audits.clear();
    this.outbox.clear();
    this.media.clear();
    this.conflicts.clear();
    this.meta.clear();
  }

  snapshot(): {
    audits: Audit[];
    outbox: OutboxItem[];
    media: MediaAsset[];
    conflicts: ConflictRecord[];
  } {
    return {
      audits: [...this.audits.values()],
      outbox: [...this.outbox.values()],
      media: [...this.media.values()],
      conflicts: [...this.conflicts.values()],
    };
  }
}

let singleton: MemoryDatabase | null = null;

export function getMemoryDatabase(): MemoryDatabase {
  if (!singleton) {
    singleton = new MemoryDatabase();
  }
  return singleton;
}

export function resetMemoryDatabase(): MemoryDatabase {
  singleton = new MemoryDatabase();
  return singleton;
}

export function countStatuses(
  items: {status: SyncRecordStatus}[],
): Record<SyncRecordStatus, number> {
  const counts: Record<SyncRecordStatus, number> = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
  };
  for (const item of items) {
    counts[item.status] += 1;
  }
  return counts;
}
