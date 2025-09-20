import { NextRequest, NextResponse } from 'next/server';

// n8n MCP endpoint for GoHighLevel integration
// This endpoint communicates with n8n workflows that handle GHL API calls

interface MCPRequest {
  action: 'search_contacts' | 'create_contact' | 'update_contact' | 'get_contact';
  data: any;
}

interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  contacts?: any[];
  contact?: any;
}

export async function POST(request: NextRequest) {
  try {
    const { action, data }: MCPRequest = await request.json();

    console.log(`[MCP GHL] Processing action: ${action}`, {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    });

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_GHL_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('[MCP GHL] N8N_GHL_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: false,
        error: 'n8n webhook URL not configured'
      }, { status: 500 });
    }

    // Prepare payload for n8n
    const n8nPayload = {
      action,
      data,
      timestamp: new Date().toISOString(),
      source: 'ikunnect-chat'
    };

    console.log(`[MCP GHL] Sending to n8n:`, {
      url: n8nWebhookUrl,
      action,
      dataSize: JSON.stringify(data).length
    });

    // Call n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'iKunnect-Chat-System/1.0'
      },
      body: JSON.stringify(n8nPayload),
      timeout: 30000 // 30 second timeout
    });

    if (!n8nResponse.ok) {
      console.error(`[MCP GHL] n8n webhook failed:`, {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText
      });
      
      return NextResponse.json({
        success: false,
        error: `n8n webhook failed: ${n8nResponse.status}`
      }, { status: 502 });
    }

    const n8nResult = await n8nResponse.json();
    
    console.log(`[MCP GHL] n8n response received:`, {
      success: n8nResult.success,
      hasData: !!n8nResult.data,
      hasContacts: !!n8nResult.contacts,
      hasContact: !!n8nResult.contact
    });

    // Handle different action responses
    const response: MCPResponse = {
      success: n8nResult.success || false,
      data: n8nResult.data,
      error: n8nResult.error
    };

    switch (action) {
      case 'search_contacts':
        response.contacts = n8nResult.contacts || [];
        break;
      
      case 'create_contact':
      case 'update_contact':
      case 'get_contact':
        response.contact = n8nResult.contact;
        break;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[MCP GHL] Error processing request:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for health check
export async function GET() {
  const n8nWebhookUrl = process.env.N8N_GHL_WEBHOOK_URL;
  
  return NextResponse.json({
    status: 'healthy',
    service: 'GHL MCP Integration',
    configured: !!n8nWebhookUrl,
    timestamp: new Date().toISOString()
  });
}
