import type {Audit} from '../../entities/audit/types';
import type {AuthSession, AuthTokens} from '../../entities/user/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PullAuditsResponse {
  audits: Audit[];
  serverTime: string;
  cursor?: string | null;
}

export interface PushAuditRequest {
  clientId: string;
  serverId?: string | null;
  operation: 'create' | 'update' | 'delete' | 'status_change';
  baseVersion: number;
  payload: Partial<Audit> & {clientId: string};
}

export interface PushAuditResult {
  clientId: string;
  serverId: string;
  version: number;
  updatedAt: string;
  status: 'ok' | 'conflict' | 'rejected';
  serverAudit?: Audit;
  error?: string;
}

export interface MediaUploadInitRequest {
  clientId: string;
  auditClientId: string;
  mimeType: string;
  byteSize: number;
}

export interface MediaUploadInitResponse {
  uploadId: string;
  uploadUrl: string;
  /** Resume offset support */
  resumeOffset: number;
}

export interface CabFloApi {
  login(req: LoginRequest): Promise<AuthSession>;
  refresh(req: RefreshRequest): Promise<AuthTokens>;
  pullAssignedAudits(params: {
    since?: string | null;
    cursor?: string | null;
  }): Promise<PullAuditsResponse>;
  pushAudit(req: PushAuditRequest): Promise<PushAuditResult>;
  initMediaUpload(req: MediaUploadInitRequest): Promise<MediaUploadInitResponse>;
  uploadMediaChunk(params: {
    uploadUrl: string;
    data: ArrayBuffer | string;
    offset: number;
    totalSize: number;
  }): Promise<{complete: boolean; remoteUrl?: string; nextOffset: number}>;
}
