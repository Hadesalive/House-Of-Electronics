import React, { useState, useEffect, Suspense } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceBuilder } from '@/components/ui/invoice';
import { InvoicePreview } from '@/components/ui/invoice/invoice-preview';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

function NewInvoicePageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { preferences, companySettings } = useSettings();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
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
    invoiceType?: string;
    currency?: string;
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
    taxes?: Array<{
      id: string;
      name: string;
      rate: number;
      amount: number;
    }>;
    discount?: number;
    notes?: string;
    terms?: string;
  }) => {
    try {
      console.log('InvoiceNewPage - Received invoiceType:', invoiceData.invoiceType);
      console.log('InvoiceNewPage - Received taxes:', invoiceData.taxes);
      console.log('InvoiceNewPage - Full invoiceData received:', invoiceData);
      
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
        taxes: invoiceData.taxes || [],
        discount: discountAmount,
        total: total,
        status: preferences.defaultInvoiceStatus || 'draft',
        invoiceType: invoiceData.invoiceType || 'invoice',
        currency: invoiceData.currency || companySettings.currency || 'NLe',
        dueDate: invoiceData.dueDate || '',
        notes: invoiceData.notes || '',
        terms: invoiceData.terms || '',
        bankDetails: undefined,
        // Add user info for RBAC tracking
        userId: user?.id,
        salesRepName: user?.fullName,
        salesRepId: user?.employeeId,
      };

      console.log('InvoiceNewPage - Request body invoiceType:', requestBody.invoiceType);
      console.log('InvoiceNewPage - Request body taxes:', requestBody.taxes);

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
            navigate(`/invoices/${invoice?.id}?overpayment=true`);
          }, 2000);
        } else {
          setToast({ message: `Invoice ${invoice?.number} created successfully!`, type: 'success' });
          
          // Redirect to the new invoice after a short delay
          setTimeout(() => {
            navigate(`/invoices/${invoice?.id}`);
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

  const handlePreview = (invoiceData: any) => {
    console.log('Preview data received:', invoiceData);
    console.log('Date field:', invoiceData?.date);
    console.log('DueDate field:', invoiceData?.dueDate);
    setPreviewData(invoiceData);
    setIsPreviewMode(true);
  };

  return (
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
            onClick={() => navigate('/invoices')}
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

        {/* Preview Modal */}
        {isPreviewMode && previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Invoice Preview</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode(false)}
                  className="flex items-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="overflow-auto max-h-[calc(90vh-80px)]">
                <InvoicePreview
                  data={previewData}
                  onEdit={() => setIsPreviewMode(false)}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    }>
      <NewInvoicePageContent />
    </Suspense>
  );
}
