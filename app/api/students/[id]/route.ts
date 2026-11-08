import { NextRequest, NextResponse } from 'next/server';
import { query, mutate } from '@/lib/appsScript';
import type { StudentDetail, StudentInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Next.js 15+ passes `params` as a Promise in route handlers.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await query<{ student: StudentDetail }>('getStudent', { id });
    return NextResponse.json(data.student);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<StudentInput>;
    const data = await mutate<{ student: StudentDetail }>('updateStudent', { id, ...body });
    return NextResponse.json(data.student);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

// Toggle active / discharged status.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = (await req.json()) as { status: string };
    const data = await mutate<{ student: StudentDetail }>('toggleStatus', { id, status });
    return NextResponse.json(data.student);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await mutate<{ deleted: boolean }>('deleteStudent', { id });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
