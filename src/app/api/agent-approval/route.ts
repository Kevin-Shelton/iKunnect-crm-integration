import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// HMAC verification function
function verifyHmac(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  
  const cleanSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(cleanSignature, 'hex')
  );
}

// Generate HMAC signature for outgoing requests
function generateHmac(body: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
}

interface AgentApproval {
  conversationId: string;
  approved: boolean;
  finalText: string;
  correlationId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Agent Approval Endpoint Called ===');
    
    // Get raw body for HMAC verification
    const body = await request.text();
    const signature = request.headers.get('x-signature') || '';
    const secret = process.env.SHARED_HMAC_SECRET;
    const n8nApprovalUrl = process.env.N8N_APPROVAL_URL;

    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Body length:', body.length);
    console.log('Signature:', signature);

    if (!secret) {
      console.error('SHARED_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!n8nApprovalUrl) {
      console.error('N8N_APPROVAL_URL not configured');
      return NextResponse.json(
        { error: 'N8N approval URL not configured' },
        { status: 500 }
      );
    }

    // Verify HMAC signature
    if (!verifyHmac(body, signature, secret)) {
      console.error('HMAC verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ HMAC verification passed');

    // Parse the JSON body
    let approval: AgentApproval;
    try {
      approval = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['conversationId', 'approved', 'finalText', 'correlationId'];
    for (const field of requiredFields) {
      if (approval[field as keyof AgentApproval] === undefined) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
        { status: 400 }
        );
      }
    }

    console.log('📋 Agent approval received:', {
      conversationId: approval.conversationId,
      approved: approval.approved,
      textLength: approval.finalText.length,
      correlationId: approval.correlationId
    });

    // Forward to n8n with HMAC signature
    const forwardBody = JSON.stringify(approval);
    const forwardSignature = generateHmac(forwardBody, secret);

    try {
      const response = await fetch(n8nApprovalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${forwardSignature}`
        },
        body: forwardBody
      });

      if (!response.ok) {
        console.error('n8n approval request failed:', response.status, response.statusText);
        return NextResponse.json(
          { error: 'Failed to forward approval to n8n' },
          { status: 502 }
        );
      }

      const n8nResponse = await response.text();
      console.log('✅ Successfully forwarded approval to n8n');

      return NextResponse.json({
        success: true,
        message: 'Approval forwarded to n8n',
        conversationId: approval.conversationId,
        approved: approval.approved,
        correlationId: approval.correlationId
      });

    } catch (error) {
      console.error('Error forwarding to n8n:', error);
      return NextResponse.json(
        { error: 'Failed to communicate with n8n' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('Error processing agent approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

