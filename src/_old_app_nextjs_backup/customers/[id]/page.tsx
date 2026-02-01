/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast, Alert } from '@/components/ui/core';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import { CustomerForm } from '@/components/ui/forms/customer-form';
import { useSettings } from '@/contexts/SettingsContext';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { customerService, salesService } from '@/lib/services';
import { Customer } from '@/lib/types/core';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  CalendarIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface CustomerDetails {
  customer: Customer;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Array<{
    id: string;
    number: string;
    issueDate: string;
    total: number;
    status: string;
    customerId: string | null;
  }>>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [customerSales, setCustomerSales] = useState<Array<{
    id: string;
    createdAt: string;
    total: number;
    status: string;
    customerId?: string;
    customerName?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    paymentMethod: string;
    notes?: string;
  }>>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();

  const loadCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await customerService.getCustomerById(customerId);
      
      if (response.success && response.data) {
        const customer = response.data;
        
        // Fetch sales data for this customer
        const salesResponse = await salesService.getAllSales();
        let totalOrders = 0;
        let totalSpent = 0;
        let lastOrderDate: string | null = null;
        
        if (salesResponse.success && salesResponse.data) {
          const customerSales = salesResponse.data.filter(sale => sale.customerId === customerId);
          totalOrders = customerSales.length;
          totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
          
          if (customerSales.length > 0) {
            // Get the most recent sale date
            const sortedSales = customerSales.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            lastOrderDate = sortedSales[0].createdAt;
          }
        }
        
        const details: CustomerDetails = {
          customer,
          totalOrders,
          totalSpent,
          lastOrderDate
        };
        
        setCustomerDetails(details);
      } else {
        setError('Customer not found');
      }
    } catch (error) {
      console.error('Failed to load customer details:', error);
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const loadCustomerInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      
      // Use Electron IPC to fetch all invoices
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('get-invoices') as {
          success: boolean;
          data?: Array<{
            id: string;
            number: string;
            issueDate: string;
            total: number;
            status: string;
            customerId: string | null;
          }>;
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch invoices');
        }
        
        const allInvoices = result.data || [];
        
        // Filter invoices for this customer
        const customerInvs = allInvoices.filter((inv) => inv.customerId === customerId);
        
        setCustomerInvoices(customerInvs);
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to load customer invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  }, [customerId]);

  const loadCustomerSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      
      const salesResponse = await salesService.getAllSales();
      
      if (salesResponse.success && salesResponse.data) {
        const customerSalesData = salesResponse.data.filter(sale => sale.customerId === customerId);
        setCustomerSales(customerSalesData);
      }
    } catch (error) {
      console.error('Failed to load customer sales:', error);
    } finally {
      setLoadingSales(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadCustomerDetails();
      loadCustomerInvoices();
      loadCustomerSales();
    }
  }, [customerId, loadCustomerDetails, loadCustomerInvoices, loadCustomerSales]);

  const handleEditCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await customerService.updateCustomer(customerId, customerData);
      if (response.success) {
        await loadCustomerDetails(); // Reload customer details
        setShowEditForm(false);
        setToast({ message: 'Customer updated successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
      setToast({ message: 'Failed to update customer', type: 'error' });
    }
  };

  const handleDeleteCustomer = () => {
    if (!customerDetails?.customer) return;

    confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customerDetails.customer.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await customerService.deleteCustomer(customerId);
        if (response.success) {
          setToast({ message: 'Customer deleted successfully', type: 'success' });
          setTimeout(() => {
            router.push('/customers');
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to delete customer:', error);
        setToast({ message: 'Failed to delete customer', type: 'error' });
      }
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p style={{ color: 'var(--muted-foreground)' }}>Loading customer details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !customerDetails) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/customers')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Customers
            </Button>
          </div>
          
          <Alert variant="error" title="Error">
            {error || 'Customer not found'}
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const { customer } = customerDetails;

  // Prepare invoice table data
  const invoiceTableColumns = [
    { key: 'number', label: 'Invoice Number' },
    { key: 'date', label: 'Date' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const invoiceTableData = customerInvoices.map(invoice => ({
    number: (
      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
        {invoice.number}
      </div>
    ),
    date: (
      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {formatDate(invoice.issueDate)}
      </div>
    ),
    total: (
      <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {formatCurrency(invoice.total)}
      </div>
    ),
    status: (
      <span className={`text-xs px-2 py-1 rounded-full ${
        invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
        invoice.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      }`}>
        {invoice.status}
      </span>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/invoices/${invoice.id}`)}
      >
        View
      </Button>
    )
  }));

  // Prepare sales table data
  const salesTableColumns = [
    { key: 'saleId', label: 'Sale ID' },
    { key: 'date', label: 'Date' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const salesTableData = customerSales.map(sale => ({
    saleId: (
      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
        #{sale.id.substring(0, 8)}
      </div>
    ),
    date: (
      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {formatDate(sale.createdAt)}
      </div>
    ),
    items: (
      <div className="text-sm" style={{ color: 'var(--foreground)' }}>
        {sale.items.length} items
      </div>
    ),
    total: (
      <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {formatCurrency(sale.total)}
      </div>
    ),
    status: (
      <span className={`text-xs px-2 py-1 rounded-full ${
        sale.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
        'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
      }`}>
        {sale.status}
      </span>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/sales/${sale.id}`)}
      >
        View
      </Button>
    )
  }));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/customers')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Customers
          </Button>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push(`/sales/new?customerId=${customerId}`)}
              className="flex items-center gap-2"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              New Sale
            </Button>
            <Button
              onClick={() => router.push(`/invoices/new?customerId=${customerId}`)}
              className="flex items-center gap-2"
            >
              <DocumentTextIcon className="h-4 w-4" />
              New Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteCustomer}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Section - Customer Info Banner */}
        <div 
          className="relative overflow-hidden rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
          
          {/* Content */}
          <div className="relative p-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name}
                    className="h-24 w-24 rounded-full object-cover border-4"
                    style={{ borderColor: 'var(--background)' }}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  {customer.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4" />
                    Customer since {formatDate(customer.createdAt)}
                  </div>
                  {customer.company && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        {customer.company}
                      </div>
                    </>
                  )}
                  {customer.email && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <EnvelopeIcon className="h-4 w-4" />
                        {customer.email}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Total Orders" 
            value={customerDetails.totalOrders.toString()}
            icon={<ShoppingBagIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Total Spent" 
            value={formatCurrency(customerDetails.totalSpent)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Last Order" 
            value={customerDetails.lastOrderDate ? formatDate(customerDetails.lastOrderDate) : 'No orders'}
            icon={<CalendarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Store Credit" 
            value={formatCurrency(customer.storeCredit || 0)}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-green-500" />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <EnvelopeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                Contact Information
              </h2>
              
              <div className="space-y-4">
                {customer.email && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</p>
                    <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                      {customer.email}
                    </p>
                  </div>
                )}

                {customer.phone && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</p>
                    <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                      {customer.phone}
                    </p>
                  </div>
                )}

                {customer.address && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Address</p>
                    <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                      {customer.address}
                    </p>
                  </div>
                )}

                {!customer.email && !customer.phone && !customer.address && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
                    No contact information available
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div 
                className="p-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                  <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  Notes
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  {customer.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Activity History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice History */}
            {loadingInvoices ? (
              <div 
                className="p-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading invoices...</p>
                </div>
              </div>
            ) : customerInvoices.length === 0 ? (
              <div 
                className="p-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 mb-3" style={{ color: 'var(--muted-foreground)' }} />
                  <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    No invoices yet
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                    This customer doesn&apos;t have any invoices yet.
                  </p>
                  <Button
                    onClick={() => router.push(`/invoices/new?customerId=${customerId}`)}
                    size="sm"
                  >
                    Create Invoice
                  </Button>
                </div>
              </div>
            ) : (
              <PaginatedTableCard
                title={`Invoice History (${customerInvoices.length})`}
                columns={invoiceTableColumns}
                data={invoiceTableData}
                itemsPerPage={5}
              />
            )}

            {/* Sales History */}
            {loadingSales ? (
              <div 
                className="p-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading sales...</p>
                </div>
              </div>
            ) : customerSales.length === 0 ? (
              <div 
                className="p-6 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="text-center py-12">
                  <ShoppingBagIcon className="mx-auto h-12 w-12 mb-3" style={{ color: 'var(--muted-foreground)' }} />
                  <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                    No sales yet
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                    This customer hasn&apos;t made any purchases yet.
                  </p>
                  <Button
                    onClick={() => router.push(`/sales/new?customerId=${customerId}`)}
                    size="sm"
                  >
                    Create Sale
                  </Button>
                </div>
              </div>
            ) : (
              <PaginatedTableCard
                title={`Sales History (${customerSales.length})`}
                columns={salesTableColumns}
                data={salesTableData}
                itemsPerPage={5}
              />
            )}
          </div>
        </div>

        {/* Toast Notifications */}
        {toast && (
          <Toast
            title={toast.message}
            variant={toast.type === 'success' ? 'success' : 'error'}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}

        {/* Edit Customer Form Modal */}
        <CustomerForm
          customer={customer}
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSave={handleEditCustomer}
          title="Edit Customer"
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      </div>
    </AppLayout>
  );
}
