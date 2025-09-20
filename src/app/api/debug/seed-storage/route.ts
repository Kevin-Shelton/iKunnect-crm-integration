
import { NextResponse } from 'next/server';
import { storeMessage } from '@/lib/persistent-storage';

export async function GET() {
  try {
    console.log('[Debug Seed API] Seeding storage with sample data...');

    const conversationId = `conv_${Date.now()}`;

    await storeMessage({
      conversation_id: conversationId,
      type: 'inbound',
      message_id: `msg_${Date.now()}`,
      text: 'Hello, I need help with my account.',
      payload: { customerName: 'John Doe' },
    });

    await storeMessage({
      conversation_id: conversationId,
      type: 'inbound',
      message_id: `msg_${Date.now() + 1}`,
      text: 'I cannot access my dashboard.',
      payload: {},
    });

    console.log('[Debug Seed API] Storage seeded successfully.');

    return NextResponse.json({ success: true, conversationId });
  } catch (error) {
    console.error('[Debug Seed API] Error seeding storage:', error);
    return NextResponse.json(
      { error: 'Failed to seed storage' },
      { status: 500 }
    );
  }
}

