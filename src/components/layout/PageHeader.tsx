import Link from 'next/link';
import { PublicEditLink } from './PublicEditLink';

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  editHref?: string;
}

export async function PageHeader({ title, breadcrumbs, editHref }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 text-sm text-gray-400 overflow-x-auto scrollbar-hide">
          <div className="flex items-center whitespace-nowrap min-w-max gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center flex-shrink-0">
                {crumb.href ? (
                  <Link href={crumb.href} prefetch={true} className="hover:text-purple-400 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="mx-2 text-gray-500 flex-shrink-0">/</span>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-4xl font-bold text-gray-100">{title}</h1>
        {editHref && <PublicEditLink href={editHref} />}
      </div>
    </div>
  );
}
