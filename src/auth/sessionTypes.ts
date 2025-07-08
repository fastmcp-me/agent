// Shared session types for server and client session managers

export interface SessionData {
  clientId: string;
  resource: string;
  expires: number;
  createdAt: number;
  data?: string;
}

export interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  resource: string;
  expires: number;
  createdAt: number;
}
