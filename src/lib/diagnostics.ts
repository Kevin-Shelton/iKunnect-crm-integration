// Persistent diagnostics storage that doesn't get overwritten
type DiagnosticSession = {
  sessionId: string;
  startTime: string;
  endTime?: string;
  taps: Array<{
    t: string;
    route: string;
    traceId: string;
    note: string;
    data?: any;
  }>;
  conversations: Array<{
    id: string;
    messageCount: number;
    suggestionCount: number;
    lastText: string;
    updatedAt: number;
  }>;
  summary: {
    totalTaps: number;
    uniqueTraceIds: string[];
    routeCounts: Record<string, number>;
    errors: string[];
    expectedFlow: string[];
    missingSteps: string[];
  };
};

const SESSIONS: Map<string, DiagnosticSession> = (globalThis as any).__DIAGNOSTIC_SESSIONS__ ?? new Map();
(globalThis as any).__DIAGNOSTIC_SESSIONS__ = SESSIONS;

export function startDiagnosticSession(sessionId?: string): string {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  const session: DiagnosticSession = {
    sessionId: id,
    startTime: new Date().toISOString(),
    taps: [],
    conversations: [],
    summary: {
      totalTaps: 0,
      uniqueTraceIds: [],
      routeCounts: {},
      errors: [],
      expectedFlow: [
        'after_extract_identity',
        'after_resolve_conversation', 
        'before_assist_request',
        'after_assist_response',
        'before_mirror_events',
        'before_mirror_assist'
      ],
      missingSteps: []
    }
  };
  
  SESSIONS.set(id, session);
  return id;
}

export function addDiagnosticTap(sessionId: string, tap: any) {
  const session = SESSIONS.get(sessionId);
  if (!session) return;
  
  session.taps.push({
    t: tap.t,
    route: tap.route,
    traceId: tap.traceId,
    note: tap.note,
    data: tap.data
  });
  
  // Update summary
  session.summary.totalTaps = session.taps.length;
  session.summary.uniqueTraceIds = [...new Set(session.taps.map(t => t.traceId))];
  
  // Count routes
  session.summary.routeCounts[tap.route] = (session.summary.routeCounts[tap.route] || 0) + 1;
  
  // Check for expected flow
  const noteSteps = session.taps.map(t => t.note);
  session.summary.missingSteps = session.summary.expectedFlow.filter(step => 
    !noteSteps.some(note => note.includes(step))
  );
}

export function updateDiagnosticConversations(sessionId: string, conversations: any[]) {
  const session = SESSIONS.get(sessionId);
  if (!session) return;
  
  session.conversations = conversations.map(conv => ({
    id: conv.id,
    messageCount: conv.messageCount || 0,
    suggestionCount: conv.suggestionCount || 0,
    lastText: conv.lastText || '',
    updatedAt: conv.updatedAt || Date.now()
  }));
}

export function endDiagnosticSession(sessionId: string) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  
  session.endTime = new Date().toISOString();
  
  // Generate final analysis
  const analysis = {
    duration: session.endTime ? 
      (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 : 0,
    success: session.summary.missingSteps.length === 0,
    issues: [] as string[]
  };
  
  if (session.summary.totalTaps === 0) {
    analysis.issues.push('No taps received - webhook may not be firing');
  }
  
  if (session.summary.missingSteps.length > 0) {
    analysis.issues.push(`Missing expected steps: ${session.summary.missingSteps.join(', ')}`);
  }
  
  if (session.conversations.length === 0 && session.summary.totalTaps > 0) {
    analysis.issues.push('Taps received but no conversations created - check mirror endpoints');
  }
  
  return {
    ...session,
    analysis
  };
}

export function getDiagnosticSession(sessionId: string) {
  return SESSIONS.get(sessionId);
}

export function getAllDiagnosticSessions() {
  return Array.from(SESSIONS.values()).sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

export function generateDiagnosticReport(sessionId: string) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  
  const report = {
    sessionInfo: {
      id: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? 
        `${((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000).toFixed(1)}s` : 'ongoing'
    },
    summary: session.summary,
    tapFlow: session.taps.map(tap => ({
      time: new Date(tap.t).toLocaleTimeString(),
      route: tap.route.replace('/api/', ''),
      note: tap.note,
      traceId: tap.traceId.slice(-8),
      data: tap.data
    })),
    conversations: session.conversations,
    diagnosis: {
      webhookWorking: session.summary.totalTaps > 0,
      n8nFlowComplete: session.summary.missingSteps.length === 0,
      mirrorEndpointsWorking: session.conversations.length > 0,
      overallHealth: session.summary.missingSteps.length === 0 && session.conversations.length > 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    }
  };
  
  return report;
}

