import {SyncEngine} from '../../sync/engine/SyncEngine';
import {MediaUploadQueue} from '../../sync/mediaQueue/MediaUploadQueue';
import {AuditRepository} from '../../data/repositories/AuditRepository';
import {ConflictRepository} from '../../data/repositories/ConflictRepository';
import {MediaRepository} from '../../data/repositories/MediaRepository';
import {OutboxRepository} from '../../data/repositories/OutboxRepository';
import {resetMemoryDatabase} from '../../data/db/MemoryDatabase';
import {MockCabFloApi, resetMockApi} from '../../data/api/mockApi';
import {saveTokens, __resetKeychainMemory} from '../../shared/storage/keychain';
import {__resetPrefsMemory} from '../../shared/storage/mmkv';

function buildEngine(online = true) {
  const db = resetMemoryDatabase();
  const api = resetMockApi();
  const audits = new AuditRepository(db);
  const outboxRepo = new OutboxRepository(db);
  const conflicts = new ConflictRepository(db);
  const media = new MediaRepository(db);
  const mediaQueue = new MediaUploadQueue({api, media});
  const engine = new SyncEngine({
    api,
    audits,
    outboxRepo,
    conflicts,
    media,
    mediaQueue,
    isOnline: () => online,
  });
  return {engine, api, audits, outboxRepo, conflicts, media, db};
}

describe('SyncEngine', () => {
  beforeEach(async () => {
    __resetKeychainMemory();
    __resetPrefsMemory();
    await saveTokens({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh-test',
      accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
  });

  it('pulls assigned audits into local DB (source of truth)', async () => {
    const {engine, api, audits} = buildEngine(true);
    await api.login({email: 'auditor@cabflo.demo', password: 'auditor123'});
    const result = await engine.runFullSync();
    expect(result.pulled).toBeGreaterThanOrEqual(3);
    const list = await audits.listAssigned('user-auditor-1');
    expect(list.length).toBeGreaterThanOrEqual(3);
  });

  it('pushes draft updates idempotently without duplicates', async () => {
    const {engine, api, audits, outboxRepo} = buildEngine(true);
    await api.login({email: 'auditor@cabflo.demo', password: 'auditor123'});
    await engine.runFullSync();

    const local = (await audits.listAssigned('user-auditor-1'))[0];
    const draft = await audits.saveDraft(local.clientId, {
      notes: 'airplane note',
      isDraft: true,
      localStatus: 'draft',
    });
    await engine.enqueueAuditUpdate(draft);
    await engine.enqueueAuditUpdate(draft); // second enqueue — separate jobs ok; server idempotent by clientId

    const first = await engine.runFullSync();
    expect(first.pushed).toBeGreaterThanOrEqual(1);

    const after = await audits.getByClientId(local.clientId);
    expect(after?.notes).toBe('airplane note');
    expect(after?.syncStatus).toBe('synced');

    // No duplicate server rows for same clientId
    const pull = await api.pullAssignedAudits({});
    const matches = pull.audits.filter(a => a.clientId === local.clientId);
    expect(matches).toHaveLength(1);

    const pending = await outboxRepo.list(['pending', 'syncing', 'failed']);
    expect(pending).toHaveLength(0);
  });

  it('resumes cleanly after kill mid-sync (syncing → pending)', async () => {
    const {engine, outboxRepo} = buildEngine(true);
    const item = await engine.getOutbox().enqueue({
      entityType: 'audit',
      entityClientId: 'x',
      operation: 'update',
      payload: {clientId: 'x', notes: 'n'},
      baseVersion: 0,
    });
    await outboxRepo.upsert({...item, status: 'syncing'});
    const recovered = await engine.recoverInterrupted();
    expect(recovered).toBe(1);
    const again = await outboxRepo.get(item.id);
    expect(again?.status).toBe('pending');
  });

  it('records visible conflicts for admin-lock + draft divergence', async () => {
    const {engine, api, audits, conflicts} = buildEngine(true);
    await api.login({email: 'auditor@cabflo.demo', password: 'auditor123'});
    await engine.runFullSync();

    const locked = (await audits.listAssigned('user-auditor-1')).find(
      a => a.clientId === 'audit-client-seed-3',
    );
    expect(locked).toBeTruthy();

    // Simulate stale local copy that is not yet locked, with divergent draft edits.
    const local = await audits.getByClientId(locked!.clientId);
    await audits.upsert({
      ...local!,
      adminLocked: false,
      assignmentStatus: 'submitted',
      notes: 'offline change under lock',
      syncStatus: 'pending',
      isDraft: true,
      localStatus: 'draft',
      updatedAt: new Date().toISOString(),
      version: (local?.version ?? 1) + 1,
    });

    (api as MockCabFloApi).lockAuditOnServer('audit-server-3');
    (api as MockCabFloApi).mutateServerNotes('audit-server-3', 'admin notes');

    await engine.runFullSync();
    const unresolved = await conflicts.listUnresolved();
    expect(unresolved.length).toBeGreaterThanOrEqual(1);
    const after = await audits.getByClientId(locked!.clientId);
    expect(after?.syncStatus === 'conflict' || unresolved.length > 0).toBe(true);
  });

  it('skips network work when offline but keeps local data', async () => {
    const {engine, api, audits} = buildEngine(true);
    await api.login({email: 'auditor@cabflo.demo', password: 'auditor123'});
    await engine.runFullSync();

    const offline = buildEngine(false);
    // share seeded? new memory — instead toggle by constructing with same db
    // Re-test with online false on fresh engine after pull on shared services:
    const db = resetMemoryDatabase();
    const api2 = resetMockApi();
    await api2.login({email: 'auditor@cabflo.demo', password: 'auditor123'});
    const audits2 = new AuditRepository(db);
    const outboxRepo = new OutboxRepository(db);
    const conflicts = new ConflictRepository(db);
    const media = new MediaRepository(db);
    const mediaQueue = new MediaUploadQueue({api: api2, media});
    const onlineEngine = new SyncEngine({
      api: api2,
      audits: audits2,
      outboxRepo,
      conflicts,
      media,
      mediaQueue,
      isOnline: () => true,
    });
    await onlineEngine.runFullSync();
    const offlineEngine = new SyncEngine({
      api: api2,
      audits: audits2,
      outboxRepo,
      conflicts,
      media,
      mediaQueue,
      isOnline: () => false,
    });
    const list = await audits2.listAssigned('user-auditor-1');
    expect(list.length).toBeGreaterThan(0);
    const result = await offlineEngine.runFullSync();
    expect(result.error).toMatch(/Offline/);
    expect((await audits2.listAssigned('user-auditor-1')).length).toBe(
      list.length,
    );
    void audits;
  });
});
