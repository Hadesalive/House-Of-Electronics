'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../core/button';
import { Input } from '../forms/input';
import { Textarea } from '../forms/textarea';
import { useSettings } from '@/contexts/SettingsContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddStoreCreditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, reason?: string) => Promise<void>;
  currentCredit: number;
  customerName: string;
}

export function AddStoreCreditDialog({
  isOpen,
  onClose,
  onConfirm,
  currentCredit,
  customerName
}: AddStoreCreditDialogProps) {
  const { formatCurrency } = useSettings();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog is closed
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const creditAmount = parseFloat(amount);
    
    if (!amount || isNaN(creditAmount) || creditAmount <= 0) {
      setError('Please enter a valid credit amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(creditAmount, reason.trim() || undefined);
      // Form will be reset by the useEffect when isOpen changes
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add store credit');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className="relative rounded-lg max-w-md w-full mx-4 border"
        style={{ 
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Add Store Credit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
              Customer: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{customerName}</span>
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Current Balance: <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatCurrency(currentCredit)}</span>
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label 
              htmlFor="credit-amount" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Credit Amount <span className="text-red-500">*</span>
            </label>
            <Input
              id="credit-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* Reason Input (Optional) */}
          <div>
            <label 
              htmlFor="credit-reason" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Reason (Optional)
            </label>
            <Textarea
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Return refund, Customer service, Promotion, etc."
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Preview New Balance */}
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                New Balance: <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  {formatCurrency(currentCredit + parseFloat(amount))}
                </span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Adding...' : 'Add Credit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

