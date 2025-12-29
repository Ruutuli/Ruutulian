import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const siteUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const iconUrl = config.iconUrl || '/icon.png';
  
  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${config.websiteName}`,
      default: `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`,
    },
    description: config.websiteDescription,
    keywords: ['original characters', 'OC wiki', 'character wiki', 'world building', 'character development', 'fictional characters', 'OC database'],
    authors: [{ name: config.authorName }],
    creator: config.authorName,
    publisher: config.authorName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: config.websiteName,
      title: `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`,
      description: config.websiteDescription,
      images: [
        {
          url: `${siteUrl}/og-image`,
          width: 1200,
          height: 630,
          alt: `${config.websiteName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${config.websiteName} - ${config.websiteDescription.split('.')[0]}`,
      description: config.websiteDescription,
      images: [`${siteUrl}/og-image`],
    },
    icons: {
      icon: [
        { url: iconUrl, sizes: 'any' },
        { url: iconUrl, type: 'image/png' },
      ],
      apple: [
        { url: iconUrl, sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: '/manifest.json',
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
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900">
        <Script
          src="https://kit.fontawesome.com/262000d25d.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
