'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface NavigationClientProps {
  isAuthenticated: boolean;
}

export function NavigationClient({ isAuthenticated }: NavigationClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu when clicking outside or on route change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Add native click listener to button as fallback
  useEffect(() => {
    const button = menuButtonRef.current;
    if (!button) return;

    const handleNativeClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setIsMobileMenuOpen((prev) => !prev);
    };

    // Use capture phase to ensure it fires before any other listeners
    button.addEventListener('click', handleNativeClick, true);
    
    return () => {
      button.removeEventListener('click', handleNativeClick, true);
    };
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Home', prefetch: true },
    { href: '/worlds', label: 'Worlds', prefetch: true },
    { href: '/ocs', label: 'Characters', prefetch: true },
    { href: '/lore', label: 'Lore', prefetch: true },
    { href: '/timelines', label: 'Timelines', prefetch: true },
    {
      href: isAuthenticated ? '/admin' : '/admin/login',
      label: isAuthenticated ? 'Admin' : 'Login',
      prefetch: false,
    },
  ];

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link
            href="/"
            prefetch={true}
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex-shrink-0"
            onClick={closeMobileMenu}
          >
            Ruutulian
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
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleMobileMenu();
            }}
            className="md:hidden p-2 -mr-2 text-gray-300 hover:text-purple-400 active:text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg touch-manipulation relative z-[60] pointer-events-auto"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <i className="fas fa-times text-xl sm:text-2xl" aria-hidden="true"></i>
            ) : (
              <i className="fas fa-bars text-xl sm:text-2xl" aria-hidden="true"></i>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div
            className="fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-gray-900/98 backdrop-blur-md z-40 md:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto translate-x-0"
          >
            <div className="flex flex-col p-4 sm:p-6 space-y-2 sm:space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={link.prefetch}
                  onClick={closeMobileMenu}
                  className="text-gray-300 hover:text-purple-400 active:text-purple-400 active:bg-gray-800/70 transition-colors font-medium text-base sm:text-lg py-3 sm:py-4 px-4 sm:px-5 rounded-lg hover:bg-gray-800/50 touch-manipulation min-h-[44px] flex items-center"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
