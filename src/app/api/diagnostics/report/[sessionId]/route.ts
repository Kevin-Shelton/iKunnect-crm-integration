export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { generateDiagnosticReport, endDiagnosticSession } from '@/lib/diagnostics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // End the session and generate report
    const finalSession = endDiagnosticSession(sessionId);
    const report = generateDiagnosticReport(sessionId);
    
    if (!report) {
      return NextResponse.json({
        ok: false,
        error: 'Session not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      ok: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error)
    }, { status: 500 });
  }
}

