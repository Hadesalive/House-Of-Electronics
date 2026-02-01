'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceBuilder } from '@/components/ui/invoice';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [, setIsPreviewMode] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prefilledData, setPrefilledData] = useState<any>(undefined);

  // Handle prefilled data from sales
  useEffect(() => {
    const dataParam = searchParams.get('data');
    const fromSale = searchParams.get('fromSale');
    
    if (dataParam && fromSale) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        // Add sale reference to the prefilled data
        const enhancedData = {
          ...decodedData,
          saleId: fromSale,
          saleNumber: fromSale.substring(0, 8)
        };
        setPrefilledData(enhancedData);
        setToast({ 
          message: `Invoice data pre-filled from Sale #${fromSale.substring(0, 8)}`, 
          type: 'success' 
        });
      } catch (error) {
        console.error('Failed to parse prefilled data:', error);
        setToast({ message: 'Failed to load prefilled data', type: 'error' });
      }
    }
  }, [searchParams]);

  const handleSave = async (invoiceData: {
    invoiceNumber?: string;
    date?: string;
    dueDate?: string;
    company?: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      email: string;
      logo?: string;
    };
    customer?: {
      id?: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      email: string;
    };
    items?: Array<{
      id?: string;
      description?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
    }>;
    taxRate?: number;
    discount?: number;
    notes?: string;
    terms?: string;
  }) => {
    try {
      // Generate invoice number if not provided
      const invoiceNumber = invoiceData.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Calculate totals
      const items = invoiceData.items || [];
      const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const discountAmount = (subtotal * (invoiceData.discount || 0)) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * (invoiceData.taxRate || 0)) / 100;
      const total = taxableAmount + taxAmount;

      // Prepare customer address
      const customer = invoiceData.customer;
      const customerAddress = customer ? 
        `${customer.address}${customer.city ? ', ' + customer.city : ''}${customer.state ? ', ' + customer.state : ''}${customer.zip ? ' ' + customer.zip : ''}`.trim() 
        : '';

      // Prepare the request body
      console.log('Preparing invoice request body:', {
        saleId: prefilledData?.saleId,
        hasPrefilledData: !!prefilledData,
        invoiceNumber
      });
      
      const requestBody = {
        number: invoiceNumber,
        saleId: prefilledData?.saleId || undefined,
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
        status: 'draft',
        invoiceType: 'invoice',
        currency: 'USD',
        dueDate: invoiceData.dueDate || '',
        notes: invoiceData.notes || '',
        terms: invoiceData.terms || '',
        bankDetails: undefined,
      };

      // Use Electron IPC to create invoice
      console.log('Sending invoice to IPC:', {
        ...requestBody,
        itemsCount: requestBody.items.length
      });
      
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('create-invoice', requestBody) as {
          success: boolean;
          data?: {
            id: string;
            number: string;
            customerId?: string;
            customerName?: string;
            customerEmail?: string;
            customerAddress?: string;
            customerPhone?: string;
            items: Array<{
              id?: string;
              description?: string;
              quantity?: number;
              rate?: number;
              amount?: number;
            }>;
            subtotal: number;
            tax: number;
            discount: number;
            total: number;
            status: string;
            invoiceType: string;
            currency: string;
            dueDate?: string;
            notes?: string;
            terms?: string;
            hasOverpayment?: boolean;
            overpaymentAmount?: number;
          };
          error?: string;
          warning?: string;
        };

        if (!result.success) {
          throw new Error(result.error || 'Failed to create invoice');
        }

        const invoice = result.data;
        
        // Check for overpayment warning
        if (result.warning) {
          setToast({ message: result.warning, type: 'error' });
          
          // Still navigate but show the warning
          setTimeout(() => {
            router.push(`/invoices/${invoice?.id}?overpayment=true`);
          }, 2000);
        } else {
          setToast({ message: `Invoice ${invoice?.number} created successfully!`, type: 'success' });
          
          // Redirect to the new invoice after a short delay
          setTimeout(() => {
            router.push(`/invoices/${invoice?.id}`);
          }, 1000);
        }
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
      setToast({ message: 'Failed to save invoice', type: 'error' });
    }
  };

  const handlePreview = () => {
    setIsPreviewMode(true);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Create New Invoice
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Build and customize your invoice
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/invoices')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Invoices
          </Button>
        </div>

        {/* Invoice Builder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <InvoiceBuilder
            onSave={handleSave}
            onPreview={handlePreview}
            initialData={prefilledData}
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

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
            <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <NewInvoicePageContent />
    </Suspense>
  );
}
