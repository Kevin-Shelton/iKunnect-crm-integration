import { env } from 'process';

const GHL_CLIENT_ID = env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = env.GHL_CLIENT_SECRET;
const GHL_VERSION_ID = '6916604cff708f28783f34b1'; // App version ID from GHL marketplace
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_OAUTH_AUTHORIZE_BASE = 'https://marketplace.gohighlevel.com';
const GHL_OAUTH_TOKEN_BASE = 'https://services.leadconnectorhq.com';
const REDIRECT_URI = 'https://i-kunnect-crm-int.vercel.app/api/oauth/callback';

// NOTE: In a real application, tokens would be stored in a secure database (e.g., Supabase)
// For this project, we will use a simple in-memory store for demonstration purposes.
// This is NOT secure for production.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiry: number = 0;
let locationId: string | null = null;
let companyId: string | null = null;
let userId: string | null = null;
let userType: string | null = null;

// 1. OAuth Authorization URL
export function getAuthorizationUrl(state: string): string {
  if (!GHL_CLIENT_ID) {
    throw new Error('GHL_CLIENT_ID is not set');
  }
  const scope = [
    'calendars.write',
    'calendars/events.readonly',
    'calendars/events.write',
    'calendars/groups.readonly',
    'conversations.readonly',
    'conversations.write',
    'conversations/message.readonly',
    'conversations/message.write',
    'conversations/livechat.write',
    'contacts.readonly',
    'contacts.write',
    'opportunities.readonly',
    'opportunities.write',
    'conversation-ai.readonly',
    'conversation-ai.write',
    'agent-studio.readonly',
    'agent-studio.write'
  ].join(' ');
  return `${GHL_OAUTH_AUTHORIZE_BASE}/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${GHL_CLIENT_ID}&scope=${encodeURIComponent(scope)}&version_id=${GHL_VERSION_ID}`;
}

// 2. Get Access Token from Authorization Code
export async function getAccessToken(code: string): Promise<any> {
  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    throw new Error('GHL_CLIENT_ID or GHL_CLIENT_SECRET is not set');
  }

  const url = `${GHL_OAUTH_TOKEN_BASE}/oauth/token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GHL_CLIENT_ID,
      client_secret: GHL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      user_type: 'Location', // Request location-level token
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GHL OAuth] Token Error:', error);
    throw new Error(`Failed to get access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Store tokens and metadata in memory (INSECURE for production)
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
  locationId = data.locationId || null;
  companyId = data.companyId || null;
  userId = data.userId || null;
  userType = data.userType || null;

  console.log('[GHL OAuth] Token obtained successfully');
  console.log('[GHL OAuth] Location ID:', locationId);
  console.log('[GHL OAuth] Company ID:', companyId);
  console.log('[GHL OAuth] User Type:', userType);

  return data;
}

// 3. Refresh Access Token
export async function refreshAccessToken(currentRefreshToken: string): Promise<any> {
  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    throw new Error('GHL_CLIENT_ID or GHL_CLIENT_SECRET is not set');
  }

  const url = `${GHL_OAUTH_TOKEN_BASE}/oauth/token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GHL_CLIENT_ID,
      client_secret: GHL_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
      user_type: 'Location', // Request location-level token
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GHL OAuth] Refresh Token Error:', error);
    throw new Error(`Failed to refresh access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Store tokens and metadata in memory (INSECURE for production)
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
  locationId = data.locationId || null;
  companyId = data.companyId || null;
  userId = data.userId || null;
  userType = data.userType || null;

  console.log('[GHL OAuth] Token refreshed successfully');

  return data;
}

// 4. Helper to get a valid token (refreshes if expired)
export async function getValidAccessToken(): Promise<string> {
  if (!accessToken || Date.now() >= tokenExpiry) {
    if (!refreshToken) {
      throw new Error('No valid access token or refresh token available. Please re-authorize.');
    }
    console.log('[GHL OAuth] Access token expired or missing. Attempting to refresh...');
    await refreshAccessToken(refreshToken);
  }
  if (!accessToken) {
    throw new Error('Failed to obtain a valid access token.');
  }
  return accessToken;
}

// 5. Get the current location ID
export function getLocationId(): string | null {
  return locationId;
}

// 6. Get the current company ID
export function getCompanyId(): string | null {
  return companyId;
}

// 7. Get the current user ID
export function getUserId(): string | null {
  return userId;
}

// 8. Get the current user type
export function getUserType(): string | null {
  return userType;
}

// 9. Check if tokens are available
export function hasValidTokens(): boolean {
  return accessToken !== null && refreshToken !== null;
}

// Export the in-memory store for initial setup (INSECURE)
export const tokenStore = {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    getLocationId: () => locationId,
    getCompanyId: () => companyId,
    getUserId: () => userId,
    getUserType: () => userType,
    setTokens: (access: string, refresh: string, expiry: number, loc?: string, comp?: string, user?: string, type?: string) => {
        accessToken = access;
        refreshToken = refresh;
        tokenExpiry = expiry;
        locationId = loc || null;
        companyId = comp || null;
        userId = user || null;
        userType = type || null;
    }
};
