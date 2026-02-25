'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  Plus,
  FileText,
  ChevronDown,
  Calendar,
  Settings,
  History,
  Bell,
  BarChart3,
  Menu,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { 
    label: 'Log', 
    href: '/daily-log',
    icon: Plus 
  },
  { 
    label: 'Notes', 
    href: '/notes',
    icon: FileText 
  },
  { 
    label: 'Reports', 
    icon: BarChart3,
    children: [
      { label: 'Weekly', href: '/weekly-summary', icon: Calendar },
      { label: 'Monthly', href: '/monthly-metrics', icon: Calendar },
    ]
  },
  { 
    label: 'More', 
    icon: Menu,
    children: [
      { label: 'Profile', href: '/profile', icon: Settings },
      { label: 'History', href: '/history', icon: History },
      { label: 'Alerts', href: '/notifications', icon: Bell },
    ]
  },
];

// Icons only for non-dashboard pages
const iconOnlyNavItems = [
  { label: 'Log', href: '/daily-log', icon: Plus },
  { label: 'Notes', href: '/notes', icon: FileText },
  { label: 'Weekly', href: '/weekly-summary', icon: Calendar },
  { label: 'Monthly', href: '/monthly-metrics', icon: Calendar },
  { label: 'Profile', href: '/profile', icon: Settings },
  { label: 'History', href: '/history', icon: History },
  { label: 'Alerts', href: '/notifications', icon: Bell },
];

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDashboard = pathname === '/dashboard';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdowns([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => 
      prev.includes(label) 
        ? prev.filter(d => d !== label)
        : [label]
    );
  };

  const handleNavigate = (href?: string) => {
    if (href) {
      router.push(href);
    }
    setOpenDropdowns([]);
  };

  const isActive = (href?: string) => href && pathname === href;

  // If on dashboard, show full bottom navigation bar with dropdowns
  if (isDashboard) {
    return (
      <div 
        ref={dropdownRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="
          flex items-center gap-1
          px-4 py-2
          rounded-2xl
          bg-dark-100/80 backdrop-blur-md
          border border-dark-300
          shadow-2xl
        ">
          {navItems.map((item) => (
            <div key={item.label} className="relative">
              {item.children ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDropdown(item.label)}
                    className={cn(
                      "flex items-center gap-1 text-gray-300 hover:text-gold-400 hover:bg-dark-300",
                      (item.children.some(c => c.href && isActive(c.href))) && "text-gold-400 bg-dark-300"
                    )}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    <span className="text-xs font-medium">{item.label}</span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform",
                      openDropdowns.includes(item.label) && "rotate-180"
                    )} />
                  </Button>
                  
                  {openDropdowns.includes(item.label) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 w-36 bg-dark-100 border border-dark-300 rounded-xl shadow-2xl overflow-hidden">
                      {item.children.map((child) => (
                        <button
                          key={child.label}
                          onClick={() => handleNavigate(child.href)}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors",
                            isActive(child.href) 
                              ? "bg-gold-600/20 text-gold-400" 
                              : "text-gray-300 hover:bg-dark-300 hover:text-gold-400"
                          )}
                        >
                          {child.icon && <child.icon className="w-4 h-4" />}
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "flex items-center gap-1 text-gray-300 hover:text-gold-400 hover:bg-dark-300",
                    isActive(item.href) && "text-gold-400 bg-dark-300"
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For non-dashboard pages, show floating icon that expands on hover - ICONS ONLY
  return (
    <div 
      ref={dropdownRef}
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={cn(
        "flex items-center gap-1 bg-dark-100/90 backdrop-blur-md border border-dark-300 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300",
        isExpanded ? "px-3 py-2" : "px-3 py-2"
      )}>
        {/* Menu Icon */}
        <button className="flex items-center gap-1 text-gold-400 hover:text-gold-300 p-1">
          <Menu className="w-5 h-5" />
        </button>

        {/* Expanded Navigation - ICONS ONLY, no text */}
        <div className={cn(
          "flex items-center gap-1 overflow-hidden transition-all duration-300",
          isExpanded ? "max-w-[280px] opacity-100 ml-1" : "max-w-0 opacity-0"
        )}>
          {/* All navigation items shown as icons only without text */}
          {iconOnlyNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isActive(item.href) 
                  ? "bg-gold-600/20 text-gold-400" 
                  : "text-gray-400 hover:text-gold-400 hover:bg-dark-300"
              )}
              title={item.label}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-dark-400 mx-1"></div>
          
          {/* Home Button */}
          <button
            onClick={() => handleNavigate('/dashboard')}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gold-600 transition-colors"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
