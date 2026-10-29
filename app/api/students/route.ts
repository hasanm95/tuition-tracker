import { NextRequest, NextResponse } from 'next/server';
import { query, mutate } from '@/lib/appsScript';
import type { Student, StudentInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year') ?? undefined;
    const data = await query<{ students: Student[] }>('listStudents', year ? { year } : {});
    return NextResponse.json(data.students);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StudentInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'নাম আবশ্যক' }, { status: 400 });
    }
    const data = await mutate<{ student: Student }>('addStudent', { ...body });
    return NextResponse.json(data.student, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
