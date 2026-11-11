import { NextRequest, NextResponse } from 'next/server';
import { query, mutate } from '@/lib/appsScript';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await query<{ signature: string }>('getSignature');
    return NextResponse.json({ signature: data.signature || '' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { signature } = (await req.json()) as { signature: string };
    const data = await mutate<{ message: string }>('saveSignature', { signature: signature ?? '' });
    return NextResponse.json({ message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
