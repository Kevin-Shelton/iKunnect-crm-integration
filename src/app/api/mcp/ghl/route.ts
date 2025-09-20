import { NextRequest, NextResponse } from 'next/server';

// Health check endpoint for GHL integration status
// The actual GHL integration uses existing n8n workflows directly

export async function GET() {
  const endpoints = {
    chatHistory: process.env.N8N_GHL_CHAT_HISTORY_URL,
    agentAdmin: process.env.N8N_GHL_ADMIN_URL,
    agentSend: process.env.N8N_GHL_SEND_URL
  };
  
  const configured = Object.values(endpoints).every(url => !!url);
  
  return NextResponse.json({
    status: 'healthy',
    service: 'GHL Integration (via existing n8n workflows)',
    configured,
    endpoints: {
      chatHistory: !!endpoints.chatHistory,
      agentAdmin: !!endpoints.agentAdmin,
      agentSend: !!endpoints.agentSend
    },
    timestamp: new Date().toISOString()
  });
}

// POST endpoint for testing connectivity
export async function POST(request: NextRequest) {
  try {
    const { endpoint, testData } = await request.json();
    
    const endpoints = {
      chatHistory: process.env.N8N_GHL_CHAT_HISTORY_URL,
      agentAdmin: process.env.N8N_GHL_ADMIN_URL,
      agentSend: process.env.N8N_GHL_SEND_URL
    };
    
    const targetUrl = endpoints[endpoint as keyof typeof endpoints];
    
    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: `Unknown endpoint: ${endpoint}`
      }, { status: 400 });
    }
    
    // Test connectivity to the n8n endpoint
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData || { test: true })
    });
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      endpoint,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
