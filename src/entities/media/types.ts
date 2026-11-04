import type {SyncRecordStatus} from '../../shared/types/sync';

export interface MediaAsset {
  id: string;
  clientId: string;
  auditClientId: string;
  localPath: string;
  remoteUrl?: string | null;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  compressed: boolean;
  uploadStatus: SyncRecordStatus;
  uploadAttempts: number;
  nextAttemptAt: string;
  lastError?: string | null;
  bytesUploaded: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadJob {
  id: string;
  mediaClientId: string;
  auditClientId: string;
  status: SyncRecordStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string | null;
}
