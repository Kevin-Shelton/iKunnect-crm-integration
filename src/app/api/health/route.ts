import { NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

export async function GET() {
  try {
    // Test CRM connectivity
    const crmClient = createCRMClient();
    const crmHealth = await crmClient.healthCheck();
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      crm: crmHealth.success ? 'connected' : 'disconnected',
      crmDetails: crmHealth.success ? 'CRM API connection successful' : `CRM API Error: ${crmHealth.error}`,
      services: {
        api: 'healthy',
        mcp: crmHealth.success ? 'healthy' : 'unhealthy'
      }
    };

    const statusCode = crmHealth.success ? 200 : 503;
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      crm: 'error',
      crmDetails: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        api: 'unhealthy',
        mcp: 'error'
      }
    }, { status: 503 });
  }
}

