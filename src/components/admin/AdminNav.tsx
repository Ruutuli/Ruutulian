'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

interface AdminNavProps {
  userEmail: string;
}

type NavLink = { href: string; label: string };

type NavGroup = {
  label: string;
  links: NavLink[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Content',
    links: [
      { href: '/admin/worlds', label: 'Worlds' },
      { href: '/admin/ocs', label: 'OCs' },
      { href: '/admin/fanfics', label: 'Fanfics' },
      { href: '/admin/timelines', label: 'Timelines' },
      { href: '/admin/world-lore', label: 'Lore' },
    ],
  },
  {
    label: 'Writing',
    links: [
      { href: '/admin/writing-prompts', label: 'Prompts' },
      { href: '/admin/writing-prompt-responses', label: 'Responses' },
    ],
  },
  {
    label: 'Site',
    links: [
      { href: '/admin/gallery', label: 'Gallery' },
      { href: '/admin/fields', label: 'Fields' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
  {
    label: 'Insights',
    links: [
      { href: '/admin/stats', label: 'Stats' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
  },
];

function isLinkActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.links.some((link) => isLinkActive(pathname, link.href));
}

function NavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = isGroupActive(pathname, group);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 font-medium text-sm lg:text-base transition-colors ${
          active ? 'text-purple-400' : 'text-gray-300 hover:text-purple-400'
        }`}
      >
        {group.label}
        <i
          className={`fas fa-chevron-down text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                isLinkActive(pathname, link.href)
                  ? 'bg-gray-800 text-purple-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-purple-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNav({ userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link
              href="/admin"
              className="text-lg sm:text-xl font-bold text-white flex-shrink-0"
              onClick={closeMenu}
            >
              Admin Home
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-5">
              <Link
                href="/admin"
                className={`font-medium text-sm lg:text-base transition-colors ${
                  isLinkActive(pathname, '/admin')
                    ? 'text-purple-400'
                    : 'text-gray-300 hover:text-purple-400'
                }`}
              >
                Home
              </Link>
              {navGroups.map((group) => (
                <NavDropdown key={group.label} group={group} pathname={pathname} />
              ))}
              <div className="flex items-center gap-3 pl-4 lg:pl-5 border-l border-gray-700">
                <span className="text-xs lg:text-sm text-gray-400 hidden lg:inline max-w-[12rem] truncate">
                  {userEmail}
                </span>
                <SignOutButton />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={toggleMenu}
              className="md:hidden p-2 text-gray-300 hover:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <i className="fas fa-times text-2xl" aria-hidden="true"></i>
              ) : (
                <i className="fas fa-bars text-2xl" aria-hidden="true"></i>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-black/70 fade-in"
            onClick={closeMenu}
          />

          <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900 shadow-xl overflow-y-auto slide-in-from-right">
            <div className="sticky top-0 bg-gray-900 z-10 flex justify-end p-4 border-b border-gray-700">
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <i className="fas fa-times text-xl" aria-hidden="true"></i>
              </button>
            </div>

            <div className="flex flex-col px-4 py-4 space-y-4">
              <Link
                href="/admin"
                onClick={closeMenu}
                className={`px-4 py-3 rounded-lg transition-colors font-medium text-lg ${
                  isLinkActive(pathname, '/admin')
                    ? 'bg-gray-800 text-purple-400'
                    : 'text-gray-300 hover:text-purple-400 hover:bg-gray-800'
                }`}
              >
                Home
              </Link>

              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMenu}
                        className={`block px-4 py-2.5 rounded-lg transition-colors font-medium ${
                          isLinkActive(pathname, link.href)
                            ? 'bg-gray-800 text-purple-400'
                            : 'text-gray-300 hover:text-purple-400 hover:bg-gray-800'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 mt-2 border-t border-gray-700">
                <div className="px-4 py-2">
                  <div className="text-xs text-gray-500 mb-1">Signed in as</div>
                  <div className="text-sm text-gray-300 font-medium break-words">{userEmail}</div>
                </div>
                <div className="px-4 py-2">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
