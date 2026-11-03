import type {Audit} from '../../entities/audit/types';
import type {ConflictRecord} from '../../shared/types/sync';
import {createClientId} from '../../shared/lib/uuid';

export type ConflictStrategy = 'last_write_wins' | 'server_wins' | 'unresolvable';

export interface ConflictDecision<T> {
  strategy: ConflictStrategy;
  winner: 'local' | 'server' | 'none';
  merged?: T;
  reason: string;
  needsUserAttention: boolean;
}

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Draft field conflicts: last-write-wins by updatedAt (then version).
 * Admin-locked assignment/status: server-wins.
 * Unresolvable when both sides changed locked + draft fields incompatibly.
 */
export function resolveAuditConflict(
  local: Audit,
  server: Audit,
): ConflictDecision<Audit> {
  if (local.adminLocked || server.adminLocked) {
    // Server owns assignmentStatus / adminLocked / cancelled lifecycle.
    const lockedFieldsChangedLocally =
      local.assignmentStatus !== server.assignmentStatus ||
      local.adminLocked !== server.adminLocked;

    if (lockedFieldsChangedLocally && local.syncStatus === 'pending') {
      if (
        local.notes !== server.notes ||
        JSON.stringify(local.checklist) !== JSON.stringify(server.checklist)
      ) {
        return {
          strategy: 'unresolvable',
          winner: 'none',
          reason:
            'Server locked assignment/status while local draft notes/checklist also diverged',
          needsUserAttention: true,
          merged: {
            ...server,
            // Preserve local draft content for user review, mark conflict.
            notes: local.notes,
            checklist: local.checklist,
            photos: local.photos,
            syncStatus: 'conflict',
            localStatus: 'conflict',
            conflictReason:
              'Admin locked this assignment while offline edits were pending',
            version: server.version,
            updatedAt: server.updatedAt,
            serverId: server.serverId ?? local.serverId,
          },
        };
      }
    }

    return {
      strategy: 'server_wins',
      winner: 'server',
      reason: 'Admin-locked assignment/status — server wins',
      needsUserAttention: false,
      merged: {
        ...server,
        clientId: local.clientId,
        photos: mergePhotosPreferLocalPreview(local, server),
        syncStatus: 'synced',
        localStatus: server.assignmentStatus === 'assigned' ? 'draft' : local.localStatus,
        isDraft: false,
        conflictReason: null,
      },
    };
  }

  // Draft LWW
  const localNewer =
    toMs(local.updatedAt) > toMs(server.updatedAt) ||
    (toMs(local.updatedAt) === toMs(server.updatedAt) &&
      local.version >= server.version);

  if (localNewer) {
    return {
      strategy: 'last_write_wins',
      winner: 'local',
      reason: 'Local draft is newer (LWW)',
      needsUserAttention: false,
      merged: {
        ...local,
        serverId: server.serverId ?? local.serverId,
        version: Math.max(local.version, server.version) + 1,
        syncStatus: 'pending',
        conflictReason: null,
      },
    };
  }

  return {
    strategy: 'last_write_wins',
    winner: 'server',
    reason: 'Server draft is newer (LWW)',
    needsUserAttention: false,
    merged: {
      ...server,
      clientId: local.clientId,
      photos: mergePhotosPreferLocalPreview(local, server),
      syncStatus: 'synced',
      localStatus: 'synced',
      isDraft: false,
      conflictReason: null,
    },
  };
}

function mergePhotosPreferLocalPreview(local: Audit, server: Audit) {
  const byClient = new Map(server.photos.map(p => [p.clientId, {...p}]));
  for (const photo of local.photos) {
    const existing = byClient.get(photo.clientId);
    if (!existing) {
      byClient.set(photo.clientId, photo);
      continue;
    }
    byClient.set(photo.clientId, {
      ...existing,
      localUri: photo.localUri ?? existing.localUri,
      remoteUrl: existing.remoteUrl ?? photo.remoteUrl,
    });
  }
  return [...byClient.values()];
}

export function toConflictRecord(
  local: Audit,
  server: Audit,
  decision: ConflictDecision<Audit>,
): ConflictRecord {
  return {
    id: createClientId(),
    entityType: 'audit',
    entityClientId: local.clientId,
    localVersion: local.version,
    serverVersion: server.version,
    localUpdatedAt: local.updatedAt,
    serverUpdatedAt: server.updatedAt,
    strategy: decision.strategy,
    reason: decision.reason,
    localSnapshot: local as unknown as Record<string, unknown>,
    serverSnapshot: server as unknown as Record<string, unknown>,
    resolved: !decision.needsUserAttention,
    createdAt: new Date().toISOString(),
  };
}
