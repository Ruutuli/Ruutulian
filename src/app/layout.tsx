import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com'),
  title: {
    template: '%s | Ruutulian',
    default: "Ruu's Personal OC Wiki - Ruutulian",
  },
  description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines across every universe.",
  keywords: ['original characters', 'OC wiki', 'character wiki', 'world building', 'character development', 'fictional characters', 'OC database'],
  authors: [{ name: 'Ruutulian' }],
  creator: 'Ruutulian',
  publisher: 'Ruutulian',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Ruutulian',
    title: "Ruu's Personal OC Wiki - Ruutulian",
    description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines across every universe.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com'}/icon.png`,
        width: 512,
        height: 512,
        alt: 'Ruutulian Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ruu's Personal OC Wiki - Ruutulian",
    description: "Ruu's personal OC wiki! A place to store and organize information on her original characters, worlds, lore, and timelines across every universe.",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com'}/icon.png`],
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
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
