import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/appsScript';

export const dynamic = 'force-dynamic';

export interface MonthStat {
  monthName: string;
  studentCount: number;
  expectedAmount: number;
  collectedAmount: number;
  dueAmount: number;
}
export interface MonthlyReport {
  year: number;
  monthlyStats: MonthStat[];
  totalExpected: number;
  totalCollected: number;
  totalDue: number;
}

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year') ?? undefined;
    const data = await query<{ report: MonthlyReport }>('getMonthlyReport', year ? { year } : {});
    return NextResponse.json(data.report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
