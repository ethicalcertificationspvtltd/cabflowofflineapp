import {appSchema, tableSchema} from '@nozbe/watermelondb';

/**
 * WatermelonDB schema — production local source of truth on device.
 * Runtime in this scaffold uses MemoryDatabase repositories that mirror these tables;
 * wire SQLiteAdapter in bootstrap.native.ts when building iOS/Android binaries.
 */
export const cabFloSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
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
    tableSchema({
      name: 'outbox_items',
      columns: [
        {name: 'client_id', type: 'string', isIndexed: true},
        {name: 'entity_type', type: 'string'},
        {name: 'entity_client_id', type: 'string', isIndexed: true},
        {name: 'operation', type: 'string'},
        {name: 'payload_json', type: 'string'},
        {name: 'base_version', type: 'number'},
        {name: 'status', type: 'string', isIndexed: true},
        {name: 'attempts', type: 'number'},
        {name: 'next_attempt_at', type: 'string'},
        {name: 'last_error', type: 'string', isOptional: true},
        {name: 'created_at', type: 'string'},
        {name: 'updated_at', type: 'string'},
      ],
    }),
    tableSchema({
      name: 'media_assets',
      columns: [
        {name: 'client_id', type: 'string', isIndexed: true},
        {name: 'audit_client_id', type: 'string', isIndexed: true},
        {name: 'local_path', type: 'string'},
        {name: 'remote_url', type: 'string', isOptional: true},
        {name: 'mime_type', type: 'string'},
        {name: 'byte_size', type: 'number'},
        {name: 'width', type: 'number', isOptional: true},
        {name: 'height', type: 'number', isOptional: true},
        {name: 'compressed', type: 'boolean'},
        {name: 'upload_status', type: 'string', isIndexed: true},
        {name: 'upload_attempts', type: 'number'},
        {name: 'next_attempt_at', type: 'string'},
        {name: 'last_error', type: 'string', isOptional: true},
        {name: 'bytes_uploaded', type: 'number'},
        {name: 'created_at', type: 'string'},
        {name: 'updated_at', type: 'string'},
      ],
    }),
    tableSchema({
      name: 'conflicts',
      columns: [
        {name: 'entity_type', type: 'string'},
        {name: 'entity_client_id', type: 'string', isIndexed: true},
        {name: 'local_version', type: 'number'},
        {name: 'server_version', type: 'number'},
        {name: 'local_updated_at', type: 'string'},
        {name: 'server_updated_at', type: 'string'},
        {name: 'strategy', type: 'string'},
        {name: 'reason', type: 'string'},
        {name: 'local_snapshot_json', type: 'string'},
        {name: 'server_snapshot_json', type: 'string'},
        {name: 'resolved', type: 'boolean'},
        {name: 'created_at', type: 'string'},
      ],
    }),
  ],
});
