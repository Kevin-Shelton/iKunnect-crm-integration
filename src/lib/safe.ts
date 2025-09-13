// /lib/safe.ts
export const asArray = <T>(v: T[] | null | undefined): T[] => Array.isArray(v) ? v : [];
export const asString = (v: any, d = ''): string => typeof v === 'string' ? v : d;

export function safeMirrorAck(p: any) {
  const payload = p ?? {};
  const messages = asArray(payload.messages);
  const suggestions = asArray(payload.suggestions);
  const contact = payload.contact ?? { id: null, created: false };
  const conversation = payload.conversation ?? { id: null, found: false };
  return {
    ok: true,
    contact,
    conversation,
    messages,
    suggestions,
    counts: { messages: messages.length, suggestions: suggestions.length },
  };
}

