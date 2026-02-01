'use client';

import React from 'react';
import { Button } from '../core/button';
import { useSettings } from '@/contexts/SettingsContext';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}: ConfirmationDialogProps) {
  const { preferences } = useSettings();

  // If user has disabled confirmation dialogs, auto-confirm
  if (!isOpen || !preferences.confirmBeforeDelete) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-200'
        };
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white',
          border: 'border-orange-200'
        };
      default:
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className={`relative rounded-lg max-w-md w-full mx-4 border ${styles.border}`}
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{styles.icon}</span>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h3>
          </div>
          
          {/* Message */}
          <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
            {message}
          </p>
          
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4 py-2"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              className={`px-4 py-2 ${styles.confirmButton}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
