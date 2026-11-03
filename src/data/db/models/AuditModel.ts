import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

/**
 * WatermelonDB model for audits.
 * TODO: switch AuditRepository to observe this model when SQLiteAdapter is enabled.
 */
export class AuditModel extends Model {
  static table = 'audits';

  @text('client_id') clientId!: string;
  @text('server_id') serverId!: string | null;
  @text('title') title!: string;
  @text('site_name') siteName!: string;
  @text('site_address') siteAddress!: string | null;
  @text('assigned_to_user_id') assignedToUserId!: string;
  @text('assignment_status') assignmentStatus!: string;
  @field('admin_locked') adminLocked!: boolean;
  @text('due_at') dueAt!: string | null;
  @text('notes') notes!: string;
  @text('checklist_json') checklistJson!: string;
  @text('photos_json') photosJson!: string;
  @field('version') version!: number;
  @text('updated_at') updatedAtIso!: string;
  @text('deleted_at') deletedAt!: string | null;
  // Named recordSyncStatus — Model already defines syncStatus for WM sync.
  @text('sync_status') recordSyncStatus!: string;
  @text('local_status') localStatus!: string;
  @field('is_draft') isDraft!: boolean;
  @text('last_synced_at') lastSyncedAt!: string | null;
  @text('conflict_reason') conflictReason!: string | null;
}
