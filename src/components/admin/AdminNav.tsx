'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SignOutButton } from './SignOutButton';

interface AdminNavProps {
  userEmail: string;
}

export function AdminNav({ userEmail }: AdminNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/admin', label: 'Home' },
    { href: '/admin/worlds', label: 'Worlds' },
    { href: '/admin/ocs', label: 'OCs' },
    { href: '/admin/fanfics', label: 'Fanfics' },
    { href: '/admin/timelines', label: 'Timelines' },
    { href: '/admin/world-lore', label: 'Lore' },
    { href: '/admin/writing-prompts', label: 'Prompts' },
    { href: '/admin/writing-prompt-responses', label: 'Responses' },
    { href: '/admin/fields', label: 'Fields' },
    { href: '/admin/stats', label: 'Stats' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when menu is open
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

  // Close menu on Escape key
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
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:text-purple-400 transition-colors font-medium text-sm lg:text-base"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 pl-4 lg:pl-6 border-l border-gray-700">
                <span className="text-xs lg:text-sm text-gray-400 hidden lg:inline">
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 fade-in"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900 shadow-xl overflow-y-auto slide-in-from-right">
            {/* Close Button */}
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
            
            <div className="flex flex-col px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="text-gray-300 hover:text-purple-400 hover:bg-gray-800 px-4 py-3 rounded-lg transition-colors font-medium text-lg"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-gray-700">
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
