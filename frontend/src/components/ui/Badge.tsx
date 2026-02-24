'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-dark-300 text-gray-200': variant === 'default',
          'bg-gold-900/50 text-gold-400 border border-gold-700': variant === 'success',
          'bg-yellow-900/50 text-yellow-400 border border-yellow-700': variant === 'warning',
          'bg-power-900/50 text-power-400 border border-power-700': variant === 'danger',
          'bg-steel-800/50 text-steel-400 border border-steel-600': variant === 'info',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
