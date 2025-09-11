import { NextResponse } from 'next/server';

export async function GET() {
  const results = {
    step4_discovery: {
      status: 'running',
      methodTests: [] as Array<{
        method: string;
        format: string;
        success: boolean;
        httpStatus?: number;
        error?: string;
        response?: string;
      }>
    }
  };

  try {
    console.log('=== STEP 4: Method Discovery ===');
    
    const mcpUrl = process.env.GHL_MCP_BASE_URL!;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
      'locationId': process.env.GHL_LOCATION_ID!
    };

    // Test different method name variations with JSON-RPC 2.0 format
    const methodVariations = [
      // From documentation
      'locations_get-location',
      'contacts_get-contacts', 
      'conversations_search-conversation',
      
      // Without underscores
      'locations/get-location',
      'contacts/get-contacts',
      'conversations/search-conversation',
      
      // CamelCase
      'locationsGetLocation',
      'contactsGetContacts',
      'conversationsSearchConversation',
      
      // Simple names
      'get-location',
      'get-contacts',
      'search-conversation',
      
      // All lowercase
      'getlocation',
      'getcontacts', 
      'searchconversation',
      
      // Generic MCP methods
      'call_tool',
      'invoke',
      'execute',
      'run',
      
      // Tool-based methods
      'tool.locations_get-location',
      'tool.contacts_get-contacts',
      'mcp.locations_get-location',
      'mcp.contacts_get-contacts'
    ];

    for (const method of methodVariations) {
      console.log(`Testing method: ${method}`);
      
      try {
        // Test with JSON-RPC 2.0 format
        const jsonRpcPayload = {
          jsonrpc: "2.0",
          method: method,
          params: {
            locationId: process.env.GHL_LOCATION_ID
          },
          id: Date.now()
        };

        const response = await fetch(mcpUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(jsonRpcPayload)
        });

        const responseText = await response.text();
        
        // Check if this method worked
        const isSuccess = response.ok || (!responseText.includes('Method not found') && !responseText.includes('invalid_union'));
        
        results.step4_discovery.methodTests.push({
          method,
          format: 'JSON-RPC 2.0',
          success: isSuccess,
          httpStatus: response.status,
          response: responseText.substring(0, 500) // Truncate for readability
        });

        // If we found a working method, also test with simple format
        if (isSuccess) {
          console.log(`✅ Found working method: ${method}`);
          
          // Test same method with simple format
          const simplePayload = {
            tool: method,
            input: {
              locationId: process.env.GHL_LOCATION_ID
            }
          };

          const simpleResponse = await fetch(mcpUrl, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(simplePayload)
          });

          const simpleResponseText = await simpleResponse.text();
          const simpleSuccess = simpleResponse.ok || (!simpleResponseText.includes('Method not found') && !simpleResponseText.includes('Unrecognized key'));

          results.step4_discovery.methodTests.push({
            method: `${method} (simple format)`,
            format: 'Simple {tool, input}',
            success: simpleSuccess,
            httpStatus: simpleResponse.status,
            response: simpleResponseText.substring(0, 500)
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.step4_discovery.methodTests.push({
          method,
          format: 'JSON-RPC 2.0',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Analyze results
    const workingMethods = results.step4_discovery.methodTests.filter(test => test.success);
    const failedMethods = results.step4_discovery.methodTests.filter(test => !test.success);

    results.step4_discovery.status = workingMethods.length > 0 ? 'success' : 'failed';

    return NextResponse.json({
      success: true,
      message: 'Step 4: Method Discovery completed',
      summary: {
        totalTested: methodVariations.length,
        workingMethods: workingMethods.length,
        failedMethods: failedMethods.length,
        workingMethodNames: workingMethods.map(m => m.method)
      },
      results,
      nextSteps: workingMethods.length > 0 ? [
        'Use the working method names found',
        'Proceed to Step 5: Request format optimization',
        'Test conversation and contact retrieval'
      ] : [
        'No working methods found',
        'May need to contact GoHighLevel support',
        'Try alternative MCP server endpoints'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Step 4 discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}

