// Shared session types for server and client session managers

import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

export interface SessionData {
  clientId: string;
  resource: string;
  scopes: string[];
  expires: number;
  createdAt: number;
}

export interface ClientData extends OAuthClientInformationFull {
  expires: number;
  createdAt: number;
}

export interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  resource: string;
  scopes: string[];
  codeChallenge?: string;
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

// Temporary authorization request data for consent flow
export interface AuthRequestData {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  state?: string;
  resource?: string;
  scopes?: string[];
  expires: number;
  createdAt: number;
}
