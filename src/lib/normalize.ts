// /lib/normalize.ts
import { GhlMessage, MsgTypeIndex, NormalizedMessage } from './types';

export function classifyMessage(m: GhlMessage): Pick<NormalizedMessage, 'category' | 'sender'> {
  const t = m.type;
  const tt = m.messageType ?? '';
  const isChat = t === MsgTypeIndex.TYPE_LIVE_CHAT || /TYPE_LIVE_CHAT/i.test(tt);
  const isInfo = t === MsgTypeIndex.TYPE_LIVE_CHAT_INFO_MESSAGE || /INFO/i.test(tt);

  const category: 'chat' | 'info' | 'other' = isChat ? 'chat' : isInfo ? 'info' : 'other';

  // Heuristic sender mapping:
  // - info -> system
  // - explicit AI markers (meta.source === 'ai' or raw.source === 'ai') -> ai_agent
  // - outbound (not system) -> human_agent
  // - else -> contact
  const aiFlag = (m as any)?.provider === 'ai' || (m as any)?.source === 'ai';
  const sender =
    category === 'info' ? 'system'
    : aiFlag ? 'ai_agent'
    : (m.direction === 'outbound' ? 'human_agent' : 'contact');

  return { category, sender };
}

export function normalizeMessages(arr: GhlMessage[], fallbackConvId?: string | null): NormalizedMessage[] {
  return (arr || []).map((m) => {
    const { category, sender } = classifyMessage(m);
    return {
      id: m.id,
      conversationId: m.conversationId ?? fallbackConvId ?? null,
      direction: m.direction,
      sender,
      category,
      text: m.body ?? '',
      createdAt: m.dateAdded ?? m.dateUpdated,
      raw: m,
    };
  });
}

