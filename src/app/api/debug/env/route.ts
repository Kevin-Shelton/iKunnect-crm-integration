import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check all possible environment variable names
    const envCheck = {
      // Supabase variables
      NEXT_PUBLIC_SUPABASE_URL: {
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
      },
      NEXT_PUBLIC_SUPABASE_ANON_TOKEN: {
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ? 'eyJ***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN.slice(-10) : null,
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN?.length || 0
      },
      SUPABASE_SERVICE_ROLE_TOKEN: {
        value: process.env.SUPABASE_SERVICE_ROLE_TOKEN ? 'eyJ***' + process.env.SUPABASE_SERVICE_ROLE_TOKEN.slice(-10) : null,
        exists: !!process.env.SUPABASE_SERVICE_ROLE_TOKEN,
        length: process.env.SUPABASE_SERVICE_ROLE_TOKEN?.length || 0
      },
      
      // Alternative names that might be used
      SUPABASE_URL: {
        value: process.env.SUPABASE_URL,
        exists: !!process.env.SUPABASE_URL,
        length: process.env.SUPABASE_URL?.length || 0
      },
      SUPABASE_ANON_KEY: {
        value: process.env.SUPABASE_ANON_KEY ? 'eyJ***' + process.env.SUPABASE_ANON_KEY.slice(-10) : null,
        exists: !!process.env.SUPABASE_ANON_KEY,
        length: process.env.SUPABASE_ANON_KEY?.length || 0
      },
      SUPABASE_SERVICE_KEY: {
        value: process.env.SUPABASE_SERVICE_KEY ? 'eyJ***' + process.env.SUPABASE_SERVICE_KEY.slice(-10) : null,
        exists: !!process.env.SUPABASE_SERVICE_KEY,
        length: process.env.SUPABASE_SERVICE_KEY?.length || 0
      },
      
      // Other configuration
      SHARED_HMAC_SECRET: {
        exists: !!process.env.SHARED_HMAC_SECRET,
        length: process.env.SHARED_HMAC_SECRET?.length || 0
      },
      N8N_AI_SUGGESTIONS_WEBHOOK_URL: {
        exists: !!process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL,
        length: process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL?.length || 0
      },
      REJECT_UNSIGNED: {
        value: process.env.REJECT_UNSIGNED,
        exists: !!process.env.REJECT_UNSIGNED
      }
    };

    // Check Node.js environment
    const nodeEnv = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION
    };

    // Count total environment variables
    const allEnvKeys = Object.keys(process.env);
    const supabaseKeys = allEnvKeys.filter(key => 
      key.toLowerCase().includes('supabase') || 
      key.toLowerCase().includes('supa')
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      envCheck,
      totalEnvVars: allEnvKeys.length,
      supabaseRelatedKeys: supabaseKeys,
      recommendations: {
        primaryIssue: !envCheck.NEXT_PUBLIC_SUPABASE_URL.exists ? 'NEXT_PUBLIC_SUPABASE_URL missing' : 
                     !envCheck.SUPABASE_SERVICE_ROLE_TOKEN.exists ? 'SUPABASE_SERVICE_ROLE_TOKEN missing' : 'Configuration looks good',
        nextSteps: [
          'Check Vercel dashboard environment variables',
          'Ensure variables are set for Production environment',
          'Redeploy after setting variables',
          'Check variable names match exactly'
        ]
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
