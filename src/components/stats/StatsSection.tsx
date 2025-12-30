'use client';

import { ReactNode } from 'react';

interface StatsSectionProps {
  title: string;
  icon?: string;
  iconColor?: string;
  children: ReactNode;
  className?: string;
}

export function StatsSection({ 
  title, 
  icon, 
  iconColor = 'text-purple-400', 
  children, 
  className = '' 
}: StatsSectionProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3 border-b border-gray-700/50 pb-3">
        {icon && (
          <i className={`${icon} ${iconColor} text-2xl`}></i>
        )}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100">
          {title}
        </h2>
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}


