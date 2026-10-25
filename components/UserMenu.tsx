'use client';

import { useSession, signOut } from 'next-auth/react';

export default function UserMenu() {
  const { data: session, status } = useSession();

  // Hidden on the sign-in page / before auth resolves.
  if (status !== 'authenticated' || !session?.user?.email) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
        padding: '8px 0 0',
        fontSize: 12,
        color: 'var(--muted)',
      }}
    >
      <span
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}
      >
        {session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/signin' })}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 12,
          color: 'var(--brand)',
          cursor: 'pointer',
          width: 'auto',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
