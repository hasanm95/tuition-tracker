import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import Providers from './providers';
import BnNavBar from '@/components/BnNavBar';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'ড্যাশবোর্ড — টিউশন ট্র্যাকার',
  description: 'প্রাইভেট পড়ানো শিক্ষার্থী ও ফি ট্র্যাকার',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'টিউশন ট্র্যাকার',
  },
};

export const viewport: Viewport = {
  themeColor: '#1565c0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="app">
            <BnNavBar />
            <InstallPrompt />
            {children}
          </div>
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
