import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all environment variables
    const envVars = process.env;
    
    // Filter and categorize environment variables
    const categorizedVars = {
      supabase: {} as Record<string, string>,
      vercel: {} as Record<string, string>,
      next: {} as Record<string, string>,
      custom: {} as Record<string, string>,
      encrypted: {} as Record<string, string>,
      all_keys: [] as string[]
    };

    // Categorize all environment variables
    Object.keys(envVars).forEach(key => {
      const value = envVars[key] || '';
      const maskedValue = value.length > 20 ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}` : value;
      
      categorizedVars.all_keys.push(key);
      
      if (key.toLowerCase().includes('supabase')) {
        categorizedVars.supabase[key] = maskedValue;
      } else if (key.startsWith('VERCEL_')) {
        categorizedVars.vercel[key] = maskedValue;
      } else if (key.startsWith('NEXT_')) {
        categorizedVars.next[key] = maskedValue;
      } else if (key === 'ENCRYPTED_CONFIG') {
        categorizedVars.encrypted[key] = maskedValue;
      } else if (!key.startsWith('_') && !key.startsWith('npm_') && !key.startsWith('NODE_')) {
        categorizedVars.custom[key] = maskedValue;
      }
    });

    // Check for specific variables we're looking for
    const targetVars = {
      ENCRYPTED_CONFIG: envVars.ENCRYPTED_CONFIG ? 'SET' : 'NOT_SET',
      SUPABASE_URL: envVars.SUPABASE_URL ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_TOKEN: envVars.SUPABASE_SERVICE_ROLE_TOKEN ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_ANON_TOKEN: envVars.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ? 'SET' : 'NOT_SET'
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercel_env: process.env.VERCEL_ENV || 'unknown',
      target_variables: targetVars,
      categorized_variables: categorizedVars,
      total_env_vars: Object.keys(envVars).length,
      deployment_info: {
        vercel_url: process.env.VERCEL_URL || 'not_set',
        vercel_git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || 'not_set',
        vercel_git_commit_ref: process.env.VERCEL_GIT_COMMIT_REF || 'not_set'
      }
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to retrieve environment variables',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
