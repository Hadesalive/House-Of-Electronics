'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input, Textarea, Switch } from '@/components/ui/forms';
import { FormSection } from '@/components/ui/forms';
import { Customer } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CustomerFormProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  title?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  isActive: boolean;
}

export function CustomerForm({ 
  customer, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Add Customer" 
}: CustomerFormProps) {
  const { formatDate } = useSettings();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        isActive: customer.isActive !== false
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        isActive: true
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        isActive: formData.isActive,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <FormSection title="Basic Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Full Name *"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={errors.name}
                    placeholder="Enter customer's full name"
                  />
                </div>
                
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="customer@example.com"
                />
                
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={errors.phone}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </FormSection>

            {/* Address Information */}
            <FormSection title="Address Information">
              <Textarea
                label="Address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter full address..."
                rows={3}
              />
            </FormSection>

            {/* Additional Information */}
            <FormSection title="Additional Information">
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this customer..."
                rows={3}
              />
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    Active Customer
                  </label>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Inactive customers won&apos;t appear in customer lists by default
                  </p>
                </div>
              </div>
            </FormSection>

            {/* Customer Information Display (for edit mode) */}
            {customer && (
              <FormSection title="Customer Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>
                      Customer ID:
                    </span>
                    <span className="ml-2" style={{ color: 'var(--foreground)' }}>
                      {customer.id}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>
                      Created:
                    </span>
                    <span className="ml-2" style={{ color: 'var(--foreground)' }}>
                      {formatDate(customer.createdAt)}
                    </span>
                  </div>
                  {customer.updatedAt !== customer.createdAt && (
                    <div className="md:col-span-2">
                      <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        Last Updated:
                      </span>
                      <span className="ml-2" style={{ color: 'var(--foreground)' }}>
                        {formatDate(customer.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </FormSection>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
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
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {customer ? 'Update Customer' : 'Add Customer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
