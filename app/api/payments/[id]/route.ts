import { NextRequest, NextResponse } from 'next/server';
import { mutate } from '@/lib/appsScript';
import type { Payment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await mutate<{ payment: Payment }>('updatePayment', { id, ...body });
    return NextResponse.json(data.payment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await mutate<{ deleted: boolean }>('deletePayment', { id });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
