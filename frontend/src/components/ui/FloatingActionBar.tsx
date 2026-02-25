'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  Target, 
  Calendar, 
  Settings, 
  History, 
  Bell,
  Plus,
  FileText
} from 'lucide-react';

interface FloatingActionBarProps {
  className?: string;
}

const actions = [
  { 
    label: 'Log Today', 
    icon: Plus, 
    href: '/daily-log',
    primary: true 
  },
  { 
    label: 'Notes', 
    icon: FileText, 
    href: '/notes' 
  },
  { 
    label: 'Weekly', 
    icon: Calendar, 
    href: '/weekly-summary' 
  },
  { 
    label: 'Profile', 
    icon: Settings, 
    href: '/profile' 
  },
  { 
    label: 'History', 
    icon: History, 
    href: '/history' 
  },
  { 
    label: 'Monthly', 
    icon: Calendar, 
    href: '/monthly-metrics' 
  },
  { 
    label: 'Alerts', 
    icon: Bell, 
    href: '/notifications' 
  },
];

export function FloatingActionBar({ className = '' }: FloatingActionBarProps) {
  const router = useRouter();

  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        ${className}
      `}
    >
      <div className="
        flex items-center gap-1 sm:gap-2
        px-2 sm:px-4 py-2
        rounded-2xl
        bg-dark-100/80 backdrop-blur-md
        border border-dark-300
        shadow-2xl
        overflow-x-auto
        max-w-[calc(100vw-2rem)]
        scrollbar-hide
      ">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.primary ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => router.push(action.href)}
            className={`
              flex-shrink-0
              ${action.primary 
                ? 'bg-gold-600 hover:bg-gold-500 text-white' 
                : 'text-gray-400 hover:text-gold-400 hover:bg-dark-200'
              }
              px-3 sm:px-4
            `}
          >
            <action.icon className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5 text-xs font-medium">
              {action.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
