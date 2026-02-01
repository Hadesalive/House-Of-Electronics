'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { Customer } from '@/lib/types/core';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CompactCustomerFormProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function CompactCustomerForm({ 
  customer, 
  isOpen, 
  onClose, 
  onSave
}: CompactCustomerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        isActive: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg w-full max-w-sm border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {customer ? 'Edit Customer' : 'New Customer'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-0.5 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
            error={errors.name}
            placeholder="Customer name"
            className="text-xs"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone"
              className="text-xs"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              placeholder="Email"
              className="text-xs"
            />
          </div>
          
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Address (optional)"
            className="text-xs"
          />

          {/* Minimal Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs py-1.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-xs py-1.5"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast, white)'
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

