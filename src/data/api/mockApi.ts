import type {Audit, ChecklistItem} from '../../entities/audit/types';
import type {AuthSession, AuthTokens, AuditorUser} from '../../entities/user/types';
import {createClientId} from '../../shared/lib/uuid';
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

const DEMO_USER: AuditorUser = {
  id: 'user-auditor-1',
  email: 'auditor@cabflo.demo',
  displayName: 'Alex Auditor',
  role: 'auditor',
};

const DEMO_PASSWORD = 'auditor123';

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

function makeTokens(): AuthTokens {
  return {
    accessToken: `mock-access-${createClientId()}`,
    refreshToken: `mock-refresh-${createClientId()}`,
    accessExpiresAt: hoursFromNow(1),
    refreshExpiresAt: hoursFromNow(24 * 14),
  };
}

function defaultChecklist(): ChecklistItem[] {
  return [
    {
      id: 'c1',
      key: 'id_check',
      label: 'Verify site ID plaque',
      required: true,
      value: null,
    },
    {
      id: 'c2',
      key: 'safety_brief',
      label: 'Safety briefing completed',
      required: true,
      value: null,
    },
    {
      id: 'c3',
      key: 'equipment_photo',
      label: 'Equipment area photographed',
      required: false,
      value: null,
    },
  ];
}

function seedAudits(userId: string): Audit[] {
  const now = new Date().toISOString();
  return [
    {
      clientId: 'audit-client-seed-1',
      serverId: 'audit-server-1',
      version: 3,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
      lastSyncedAt: now,
      conflictReason: null,
      title: 'Rooftop HVAC inspection',
      siteName: 'Cab Flo Depot North',
      siteAddress: '12 Industrial Ave',
      assignedToUserId: userId,
      assignmentStatus: 'assigned',
      adminLocked: false,
      dueAt: hoursFromNow(48),
      notes: '',
      checklist: defaultChecklist(),
      photos: [],
      localStatus: 'synced',
      isDraft: false,
    },
    {
      clientId: 'audit-client-seed-2',
      serverId: 'audit-server-2',
      version: 5,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
      lastSyncedAt: now,
      conflictReason: null,
      title: 'Fleet bay compliance',
      siteName: 'Cab Flo Yard South',
      siteAddress: '88 Harbor Rd',
      assignedToUserId: userId,
      assignmentStatus: 'in_progress',
      adminLocked: false,
      dueAt: hoursFromNow(24),
      notes: '',
      checklist: defaultChecklist(),
      photos: [],
      localStatus: 'synced',
      isDraft: false,
    },
    {
      clientId: 'audit-client-seed-3',
      serverId: 'audit-server-3',
      version: 2,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'synced',
      lastSyncedAt: now,
      conflictReason: null,
      title: 'Locked admin review',
      siteName: 'HQ Loading Dock',
      siteAddress: '1 Main St',
      assignedToUserId: userId,
      assignmentStatus: 'locked',
      adminLocked: true,
      dueAt: hoursFromNow(12),
      notes: 'Awaiting admin unlock',
      checklist: defaultChecklist(),
      photos: [],
      localStatus: 'synced',
      isDraft: false,
    },
  ];
}

/**
 * In-process mock Cab Flo API. Supports idempotent push by clientId and
 * conflict simulation when baseVersion is stale vs server copy.
 */
export class MockCabFloApi implements CabFloApi {
  private serverAudits = new Map<string, Audit>();
  private byClientId = new Map<string, string>();
  private uploads = new Map<
    string,
    {clientId: string; offset: number; size: number; remoteUrl?: string}
  >();
  private sessions = new Map<string, AuthSession>();

  /** Force a server-side audit into admin-locked state (tests / demo). */
  lockAuditOnServer(serverId: string): void {
    const audit = this.serverAudits.get(serverId);
    if (!audit) {
      return;
    }
    this.serverAudits.set(serverId, {
      ...audit,
      adminLocked: true,
      assignmentStatus: 'locked',
      version: audit.version + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Bump server notes to create LWW conflict scenarios. */
  mutateServerNotes(serverId: string, notes: string): void {
    const audit = this.serverAudits.get(serverId);
    if (!audit) {
      return;
    }
    this.serverAudits.set(serverId, {
      ...audit,
      notes,
      version: audit.version + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  reset(): void {
    this.serverAudits.clear();
    this.byClientId.clear();
    this.uploads.clear();
    this.sessions.clear();
  }

  async login(req: LoginRequest): Promise<AuthSession> {
    await delay(120);
    if (req.email !== DEMO_USER.email || req.password !== DEMO_PASSWORD) {
      throw new Error('Invalid email or password');
    }
    const session: AuthSession = {user: DEMO_USER, tokens: makeTokens()};
    this.sessions.set(session.tokens.refreshToken, session);
    if (this.serverAudits.size === 0) {
      for (const audit of seedAudits(DEMO_USER.id)) {
        this.serverAudits.set(audit.serverId!, audit);
        this.byClientId.set(audit.clientId, audit.serverId!);
      }
    }
    return session;
  }

  async refresh(req: RefreshRequest): Promise<AuthTokens> {
    await delay(80);
    const session = this.sessions.get(req.refreshToken);
    if (!session) {
      // Accept mock refresh tokens that look valid for offline demo reconnect.
      if (!req.refreshToken.startsWith('mock-refresh-')) {
        throw new Error('Invalid refresh token');
      }
    }
    const tokens = makeTokens();
    if (session) {
      this.sessions.delete(req.refreshToken);
      this.sessions.set(tokens.refreshToken, {...session, tokens});
    }
    return tokens;
  }

  async pullAssignedAudits(_params?: {
    since?: string | null;
    cursor?: string | null;
  }): Promise<PullAuditsResponse> {
    await delay(150);
    void _params;
    return {
      audits: [...this.serverAudits.values()].map(a => ({...a, photos: [...a.photos]})),
      serverTime: new Date().toISOString(),
      cursor: null,
    };
  }

  async pushAudit(req: PushAuditRequest): Promise<PushAuditResult> {
    await delay(100);
    const existingServerId = req.serverId ?? this.byClientId.get(req.clientId);
    const existing = existingServerId
      ? this.serverAudits.get(existingServerId)
      : undefined;

    if (existing && req.baseVersion < existing.version) {
      return {
        clientId: req.clientId,
        serverId: existing.serverId!,
        version: existing.version,
        updatedAt: existing.updatedAt,
        status: 'conflict',
        serverAudit: {...existing},
        error: 'Version conflict',
      };
    }

    const now = new Date().toISOString();
    const serverId = existing?.serverId ?? `audit-server-${createClientId().slice(0, 8)}`;
    const version = (existing?.version ?? 0) + 1;
    const merged: Audit = {
      ...(existing ?? (req.payload as Audit)),
      ...req.payload,
      clientId: req.clientId,
      serverId,
      version,
      updatedAt: now,
      syncStatus: 'synced',
      localStatus: 'synced',
      isDraft: false,
      lastSyncedAt: now,
      conflictReason: null,
      photos: req.payload.photos ?? existing?.photos ?? [],
      checklist: req.payload.checklist ?? existing?.checklist ?? [],
      notes: req.payload.notes ?? existing?.notes ?? '',
      title: req.payload.title ?? existing?.title ?? 'Audit',
      siteName: req.payload.siteName ?? existing?.siteName ?? 'Site',
      assignedToUserId:
        req.payload.assignedToUserId ?? existing?.assignedToUserId ?? DEMO_USER.id,
      assignmentStatus:
        req.payload.assignmentStatus ?? existing?.assignmentStatus ?? 'assigned',
      adminLocked: existing?.adminLocked ?? req.payload.adminLocked ?? false,
    };

    // Server-wins enforcement for locked audits
    if (existing?.adminLocked) {
      merged.assignmentStatus = existing.assignmentStatus;
      merged.adminLocked = true;
    }

    this.serverAudits.set(serverId, merged);
    this.byClientId.set(req.clientId, serverId);

    return {
      clientId: req.clientId,
      serverId,
      version,
      updatedAt: now,
      status: 'ok',
      serverAudit: merged,
    };
  }

  async initMediaUpload(
    req: MediaUploadInitRequest,
  ): Promise<MediaUploadInitResponse> {
    await delay(50);
    const uploadId = createClientId();
    this.uploads.set(uploadId, {
      clientId: req.clientId,
      offset: 0,
      size: req.byteSize,
    });
    return {
      uploadId,
      uploadUrl: `mock://upload/${uploadId}`,
      resumeOffset: 0,
    };
  }

  async uploadMediaChunk(params: {
    uploadUrl: string;
    data: ArrayBuffer | string;
    offset: number;
    totalSize: number;
  }): Promise<{complete: boolean; remoteUrl?: string; nextOffset: number}> {
    await delay(40);
    const uploadId = params.uploadUrl.replace('mock://upload/', '');
    const state = this.uploads.get(uploadId);
    if (!state) {
      throw new Error('Unknown upload');
    }
    const chunkSize =
      typeof params.data === 'string' ? params.data.length : params.data.byteLength;
    const nextOffset = Math.min(params.totalSize, params.offset + chunkSize);
    state.offset = nextOffset;
    if (nextOffset >= params.totalSize) {
      const remoteUrl = `https://cdn.cabflo.demo/media/${state.clientId}.jpg`;
      state.remoteUrl = remoteUrl;
      return {complete: true, remoteUrl, nextOffset};
    }
    return {complete: false, nextOffset};
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let mockSingleton: MockCabFloApi | null = null;

export function getMockApi(): MockCabFloApi {
  if (!mockSingleton) {
    mockSingleton = new MockCabFloApi();
  }
  return mockSingleton;
}

export function resetMockApi(): MockCabFloApi {
  mockSingleton = new MockCabFloApi();
  return mockSingleton;
}

export const DEMO_CREDENTIALS = {
  email: DEMO_USER.email,
  password: DEMO_PASSWORD,
} as const;
