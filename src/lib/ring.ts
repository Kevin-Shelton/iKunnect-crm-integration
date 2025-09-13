type Item = { t: string; route: string; traceId: string; note: string; data?: any };
type Ring = { buf: Item[]; i: number; size: number };
const RING: Ring = (globalThis as any).__RING__ ?? { buf: new Array(200), i: 0, size: 200 };
(globalThis as any).__RING__ = RING;

// Import diagnostics for persistent storage
import { getAllDiagnosticSessions, addDiagnosticTap } from './diagnostics';

export function tapPush(item: Item) {
  RING.buf[RING.i] = item;
  RING.i = (RING.i + 1) % RING.size;
  
  // Also add to any active diagnostic sessions
  try {
    const sessions = getAllDiagnosticSessions();
    const activeSessions = sessions.filter(s => !s.endTime);
    activeSessions.forEach(session => {
      addDiagnosticTap(session.sessionId, item);
    });
  } catch (error) {
    // Ignore errors in diagnostic capture
  }
}

export function tapRead(): Item[] {
  const out: Item[] = [];
  for (let j = 0; j < RING.size; j++) {
    const k = (RING.i + j) % RING.size;
    const it = RING.buf[k];
    if (it) out.push(it);
  }
  return out;
}

export function tapClear() { RING.i = 0; RING.buf = new Array(RING.size); }

