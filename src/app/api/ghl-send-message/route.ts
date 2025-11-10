import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GHL MCP API configuration
const GHL_MCP_ENDPOINT = 'https://services.leadconnectorhq.com/mcp/';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'DKs2AdSvw0MGWJYyXwk1';

interface SendMessageRequest {
  name: string;
  email: string;
  message: string;
}

interface MCPToolCall {
  jsonrpc: '2.0';
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
  id: string;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: {
    content?: Array<{
      type: string;
      text: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
  id: string;
}

/**
 * Parse MCP response which may contain nested JSON in text field
 */
function parseMCPResponse(response: MCPResponse): any {
  if (response.error) {
    throw new Error(`MCP Error: ${response.error.message}`);
  }

  if (!response.result?.content?.[0]?.text) {
    throw new Error('Invalid MCP response format');
  }

  const text = response.result.content[0].text;

  // Try to parse as JSON, otherwise return as plain text
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

/**
 * Call GHL MCP API with proper authentication and formatting
 */
async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<any> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;

  if (!token) {
    throw new Error('GHL_PRIVATE_INTEGRATION_TOKEN not configured');
  }

  const payload: MCPToolCall = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
    id: `mcp_${Date.now()}`,
  };

  console.log(`[GHL MCP] Calling tool: ${toolName}`, { args });

  const response = await fetch(GHL_MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'locationId': GHL_LOCATION_ID,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GHL MCP] HTTP error ${response.status}:`, errorText);
    throw new Error(`GHL MCP API error: ${response.status}`);
  }

  const mcpResponse: MCPResponse = await response.json();
  console.log(`[GHL MCP] Response from ${toolName}:`, mcpResponse);

  return parseMCPResponse(mcpResponse);
}

/**
 * Create or update a contact in GHL
 */
async function upsertContact(
  email: string,
  name?: string
): Promise<{ contactId: string }> {
  const args: Record<string, unknown> = {
    locationId: GHL_LOCATION_ID,
    email,
  };

  if (name) {
    args.name = name;
  }

  const result = await callMCPTool('contacts_upsert-contact', args);

  // Extract contactId from response
  const contactId = result.contact?.id || result.contactId || result.id;

  if (!contactId) {
    console.error('[GHL MCP] No contactId in upsert response:', result);
    throw new Error('Failed to get contactId from GHL');
  }

  console.log(`[GHL MCP] Contact upserted: ${contactId}`);
  return { contactId };
}

/**
 * Send a message to GHL conversation
 */
async function sendMessage(
  contactId: string,
  message: string
): Promise<{ conversationId: string; messageId: string }> {
  const args = {
    locationId: GHL_LOCATION_ID,
    contactId,
    type: 'webchat', // IMPORTANT: Use webchat, not SMS
    message,
  };

  const result = await callMCPTool('conversations_send-a-new-message', args);

  // Extract conversationId and messageId from response
  const conversationId =
    result.conversation?.id ||
    result.conversationId ||
    result.conversation_id;
  const messageId = result.message?.id || result.messageId || result.message_id;

  if (!conversationId || !messageId) {
    console.error('[GHL MCP] Missing IDs in send message response:', result);
    throw new Error('Failed to get conversation/message IDs from GHL');
  }

  console.log(
    `[GHL MCP] Message sent: conversationId=${conversationId}, messageId=${messageId}`
  );
  return { conversationId, messageId };
}

/**
 * POST /api/ghl-send-message
 * Secure proxy to send messages to GoHighLevel MCP API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request method and environment
    if (!process.env.GHL_PRIVATE_INTEGRATION_TOKEN) {
      console.error('[GHL MCP] Missing GHL_PRIVATE_INTEGRATION_TOKEN');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 2. Parse and validate request body
    let body: SendMessageRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, email, message } = body;

    if (!email || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and message are required',
        },
        { status: 400 }
      );
    }

    console.log('[GHL MCP] Processing message send request:', {
      name,
      email,
      messageLength: message.length,
    });

    // 3. Create/update contact in GHL
    const { contactId } = await upsertContact(email, name);

    // 4. Send message to GHL
    const { conversationId, messageId } = await sendMessage(contactId, message);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      contactId,
      conversationId,
      messageId,
    });
  } catch (error) {
    console.error('[GHL MCP] Error processing request:', error);

    // Return generic error to frontend (don't expose internal details)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ghl-send-message
 * Return method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
