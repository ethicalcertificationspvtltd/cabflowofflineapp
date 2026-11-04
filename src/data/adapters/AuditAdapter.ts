import type {Audit} from '../../entities/audit/types';

/** Normalize API / DB shapes into domain Audit entities. */
export function auditFromApi(raw: Record<string, unknown>): Audit {
  return {
    clientId: String(raw.clientId ?? raw.client_id),
    serverId: (raw.serverId ?? raw.server_id ?? null) as string | null,
    version: Number(raw.version ?? 1),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? new Date().toISOString()),
    deletedAt: (raw.deletedAt ?? raw.deleted_at ?? null) as string | null,
    syncStatus: (raw.syncStatus as Audit['syncStatus']) ?? 'synced',
    lastSyncedAt: (raw.lastSyncedAt ?? raw.last_synced_at ?? null) as string | null,
    conflictReason: (raw.conflictReason ?? null) as string | null,
    title: String(raw.title ?? ''),
    siteName: String(raw.siteName ?? raw.site_name ?? ''),
    siteAddress: (raw.siteAddress ?? raw.site_address ?? null) as string | null,
    assignedToUserId: String(
      raw.assignedToUserId ?? raw.assigned_to_user_id ?? '',
    ),
    assignmentStatus:
      (raw.assignmentStatus as Audit['assignmentStatus']) ??
      (raw.assignment_status as Audit['assignmentStatus']) ??
      'assigned',
    adminLocked: Boolean(raw.adminLocked ?? raw.admin_locked ?? false),
    dueAt: (raw.dueAt ?? raw.due_at ?? null) as string | null,
    notes: String(raw.notes ?? ''),
    checklist: (raw.checklist as Audit['checklist']) ?? [],
    photos: (raw.photos as Audit['photos']) ?? [],
    localStatus: (raw.localStatus as Audit['localStatus']) ?? 'synced',
    isDraft: Boolean(raw.isDraft ?? false),
  };
}

export function auditToPushPayload(audit: Audit): Record<string, unknown> {
  return {
    clientId: audit.clientId,
    serverId: audit.serverId,
    notes: audit.notes,
    checklist: audit.checklist,
    photos: audit.photos.map(p => ({
      clientId: p.clientId,
      remoteUrl: p.remoteUrl,
      mimeType: p.mimeType,
    })),
    assignmentStatus: audit.assignmentStatus,
    title: audit.title,
    siteName: audit.siteName,
    siteAddress: audit.siteAddress,
    assignedToUserId: audit.assignedToUserId,
    adminLocked: audit.adminLocked,
    dueAt: audit.dueAt,
  };
}
