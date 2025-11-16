import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrivyClientProvider } from '@/components/PrivyClientProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppInitializer from '@/components/AppInitializer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StudIQ - AI-Powered Student Financial Platform",
    template: "%s | StudIQ",
  },
  description: "Empowering students through AI-driven financial literacy, collaborative savings pools, and intelligent budgeting. The future of student finance management.",
  keywords: [
    "student finance",
    "AI financial assistant",
    "savings pools",
    "campus stores",
    "financial literacy",
    "student wallet",
    "DeFi for students",
    "AI tutoring",
    "budget management",
    "student discounts",
    "cryptocurrency",
    "Solana wallet",
    "financial education",
    "collaborative savings",
    "student financial platform"
  ],
  authors: [{ name: "StudIQ Team", url: "https://studiq.app" }],
  creator: "StudIQ",
  publisher: "StudIQ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://studiq.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "StudIQ - AI-Powered Student Financial Platform",
    description: "Empowering students through AI-driven financial literacy, collaborative savings pools, and intelligent budgeting. Join the future of student finance.",
    url: 'https://studiq.app',
    siteName: 'StudIQ',
    images: [
      {
        url: 'https://studiq.app/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'StudIQ - AI-Powered Student Financial Platform',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "StudIQ - AI-Powered Student Financial Platform",
    description: "Empowering students through AI-driven financial literacy, collaborative savings pools, and intelligent budgeting.",
    images: ['https://studiq.app/twitter-image.jpg'],
    creator: '@studiq_app',
    site: '@studiq_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  },
  category: 'finance',
  classification: 'Student Financial Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#0066FF" />
        <meta name="msapplication-TileColor" content="#0066FF" />
        
        {/* Additional SEO */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StudIQ" />
        
        {/* PWA Manifest - Temporarily disabled due to 401 error */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "StudIQ",
              "description": "AI-Powered Student Financial Platform",
              "url": "https://studiq.app",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "StudIQ"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1000"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var k='studiq_theme';var t=localStorage.getItem(k);var p=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t==='system'&&p);document.documentElement.classList.toggle('dark',!!d);}catch(e){}}();`
          }}
        />
        <ErrorBoundary>
          <AppInitializer>
            <PrivyClientProvider>
              {children}
            </PrivyClientProvider>
          </AppInitializer>
        </ErrorBoundary>
      </body>
    </html>
  );
}
