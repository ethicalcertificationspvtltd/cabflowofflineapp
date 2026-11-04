import type {OutboxItem, SyncRecordStatus} from '../../shared/types/sync';
import type {OutboxStore} from '../../sync/outbox/OutboxQueue';
import {countStatuses, type MemoryDatabase} from '../db/MemoryDatabase';

export class OutboxRepository implements OutboxStore {
  constructor(private readonly db: MemoryDatabase) {}

  async list(status?: SyncRecordStatus | SyncRecordStatus[]): Promise<OutboxItem[]> {
    const all = [...this.db.outbox.values()];
    if (!status) {
      return all;
    }
    const set = new Set(Array.isArray(status) ? status : [status]);
    return all.filter(item => set.has(item.status));
  }

  async get(id: string): Promise<OutboxItem | null> {
    return this.db.outbox.get(id) ?? null;
  }

  async upsert(item: OutboxItem): Promise<void> {
    this.db.outbox.set(item.id, item);
  }

  async remove(id: string): Promise<void> {
    this.db.outbox.delete(id);
  }

  async clearSynced(): Promise<number> {
    let n = 0;
    for (const [id, item] of this.db.outbox) {
      if (item.status === 'synced') {
        this.db.outbox.delete(id);
        n += 1;
      }
    }
    return n;
  }

  async countByStatus(): Promise<Record<SyncRecordStatus, number>> {
    return countStatuses([...this.db.outbox.values()]);
  }

  async listFailed(): Promise<OutboxItem[]> {
    return this.list(['failed', 'conflict']);
  }
}
