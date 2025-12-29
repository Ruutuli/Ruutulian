import type { Metadata } from 'next';
import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { requireAuth } from '@/lib/auth/require-auth';
import { getSiteConfig } from '@/lib/config/site-config';

// Force dynamic rendering to ensure middleware and auth checks run
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const siteUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  // Use altIconUrl for admin pages if available, otherwise default to /icon-alt.png for admin pages
  const iconUrl = config.altIconUrl || '/icon-alt.png';
  
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
