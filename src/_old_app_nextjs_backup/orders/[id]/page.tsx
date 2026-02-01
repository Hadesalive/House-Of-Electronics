'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard/kpi-card';
import { PaginatedTableCard } from '@/components/ui/dashboard/table-card';
import { orderService } from '@/lib/services';
import { Order } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrderById(orderId);
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setToast({ message: 'Order not found', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setToast({ message: 'Failed to load order', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const response = await orderService.deleteOrder(orderId);
      if (response.success) {
        setToast({ message: 'Order deleted successfully', type: 'success' });
        setTimeout(() => {
          router.push('/orders');
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to delete order', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setToast({ message: 'Failed to delete order', type: 'error' });
    }
  };

  const handleMarkDelivered = async () => {
    if (!order) return;
    if (!confirm('Mark this order as delivered? This will add items to inventory.')) return;

    try {
      const response = await orderService.updateOrder(orderId, { status: 'delivered' });
      if (response.success) {
        setToast({ message: 'Order marked as delivered. Stock updated!', type: 'success' });
        loadOrder();
      } else {
        setToast({ message: response.error || 'Failed to update order', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setToast({ message: 'Failed to update order', type: 'error' });
    }
  };

  const getStatusBadgeColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeColor = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading order...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Order not found</p>
            <Button onClick={() => router.push('/orders')} className="mt-4">
              Back to Orders
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
    { key: 'total', label: 'Total', sortable: false }
  ];

  const tableData = order.items.map((item, index) => ({
    id: `${index}`,
    product: item.productName,
    quantity: item.quantity.toString(),
    unitPrice: formatCurrency(item.unitPrice),
    total: formatCurrency(item.total)
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/orders')}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                Order {order.orderNumber}
              </h1>
              <p className="text-muted-foreground mt-1">
                Supplier: {order.supplierName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button variant="outline" onClick={handleMarkDelivered}>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Mark Delivered
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/orders/${orderId}/edit`)}>
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
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
            Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Amount"
            value={formatCurrency(order.total)}
            icon={<CurrencyDollarIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard
            title="Items"
            value={order.items.length}
            icon={<TruckIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard
            title="Expected Delivery"
            value={order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'Not set'}
            icon={<CalendarIcon className="h-8 w-8 text-blue-500" />}
          />
          <KPICard
            title="Payment Method"
            value={order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : 'Not set'}
            icon={<CurrencyDollarIcon className="h-8 w-8 text-green-500" />}
          />
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Table */}
          <div className="lg:col-span-2">
            <PaginatedTableCard
              title="Order Items"
              columns={tableColumns}
              data={tableData}
              itemsPerPage={10}
            />
          </div>

          {/* Order Information */}
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
                Financial Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Tax:</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(order.tax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Discount:</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(order.discount)}
                  </span>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Total:</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div 
              className="p-6 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Important Dates
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Created:</p>
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                {order.expectedDeliveryDate && (
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Expected Delivery:</p>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatDate(order.expectedDeliveryDate)}
                    </p>
                  </div>
                )}
                {order.actualDeliveryDate && (
                  <div>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Actual Delivery:</p>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatDate(order.actualDeliveryDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
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
                <p style={{ color: 'var(--muted-foreground)' }}>{order.notes}</p>
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

