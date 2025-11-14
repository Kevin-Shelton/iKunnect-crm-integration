import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/ghl-api-2.0';
import { REDIRECT_URI } from '@/app/api/ghl-oauth-callback/route';

export async function GET(request: NextRequest) {
  try {
    // In a real app, 'state' would be a securely generated token
    const state = 'secure_random_state_token'; 
    
    const authUrl = getAuthorizationUrl(REDIRECT_URI, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth Init Error:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth process', details: error.message }, { status: 500 });
  }
}
