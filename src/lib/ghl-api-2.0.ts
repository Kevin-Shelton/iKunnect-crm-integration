import { env } from 'process';

const GHL_CLIENT_ID = env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = env.GHL_CLIENT_SECRET;
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_OAUTH_BASE = 'https://marketplace.gohighlevel.com';

// NOTE: In a real application, tokens would be stored in a secure database (e.g., Supabase)
// For this project, we will use a simple in-memory store for demonstration purposes.
// This is NOT secure for production.
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiry: number = 0;

// 1. OAuth Authorization URL
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  if (!GHL_CLIENT_ID) {
    throw new Error('GHL_CLIENT_ID is not set');
  }
  const scope = 'conversations/message.write contacts/write'; // Minimal scope for chat
  return `${GHL_OAUTH_BASE}/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${GHL_CLIENT_ID}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

// 2. Get Access Token from Authorization Code
export async function getAccessToken(code: string, redirectUri: string): Promise<{ accessToken: string, refreshToken: string, expires_in: number }> {
  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    throw new Error('GHL_CLIENT_ID or GHL_CLIENT_SECRET is not set');
  }

  const url = `${GHL_OAUTH_BASE}/oauth/token`;
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
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('GHL Token Error:', error);
    throw new Error(`Failed to get access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Store tokens in memory (INSECURE for production)
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

  return data;
}

// 3. Refresh Access Token
export async function refreshAccessToken(currentRefreshToken: string): Promise<{ accessToken: string, refreshToken: string, expires_in: number }> {
  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    throw new Error('GHL_CLIENT_ID or GHL_CLIENT_SECRET is not set');
  }

  const url = `${GHL_OAUTH_BASE}/oauth/token`;
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
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('GHL Refresh Token Error:', error);
    throw new Error(`Failed to refresh access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Store tokens in memory (INSECURE for production)
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

  return data;
}

// 4. Helper to get a valid token (refreshes if expired)
export async function getValidAccessToken(): Promise<string> {
  if (!accessToken || Date.now() >= tokenExpiry) {
    if (!refreshToken) {
      throw new Error('No valid access token or refresh token available. Please re-authorize.');
    }
    console.log('Access token expired or missing. Attempting to refresh...');
    await refreshAccessToken(refreshToken);
  }
  if (!accessToken) {
    throw new Error('Failed to obtain a valid access token.');
  }
  return accessToken;
}

// 5. Send Message API Call (Example)
interface SendMessagePayload {
  contactId: string;
  message: string;
  type: 'SMS' | 'Email' | 'Webchat'; // GHL API 2.0 uses different types
}

export async function sendMessage(payload: SendMessagePayload): Promise<any> {
  const token = await getValidAccessToken();
  const url = `${GHL_API_BASE}/conversations/messages`; // Placeholder URL, need to confirm actual endpoint

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Version': '2021-07-28', // Recommended API version
    },
    body: JSON.stringify({
      contactId: payload.contactId,
      message: payload.message,
      type: payload.type,
      // Additional fields like locationId might be required
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('GHL Send Message Error:', error);
    throw new Error(`Failed to send message: ${error.message || response.statusText}`);
  }

  return response.json();
}

// Export the in-memory store for initial setup (INSECURE)
export const tokenStore = {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    setTokens: (access: string, refresh: string, expiry: number) => {
        accessToken = access;
        refreshToken = refresh;
        tokenExpiry = expiry;
    }
};
