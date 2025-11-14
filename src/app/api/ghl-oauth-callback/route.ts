import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, tokenStore } from '@/lib/ghl-api-2.0';

// NOTE: This is the REDIRECT_URI that must be registered in the GHL App settings.
const REDIRECT_URI = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/ghl-oauth-callback`
  : 'http://localhost:3000/api/ghl-oauth-callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const locationId = searchParams.get('locationId');

  if (!code) {
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }

  // In a real app, you would validate the 'state' parameter here for CSRF protection.
  // For this project, we will skip state validation.

  try {
    const { access_token, refresh_token, expires_in } = await getAccessToken(code, REDIRECT_URI);

    // In a real application, you would save these tokens to a secure database
    // associated with the user/locationId.
    // For this project, we store them in the in-memory store for demonstration.
    const expiry = Date.now() + (expires_in * 1000) - 60000; // 1 minute buffer
    tokenStore.setTokens(access_token, refresh_token, expiry);

    // Redirect the user back to the main application page
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.json({ error: 'Failed to complete OAuth process', details: error.message }, { status: 500 });
  }
}

// Export the redirect URI for use in the main app
export { REDIRECT_URI };
