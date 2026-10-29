'use client';

import Link from 'next/link';
import StudentForm from '@/components/StudentForm';

export default function NewStudentPage() {
  return (
    <>
      <div className="topbar" style={{ marginTop: 14 }}>
        <div>
          <h1>নতুন ভর্তি</h1>
          <div className="sub">শিক্ষার্থীর তথ্য পূরণ করুন</div>
        </div>
        <Link href="/" className="btn ghost">বাতিল</Link>
      </div>
      <StudentForm />
    </>
  );
}
