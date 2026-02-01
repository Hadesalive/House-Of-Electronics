'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNotifications, NotificationType } from '@/contexts/NotificationContext';

export function NotificationIcon() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationDotColor = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-8 w-8 rounded-md flex items-center justify-center hover:bg-opacity-10 transition-colors"
        style={{ 
          backgroundColor: isOpen ? 'rgba(0, 0, 0, 0.05)' : 'transparent'
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon className="h-4 w-4" style={{ color: 'var(--foreground)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Notification Panel */}
          <div
            className="absolute right-0 top-11 w-72 max-h-[480px] overflow-hidden rounded-xl shadow-lg z-50 flex flex-col"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}>
              <h3 className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-xs opacity-60" style={{ color: 'var(--muted-foreground)' }}>
                    No notifications
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="group px-3 py-2.5 transition-colors cursor-pointer hover:bg-black/3"
                      style={{
                        backgroundColor: !notification.read
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'transparent',
                        borderBottom: index < notifications.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                      }}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.action) {
                          notification.action.onClick();
                          setIsOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Dot indicator */}
                        <div
                          className="flex-shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getNotificationDotColor(notification.type) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4
                              className={`text-xs leading-tight ${
                                !notification.read ? 'font-semibold' : 'font-normal'
                              }`}
                              style={{ color: 'var(--foreground)' }}
                            >
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors opacity-0 group-hover:opacity-100"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                          <p
                            className="text-xs leading-relaxed mb-1.5 line-clamp-2"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              {formatTime(notification.timestamp)}
                            </span>
                            {notification.action && (
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: 'var(--muted-foreground)' }}
                              >
                                {notification.action.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.96);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

