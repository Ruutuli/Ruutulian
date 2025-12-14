'use client';

import { AdminNav } from './AdminNav';

export function AdminLayoutWrapper({ 
  children,
  userEmail 
}: { 
  children: React.ReactNode;
  userEmail: string | null;
}) {
  // Login page is now in (auth) route group, so it won't use this component
  // All pages using this wrapper are authenticated admin pages
  return (
    <div className="min-h-screen bg-gray-900">
      {userEmail && <AdminNav userEmail={userEmail} />}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
