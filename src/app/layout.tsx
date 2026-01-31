import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { getSiteConfig } from '@/lib/config/site-config';
import { generateBaseMetadata, generateOpenGraphImage, generateTwitterCard } from '@/lib/seo/metadata-helpers';
import { MemoryMonitor } from '@/components/memory/MemoryMonitor';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  // Generate base metadata with consistent icons
  const base = generateBaseMetadata(config, {
    description: config.websiteDescription,
  });

  // Generate OpenGraph image
  const ogImages = generateOpenGraphImage(null, baseUrl, {
    width: 1200,
    height: 630,
    alt: `${config.websiteName} Logo`,
    fallbackToOgImage: true,
  });

  // Generate Twitter card
  const twitter = generateTwitterCard(config, {
    baseUrl,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      locale: 'en_US',
      url: '/',
      images: ogImages,
    },
    twitter,
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
        <MemoryMonitor />
        {children}
      </body>
    </html>
  );
}
