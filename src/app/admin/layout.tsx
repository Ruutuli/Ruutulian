import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { requireAuth } from '@/lib/auth/require-auth';
import { getSiteConfig } from '@/lib/config/site-config';
import { getGoogleDriveFileId, getProxyUrl } from '@/lib/utils/googleDriveImage';
import { logger } from '@/lib/logger';

// Force dynamic rendering to ensure middleware and auth checks run
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const startTime = Date.now();
  console.log('[AdminLayout] generateMetadata called');
  
  const config = await getSiteConfig();
  const siteUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  console.log('[AdminLayout] Site config loaded:', {
    siteUrl,
    altIconUrl: config.altIconUrl,
    hasAltIconUrl: !!config.altIconUrl,
  });
  
  // Use altIconUrl for admin pages if available, otherwise default to /icon-alt.png for admin pages
  const altIconUrl = config.altIconUrl || '/icon-alt.png';
  
  console.log('[AdminLayout] Processing icon URL:', {
    altIconUrl,
    isGoogleDrive: altIconUrl.includes('drive.google.com'),
  });
  
  // For Google Drive URLs, use the proxy API with absolute URL
  // For relative URLs (like /icon-alt.png), make them absolute
  let iconUrl: string;
  if (altIconUrl.includes('drive.google.com')) {
    const fileId = getGoogleDriveFileId(altIconUrl);
    console.log('[AdminLayout] Google Drive URL detected:', {
      originalUrl: altIconUrl,
      extractedFileId: fileId,
    });
    
    if (fileId) {
      // Use absolute URL for the proxy API
      iconUrl = `${siteUrl}/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(altIconUrl)}`;
      console.log('[AdminLayout] Generated proxy URL:', iconUrl);
    } else {
      // Fallback if we can't extract file ID
      iconUrl = altIconUrl.startsWith('http') ? altIconUrl : `${siteUrl}${altIconUrl}`;
      console.warn('[AdminLayout] Could not extract file ID, using fallback URL:', iconUrl);
    }
  } else {
    // For non-Google Drive URLs, make relative URLs absolute
    iconUrl = altIconUrl.startsWith('http') ? altIconUrl : `${siteUrl}${altIconUrl}`;
    console.log('[AdminLayout] Non-Google Drive URL, using:', iconUrl);
  }
  
  const duration = Date.now() - startTime;
  console.log('[AdminLayout] Metadata generation completed in', duration, 'ms', {
    finalIconUrl: iconUrl,
  });
  
  return {
    icons: {
      icon: [
        { url: iconUrl, sizes: 'any' },
        { url: iconUrl, type: 'image/png' },
      ],
      apple: [
        { url: iconUrl, sizes: '180x180', type: 'image/png' },
      ],
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication - if not authenticated, requireAuth() will redirect to /admin/login
  // Since login page is now in (auth) route group, it won't use this layout, so no redirect loop
  const user = await requireAuth();
  const userEmail = user?.email || null;

  return <AdminLayoutWrapper userEmail={userEmail}>{children}</AdminLayoutWrapper>;
}
