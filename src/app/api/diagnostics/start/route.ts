export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { startDiagnosticSession } from '@/lib/diagnostics';

export async function POST() {
  try {
    const sessionId = startDiagnosticSession();
    
    return NextResponse.json({
      ok: true,
      sessionId,
      message: 'Diagnostic session started. Now initiate your live chat.',
      instructions: [
        '1. Send a live chat message from GoHighLevel',
        '2. Wait for AI response',
        '3. Call /api/diagnostics/report/{sessionId} to get full report'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error)
    }, { status: 500 });
  }
}

