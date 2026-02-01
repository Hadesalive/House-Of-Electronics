'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product } from '@/lib/types/core';
import { productService } from '@/lib/services';

export type NotificationType = 'warning' | 'info' | 'error' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate notification ID
  const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => {
      // Check if similar notification already exists (same title)
      const exists = prev.some(n => n.title === notification.title && !n.read);
      if (exists) {
        return prev;
      }
      return [newNotification, ...prev];
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Refresh notifications by checking for reminders
  const refreshNotifications = useCallback(async () => {
    try {
      // Check for products without cost
      const productsResponse = await productService.getAllProducts();
      if (productsResponse.success && productsResponse.data) {
        const productsWithoutCost = productsResponse.data.filter(
          p => p.isActive !== false && (p.cost === undefined || p.cost === null)
        );

        if (productsWithoutCost.length > 0) {
          addNotification({
            type: 'warning',
            title: 'Add Product Costs for Better Analytics',
            message: `${productsWithoutCost.length} ${productsWithoutCost.length === 1 ? 'product' : 'products'} ${productsWithoutCost.length === 1 ? 'is' : 'are'} missing cost information. Adding product costs enables accurate profit calculations, inventory valuation, and better financial reporting.`,
            action: {
              label: 'View Products',
              onClick: () => {
                window.location.href = '/products';
              },
            },
          });
        }
      }

      // Check for low stock and out of stock products
      if (productsResponse.success && productsResponse.data) {
        const lowStockProducts = productsResponse.data.filter(
          p => p.stock > 0 && p.stock <= (p.minStock || 5)
        );
        const outOfStockProducts = productsResponse.data.filter(p => p.stock === 0);

        if (outOfStockProducts.length > 0) {
          addNotification({
            type: 'error',
            title: 'Products Out of Stock',
            message: `${outOfStockProducts.length} ${outOfStockProducts.length === 1 ? 'product' : 'products'} ${outOfStockProducts.length === 1 ? 'is' : 'are'} out of stock. Consider restocking to avoid stockouts.`,
            action: {
              label: 'View Inventory',
              onClick: () => {
                window.location.href = '/inventory';
              },
            },
          });
        }

        if (lowStockProducts.length > 0) {
          addNotification({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowStockProducts.length} ${lowStockProducts.length === 1 ? 'product' : 'products'} ${lowStockProducts.length === 1 ? 'is' : 'are'} running low on stock. Consider restocking soon.`,
            action: {
              label: 'View Inventory',
              onClick: () => {
                window.location.href = '/inventory';
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [addNotification]);

  // Refresh notifications on mount and periodically
  useEffect(() => {
    refreshNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

