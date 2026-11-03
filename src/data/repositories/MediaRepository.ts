import type {MediaAsset} from '../../entities/media/types';
import type {SyncRecordStatus} from '../../shared/types/sync';
import {createClientId} from '../../shared/lib/uuid';
import type {MemoryDatabase} from '../db/MemoryDatabase';

export class MediaRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listByAudit(auditClientId: string): Promise<MediaAsset[]> {
    return [...this.db.media.values()].filter(m => m.auditClientId === auditClientId);
  }

  async listPendingUploads(now: Date = new Date()): Promise<MediaAsset[]> {
    return [...this.db.media.values()]
      .filter(
        m =>
          (m.uploadStatus === 'pending' || m.uploadStatus === 'failed') &&
          new Date(m.nextAttemptAt).getTime() <= now.getTime() &&
          !m.remoteUrl,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async get(clientId: string): Promise<MediaAsset | null> {
    return this.db.media.get(clientId) ?? null;
  }

  async upsert(asset: MediaAsset): Promise<void> {
    this.db.media.set(asset.clientId, asset);
  }

  async createLocal(input: {
    auditClientId: string;
    localPath: string;
    mimeType: string;
    byteSize: number;
    width?: number;
    height?: number;
  }): Promise<MediaAsset> {
    const now = new Date().toISOString();
    const asset: MediaAsset = {
      id: createClientId(),
      clientId: createClientId(),
      auditClientId: input.auditClientId,
      localPath: input.localPath,
      remoteUrl: null,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      width: input.width ?? null,
      height: input.height ?? null,
      compressed: false,
      uploadStatus: 'pending',
      uploadAttempts: 0,
      nextAttemptAt: now,
      lastError: null,
      bytesUploaded: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.upsert(asset);
    return asset;
  }

  async updateUploadProgress(
    clientId: string,
    patch: Partial<
      Pick<
        MediaAsset,
        | 'uploadStatus'
        | 'bytesUploaded'
        | 'remoteUrl'
        | 'lastError'
        | 'uploadAttempts'
        | 'nextAttemptAt'
        | 'compressed'
        | 'localPath'
        | 'byteSize'
      >
    >,
  ): Promise<MediaAsset | null> {
    const existing = this.db.media.get(clientId);
    if (!existing) {
      return null;
    }
    const updated: MediaAsset = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.db.media.set(clientId, updated);
    return updated;
  }

  async countByStatus(): Promise<Record<SyncRecordStatus, number>> {
    const counts: Record<SyncRecordStatus, number> = {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
    };
    for (const m of this.db.media.values()) {
      counts[m.uploadStatus] += 1;
    }
    return counts;
  }
}
