import { NextRequest, NextResponse } from 'next/server';
import { mutate } from '@/lib/appsScript';

export const dynamic = 'force-dynamic';

// Change the in-app admin password. The backend requires `phone` to match the
// stored director number (MASTER_PHONE) — that is the director confirmation.
export async function POST(req: NextRequest) {
  try {
    const { phone, newPass } = (await req.json()) as { phone: string; newPass: string };
    const data = await mutate<{ message: string }>('changePassword', { phone, newPass });
    return NextResponse.json({ message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
