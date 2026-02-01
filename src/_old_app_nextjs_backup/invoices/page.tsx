'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/app-layout';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function InvoicesPage() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    number: string;
    type: string;
    status: string;
    customerName: string;
    customerEmail: string;
    issueDate: string;
    dueDate: string;
    paidDate: string | null;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    balance: number;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'issueDate' | 'dueDate' | 'total' | 'customerName'>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load invoices using Electron IPC
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        
        // Use Electron IPC if available (production/dev)
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          console.log('Loading invoices via IPC...');
          const result = await window.electron.ipcRenderer.invoke('get-invoices') as { 
            success: boolean; 
            data?: typeof invoices; 
            error?: string 
          };
          
          if (result.success) {
            console.log('Invoices loaded via IPC:', result.data?.length || 0);
            setInvoices(result.data || []);
          } else {
            console.error('Failed to load invoices via IPC:', result.error);
            setToast({ message: result.error || 'Failed to load invoices', type: 'error' });
          }
        } else {
          console.warn('Electron IPC not available - this should not happen in production');
          setToast({ message: 'Unable to connect to database', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to load invoices:', error);
        setToast({ message: 'Failed to load invoices', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // Filter and sort invoices
  const filteredAndSortedInvoices = useMemo(() => {
    const filtered = invoices.filter(invoice => {
      const matchesSearch = !searchTerm || 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || invoice.status === statusFilter;
      const matchesType = !typeFilter || invoice.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy];
      let bValue: string | number | Date = b[sortBy];
      
      if (sortBy === 'issueDate' || sortBy === 'dueDate') {
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
  }, [invoices, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.balance, 0);
    const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.balance, 0);
    
    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue,
      pendingAmount,
      overdueAmount
    };
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this invoice?')) {
        return;
      }

      // Use Electron IPC if available
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('delete-invoice', invoiceId) as { 
          success: boolean; 
          error?: string 
        };
        
        if (result.success) {
          setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
          setToast({ message: 'Invoice deleted successfully', type: 'success' });
        } else {
          setToast({ message: result.error || 'Failed to delete invoice', type: 'error' });
        }
      } else {
        setToast({ message: 'Unable to connect to database', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      setToast({ message: 'Failed to delete invoice', type: 'error' });
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}/edit`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'draft':
        return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Table configuration
  const tableColumns = [
    { key: 'number', label: 'Invoice #', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'balance', label: 'Balance', sortable: false },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedInvoices.map(invoice => ({
    number: invoice.number,
    customer: (
      <div>
        <div className="font-medium" style={{ color: 'var(--foreground)' }}>
          {invoice.customerName}
        </div>
        <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {invoice.customerEmail}
        </div>
      </div>
    ),
    type: (
      <span className="capitalize text-sm" style={{ color: 'var(--foreground)' }}>
        {invoice.type.replace('_', ' ')}
      </span>
    ),
    status: (
      <div className="flex items-center gap-2">
        {getStatusIcon(invoice.status)}
        <span 
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
        >
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>
    ),
    total: formatCurrency(invoice.total),
    balance: invoice.balance > 0 ? formatCurrency(invoice.balance) : (
      <span className="text-green-600 font-medium">Paid</span>
    ),
    dueDate: formatDate(invoice.dueDate),
    actions: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice.id)}>
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice.id)}>
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Link href={`/invoices/${invoice.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDeleteInvoice(invoice.id)}
          className="text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Invoices
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Manage your invoices and billing
            </p>
          </div>
          <Button onClick={() => router.push('/invoices/new')} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard 
            title="Total Revenue" 
            value={formatCurrency(stats.totalRevenue)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Paid Invoices" 
            value={stats.paidInvoices.toString()}
            icon={<CheckCircleIcon className="h-6 w-6 text-green-500" />}
          />
          <KPICard 
            title="Pending Amount" 
            value={formatCurrency(stats.pendingAmount)}
            icon={<ClockIcon className="h-6 w-6 text-yellow-500" />}
          />
          <KPICard 
            title="Overdue Amount" 
            value={formatCurrency(stats.overdueAmount)}
            icon={<XCircleIcon className="h-6 w-6 text-red-500" />}
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="Search invoices by number, customer, or email..."
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
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-w-[140px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="standard">Standard</option>
              <option value="proforma">Proforma</option>
              <option value="credit_note">Credit Note</option>
              <option value="debit_note">Debit Note</option>
              <option value="quote">Quote</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'issueDate' | 'dueDate' | 'total' | 'customerName')}
              className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="issueDate">Sort by Issue Date</option>
              <option value="dueDate">Sort by Due Date</option>
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
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter && ` with status "${statusFilter}"`}
            {typeFilter && ` of type "${typeFilter}"`}
          </span>
        </div>

        {/* Invoices Table */}
        <PaginatedTableCard 
          title="All Invoices"
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
              {typeFilter && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {typeFilter}
                </span>
              )}
            </div>
          }
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
