import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { PaginatedTableCard } from '@/components/ui/dashboard/table-card';
import { KPICard } from '@/components/ui/dashboard/kpi-card';
import { returnService } from '@/lib/services';
import { Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function ReturnsPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refundMethodFilter, setRefundMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const response = await returnService.getAllReturns();
      if (response.success && response.data) {
        setReturns(response.data);
      } else {
        setToast({ message: response.error || 'Failed to load returns', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading returns:', error);
      setToast({ message: 'Failed to load returns', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('Are you sure you want to delete this return?')) return;

    try {
      const response = await returnService.deleteReturn(returnId);
      if (response.success) {
        setToast({ message: 'Return deleted successfully', type: 'success' });
        loadReturns();
      } else {
        setToast({ message: response.error || 'Failed to delete return', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      setToast({ message: 'Failed to delete return', type: 'error' });
    }
  };

  const handleCreateCreditNote = (returnData: Return) => {
    // Navigate to invoice builder with credit note pre-filled
    const creditNoteData = {
      invoiceType: 'credit_note',
      customer: {
        name: returnData.customerName || 'Unknown Customer',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
      },
      items: returnData.items.map(item => ({
        id: `item_${Date.now()}_${Math.random()}`,
        description: item.productName,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: item.total,
      })),
      notes: `Credit note for return #${returnData.returnNumber}\nReason: ${returnData.reason}`,
      terms: 'This credit note can be used for future purchases or refunded as store credit.',
      taxRate: 0, // Credit notes typically don't have tax
      discount: 0,
      total: returnData.refundAmount,
      subtotal: returnData.refundAmount,
      tax: 0,
    };

    // Store the credit note data in sessionStorage for the invoice builder
    sessionStorage.setItem('creditNoteData', JSON.stringify(creditNoteData));
    navigate('/invoices/new');
  };

  const filteredAndSortedReturns = useMemo(() => {
    const currentReturns = returns || [];
    
    const filtered = currentReturns.filter(returnItem => {
      const matchesSearch =
        returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        returnItem.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        returnItem.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
      const matchesRefundMethod = refundMethodFilter === 'all' || returnItem.refundMethod === refundMethodFilter;

      return matchesSearch && matchesStatus && matchesRefundMethod;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.refundAmount - a.refundAmount;
        case 'customer':
          return (a.customerName || '').localeCompare(b.customerName || '');
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [returns, searchTerm, statusFilter, refundMethodFilter, sortBy]);

  const stats = useMemo(() => {
    const currentReturns = returns || [];
    return {
      total: currentReturns.length,
      pending: currentReturns.filter(r => r.status === 'pending').length,
      approved: currentReturns.filter(r => r.status === 'approved').length,
      completed: currentReturns.filter(r => r.status === 'completed').length,
      totalRefunded: currentReturns
        .filter(r => r.status === 'completed' || r.status === 'approved')
        .reduce((sum, r) => sum + r.refundAmount, 0)
    };
  }, [returns]);

  const getStatusBadgeColor = (status: Return['status']) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#fef3c7', color: '#92400e' }; // yellow
      case 'approved': return { backgroundColor: '#dbeafe', color: '#1e40af' }; // blue
      case 'completed': return { backgroundColor: '#dcfce7', color: '#166534' }; // green
      case 'rejected': return { backgroundColor: '#fee2e2', color: '#991b1b' }; // red
      default: return { backgroundColor: '#f3f4f6', color: '#374151' }; // gray
    }
  };

  const getRefundMethodBadgeColor = (method: Return['refundMethod']) => {
    switch (method) {
      case 'store_credit': return { backgroundColor: '#f3e8ff', color: '#6b21a8' }; // purple
      case 'cash': return { backgroundColor: '#dcfce7', color: '#166534' }; // green
      case 'original_payment': return { backgroundColor: '#dbeafe', color: '#1e40af' }; // blue
      case 'exchange': return { backgroundColor: '#fed7aa', color: '#9a3412' }; // orange
      default: return { backgroundColor: '#f3f4f6', color: '#374151' }; // gray
    }
  };

  const tableColumns = [
    { key: 'returnNumber', label: 'Return #', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'refundAmount', label: 'Refund Amount', sortable: true },
    { key: 'refundMethod', label: 'Refund Method', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'date', label: 'Date', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedReturns.map(returnItem => ({
    id: returnItem.id,
    returnNumber: returnItem.returnNumber,
    customer: returnItem.customerName || 'N/A',
    refundAmount: formatCurrency(returnItem.refundAmount),
    refundMethod: (
      <span 
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={getRefundMethodBadgeColor(returnItem.refundMethod)}
      >
        {returnItem.refundMethod.replace('_', ' ').charAt(0).toUpperCase() + returnItem.refundMethod.replace('_', ' ').slice(1)}
      </span>
    ),
    status: (
      <span 
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={getStatusBadgeColor(returnItem.status)}
      >
        {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
      </span>
    ),
    date: formatDate(returnItem.createdAt),
    actions: (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/returns/${returnItem.id}`)}
        >
          View
        </Button>
        {(returnItem.status === 'completed' || returnItem.status === 'approved') && returnItem.refundMethod === 'store_credit' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCreateCreditNote(returnItem)}
            className="flex items-center gap-1"
          >
            <DocumentTextIcon className="h-4 w-4" />
            Credit Note
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDeleteReturn(returnItem.id)}
        >
          Delete
        </Button>
      </div>
    )
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Returns</h1>
            <p className="text-muted-foreground mt-1">
              Manage product returns and refunds
            </p>
          </div>
          <Button onClick={() => navigate('/returns/new')}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Return
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Returns"
            value={stats.total}
            icon={<ArrowPathIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
            accentColor="#ef4444"
          />

          <KPICard
            title="Pending"
            value={stats.pending}
            icon={<ClockIcon className="h-8 w-8 text-yellow-500" />}
            accentColor="#eab308"
          />

          <KPICard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircleIcon className="h-8 w-8 text-green-500" />}
            accentColor="#22c55e"
          />

          <KPICard
            title="Total Refunded"
            value={formatCurrency(stats.totalRefunded)}
            icon={<CurrencyDollarIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
            accentColor="#3b82f6"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by return number, customer, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'completed', label: 'Completed' }
            ]}
          />

          <Select
            value={refundMethodFilter}
            onChange={(e) => setRefundMethodFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Methods' },
              { value: 'cash', label: 'Cash' },
              { value: 'store_credit', label: 'Store Credit' },
              { value: 'original_payment', label: 'Original Payment' },
              { value: 'exchange', label: 'Exchange' }
            ]}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'customer')}
            options={[
              { value: 'date', label: 'Sort by Date' },
              { value: 'amount', label: 'Sort by Amount' },
              { value: 'customer', label: 'Sort by Customer' }
            ]}
          />
        </div>

        {/* Returns Table */}
        <PaginatedTableCard
          title="Returns List"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
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
  );
}
