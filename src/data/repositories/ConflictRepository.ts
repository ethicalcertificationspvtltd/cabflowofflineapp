import type {ConflictRecord} from '../../shared/types/sync';
import type {MemoryDatabase} from '../db/MemoryDatabase';

export class ConflictRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listUnresolved(): Promise<ConflictRecord[]> {
    return [...this.db.conflicts.values()]
      .filter(c => !c.resolved)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async add(conflict: ConflictRecord): Promise<void> {
    this.db.conflicts.set(conflict.id, conflict);
  }

  async resolve(id: string): Promise<void> {
    const existing = this.db.conflicts.get(id);
    if (!existing) {
      return;
    }
    this.db.conflicts.set(id, {...existing, resolved: true});
  }

  async clear(): Promise<void> {
    this.db.conflicts.clear();
  }
}
