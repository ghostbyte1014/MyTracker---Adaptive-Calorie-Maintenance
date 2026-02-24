import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyTracker - Adaptive Calorie Maintenance',
  description: 'Track your fitness journey with intelligent calorie management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyTracker',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
