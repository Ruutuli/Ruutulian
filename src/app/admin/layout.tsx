import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { requireAuth } from '@/lib/auth/require-auth';
import { getSiteConfig } from '@/lib/config/site-config';
import { getGoogleDriveFileId, convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

// Force dynamic rendering to ensure middleware and auth checks run
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const siteUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  
  // Use altIconUrl for admin pages if available, otherwise fall back to main iconUrl
  const altIconUrl = config.altIconUrl;
  const mainIconUrl = convertGoogleDriveUrl(config.iconUrl || '/images/logo.png');
  
  // For Google Drive URLs, use the proxy API with absolute URL
  // For relative URLs, make them absolute
  let iconUrl: string;
  if (altIconUrl) {
    if (altIconUrl.includes('drive.google.com')) {
      const fileId = getGoogleDriveFileId(altIconUrl);
      
      if (fileId) {
        // Use absolute URL for the proxy API
        iconUrl = `${siteUrl}/api/images/proxy?fileId=${encodeURIComponent(fileId)}&url=${encodeURIComponent(altIconUrl)}`;
      } else {
        // Fallback if we can't extract file ID
        iconUrl = altIconUrl.startsWith('http') ? altIconUrl : `${siteUrl}${altIconUrl}`;
        console.warn('[AdminLayout] Could not extract file ID, using fallback URL');
      }
    } else {
      // For non-Google Drive URLs, make relative URLs absolute
      iconUrl = altIconUrl.startsWith('http') ? altIconUrl : `${siteUrl}${altIconUrl}`;
    }
  } else {
    // Fall back to main icon if altIconUrl is not set
    iconUrl = mainIconUrl.startsWith('http') ? mainIconUrl : `${siteUrl}${mainIconUrl}`;
  }
  
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
