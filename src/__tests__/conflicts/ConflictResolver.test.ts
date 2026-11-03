import {
  resolveAuditConflict,
  toConflictRecord,
} from '../../sync/conflicts/ConflictResolver';
import type {Audit} from '../../entities/audit/types';

function baseAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    clientId: 'c1',
    serverId: 's1',
    version: 1,
    updatedAt: '2024-01-01T10:00:00.000Z',
    deletedAt: null,
    syncStatus: 'pending',
    lastSyncedAt: null,
    conflictReason: null,
    title: 'Audit',
    siteName: 'Site',
    siteAddress: null,
    assignedToUserId: 'u1',
    assignmentStatus: 'in_progress',
    adminLocked: false,
    dueAt: null,
    notes: 'local notes',
    checklist: [],
    photos: [],
    localStatus: 'draft',
    isDraft: true,
    ...overrides,
  };
}

describe('resolveAuditConflict', () => {
  it('uses last-write-wins for drafts', () => {
    const local = baseAudit({
      notes: 'newer local',
      updatedAt: '2024-01-01T12:00:00.000Z',
      version: 3,
    });
    const server = baseAudit({
      notes: 'older server',
      updatedAt: '2024-01-01T11:00:00.000Z',
      version: 2,
      syncStatus: 'synced',
      isDraft: false,
    });
    const decision = resolveAuditConflict(local, server);
    expect(decision.strategy).toBe('last_write_wins');
    expect(decision.winner).toBe('local');
    expect(decision.merged?.notes).toBe('newer local');
  });

  it('applies server-wins for admin-locked assignment', () => {
    const local = baseAudit({
      assignmentStatus: 'submitted',
      notes: 'same',
      syncStatus: 'pending',
    });
    const server = baseAudit({
      adminLocked: true,
      assignmentStatus: 'locked',
      notes: 'same',
      version: 5,
      updatedAt: '2024-01-01T13:00:00.000Z',
      syncStatus: 'synced',
      isDraft: false,
    });
    const decision = resolveAuditConflict(local, server);
    expect(decision.strategy).toBe('server_wins');
    expect(decision.winner).toBe('server');
    expect(decision.merged?.assignmentStatus).toBe('locked');
    expect(decision.needsUserAttention).toBe(false);
  });

  it('surfaces unresolvable when locked status and draft content both diverge', () => {
    const local = baseAudit({
      assignmentStatus: 'submitted',
      notes: 'offline draft notes',
      syncStatus: 'pending',
    });
    const server = baseAudit({
      adminLocked: true,
      assignmentStatus: 'locked',
      notes: 'admin notes',
      version: 9,
      updatedAt: '2024-01-01T14:00:00.000Z',
      syncStatus: 'synced',
      isDraft: false,
    });
    const decision = resolveAuditConflict(local, server);
    expect(decision.strategy).toBe('unresolvable');
    expect(decision.needsUserAttention).toBe(true);
    expect(decision.merged?.syncStatus).toBe('conflict');

    const record = toConflictRecord(local, server, decision);
    expect(record.resolved).toBe(false);
    expect(record.entityClientId).toBe('c1');
  });
});
