import { NextRequest, NextResponse } from 'next/server';
import { query, mutate } from '@/lib/appsScript';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const params: Record<string, string> = {};
    const year = sp.get('year'); if (year) params.year = year;
    const cls = sp.get('class'); if (cls) params.class = cls;
    const date = sp.get('date'); if (date) params.date = date;
    const data = await query<{ result: any }>('getExamResults', params);
    return NextResponse.json(data.result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await mutate<{ message: string }>('saveExamMarks', body);
    return NextResponse.json({ message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
