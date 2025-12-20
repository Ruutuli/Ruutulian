'use client';

import { useState, useEffect } from 'react';

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-br from-purple-600/90 to-purple-700/90 hover:from-purple-500/90 hover:to-purple-600/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-purple-400/50 backdrop-blur-sm"
      aria-label="Back to top"
    >
      <i className="fas fa-arrow-up text-xl"></i>
    </button>
  );
}



















