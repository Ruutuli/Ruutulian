import { NavigationClient } from './NavigationClient';
import { checkAdminAuth } from '@/lib/auth/require-auth';
import { getSiteConfig } from '@/lib/config/site-config';

export async function Navigation() {
  const isAuthenticated = await checkAdminAuth();
  const siteConfig = await getSiteConfig();

  return (
    <NavigationClient
      isAuthenticated={isAuthenticated}
      galleryEnabled={siteConfig.galleryEnabled}
    />
  );
}
