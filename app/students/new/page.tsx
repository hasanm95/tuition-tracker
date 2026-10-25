'use client';

import Link from 'next/link';
import StudentForm from '@/components/StudentForm';

export default function NewStudentPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Add student</h1>
        </div>
        <Link href="/" className="btn ghost">
          Cancel
        </Link>
      </div>
      <StudentForm />
    </>
  );
}
