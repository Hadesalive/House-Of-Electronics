'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceBuilder } from '@/components/ui/invoice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Default invoice data structure
const getDefaultInvoiceData = (): {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  notes: string;
  terms: string;
  taxRate: number;
  discount: number;
} => ({
  invoiceNumber: 'INV-2024-001',
  date: '2024-01-15',
  dueDate: '2024-02-15',
  company: {
    name: "TopNotch Electronics",
    address: "123 Business St",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    phone: "+1 (555) 123-4567",
    email: "info@topnotch.com",
    website: "",
    logo: ""
  },
  customer: {
    name: "Acme Corporation",
    address: "123 Business Ave, Suite 100",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    phone: "+1 (555) 987-6543",
    email: "billing@acme.com"
  },
  items: [
    {
      id: "1",
      description: "Website Development",
      quantity: 1,
      rate: 2000,
      amount: 2000
    },
    {
      id: "2",
      description: "SEO Optimization",
      quantity: 1,
      rate: 500,
      amount: 500
    }
  ],
  notes: "Thank you for your business!",
  terms: "Payment due within 30 days of invoice date.",
  taxRate: 8.5,
  discount: 0
});

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  
  const invoiceId = params.id as string;
  const [invoiceData, setInvoiceData] = useState(getDefaultInvoiceData());
  const [loading, setLoading] = useState(false);
  const [, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadInvoiceData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron not available');
      }
      
      const result = await window.electron.ipcRenderer.invoke('get-invoice-by-id', invoiceId) as {
        success: boolean;
        data?: unknown;
        error?: string;
      };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load invoice');
      }
      
      const invoice = result.data as {
        id: string;
        number: string;
        customerId?: string;
        customerName: string;
        customerEmail: string;
        customerAddress: string;
        customerPhone: string;
        issueDate: string;
        dueDate: string;
        invoiceType: "invoice" | "proforma" | "quote" | "credit_note" | "debit_note";
        currency: string;
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
        paidAmount: number;
        balance: number;
        status: "draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled";
        items: Array<{
          id: string;
          description: string;
          quantity: number;
          rate: number;
          amount: number;
        }>;
        notes?: string;
        terms?: string;
        bankDetails?: {
          bankName: string;
          accountName?: string;
          accountNumber: string;
          routingNumber?: string;
          swiftCode?: string;
        };
        createdAt: string;
        updatedAt: string;
      };
      
      // Transform API data to InvoiceBuilder format
      const customerAddressParts = (invoice.customerAddress || '').split(',').map((s: string) => s.trim());
      
      setInvoiceData({
        invoiceNumber: invoice.number,
        date: invoice.createdAt.split('T')[0],
        dueDate: invoice.dueDate || '',
        company: {
          name: "TopNotch Electronics",
          address: "123 Business St",
          city: "Freetown",
          state: "Western Area Urban, BO etc",
          zip: "94105",
          phone: "+232 74 123-4567",
          email: "info@topnotch.com",
          website: "",
          logo: ""
        },
        customer: {
          name: invoice.customerName || '',
          email: invoice.customerEmail || '',
          address: customerAddressParts[0] || '',
          city: customerAddressParts[1] || '',
          state: customerAddressParts[2] || '',
          zip: customerAddressParts[3] || '',
          phone: invoice.customerPhone || ''
        },
        items: invoice.items || [],
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        taxRate: invoice.tax && invoice.subtotal ? (invoice.tax / (invoice.subtotal - (invoice.discount || 0))) * 100 : 0,
        discount: invoice.discount && invoice.subtotal ? (invoice.discount / invoice.subtotal) * 100 : 0
      });
    } catch (error) {
      console.error('Failed to load invoice:', error);
      setToast({ message: 'Failed to load invoice data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoiceData();
  }, [loadInvoiceData]);

  const handleSave = async (updatedInvoiceData: {
    invoiceNumber?: string;
    date?: string;
    dueDate?: string;
    company?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
      email?: string;
      website?: string;
    };
    customer?: {
      id?: string;
      name?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
    };
    items?: Array<{
      id?: string;
      description?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
    }>;
    notes?: string;
    terms?: string;
    taxRate?: number;
    discount?: number;
  }) => {
    try {
      setSaving(true);
      
      // Calculate totals
      const items = updatedInvoiceData.items || [];
      const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const discountAmount = (subtotal * (updatedInvoiceData.discount || 0)) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * (updatedInvoiceData.taxRate || 0)) / 100;
      const total = taxableAmount + taxAmount;

      // Prepare customer address
      const customer = updatedInvoiceData.customer;
      const customerAddress = customer ? 
        `${customer.address || ''}${customer.city ? ', ' + customer.city : ''}${customer.state ? ', ' + customer.state : ''}${customer.zip ? ' ' + customer.zip : ''}`.trim() 
        : '';

      // Prepare the request body
      const requestBody = {
        number: updatedInvoiceData.invoiceNumber,
        customerId: customer?.id || undefined,
        customerName: customer?.name || '',
        customerEmail: customer?.email || '',
        customerAddress: customerAddress,
        customerPhone: customer?.phone || '',
        items: items,
        subtotal: subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total: total,
        dueDate: updatedInvoiceData.dueDate || '',
        notes: updatedInvoiceData.notes || '',
        terms: updatedInvoiceData.terms || '',
      };

      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron not available');
      }
      
      const result = await window.electron.ipcRenderer.invoke('update-invoice', {
        id: invoiceId,
        body: requestBody
      }) as {
        success: boolean;
        data?: unknown;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to update invoice');
      }
      
      setToast({ message: 'Invoice updated successfully!', type: 'success' });
      
      // Redirect to invoice details after a short delay
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to update invoice:', error);
      setToast({ message: 'Failed to update invoice', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setToast({ message: 'Invoice preview updated', type: 'success' });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoice...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Edit Invoice {invoiceData.invoiceNumber}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Modify invoice details and items
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/invoices/${invoiceId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Invoice
          </Button>
        </div>

        {/* Invoice Builder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <InvoiceBuilder
            initialData={invoiceData}
            onSave={handleSave}
            onPreview={handlePreview}
            className="p-6"
          />
        </div>

        {/* Toast Notifications */}
        {toast && (
          <Toast
            title={toast.message}
            variant={toast.type}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}
      </div>
    </AppLayout>
  );
}
