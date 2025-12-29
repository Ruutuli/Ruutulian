import { ReactNode, Suspense } from 'react';
import { Navigation } from './Navigation';
import { NavigationProgress } from './NavigationProgress';

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/30" suppressHydrationWarning>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Suspense fallback={<nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 h-14 sm:h-16" />}>
        <Navigation />
      </Suspense>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8" suppressHydrationWarning>
        {children}
      </main>
    </div>
  );
}
