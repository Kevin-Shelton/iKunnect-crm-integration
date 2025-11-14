import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ghl-api-2.0';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check if GHL returned an error
    if (error) {
      console.error('[OAuth Callback] GHL returned error:', error, errorDescription);
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
              h1 { color: #c00; }
              a { color: #0066cc; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Authorization Failed</h1>
              <p><strong>Error:</strong> ${error}</p>
              <p><strong>Description:</strong> ${errorDescription || 'No description provided'}</p>
              <p><a href="/">← Back to Home</a></p>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if authorization code is present
    if (!code) {
      console.error('[OAuth Callback] Authorization code missing');
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
              h1 { color: #c00; }
              a { color: #0066cc; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Authorization Code Missing</h1>
              <p>The authorization code was not received from GoHighLevel.</p>
              <p><a href="/">← Back to Home</a></p>
            </div>
          </body>
        </html>
        `,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('[OAuth Callback] Received authorization code, exchanging for token...');
    console.log('[OAuth Callback] Code:', code.substring(0, 10) + '...');
    console.log('[OAuth Callback] State:', state);

    // Exchange authorization code for access token
    const tokenData = await getAccessToken(code);

    console.log('[OAuth Callback] ✅ Token exchange successful!');
    console.log('[OAuth Callback] Location ID:', tokenData.locationId);
    console.log('[OAuth Callback] Company ID:', tokenData.companyId);
    console.log('[OAuth Callback] User Type:', tokenData.userType);
    console.log('[OAuth Callback] Access Token:', tokenData.access_token ? 'Present' : 'Missing');
    console.log('[OAuth Callback] Refresh Token:', tokenData.refresh_token ? 'Present' : 'Missing');

    // Return success page with redirect
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <meta http-equiv="refresh" content="3;url=/" />
          <style>
            body { 
              font-family: system-ui; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px;
              text-align: center;
            }
            .success { 
              background: #efe; 
              border: 1px solid #cfc; 
              padding: 30px; 
              border-radius: 8px; 
            }
            h1 { color: #060; }
            .details { 
              text-align: left; 
              background: #f9f9f9; 
              padding: 15px; 
              border-radius: 4px; 
              margin: 20px 0;
              font-size: 14px;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #060;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            a { color: #0066cc; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Authorization Successful!</h1>
            <p>Your GoHighLevel account has been connected successfully.</p>
            <div class="details">
              <strong>Connection Details:</strong><br/>
              📍 Location ID: ${tokenData.locationId || 'N/A'}<br/>
              🏢 Company ID: ${tokenData.companyId || 'N/A'}<br/>
              👤 User Type: ${tokenData.userType || 'N/A'}<br/>
              🔑 Access Token: ${tokenData.access_token ? '✓ Received' : '✗ Missing'}<br/>
              🔄 Refresh Token: ${tokenData.refresh_token ? '✓ Received' : '✗ Missing'}
            </div>
            <div class="spinner"></div>
            <p>Redirecting you to the dashboard in 3 seconds...</p>
            <p><a href="/">Click here if not redirected automatically</a></p>
          </div>
        </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('[OAuth Callback] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Error</title>
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
            <h1>❌ OAuth Error</h1>
            <p><strong>Failed to complete OAuth process</strong></p>
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
