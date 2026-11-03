export type SyncRecordStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict';

export type GlobalSyncPhase =
  | 'idle'
  | 'pulling'
  | 'pushing'
  | 'uploading_media'
  | 'error';

export type OutboxOperation = 'create' | 'update' | 'delete' | 'status_change';

export type OutboxEntityType = 'audit' | 'checklist_item' | 'note' | 'media_meta';

export interface SyncableMeta {
  clientId: string;
  serverId?: string | null;
  version: number;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus: SyncRecordStatus;
  lastSyncedAt?: string | null;
  conflictReason?: string | null;
}

export interface OutboxItem {
  id: string;
  clientId: string;
  entityType: OutboxEntityType;
  entityClientId: string;
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  baseVersion: number;
  status: SyncRecordStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictRecord {
  id: string;
  entityType: OutboxEntityType;
  entityClientId: string;
  localVersion: number;
  serverVersion: number;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  strategy: 'last_write_wins' | 'server_wins' | 'unresolvable';
  reason: string;
  localSnapshot: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
}
