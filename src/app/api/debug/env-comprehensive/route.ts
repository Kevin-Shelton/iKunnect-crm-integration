import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check all possible environment variable variations
    const envCheck = {
      // Primary Supabase variables (what we expect from Vercel dashboard)
      SUPABASE_URL: {
        value: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : null,
        exists: !!process.env.SUPABASE_URL,
        length: process.env.SUPABASE_URL?.length || 0
      },
      SUPABASE_SERVICE_ROLE_TOKEN: {
        value: process.env.SUPABASE_SERVICE_ROLE_TOKEN ? 'eyJ***' + process.env.SUPABASE_SERVICE_ROLE_TOKEN.slice(-10) : null,
        exists: !!process.env.SUPABASE_SERVICE_ROLE_TOKEN,
        length: process.env.SUPABASE_SERVICE_ROLE_TOKEN?.length || 0
      },
      NEXT_PUBLIC_SUPABASE_ANON_TOKEN: {
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ? 'eyJ***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN.slice(-10) : null,
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN?.length || 0
      },
      
      // Alternative naming patterns that might be used
      NEXT_PUBLIC_SUPABASE_URL: {
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : null,
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
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
      }
    };

    // Check Vercel system environment variables
    const vercelEnv = {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV
    };

    // Count all environment variables
    const allEnvKeys = Object.keys(process.env);
    const supabaseKeys = allEnvKeys.filter(key => 
      key.toLowerCase().includes('supabase') || 
      key.toLowerCase().includes('supa')
    );

    // Determine the primary issue
    let primaryIssue = 'Unknown';
    const recommendations = [];

    if (!envCheck.SUPABASE_URL.exists && !envCheck.NEXT_PUBLIC_SUPABASE_URL.exists) {
      primaryIssue = 'No Supabase URL found';
      recommendations.push('Add SUPABASE_URL environment variable in Vercel dashboard');
      recommendations.push('Ensure variable is set for Production environment');
    } else if (!envCheck.SUPABASE_SERVICE_ROLE_TOKEN.exists && !envCheck.SUPABASE_SERVICE_KEY.exists) {
      primaryIssue = 'No Supabase service key found';
      recommendations.push('Add SUPABASE_SERVICE_ROLE_TOKEN environment variable in Vercel dashboard');
      recommendations.push('Use the service_role key, not the anon key');
    } else if (!envCheck.NEXT_PUBLIC_SUPABASE_ANON_TOKEN.exists && !envCheck.SUPABASE_ANON_KEY.exists) {
      primaryIssue = 'No Supabase anon key found';
      recommendations.push('Add NEXT_PUBLIC_SUPABASE_ANON_TOKEN environment variable in Vercel dashboard');
    } else {
      primaryIssue = 'Configuration appears correct';
      recommendations.push('Try redeploying the project');
      recommendations.push('Check if variables are set for correct environment (Production vs Preview)');
    }

    // Check if we're in the right environment
    const isProduction = process.env.VERCEL_ENV === 'production';
    const isVercel = !!process.env.VERCEL;

    if (!isVercel) {
      recommendations.unshift('This appears to be running locally, not on Vercel');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        isVercel,
        isProduction,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV
      },
      envCheck,
      vercelSystemVars: vercelEnv,
      analysis: {
        totalEnvVars: allEnvKeys.length,
        supabaseRelatedKeys: supabaseKeys,
        primaryIssue,
        recommendations
      },
      debugInfo: {
        // Show first few characters of each env var for debugging
        envSample: allEnvKeys.slice(0, 10).map(key => ({
          key,
          hasValue: !!process.env[key],
          length: process.env[key]?.length || 0
        }))
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
