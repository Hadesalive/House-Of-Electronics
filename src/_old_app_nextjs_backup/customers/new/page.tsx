'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button } from '@/components/ui/core';
import { FormCard, FormSection, FormActions } from '@/components/ui/forms';
import { Input, Textarea } from '@/components/ui/forms';
import { customerService } from '@/lib/services';
import { Customer } from '@/lib/types/core';
import { useRouter } from 'next/navigation';

export default function NewCustomerPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer.name.trim()) {
      alert('Customer name is required');
      return;
    }

    setLoading(true);
    
    try {
      const response = await customerService.createCustomer(customer);
      
      if (response.success) {
        alert('Customer created successfully!');
        router.push('/customers');
      } else {
        alert(`Failed to create customer: ${response.error}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof customer, value: string) => {
    setCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <FormCard title="New Customer">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormSection title="Customer Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name *"
                  value={customer.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                <Input
                  label="Phone"
                  value={customer.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Address"
                  value={customer.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={3}
                />
              </div>
            </FormSection>

            <FormActions>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Customer'}
              </Button>
            </FormActions>
          </form>
        </FormCard>
      </div>
    </AppLayout>
  );
}
