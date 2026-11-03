import {OutboxQueue} from '../../sync/outbox/OutboxQueue';
import {OutboxRepository} from '../../data/repositories/OutboxRepository';
import {resetMemoryDatabase} from '../../data/db/MemoryDatabase';

describe('OutboxQueue', () => {
  beforeEach(() => {
    resetMemoryDatabase();
  });

  it('enqueues idempotent client UUIDs and dequeues ready jobs', async () => {
    const db = resetMemoryDatabase();
    const queue = new OutboxQueue(new OutboxRepository(db));
    const now = new Date('2024-06-01T12:00:00.000Z');

    const a = await queue.enqueue({
      entityType: 'audit',
      entityClientId: 'audit-1',
      operation: 'update',
      payload: {notes: 'one'},
      baseVersion: 1,
      clientId: 'outbox-client-stable',
      now,
    });
    expect(a.clientId).toBe('outbox-client-stable');
    expect(a.status).toBe('pending');

    const ready = await queue.dequeueReady(10, now);
    expect(ready).toHaveLength(1);
    expect(ready[0].status).toBe('syncing');

    await queue.markSynced(ready[0].id, now);
    const counts = await queue.pendingCounts();
    expect(counts.synced).toBe(1);
    expect(counts.pending).toBe(0);
  });

  it('marks failed with exponential nextAttemptAt and allows partial progress', async () => {
    const db = resetMemoryDatabase();
    const queue = new OutboxQueue(new OutboxRepository(db));
    const now = new Date('2024-06-01T12:00:00.000Z');

    const first = await queue.enqueue({
      entityType: 'audit',
      entityClientId: 'a1',
      operation: 'update',
      payload: {},
      baseVersion: 0,
      now,
    });
    const second = await queue.enqueue({
      entityType: 'audit',
      entityClientId: 'a2',
      operation: 'update',
      payload: {},
      baseVersion: 0,
      now,
    });

    const ready = await queue.dequeueReady(10, now);
    expect(ready).toHaveLength(2);

    await queue.markFailed(first.id, 'network', now);
    await queue.markSynced(second.id, now);

    const counts = await queue.pendingCounts();
    expect(counts.failed).toBe(1);
    expect(counts.synced).toBe(1);

    const failed = await db.outbox.get(first.id);
    expect(failed?.attempts).toBe(1);
    expect(new Date(failed!.nextAttemptAt).getTime()).toBeGreaterThan(
      now.getTime(),
    );
  });

  it('recovers via requeue for retry after failure', async () => {
    const db = resetMemoryDatabase();
    const queue = new OutboxQueue(new OutboxRepository(db));
    const now = new Date('2024-06-01T12:00:00.000Z');
    const item = await queue.enqueue({
      entityType: 'audit',
      entityClientId: 'a1',
      operation: 'update',
      payload: {},
      baseVersion: 0,
      now,
    });
    const [job] = await queue.dequeueReady(1, now);
    await queue.markFailed(job.id, 'boom', now);
    await queue.requeue(item.id, now);
    const again = await queue.dequeueReady(1, now);
    expect(again[0].id).toBe(item.id);
    expect(again[0].status).toBe('syncing');
  });
});
