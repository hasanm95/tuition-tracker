import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import Providers from './providers';
import UserMenu from '@/components/UserMenu';

export const metadata: Metadata = {
  title: 'Fee Tracker',
  description: 'Private tutoring student & fee tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fee Tracker',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app">
            <UserMenu />
            {children}
          </div>
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
