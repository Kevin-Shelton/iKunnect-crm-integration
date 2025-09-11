import { NextResponse } from 'next/server';

export async function GET() {
  const results: {
    step1_environment: {
      status: string;
      variables: Record<string, { exists: boolean; length: number; preview: string }>;
      summary?: string;
    };
    step2_connectivity: Record<string, unknown>;
    step3_authentication: Record<string, unknown>;
    step4_discovery: Record<string, unknown>;
    step5_format: Record<string, unknown>;
  } = {
    step1_environment: {
      status: 'checking',
      variables: {}
    },
    step2_connectivity: {},
    step3_authentication: {},
    step4_discovery: {},
    step5_format: {}
  };

  try {
    // STEP 1: Validate Environment Variables
    console.log('=== STEP 1: Environment Variables ===');
    
    const requiredEnvVars = [
      'GHL_PRIVATE_INTEGRATION_TOKEN',
      'GHL_LOCATION_ID', 
      'GHL_MCP_BASE_URL',
      'OPENAI_API_TOKEN',
      'OPENAI_PROMPT_ID'
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      results.step1_environment.variables[envVar] = {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 8)}...` : 'MISSING'
      };
    }

    const allEnvVarsPresent = requiredEnvVars.every(envVar => process.env[envVar]);
    results.step1_environment.status = allEnvVarsPresent ? 'success' : 'failed';
    results.step1_environment.summary = `${Object.values(results.step1_environment.variables).filter(v => v.exists).length}/${requiredEnvVars.length} variables present`;

    if (!allEnvVarsPresent) {
      return NextResponse.json({
        success: false,
        message: 'Environment variables missing - cannot proceed',
        results
      });
    }

    // STEP 2: Test Basic Connectivity
    console.log('=== STEP 2: Basic Connectivity ===');
    
    const mcpUrl = process.env.GHL_MCP_BASE_URL!;
    results.step2_connectivity = {
      status: 'checking',
      url: mcpUrl
    };

    try {
      const connectivityTest = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'connectivity' })
      });

      results.step2_connectivity = {
        status: 'success',
        url: mcpUrl,
        httpStatus: connectivityTest.status,
        statusText: connectivityTest.statusText,
        headers: Object.fromEntries(connectivityTest.headers.entries())
      };

    } catch (connectError) {
      results.step2_connectivity = {
        status: 'failed',
        url: mcpUrl,
        error: connectError instanceof Error ? connectError.message : 'Unknown connectivity error'
      };
      
      return NextResponse.json({
        success: false,
        message: 'Cannot connect to MCP server',
        results
      });
    }

    // STEP 3: Test Authentication
    console.log('=== STEP 3: Authentication Test ===');
    
    const authHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
      'locationId': process.env.GHL_LOCATION_ID!
    };

    results.step3_authentication = {
      status: 'checking',
      headers: {
        'Content-Type': authHeaders['Content-Type'],
        'Accept': authHeaders['Accept'],
        'Authorization': `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN?.substring(0, 8)}...`,
        'locationId': process.env.GHL_LOCATION_ID
      }
    };

    // Test with the simplest possible request
    try {
      const authTest = await fetch(mcpUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          tool: 'locations_get-location',
          input: {
            locationId: process.env.GHL_LOCATION_ID
          }
        })
      });

      const authResponseText = await authTest.text();
      
      results.step3_authentication = {
        status: authTest.ok ? 'success' : 'failed',
        httpStatus: authTest.status,
        statusText: authTest.statusText,
        responseLength: authResponseText.length,
        responsePreview: authResponseText.substring(0, 200),
        fullResponse: authResponseText
      };

    } catch (authError) {
      results.step3_authentication = {
        status: 'failed',
        error: authError instanceof Error ? authError.message : 'Unknown auth error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Step-by-step validation completed',
      results,
      nextSteps: [
        'Review each step result',
        'Fix any failed steps before proceeding',
        'If all steps pass, we can proceed to tool discovery'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Validation process failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}

