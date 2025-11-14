import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/ghl-api-2.0';

export async function GET(request: NextRequest) {
  try {
    console.log('[OAuth Init] Starting OAuth initialization...');
    
    // Generate a secure random state token for CSRF protection
    const state = crypto.randomUUID();
    console.log('[OAuth Init] Generated state:', state);
    
    // Get the authorization URL
    const authUrl = getAuthorizationUrl(state);
    console.log('[OAuth Init] Authorization URL:', authUrl);

    // Redirect to GHL authorization page
    return NextResponse.redirect(authUrl, { status: 302 });
    
  } catch (error) {
    console.error('[OAuth Init] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    // Return HTML error page instead of JSON
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Initialization Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
            h1 { color: #c00; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
            a { color: #0066cc; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ OAuth Initialization Failed</h1>
            <p><strong>Error:</strong> ${errorMessage}</p>
            <details>
              <summary>Technical Details</summary>
              <pre>${errorStack}</pre>
            </details>
            <p><a href="/">← Back to Home</a></p>
          </div>
        </body>
      </html>
      `,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
