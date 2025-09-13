import type { NormalizedMessage } from './types';

type Conv = { id: string; messages: NormalizedMessage[]; suggestions: string[]; updatedAt: number };
const STORE: Map<string, Conv> = (globalThis as any).__CHAT_STORE__ ?? new Map(); 
(globalThis as any).__CHAT_STORE__ = STORE;

export function upsertMessages(conversationId: string, messages: NormalizedMessage[]) {
  if (!conversationId) return;
  const conv = STORE.get(conversationId) ?? { id: conversationId, messages: [], suggestions: [], updatedAt: Date.now() };
  const seen = new Set(conv.messages.map(m => m.id));
  for (const m of messages) if (!seen.has(m.id)) conv.messages.push(m);
  conv.messages.sort((a,b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  conv.updatedAt = Date.now();
  STORE.set(conversationId, conv);
}

export function addSuggestions(conversationId: string, suggestions: string[]) {
  if (!conversationId) return;
  const conv = STORE.get(conversationId) ?? { id: conversationId, messages: [], suggestions: [], updatedAt: Date.now() };
  conv.suggestions = (suggestions || []).filter(Boolean).map(String);
  conv.updatedAt = Date.now();
  STORE.set(conversationId, conv);
}

export function listConversations() {
  const arr = Array.from(STORE.values()).sort((a,b)=>b.updatedAt-a.updatedAt);
  return arr.map(c=>({ 
    id:c.id, 
    updatedAt:c.updatedAt, 
    messageCount:c.messages.length, 
    suggestionCount:c.suggestions.length, 
    lastText:c.messages.at(-1)?.text ?? '' 
  }));
}

export function getConversation(id: string) { 
  return STORE.get(id) ?? { id, messages: [], suggestions: [], updatedAt: 0 }; 
}

export function resetConversations(){ 
  STORE.clear(); 
}

