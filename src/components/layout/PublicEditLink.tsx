import Link from 'next/link';
import { checkAdminAuth } from '@/lib/auth/require-auth';

const editLinkClassName =
  'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition-colors border border-amber-400/30 hover:border-amber-400/50 flex-shrink-0';

interface PublicEditLinkProps {
  href: string;
  className?: string;
  label?: string;
}

export async function PublicEditLink({
  href,
  className,
  label = 'Edit',
}: PublicEditLinkProps) {
  const isAuthenticated = await checkAdminAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={className ?? editLinkClassName}
    >
      <i className="fas fa-pen text-xs" aria-hidden="true" />
      {label}
    </Link>
  );
}
