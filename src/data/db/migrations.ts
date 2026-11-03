import {schemaMigrations, createTable} from '@nozbe/watermelondb/Schema/migrations';

/**
 * Schema migrations for WatermelonDB.
 * v1: initial audits / outbox / media / conflicts.
 * Add createTable / addColumns entries here when bumping cabFloSchema.version.
 */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 1,
      steps: [
        createTable({
          name: 'audits',
          columns: [
            {name: 'client_id', type: 'string', isIndexed: true},
            {name: 'server_id', type: 'string', isOptional: true, isIndexed: true},
            {name: 'title', type: 'string'},
            {name: 'site_name', type: 'string'},
            {name: 'site_address', type: 'string', isOptional: true},
            {name: 'assigned_to_user_id', type: 'string', isIndexed: true},
            {name: 'assignment_status', type: 'string'},
            {name: 'admin_locked', type: 'boolean'},
            {name: 'due_at', type: 'string', isOptional: true},
            {name: 'notes', type: 'string'},
            {name: 'checklist_json', type: 'string'},
            {name: 'photos_json', type: 'string'},
            {name: 'version', type: 'number'},
            {name: 'updated_at', type: 'string', isIndexed: true},
            {name: 'deleted_at', type: 'string', isOptional: true},
            {name: 'sync_status', type: 'string', isIndexed: true},
            {name: 'local_status', type: 'string'},
            {name: 'is_draft', type: 'boolean'},
            {name: 'last_synced_at', type: 'string', isOptional: true},
            {name: 'conflict_reason', type: 'string', isOptional: true},
          ],
        }),
      ],
    },
  ],
});

/**
 * Retention purge is application-level (AuditRepository.purgeSyncedOlderThan),
 * configurable via AppConfig.auditRetentionDays / prefs.
 */
export const DEFAULT_AUDIT_RETENTION_DAYS = 30;
