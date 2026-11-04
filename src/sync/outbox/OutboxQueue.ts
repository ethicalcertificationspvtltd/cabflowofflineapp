import type {OutboxItem, OutboxOperation, OutboxEntityType, SyncRecordStatus} from '../../shared/types/sync';
import {createClientId} from '../../shared/lib/uuid';
import {nextAttemptAt} from '../../shared/lib/backoff';

export interface OutboxStore {
  list(status?: SyncRecordStatus | SyncRecordStatus[]): Promise<OutboxItem[]>;
  get(id: string): Promise<OutboxItem | null>;
  upsert(item: OutboxItem): Promise<void>;
  remove(id: string): Promise<void>;
  clearSynced(): Promise<number>;
  countByStatus(): Promise<Record<SyncRecordStatus, number>>;
}

export interface EnqueueInput {
  entityType: OutboxEntityType;
  entityClientId: string;
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  baseVersion: number;
  clientId?: string;
  now?: Date;
}

export class OutboxQueue {
  constructor(private readonly store: OutboxStore) {}

  async enqueue(input: EnqueueInput): Promise<OutboxItem> {
    const now = input.now ?? new Date();
    const iso = now.toISOString();
    const item: OutboxItem = {
      id: createClientId(),
      clientId: input.clientId ?? createClientId(),
      entityType: input.entityType,
      entityClientId: input.entityClientId,
      operation: input.operation,
      payload: input.payload,
      baseVersion: input.baseVersion,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: iso,
      lastError: null,
      createdAt: iso,
      updatedAt: iso,
    };
    await this.store.upsert(item);
    return item;
  }

  /** Ready jobs: pending/failed whose nextAttemptAt <= now. Partial sync friendly. */
  async dequeueReady(limit: number, now: Date = new Date()): Promise<OutboxItem[]> {
    const candidates = await this.store.list(['pending', 'failed']);
    const ready = candidates
      .filter(item => new Date(item.nextAttemptAt).getTime() <= now.getTime())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);

    for (const item of ready) {
      await this.store.upsert({
        ...item,
        status: 'syncing',
        updatedAt: now.toISOString(),
      });
    }

    return ready.map(item => ({...item, status: 'syncing' as const}));
  }

  async markSynced(id: string, now: Date = new Date()): Promise<void> {
    const item = await this.store.get(id);
    if (!item) {
      return;
    }
    await this.store.upsert({
      ...item,
      status: 'synced',
      lastError: null,
      updatedAt: now.toISOString(),
    });
  }

  async markFailed(
    id: string,
    error: string,
    now: Date = new Date(),
  ): Promise<OutboxItem | null> {
    const item = await this.store.get(id);
    if (!item) {
      return null;
    }
    const attempts = item.attempts + 1;
    const updated: OutboxItem = {
      ...item,
      status: 'failed',
      attempts,
      lastError: error,
      nextAttemptAt: nextAttemptAt(attempts, now),
      updatedAt: now.toISOString(),
    };
    await this.store.upsert(updated);
    return updated;
  }

  async markConflict(id: string, error: string, now: Date = new Date()): Promise<void> {
    const item = await this.store.get(id);
    if (!item) {
      return;
    }
    await this.store.upsert({
      ...item,
      status: 'conflict',
      lastError: error,
      updatedAt: now.toISOString(),
    });
  }

  async requeue(id: string, now: Date = new Date()): Promise<void> {
    const item = await this.store.get(id);
    if (!item) {
      return;
    }
    await this.store.upsert({
      ...item,
      status: 'pending',
      nextAttemptAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastError: null,
    });
  }

  async pendingCounts(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    conflict: number;
    synced: number;
  }> {
    const counts = await this.store.countByStatus();
    return {
      pending: counts.pending ?? 0,
      syncing: counts.syncing ?? 0,
      failed: counts.failed ?? 0,
      conflict: counts.conflict ?? 0,
      synced: counts.synced ?? 0,
    };
  }
}
