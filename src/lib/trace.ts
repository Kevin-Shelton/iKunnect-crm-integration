export function nowIso() { return new Date().toISOString(); }
export function newTraceId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export function pickTrace(h?: Headers) {
  const t = h?.get('x-trace-id');
  return t && t.length > 6 ? t : newTraceId();
}

