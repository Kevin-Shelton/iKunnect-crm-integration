import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, tokenStore } from '@/lib/ghl-api-2.0';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    console.error('[OAuth Callback] Authorization code missing');
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }

  // In a real app, you would validate the 'state' parameter here for CSRF protection.
  console.log('[OAuth Callback] Received authorization code, exchanging for token...');

  try {
    const tokenData = await getAccessToken(code);

    console.log('[OAuth Callback] Token exchange successful');
    console.log('[OAuth Callback] Location ID:', tokenData.locationId);
    console.log('[OAuth Callback] User Type:', tokenData.userType);

    // Redirect the user back to the main application page
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to complete OAuth process', 
      details: errorMessage 
    }, { status: 500 });
  }
}
