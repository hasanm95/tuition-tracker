import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/appsScript';
import type { Student } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year') ?? undefined;
    const params: Record<string, string> = {};
    if (year) params.year = year;
    const data = await query<{ students: Student[] }>('listStudents', params);
    const students = data.students;

    const BOM = '﻿';
    const headers = [
      'নাম', 'শ্রেণী', 'শাখা', 'রোল', 'অভিভাবক ফোন',
      'মাসিক ফি', 'শুরুর তারিখ', 'মোট জমা', 'মোট বেকেয়া', 'শিক্ষাবর্ষ', 'অবস্থা'
    ];

    const rows = students.map((s) => [
      s.name,
      s.class,
      s.section,
      s.roll,
      s.guardianPhone,
      s.monthlyFee,
      s.startDate,
      s.totalPaid,
      Math.max(0, s.due),
      s.academicYear,
      s.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    ]);

    const csv =
      BOM +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const v = String(cell ?? '');
              return v.includes(',') || v.includes('"') || v.includes('\n')
                ? `"${v.replace(/"/g, '""')}"`
                : v;
            })
            .join(',')
        )
        .join('\r\n');

    const filename = `tuition-${year ?? 'all'}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
