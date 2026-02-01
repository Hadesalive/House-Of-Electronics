'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard/kpi-card';
import { PaginatedTableCard } from '@/components/ui/dashboard/table-card';
import { returnService } from '@/lib/services';
import { Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

export default function ReturnDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const returnId = params.id as string;
  
  const [returnData, setReturnData] = useState<Return | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  const loadReturn = async () => {
    setLoading(true);
    try {
      const response = await returnService.getReturnById(returnId);
      if (response.success && response.data) {
        setReturnData(response.data);
      } else {
        setToast({ message: 'Return not found', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading return:', error);
      setToast({ message: 'Failed to load return', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this return?')) return;

    try {
      const response = await returnService.deleteReturn(returnId);
      if (response.success) {
        setToast({ message: 'Return deleted successfully', type: 'success' });
        setTimeout(() => {
          router.push('/returns');
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to delete return', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      setToast({ message: 'Failed to delete return', type: 'error' });
    }
  };

  const handleApprove = async () => {
    if (!returnData) return;
    if (!confirm('Approve this return? This will restore stock and process the refund.')) return;

    try {
      const response = await returnService.updateReturn(returnId, { status: 'approved' });
      if (response.success) {
        setToast({ message: 'Return approved! Stock restored and refund processed.', type: 'success' });
        loadReturn();
      } else {
        setToast({ message: response.error || 'Failed to approve return', type: 'error' });
      }
    } catch (error) {
      console.error('Error approving return:', error);
      setToast({ message: 'Failed to approve return', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!returnData) return;
    if (!confirm('Reject this return?')) return;

    try {
      const response = await returnService.updateReturn(returnId, { status: 'rejected' });
      if (response.success) {
        setToast({ message: 'Return rejected', type: 'success' });
        loadReturn();
      } else {
        setToast({ message: response.error || 'Failed to reject return', type: 'error' });
      }
    } catch (error) {
      console.error('Error rejecting return:', error);
      setToast({ message: 'Failed to reject return', type: 'error' });
    }
  };

  const handleComplete = async () => {
    if (!returnData) return;
    if (!confirm('Mark this return as completed?')) return;

    try {
      const response = await returnService.updateReturn(returnId, { status: 'completed' });
      if (response.success) {
        setToast({ message: 'Return completed successfully', type: 'success' });
        loadReturn();
      } else {
        setToast({ message: response.error || 'Failed to complete return', type: 'error' });
      }
    } catch (error) {
      console.error('Error completing return:', error);
      setToast({ message: 'Failed to complete return', type: 'error' });
    }
  };

  const getStatusBadgeColor = (status: Return['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundMethodBadgeColor = (method: Return['refundMethod']) => {
    switch (method) {
      case 'store_credit': return 'bg-purple-100 text-purple-800';
      case 'cash': return 'bg-green-100 text-green-800';
      case 'original_payment': return 'bg-blue-100 text-blue-800';
      case 'exchange': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading return...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!returnData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Return not found</p>
            <Button onClick={() => router.push('/returns')} className="mt-4">
              Back to Returns
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const tableColumns = [
    { key: 'product', label: 'Product', sortable: false },
    { key: 'quantity', label: 'Quantity', sortable: false },
    { key: 'unitPrice', label: 'Unit Price', sortable: false },
    { key: 'total', label: 'Total', sortable: false },
    { key: 'reason', label: 'Reason', sortable: false },
    { key: 'condition', label: 'Condition', sortable: false }
  ];

  const tableData = returnData.items.map((item, index) => ({
    id: `${index}`,
    product: item.productName,
    quantity: item.quantity.toString(),
    unitPrice: formatCurrency(item.unitPrice),
    total: formatCurrency(item.total),
    reason: item.reason,
    condition: (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
      </span>
    )
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/returns')}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                Return {returnData.returnNumber}
              </h1>
              <p className="text-muted-foreground mt-1">
                Customer: {returnData.customerName || 'Walk-in Customer'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {returnData.status === 'pending' && (
              <>
                <Button variant="outline" onClick={handleApprove}>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Approve
                </Button>
                <Button variant="outline" onClick={handleReject}>
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {returnData.status === 'approved' && (
              <Button variant="outline" onClick={handleComplete}>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Complete
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/returns/${returnId}/edit`)}>
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(returnData.status)}`}>
            {returnData.status.charAt(0).toUpperCase() + returnData.status.slice(1)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRefundMethodBadgeColor(returnData.refundMethod)}`}>
            Refund: {returnData.refundMethod.replace('_', ' ').charAt(0).toUpperCase() + returnData.refundMethod.replace('_', ' ').slice(1)}
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Refund Amount"
            value={formatCurrency(returnData.refundAmount)}
            icon={<CurrencyDollarIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard
            title="Items Returned"
            value={returnData.items.length}
            icon={<CheckCircleIcon className="h-8 w-8 text-blue-500" />}
          />
          <KPICard
            title="Return Date"
            value={formatDate(returnData.createdAt)}
            icon={<CalendarIcon className="h-8 w-8 text-green-500" />}
          />
          <KPICard
            title="Customer"
            value={returnData.customerName || 'Walk-in'}
            icon={<UserIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Return Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Table */}
          <div className="lg:col-span-2">
            <PaginatedTableCard
              title="Returned Items"
              columns={tableColumns}
              data={tableData}
              itemsPerPage={10}
            />
          </div>

          {/* Return Information */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Refund Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(returnData.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Tax:</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(returnData.tax)}
                  </span>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Refund Amount:</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(returnData.refundAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Info */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Return Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Return Number:</p>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {returnData.returnNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Refund Method:</p>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {returnData.refundMethod.replace('_', ' ').charAt(0).toUpperCase() + returnData.refundMethod.replace('_', ' ').slice(1)}
                  </p>
                </div>
                {returnData.processedBy && (
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Processed By:</p>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {returnData.processedBy}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Created:</p>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatDate(returnData.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {returnData.notes && (
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Notes
                </h2>
                <p style={{ color: 'var(--muted-foreground)' }}>{returnData.notes}</p>
              </div>
            )}
          </div>
        </div>
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
    </AppLayout>
  );
}

