import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import { cn } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://meetmind.app'),
  title: {
    default: 'MeetMind – AI Meeting Minutes & Analysis',
    template: '%s – MeetMind',
  },
  description: 'Record, transcribe, and analyze meetings with AI-powered key points, sentiment, topics, and exports.',
  keywords: [
    'meeting minutes',
    'AI transcription',
    'audio recording',
    'meeting analysis',
    'sentiment analysis',
    'key points',
    'topics extraction',
  ],
  authors: [{ name: 'MeetMind' }],
  creator: 'MeetMind',
  applicationName: 'MeetMind',
  openGraph: {
    type: 'website',
    url: 'https://meetmind.app',
    title: 'MeetMind – AI Meeting Minutes & Analysis',
    description: 'Record, transcribe, and analyze meetings with AI-powered insights.',
    siteName: 'MeetMind',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'MeetMind preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MeetMind – AI Meeting Minutes & Analysis',
    description: 'Record, transcribe, and analyze meetings with AI-powered insights.',
    images: ['/og.png'],
    creator: '@meetmind',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  category: 'productivity',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(210 40% 98%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(210 10% 12%)' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        {children}
        <Toaster /> {/* Add Toaster */}
        <Analytics />
      </body>
    </html>
  );
}
