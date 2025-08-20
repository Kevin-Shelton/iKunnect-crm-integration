// api/_utils/mcp.ts
type Json = Record<string, any>;

function pick(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function parseMcpEnvelope(status: number, rawText: string) {
  if (!rawText || typeof rawText !== 'string') throw new Error(`Empty MCP response [${status}]`);
  const ssePrefix = 'event: message\ndata: ';
  const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`);
  }
  const base = parsed?.result ?? parsed;

  // unwrap nested { content:[{ type:'text', text:'{...}' }]}
  let current: any = base;
  for (let i = 0; i < 5; i++) {
    const textNode = current?.content?.[0]?.text;
    if (!textNode || typeof textNode !== 'string') break;
    try { current = JSON.parse(textNode); } catch { break; }
  }

  if (current?.error) {
    const msg = current.error?.message || 'Unknown MCP error';
    const code = current.error?.code || status;
    throw new Error(`${code}: ${msg}`);
  }
  return current;
}

export async function callGHLMCP(toolName: string, input: Json = {}) {
  // On Vercel (Node 20+), global fetch is available
  const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  if (!pit || !locationId) throw new Error('Missing env: CRM_PIT or CRM_LOCATION_ID');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };

  // Preferred envelope: { tool, input }
  let resp = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool: toolName, input })
  });
  let txt = await resp.text();
  if (resp.ok) return parseMcpEnvelope(resp.status, txt);

  // Fallback JSON-RPC
  const rpc = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method: 'tools/call',
    params: { name: toolName, arguments: input }
  };
  resp = await fetch(mcpUrl, { method: 'POST', headers, body: JSON.stringify(rpc) });
  txt = await resp.text();
  if (!resp.ok) throw new Error(`GHL MCP Error [${resp.status}]: ${txt.slice(0, 240)}...`);
  return parseMcpEnvelope(resp.status, txt);
}

export function extractConversationId(obj: any) {
  return pick(obj, 'data.conversationId') || pick(obj, 'conversationId') || pick(obj, 'conversation.id') || null;
}

export async function sendInboundVisitorMessage(params: { contactId: string; text: string; provider?: string }) {
  const { contactId, text, provider = 'live-chat' } = params;
  return callGHLMCP('conversations_add-an-inbound-message', {
    contactId,
    text,
    provider,                 // 'live-chat' | 'webchat'
    messageType: 'Live_Chat'  // routes to Conversation AI (live chat)
  });
}

export async function sendOutboundMessage(params: { conversationId: string; text: string; messageType?: string }) {
  const { conversationId, text, messageType = 'Live_Chat' } = params;
  return callGHLMCP('conversations_send-a-new-message', { conversationId, text, messageType });
}

export { pick };
