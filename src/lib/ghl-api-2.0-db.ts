import { env } from 'process';
import { saveTokens, getTokens, GHLTokenData } from './ghl-token-storage';

const GHL_CLIENT_ID = env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = env.GHL_CLIENT_SECRET;
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_OAUTH_BASE = 'https://services.leadconnectorhq.com';
const REDIRECT_URI = 'https://i-kunnect-crm-int.vercel.app/api/ghl-oauth-callback';

// For single-location apps, we can use a default location ID
// In multi-location apps, this would be dynamic based on the user
let currentLocationId: string | null = null;

// 1. OAuth Authorization URL
export function getAuthorizationUrl(state: string): string {
  if (!GHL_CLIENT_ID) {
    throw new Error('GHL_CLIENT_ID is not set');
  }
  const scope = 'conversations/message.write conversations/message.readonly contacts.write contacts.readonly';
  return `${GHL_OAUTH_BASE}/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${GHL_CLIENT_ID}&scope=${encodeURIComponent(scope)}&state=${state}&user_type=Location`;
}

// 2. Get Access Token from Authorization Code
export async function getAccessToken(code: string): Promise<any> {
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
      redirect_uri: REDIRECT_URI,
      user_type: 'Location',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GHL OAuth] Token Error:', error);
    throw new Error(`Failed to get access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Save tokens to database
  const tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
  await saveTokens({
    locationId: data.locationId,
    companyId: data.companyId,
    userId: data.userId,
    userType: data.userType,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: tokenExpiry,
    scope: data.scope,
  });

  // Set current location ID
  currentLocationId = data.locationId;

  console.log('[GHL OAuth] Token obtained and saved to database');
  console.log('[GHL OAuth] Location ID:', data.locationId);
  console.log('[GHL OAuth] Company ID:', data.companyId);
  console.log('[GHL OAuth] User Type:', data.userType);

  return data;
}

// 3. Refresh Access Token
export async function refreshAccessToken(locationId: string, currentRefreshToken: string): Promise<any> {
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
      user_type: 'Location',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GHL OAuth] Refresh Token Error:', error);
    throw new Error(`Failed to refresh access token: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  
  // Save refreshed tokens to database
  const tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
  await saveTokens({
    locationId: locationId,
    companyId: data.companyId,
    userId: data.userId,
    userType: data.userType,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: tokenExpiry,
    scope: data.scope,
  });

  console.log('[GHL OAuth] Token refreshed and saved to database');

  return data;
}

// 4. Helper to get a valid token (refreshes if expired)
export async function getValidAccessToken(locationId?: string): Promise<string> {
  const locId = locationId || currentLocationId;
  
  if (!locId) {
    throw new Error('No location ID available. Please authorize first.');
  }

  // Retrieve tokens from database
  const tokenData = await getTokens(locId);
  
  if (!tokenData) {
    throw new Error('No tokens found. Please re-authorize.');
  }

  // Check if token is expired
  const now = new Date();
  const bufferTime = 60 * 1000; // 1 minute buffer
  
  if (now.getTime() >= tokenData.tokenExpiry.getTime() - bufferTime) {
    console.log('[GHL OAuth] Access token expired or expiring soon. Refreshing...');
    const refreshedData = await refreshAccessToken(locId, tokenData.refreshToken);
    return refreshedData.access_token;
  }

  return tokenData.accessToken;
}

// 5. Get the current location ID
export async function getLocationId(): Promise<string | null> {
  if (currentLocationId) {
    return currentLocationId;
  }

  // Try to load from database (get the first available location)
  // In a multi-location app, this would be based on the current user
  const { getAllTokens } = await import('./ghl-token-storage');
  const allTokens = await getAllTokens();
  
  if (allTokens.length > 0) {
    currentLocationId = allTokens[0].locationId;
    return currentLocationId;
  }

  return null;
}

// 6. Set the current location ID (for multi-location apps)
export function setCurrentLocationId(locationId: string): void {
  currentLocationId = locationId;
}

// 7. Check if tokens are available
export async function hasValidTokens(locationId?: string): Promise<boolean> {
  const locId = locationId || currentLocationId;
  
  if (!locId) {
    return false;
  }

  const tokenData = await getTokens(locId);
  return tokenData !== null;
}
