'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

export function Input({ className, label, error, description, id, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full px-4 py-2 border border-dark-300 bg-dark-200 text-gray-100 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all placeholder-gray-500',
          error && 'border-power-500 focus:ring-power-500',
          className
        )}
        {...props}
      />
      {description && !error && (
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-power-500">{error}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export function Select({ className, label, error, id, options, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full px-4 py-2 border border-dark-300 bg-dark-200 text-gray-100 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all',
          error && 'border-power-500 focus:ring-power-500',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-dark-200">
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-power-500">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ className, label, error, id, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full px-4 py-2 border border-dark-300 bg-dark-200 text-gray-100 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all resize-none placeholder-gray-500',
          error && 'border-power-500 focus:ring-power-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-power-500">{error}</p>
      )}
    </div>
  );
}
