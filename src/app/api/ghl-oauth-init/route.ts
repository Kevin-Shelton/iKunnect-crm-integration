import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/ghl-api-2.0';

export async function GET(request: NextRequest) {
  try {
    // In a real app, 'state' would be a securely generated token
    const state = 'secure_random_state_token'; 
    
    const authUrl = getAuthorizationUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth Init] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to initiate OAuth process', details: errorMessage }, { status: 500 });
  }
}
