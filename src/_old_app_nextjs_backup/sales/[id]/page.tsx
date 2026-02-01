'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Alert, Toast } from '@/components/ui/core';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { salesService, customerService, productService } from '@/lib/services';
import { Sale, Customer, Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

interface SaleDetails {
  sale: Sale;
}

export default function SaleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const saleId = params.id as string;
  
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Removed pagination state - PaginatedTableCard handles this internally

  const loadSaleDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load sale details, customers, and products in parallel
      const [saleResponse, customersResponse, productsResponse] = await Promise.all([
        salesService.getSaleById(saleId),
        customerService.getAllCustomers(),
        productService.getAllProducts()
      ]);
      
      if (saleResponse.success && saleResponse.data) {
        const details: SaleDetails = {
          sale: saleResponse.data
        };
        
        setSaleDetails(details);
        // Pagination now handled by PaginatedTableCard component
      } else {
        setError('Sale not found');
      }

      if (customersResponse.success) {
        setCustomers(customersResponse.data || []);
      }

      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load sale details:', error);
      setError('Failed to load sale details');
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    if (saleId) {
      loadSaleDetails();
    }
  }, [saleId, loadSaleDetails]);

  const handleCreateInvoice = () => {
    if (!saleDetails?.sale) return;
    
    const sale = saleDetails.sale;
    
    // Get customer details if customerId exists
    const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
    
    // Map sale data to invoice format
    const invoiceData = {
      // Customer data
      customer: {
        id: sale.customerId,
        name: sale.customerName || customer?.name || 'Walk-in Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        city: customer?.company || '', // Using company field for city if available
        state: '',
        zip: ''
      },
      
      // Invoice details
      invoiceNumber: `INV-${sale.id.substring(0, 8).toUpperCase()}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      
      // Items mapping with actual product names
      items: sale.items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        return {
          id: `item-${index}`,
          description: product?.name || `Product ${item.productId}`,
          quantity: item.quantity,
          rate: item.unitPrice,
          amount: item.total
        };
      }),
      
      // Financial data
      taxRate: sale.tax > 0 ? (sale.tax / sale.subtotal) * 100 : 0,
      discount: sale.discount,
      
      // Additional fields
      notes: sale.notes || '',
      terms: 'Payment due within 30 days of invoice date.'
    };
    
    // Navigate to invoice creation with pre-filled data
    const queryParams = new URLSearchParams({
      fromSale: saleId,
      data: encodeURIComponent(JSON.stringify(invoiceData))
    });
    
    router.push(`/invoices/new?${queryParams.toString()}`);
  };

  const handleDeleteSale = () => {
    if (!saleDetails?.sale) return;

    confirm({
      title: 'Delete Sale',
      message: `Are you sure you want to delete this sale? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await salesService.deleteSale(saleId);
        if (response.success) {
          setToast({ message: 'Sale deleted successfully', type: 'success' });
          setTimeout(() => {
            router.push('/sales');
          }, 1000);
        } else {
          setToast({ message: response.error || 'Failed to delete sale', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete sale:', error);
        setToast({ message: 'Failed to delete sale', type: 'error' });
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
      case 'refunded':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sale details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !saleDetails) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Alert variant="error" title="Error">
              {error || 'Sale not found'}
            </Alert>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { sale } = saleDetails;

  // Prepare table data for PaginatedTableCard
  const tableColumns = [
    { key: 'product', label: 'Product' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'total', label: 'Total' }
  ];

  const tableData = sale.items.map(item => ({
    product: (
      <div>
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {item.productName}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          ID: {item.productId.substring(0, 8)}
        </div>
      </div>
    ),
    quantity: <span className="text-sm font-medium">{item.quantity}</span>,
    unitPrice: <span className="text-sm">{formatCurrency(item.unitPrice)}</span>,
    total: <span className="text-sm font-semibold">{formatCurrency(item.total)}</span>
  }));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/sales')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Sales
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {sale.invoiceId ? (
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/${sale.invoiceId}`)}
                className="flex items-center gap-2"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                <DocumentTextIcon className="h-4 w-4" />
                View Invoice
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleCreateInvoice}
                className="flex items-center gap-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Create Invoice
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/sales/${sale.id}/edit`)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteSale}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Section - Sale Info Banner */}
        <div 
          className="relative overflow-hidden rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10"></div>
          
          {/* Content */}
          <div className="relative p-8">
            <div className="flex items-center gap-6">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white border-4" style={{ borderColor: 'var(--background)' }}>
                  <CurrencyDollarIcon className="h-12 w-12" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Sale #{sale.id.substring(0, 8).toUpperCase()}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sale.status)}
                    <span 
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}
                    >
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span className="capitalize">{sale.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4" />
                    {sale.customerName || 'Walk-in Customer'}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4" />
                    {formatDate(sale.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Subtotal" 
            value={formatCurrency(sale.subtotal)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Tax" 
            value={formatCurrency(sale.tax)}
            icon={<ReceiptPercentIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Discount" 
            value={formatCurrency(sale.discount)}
            icon={<ReceiptPercentIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Total" 
            value={formatCurrency(sale.total)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sale Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Information */}
            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <UserIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                Customer Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Customer Name</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {sale.customerName || 'Walk-in Customer'}
                  </p>
                </div>
                
                {sale.customerId && (
                  <>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Customer ID</p>
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                        {sale.customerId.substring(0, 16)}...
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/customers/${sale.customerId}`)}
                      className="w-full mt-2"
                    >
                      View Customer Profile
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <CurrencyDollarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                Financial Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(sale.subtotal)}
                  </span>
                </div>
                
                {sale.discount > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Discount</span>
                    <span className="font-semibold text-green-600">
                      -{formatCurrency(sale.discount)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Tax</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(sale.tax)}
                  </span>
                </div>
                
                <div className="flex justify-between py-3">
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                Additional Details
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Payment Method</span>
                  <span style={{ color: 'var(--foreground)' }} className="capitalize font-medium">
                    {sale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Created</span>
                  <span style={{ color: 'var(--foreground)' }}>
                    {formatDate(sale.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Last Updated</span>
                  <span style={{ color: 'var(--foreground)' }}>
                    {formatDate(sale.updatedAt)}
                  </span>
                </div>
                {sale.invoiceId && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>Invoice</span>
                    <button
                      onClick={() => router.push(`/invoices/${sale.invoiceId}`)}
                      className="hover:underline font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      {sale.invoiceNumber || `INV-${sale.invoiceId.substring(0, 8)}`}
                    </button>
                  </div>
                )}
              </div>

              {sale.notes && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                    {sale.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sale Items */}
          <div className="lg:col-span-2">
            <PaginatedTableCard 
              title={`Sale Items (${sale.items.length})`}
              columns={tableColumns}
              data={tableData}
              itemsPerPage={10}
            />
          </div>
        </div>

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
