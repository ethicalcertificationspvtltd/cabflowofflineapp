import type {SyncableMeta, SyncRecordStatus} from '../../shared/types/sync';

export type AuditAssignmentStatus =
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'locked'
  | 'completed'
  | 'cancelled';

export type AuditLocalStatus = 'draft' | 'ready_to_sync' | 'synced' | 'conflict';

export interface ChecklistItem {
  id: string;
  key: string;
  label: string;
  required: boolean;
  value: boolean | string | number | null;
  notes?: string | null;
}

export interface AuditPhoto {
  id: string;
  clientId: string;
  localUri?: string | null;
  remoteUrl?: string | null;
  mimeType: string;
  byteSize: number;
  uploadStatus: SyncRecordStatus;
  createdAt: string;
}

export interface Audit extends SyncableMeta {
  title: string;
  siteName: string;
  siteAddress?: string | null;
  assignedToUserId: string;
  assignmentStatus: AuditAssignmentStatus;
  /** Admin-locked fields must follow server-wins on conflict. */
  adminLocked: boolean;
  dueAt?: string | null;
  notes: string;
  checklist: ChecklistItem[];
  photos: AuditPhoto[];
  localStatus: AuditLocalStatus;
  isDraft: boolean;
}

export type AuditDraftPatch = Partial<
  Pick<Audit, 'notes' | 'checklist' | 'photos' | 'assignmentStatus' | 'localStatus' | 'isDraft'>
>;

export interface AuditListItem {
  clientId: string;
  serverId?: string | null;
  title: string;
  siteName: string;
  assignmentStatus: AuditAssignmentStatus;
  syncStatus: SyncRecordStatus;
  localStatus: AuditLocalStatus;
  isDraft: boolean;
  dueAt?: string | null;
  updatedAt: string;
  photoCount: number;
  pendingOutbox: boolean;
}
