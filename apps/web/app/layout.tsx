import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { CookieConsent } from '../components/ui/CookieConsent';
import { SplashLoader } from '../components/ui/SplashLoader';
import PWARegister from '../components/ui/PWARegister';

export const metadata: Metadata = {
  title: 'OpenSketch | Whiteboard',
  description: 'Collaborative whiteboard. Draw together in real-time.',
  manifest: '/manifest.webmanifest',
  themeColor: '#0b63f6',
  icons: {
    icon: [
      // { url: '/favicon.ico' },
      { url: '/icons/pen1.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/pen1.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/pen1.png', type: 'image/png' }
    ],
    shortcut: '/icons/pen1.png',
    apple: '/icons/pen1.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SplashLoader />
        <PWARegister />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}