export interface AuditorUser {
  id: string;
  email: string;
  displayName: string;
  role: 'auditor' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export interface AuthSession {
  user: AuditorUser;
  tokens: AuthTokens;
}
