'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Student } from '@/lib/types';
import StudentForm from '@/components/StudentForm';

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/students/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
        }
        setStudent(await res.json());
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [id]);

  return (
    <>
      <div className="topbar" style={{ marginTop: 14 }}>
        <div>
          <h1>তথ্য এডিট করুন</h1>
        </div>
        <Link href={`/students/${id}`} className="btn ghost">বাতিল</Link>
      </div>

      {error && <div className="error">{error}</div>}
      {!student && !error && (
        <div className="card">
          <div className="skeleton" style={{ height: 16, width: '40%' }} />
          <div className="skeleton" style={{ height: 44, width: '100%', marginTop: 10 }} />
          <div className="skeleton" style={{ height: 44, width: '100%', marginTop: 10 }} />
        </div>
      )}
      {student && <StudentForm student={student} />}
    </>
  );
}
