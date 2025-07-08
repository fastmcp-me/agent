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

// Unified client session data structure
export interface ClientSessionData {
  serverName: string;
  clientInfo?: string; // JSON string of OAuthClientInformationFull
  tokens?: string; // JSON string of OAuthTokens
  codeVerifier?: string;
  state?: string;
  expires: number;
  createdAt: number;
}
