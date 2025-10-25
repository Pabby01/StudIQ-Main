import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile Settings - Student Account Management | StudIQ',
  description: 'Manage your StudIQ student profile, wallet settings, preferences, and account security. Update personal information and customize your experience.',
  keywords: 'student profile, account settings, wallet management, profile settings, student account, account preferences, security settings',
  openGraph: {
    title: 'Profile Settings - Student Account Management',
    description: 'Manage your StudIQ student profile, wallet settings, and account preferences.',
    url: 'https://studiq.app/profile',
    siteName: 'StudIQ',
    images: [
      {
        url: 'https://studiq.app/og-profile.png',
        width: 1200,
        height: 630,
        alt: 'StudIQ Profile Settings'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Profile Settings - Student Account Management',
    description: 'Manage your StudIQ student profile, wallet settings, and account preferences.',
    images: ['https://studiq.app/twitter-profile.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}