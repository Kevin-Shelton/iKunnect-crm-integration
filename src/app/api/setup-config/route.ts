import { NextRequest, NextResponse } from 'next/server';
import { setupConfiguration } from '@/lib/secure-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey, n8nWebhookUrl, hmacSecret, setupKey } = body;

    // Simple setup key validation (you can make this more sophisticated)
    const expectedSetupKey = 'ikunnect-setup-2025'; // Change this to your preferred setup key
    
    if (setupKey !== expectedSetupKey) {
      return NextResponse.json({
        error: 'Invalid setup key',
        message: 'Please provide the correct setup key to configure the system'
      }, { status: 401 });
    }

    // Validate required fields
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'supabaseUrl, supabaseAnonKey, and supabaseServiceKey are required'
      }, { status: 400 });
    }

    // Generate encrypted configuration
    const encryptedConfig = setupConfiguration(
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceKey,
      n8nWebhookUrl,
      hmacSecret
    );

    return NextResponse.json({
      success: true,
      message: 'Configuration generated successfully',
      encryptedConfig,
      instructions: [
        '1. Copy the encryptedConfig value',
        '2. Set it as ENCRYPTED_CONFIG environment variable in Vercel',
        '3. Redeploy the application',
        '4. The system will automatically use the new configuration'
      ],
      nextSteps: {
        vercelCommand: `vercel env add ENCRYPTED_CONFIG`,
        vercelValue: encryptedConfig,
        environment: 'Production'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Configuration setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Configuration Setup Endpoint',
    usage: 'POST with { supabaseUrl, supabaseAnonKey, supabaseServiceKey, setupKey }',
    setupKey: 'Contact administrator for setup key',
    example: {
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      n8nWebhookUrl: 'https://your-n8n-webhook-url',
      hmacSecret: 'your-hmac-secret',
      setupKey: 'your-setup-key'
    }
  });
}
