import {createApiClient} from '../data/api/client';
import {getMemoryDatabase} from '../data/db/MemoryDatabase';
import {AuditRepository} from '../data/repositories/AuditRepository';
import {ConflictRepository} from '../data/repositories/ConflictRepository';
import {MediaRepository} from '../data/repositories/MediaRepository';
import {OutboxRepository} from '../data/repositories/OutboxRepository';
import {SyncEngine} from '../sync/engine/SyncEngine';
import {MediaUploadQueue} from '../sync/mediaQueue/MediaUploadQueue';
import {useSyncStatusStore} from '../sync/status/syncStatusStore';
import {PrefKeys, getPrefString} from '../shared/storage/mmkv';

export interface AppServices {
  api: ReturnType<typeof createApiClient>;
  db: ReturnType<typeof getMemoryDatabase>;
  audits: AuditRepository;
  outboxRepo: OutboxRepository;
  conflicts: ConflictRepository;
  media: MediaRepository;
  mediaQueue: MediaUploadQueue;
  syncEngine: SyncEngine;
  refreshCounts: () => Promise<void>;
}

let services: AppServices | null = null;

export function getServices(): AppServices {
  if (services) {
    return services;
  }

  const db = getMemoryDatabase();
  const api = createApiClient();
  const audits = new AuditRepository(db);
  const outboxRepo = new OutboxRepository(db);
  const conflicts = new ConflictRepository(db);
  const media = new MediaRepository(db);
  const mediaQueue = new MediaUploadQueue({
    api,
    media,
    compress: MediaUploadQueue.stubCompress,
  });

  const syncEngine = new SyncEngine({
    api,
    audits,
    outboxRepo,
    conflicts,
    media,
    mediaQueue,
    isOnline: () => useSyncStatusStore.getState().online,
    onPhaseChange: phase => useSyncStatusStore.getState().setPhase(phase),
  });

  const refreshCounts = async () => {
    const outbox = await outboxRepo.countByStatus();
    const mediaCounts = await media.countByStatus();
    const unresolved = (await conflicts.listUnresolved()).length;
    useSyncStatusStore.getState().setCounts({
      outbox,
      media: mediaCounts,
      unresolvedConflicts: unresolved,
    });
    const last = getPrefString(PrefKeys.lastSyncAt, '');
    const err = getPrefString(PrefKeys.lastSyncError, '');
    useSyncStatusStore.getState().setLastSync(last || null, err || null);
  };

  services = {
    api,
    db,
    audits,
    outboxRepo,
    conflicts,
    media,
    mediaQueue,
    syncEngine,
    refreshCounts,
  };
  return services;
}

/** Test helper */
export function resetServices(): void {
  services = null;
}
