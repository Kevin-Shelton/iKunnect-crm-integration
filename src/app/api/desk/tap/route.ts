export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { tapPush } from '@/lib/ring';
import { pickTrace, nowIso } from '@/lib/trace';

export async function POST(req: NextRequest){
  const traceId = pickTrace(req.headers);
  const raw = await req.text();
  let data:any; 
  try{ 
    data = JSON.parse(raw) 
  }catch{ 
    data = { raw } 
  }
  tapPush({ t: nowIso(), route: '/api/desk/tap', traceId, note: data?.note ?? 'tap', data });
  return NextResponse.json({ ok:true, traceId }, { status:200 });
}

