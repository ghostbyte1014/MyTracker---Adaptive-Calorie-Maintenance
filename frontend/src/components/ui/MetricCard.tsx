'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  badge?: { label: string; variant?: 'success' | 'warning' | 'default' };
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  iconColor,
  trend,
  trendValue,
  badge,
  children,
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={`
        stat-card relative overflow-hidden
        transition-all duration-300 ease-in-out
        ${isHovered ? 'scale-105 shadow-xl shadow-gold-900/20 z-10' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(!isHovered)}
    >
      <CardContent className="pt-4">
        {/* Icon and Title - Always visible */}
        <div className={`flex items-center gap-2 ${iconColor} mb-2`}>
          <Icon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest opacity-70">
            {title}
          </span>
        </div>

        {/* Main Value - Always visible */}
        <p className="text-2xl font-bold text-white">
          {value}
        </p>

        {/* Expanded Content - Only on hover */}
        <div
          className={`
            transition-all duration-300 ease-in-out
            ${isHovered ? 'opacity-100 max-h-40 mt-2' : 'opacity-0 max-h-0 mt-0'}
            overflow-hidden
          `}
        >
          {/* Subtext */}
          {subtext && (
            <p className="text-xs text-gray-400 mt-1">
              {subtext}
            </p>
          )}

          {/* Trend indicator */}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && (
                <svg className="w-3 h-3 text-power-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-3 h-3 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend === 'stable' && (
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              <span className={`text-xs ${
                trend === 'up' ? 'text-power-400' : 
                trend === 'down' ? 'text-gold-400' : 
                'text-gray-500'
              }`}>
                {trendValue}
              </span>
            </div>
          )}

          {/* Badge */}
          {badge && (
            <div className="mt-2">
              <span className={`
                text-xs px-2 py-1 rounded-full font-medium
                ${badge.variant === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : ''}
                ${badge.variant === 'warning' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' : ''}
                ${!badge.variant || badge.variant === 'default' ? 'bg-gray-700/50 text-gray-400 border border-gray-600' : ''}
              `}>
                {badge.label}
              </span>
            </div>
          )}

          {/* Additional children content */}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
