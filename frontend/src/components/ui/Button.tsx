'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-gold-600 text-white hover:bg-gold-500': variant === 'primary',
          'bg-steel-600 text-white hover:bg-steel-500': variant === 'secondary',
          'border border-dark-400 bg-dark-200 text-gray-200 hover:bg-dark-300': variant === 'outline',
          'text-gray-400 hover:bg-dark-300 hover:text-gray-200': variant === 'ghost',
          'bg-power-600 text-white hover:bg-power-500': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
