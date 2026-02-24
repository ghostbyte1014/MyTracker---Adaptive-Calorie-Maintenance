'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { Notification } from '@/types';
import { 
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Flame,
  Info
} from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(filter === 'unread');
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'drift_warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'high_fatigue':
        return <Flame className="w-5 h-5 text-power-400" />;
      case 'weight_milestone':
        return <TrendingUp className="w-5 h-5 text-gold-400" />;
      case 'milestone':
        return <TrendingDown className="w-5 h-5 text-gold-400" />;
      default:
        return <Bell className="w-5 h-5 text-gold-400" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-dark-200 border-dark-300';
    
    switch (type) {
      case 'drift_warning':
        return 'bg-yellow-900/20 border-yellow-700/50';
      case 'high_fatigue':
        return 'bg-power-900/20 border-power-700/50';
      case 'weight_milestone':
      case 'milestone':
        return 'bg-gold-900/20 border-gold-700/50';
      default:
        return 'bg-dark-200 border-dark-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'drift_warning':
        return 'DRIFT WARNING';
      case 'high_fatigue':
        return 'HIGH FATIGUE';
      case 'weight_milestone':
      case 'milestone':
        return 'MILESTONE';
      default:
        return 'NOTIFICATION';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-gray-200 hover:bg-dark-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  NOTIFICATIONS
                </h1>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="border-gold-700 text-gold-400 hover:bg-gold-900/30"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' 
              ? '' 
              : 'border-gold-700 text-gold-400 hover:bg-gold-900/30'
            }
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'outline'}
            onClick={() => setFilter('unread')}
            className={filter === 'unread' 
              ? '' 
              : 'border-gold-700 text-gold-400 hover:bg-gold-900/30'
            }
          >
            <Bell className="w-4 h-4 mr-2" />
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="bg-dark-100 border-dark-200">
            <CardContent className="py-16 text-center">
              <BellOff className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {filter === 'unread' 
                  ? 'You\'re all caught up!' 
                  : 'Notifications will appear when we detect important changes in your metrics'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`${getNotificationColor(notification.type, notification.is_read)} border transition-all hover:scale-[1.01]`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      notification.is_read ? 'bg-dark-300' : 'bg-gold-900/30'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="warning" className="text-xs bg-yellow-900/50 text-yellow-400 border-yellow-700">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <h3 className={`font-bold ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      {notification.message && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-gold-400 hover:bg-dark-300"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-dark-100 border-dark-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-steel-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">How notifications work</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Notifications are automatically generated when:
                </p>
                <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Your weight drift status changes to WARNING</li>
                  <li>Your fatigue risk index exceeds 7</li>
                  <li>You hit a weight milestone (gained or lost significant weight)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
