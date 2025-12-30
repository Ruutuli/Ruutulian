'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SiteName } from './SiteName';

interface NavigationClientProps {
  isAuthenticated: boolean;
}

export function NavigationClient({ isAuthenticated }: NavigationClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navLinks = useMemo(() => [
    { href: '/', label: 'Home', prefetch: true },
    { href: '/worlds', label: 'Worlds', prefetch: true },
    { href: '/ocs', label: 'Characters', prefetch: true },
    { href: '/lore', label: 'Lore', prefetch: true },
    { href: '/timelines', label: 'Timelines', prefetch: true },
    { href: '/calendar', label: 'Calendar', prefetch: true },
    { href: '/stats', label: 'Statistics', prefetch: true },
    { href: '/tools', label: 'Tools', prefetch: true },
    {
      href: isAuthenticated ? '/admin' : '/admin/login',
      label: isAuthenticated ? 'Admin Page' : 'Login',
      prefetch: false,
    },
  ], [isAuthenticated]);

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
              href="/"
              prefetch={true}
              className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex-shrink-0"
              onClick={closeMenu}
            >
              <SiteName />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-4 lg:space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.prefetch}
                  className="text-gray-300 hover:text-purple-400 transition-colors font-medium text-sm lg:text-base"
                >
                  {link.label}
                </Link>
              ))}
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
                  prefetch={link.prefetch}
                  onClick={closeMenu}
                  className="text-gray-300 hover:text-purple-400 hover:bg-gray-800 px-4 py-3 rounded-lg transition-colors font-medium text-lg"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
