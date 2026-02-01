'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { salesService, returnService } from '@/lib/services';
import { Sale, Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function SalesPage() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'customerName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const [salesRes, returnsRes] = await Promise.all([
        salesService.getAllSales(),
        returnService.getAllReturns()
      ]);
      
      if (salesRes.success && salesRes.data) {
        setSales(salesRes.data);
      } else {
        setToast({ message: 'Failed to load sales', type: 'error' });
      }

      if (returnsRes.success && returnsRes.data) {
        setReturns(returnsRes.data);
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
      setToast({ message: 'Failed to load sales', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = (saleId: string) => {
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
          loadSales();
        } else {
          setToast({ message: response.error || 'Failed to delete sale', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete sale:', error);
        setToast({ message: 'Failed to delete sale', type: 'error' });
      }
    });
  };

  const handleViewSale = (sale: Sale) => {
    router.push(`/sales/${sale.id}`);
  };

  const handleEditSale = (sale: Sale) => {
    router.push(`/sales/${sale.id}/edit`);
  };

  // Filter and sort sales
  const filteredAndSortedSales = useMemo(() => {
    const currentSales = sales || [];
    const filtered = currentSales.filter(sale => {
      const matchesSearch = !searchTerm || 
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || sale.status === statusFilter;
      const matchesPayment = !paymentMethodFilter || sale.paymentMethod === paymentMethodFilter;
      
      return matchesSearch && matchesStatus && matchesPayment;
    });

    // Sort sales
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy] || '';
      let bValue: string | number | Date = b[sortBy] || '';
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const currentSales = sales || [];
    const currentReturns = returns || [];
    
    // Calculate gross revenue from all sales
    const grossRevenue = currentSales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Calculate return impact (only completed/approved returns with cash/original_payment refunds)
    const revenueReducingReturns = currentReturns.filter(
      ret => 
        (ret.status === 'completed' || ret.status === 'approved') &&
        (ret.refundMethod === 'cash' || ret.refundMethod === 'original_payment')
    );
    const returnAmount = revenueReducingReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
    
    // Net revenue after returns (matching dashboard logic)
    const netRevenue = grossRevenue - returnAmount;
    
    const totalSales = currentSales.length;
    const pendingSales = currentSales.filter(sale => sale.status === 'pending').length;
    const completedSales = currentSales.filter(sale => sale.status === 'completed').length;
    const totalReturns = currentReturns.length;
    
    return {
      grossRevenue,
      returnAmount,
      netRevenue,
      totalSales,
      pendingSales,
      completedSales,
      totalReturns
    };
  }, [sales, returns]);

  // Table configuration
  const tableColumns = [
    { key: 'id', label: 'Sale ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'paymentMethod', label: 'Payment', sortable: false },
    { key: 'createdAt', label: 'Date', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedSales.map(sale => {
    // Check if this sale has any returns
    const saleReturns = returns.filter(ret => ret.saleId === sale.id);
    const hasReturns = saleReturns.length > 0;
    
    return {
    id: sale.id.substring(0, 8),
    customer: (
      <div className="flex items-center gap-2">
        <span>{sale.customerName || 'Walk-in Customer'}</span>
        {hasReturns && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Returned
          </span>
        )}
      </div>
    ),
    total: formatCurrency(sale.total),
    status: (
      <div className="flex items-center gap-2">
        {sale.status === 'completed' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
        {sale.status === 'pending' && <ClockIcon className="h-4 w-4 text-yellow-500" />}
        {(sale.status === 'cancelled' || sale.status === 'refunded') && <XCircleIcon className="h-4 w-4 text-red-500" />}
        <span 
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            sale.status === 'completed' 
              ? 'bg-green-100 text-green-800' 
              : sale.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
        </span>
      </div>
    ),
    paymentMethod: (
      <div className="flex items-center gap-1">
        <CurrencyDollarIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
        <span className="capitalize">{sale.paymentMethod.replace('_', ' ')}</span>
      </div>
    ),
    createdAt: formatDate(sale.createdAt),
    actions: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleViewSale(sale)}>
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleEditSale(sale)}>
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDeleteSale(sale.id)}
          className="text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
    };
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sales...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Sales
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Manage your sales transactions and revenue
            </p>
          </div>
          <Button onClick={() => router.push('/sales/new')} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Sale
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard 
            title="Net Revenue" 
            value={formatCurrency(stats.netRevenue)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Total Sales" 
            value={stats.totalSales.toString()}
            icon={<CheckCircleIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Pending Sales" 
            value={stats.pendingSales.toString()}
            icon={<ClockIcon className="h-6 w-6 text-yellow-500" />}
          />
          <KPICard 
            title="Returns" 
            value={`${stats.totalReturns} (${formatCurrency(stats.returnAmount)})`}
            icon={<XCircleIcon className="h-6 w-6 text-red-500" />}
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="Search sales by ID, customer, or payment method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="min-w-[140px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Payment</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'total' | 'customerName')}
              className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="total">Sort by Total</option>
              <option value="customerName">Sort by Customer</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>
            Showing {filteredAndSortedSales.length} of {(sales || []).length} sales
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter && ` with status "${statusFilter}"`}
            {paymentMethodFilter && ` paid via "${paymentMethodFilter}"`}
          </span>
        </div>

        {/* Sales Table */}
        <PaginatedTableCard 
          title="Sales Transactions"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          headerActions={
            <div className="flex items-center gap-2">
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {statusFilter && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {statusFilter}
                </span>
              )}
              {paymentMethodFilter && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {paymentMethodFilter}
                </span>
              )}
            </div>
          }
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

