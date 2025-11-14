import { NextResponse } from 'next/server';

// This file previously contained the GHL MCP integration logic, which is now deprecated
// in favor of the GHL API 2.0 OAuth flow.

/**
 * POST /api/ghl-send-message
 * Returns a 410 Gone status to indicate the endpoint is no longer supported.
 */
export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Endpoint Deprecated', 
      message: 'This endpoint has been replaced by the GHL API 2.0 OAuth flow. Please use /api/ghl-api-2.0-send-message instead.' 
    },
    { status: 410 }
  );
}

/**
 * GET /api/ghl-send-message
 * Return method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
