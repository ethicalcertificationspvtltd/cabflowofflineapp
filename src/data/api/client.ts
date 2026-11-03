import {getAppConfig} from '../../shared/config/env';
import {loadTokens, saveTokens} from '../../shared/storage/keychain';
import type {AuthSession, AuthTokens} from '../../entities/user/types';
import {getMockApi} from './mockApi';
import type {
  CabFloApi,
  LoginRequest,
  MediaUploadInitRequest,
  MediaUploadInitResponse,
  PushAuditRequest,
  PushAuditResult,
  PullAuditsResponse,
  RefreshRequest,
} from './types';

/**
 * Typed API facade. Uses mock in development by default; swap to HTTP adapter
 * when Cab Flo endpoints are wired (see HttpCabFloApi below).
 */
export function createApiClient(overrides?: {useMock?: boolean}): CabFloApi {
  const config = getAppConfig();
  const useMock = overrides?.useMock ?? config.useMockApi;
  if (useMock) {
    return getMockApi();
  }
  return new HttpCabFloApi(config.apiBaseUrl);
}

/** Real HTTP adapter — endpoints match Cab Flo JWT + refresh conventions. */
export class HttpCabFloApi implements CabFloApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    path: string,
    init: RequestInit & {auth?: boolean} = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (init.auth !== false) {
      const tokens = await loadTokens();
      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }
    const res = await fetch(`${this.baseUrl}${path}`, {...init, headers});
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }

  login(req: LoginRequest): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
      auth: false,
    });
  }

  refresh(req: RefreshRequest): Promise<AuthTokens> {
    return this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(req),
      auth: false,
    });
  }

  pullAssignedAudits(params: {
    since?: string | null;
    cursor?: string | null;
  }): Promise<PullAuditsResponse> {
    const q = new URLSearchParams();
    if (params.since) {
      q.set('since', params.since);
    }
    if (params.cursor) {
      q.set('cursor', params.cursor);
    }
    const qs = q.toString();
    return this.request<PullAuditsResponse>(
      `/audits/assigned${qs ? `?${qs}` : ''}`,
    );
  }

  pushAudit(req: PushAuditRequest): Promise<PushAuditResult> {
    return this.request<PushAuditResult>('/audits/sync', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  initMediaUpload(
    req: MediaUploadInitRequest,
  ): Promise<MediaUploadInitResponse> {
    return this.request<MediaUploadInitResponse>('/media/uploads', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async uploadMediaChunk(params: {
    uploadUrl: string;
    data: ArrayBuffer | string;
    offset: number;
    totalSize: number;
  }): Promise<{complete: boolean; remoteUrl?: string; nextOffset: number}> {
    const chunkLength =
      typeof params.data === 'string'
        ? params.data.length
        : params.data.byteLength;
    const res = await fetch(params.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${params.offset}-${
          params.offset + chunkLength - 1
        }/${params.totalSize}`,
      },
      body: params.data as unknown as string,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
    return (await res.json()) as {
      complete: boolean;
      remoteUrl?: string;
      nextOffset: number;
    };
  }
}

export async function refreshTokensIfNeeded(
  api: CabFloApi,
  skewMs = 60_000,
): Promise<AuthTokens | null> {
  const tokens = await loadTokens();
  if (!tokens) {
    return null;
  }
  const expires = new Date(tokens.accessExpiresAt).getTime();
  if (expires - Date.now() > skewMs) {
    return tokens;
  }
  const refreshExpires = new Date(tokens.refreshExpiresAt).getTime();
  if (refreshExpires <= Date.now()) {
    throw new Error('Refresh token expired — re-login required');
  }
  const next = await api.refresh({refreshToken: tokens.refreshToken});
  await saveTokens(next);
  return next;
}
