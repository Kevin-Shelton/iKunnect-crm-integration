export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { tapRead, tapClear } from '@/lib/ring';
import { listConversations } from '@/lib/chatStorage';

export async function GET(){
  return NextResponse.json({ 
    ok:true, 
    taps: tapRead(), 
    conversations: listConversations() 
  }, { status:200 });
}

export async function DELETE(){ 
  tapClear(); 
  return NextResponse.json({ ok:true }); 
}

