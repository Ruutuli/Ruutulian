import { AdminLayoutWrapper } from '@/components/admin/AdminLayoutWrapper';
import { requireAuth } from '@/lib/auth/require-auth';

// Force dynamic rendering to ensure middleware and auth checks run
export const dynamic = 'force-dynamic';

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
