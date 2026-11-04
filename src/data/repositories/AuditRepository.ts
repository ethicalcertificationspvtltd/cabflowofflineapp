import type {Audit, AuditDraftPatch, AuditListItem} from '../../entities/audit/types';
import {createClientId} from '../../shared/lib/uuid';
import type {MemoryDatabase} from '../db/MemoryDatabase';
import {getAppConfig} from '../../shared/config/env';

export class AuditRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listAssigned(userId: string): Promise<AuditListItem[]> {
    return [...this.db.audits.values()]
      .filter(a => a.assignedToUserId === userId && !a.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toListItem);
  }

  async listDrafts(userId: string): Promise<AuditListItem[]> {
    return [...this.db.audits.values()]
      .filter(
        a =>
          a.assignedToUserId === userId &&
          !a.deletedAt &&
          (a.isDraft || a.syncStatus === 'pending' || a.syncStatus === 'failed'),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toListItem);
  }

  async getByClientId(clientId: string): Promise<Audit | null> {
    return this.db.audits.get(clientId) ?? null;
  }

  async getByServerId(serverId: string): Promise<Audit | null> {
    return (
      [...this.db.audits.values()].find(a => a.serverId === serverId) ?? null
    );
  }

  async upsert(audit: Audit): Promise<Audit> {
    this.db.audits.set(audit.clientId, audit);
    return audit;
  }

  async upsertMany(audits: Audit[]): Promise<void> {
    for (const audit of audits) {
      this.db.audits.set(audit.clientId, audit);
    }
  }

  async saveDraft(
    clientId: string,
    patch: AuditDraftPatch,
    now: Date = new Date(),
  ): Promise<Audit> {
    const existing = this.db.audits.get(clientId);
    if (!existing) {
      throw new Error(`Audit not found: ${clientId}`);
    }
    if (existing.adminLocked && patch.assignmentStatus) {
      throw new Error('Cannot change status on admin-locked audit');
    }

    const updated: Audit = {
      ...existing,
      ...patch,
      isDraft: patch.isDraft ?? true,
      localStatus: patch.localStatus ?? 'draft',
      syncStatus: 'pending',
      version: existing.version + 1,
      updatedAt: now.toISOString(),
      conflictReason: null,
    };
    this.db.audits.set(clientId, updated);
    return updated;
  }

  async markSynced(
    clientId: string,
    serverId: string,
    version: number,
    now: Date = new Date(),
  ): Promise<void> {
    const existing = this.db.audits.get(clientId);
    if (!existing) {
      return;
    }
    this.db.audits.set(clientId, {
      ...existing,
      serverId,
      version,
      syncStatus: 'synced',
      localStatus: 'synced',
      isDraft: false,
      lastSyncedAt: now.toISOString(),
      conflictReason: null,
    });
  }

  async markConflict(clientId: string, reason: string, merged: Audit): Promise<void> {
    this.db.audits.set(clientId, {
      ...merged,
      clientId,
      syncStatus: 'conflict',
      localStatus: 'conflict',
      conflictReason: reason,
    });
  }

  async purgeSyncedOlderThan(retentionDays?: number, now: Date = new Date()): Promise<number> {
    const days = retentionDays ?? getAppConfig().auditRetentionDays;
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const [id, audit] of this.db.audits) {
      if (
        audit.syncStatus === 'synced' &&
        !audit.isDraft &&
        audit.lastSyncedAt &&
        new Date(audit.lastSyncedAt).getTime() < cutoff
      ) {
        this.db.audits.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  createLocalShell(partial: Omit<Audit, keyof import('../../shared/types/sync').SyncableMeta | 'localStatus' | 'isDraft' | 'photos'> & {
    photos?: Audit['photos'];
  }): Audit {
    const now = new Date().toISOString();
    return {
      clientId: createClientId(),
      serverId: null,
      version: 1,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
      lastSyncedAt: now,
      conflictReason: null,
      localStatus: 'synced',
      isDraft: false,
      photos: partial.photos ?? [],
      ...partial,
    };
  }
}

function toListItem(audit: Audit): AuditListItem {
  return {
    clientId: audit.clientId,
    serverId: audit.serverId,
    title: audit.title,
    siteName: audit.siteName,
    assignmentStatus: audit.assignmentStatus,
    syncStatus: audit.syncStatus,
    localStatus: audit.localStatus,
    isDraft: audit.isDraft,
    dueAt: audit.dueAt,
    updatedAt: audit.updatedAt,
    photoCount: audit.photos.length,
    pendingOutbox: audit.syncStatus === 'pending' || audit.syncStatus === 'failed',
  };
}
