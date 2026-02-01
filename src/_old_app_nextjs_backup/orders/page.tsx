'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { PaginatedTableCard } from '@/components/ui/dashboard/table-card';
import { KPICard } from '@/components/ui/dashboard/kpi-card';
import { orderService } from '@/lib/services';
import { Order } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function OrdersPage() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'supplier'>('date');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getAllOrders();
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setToast({ message: response.error || 'Failed to load orders', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setToast({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const response = await orderService.deleteOrder(orderId);
      if (response.success) {
        setToast({ message: 'Order deleted successfully', type: 'success' });
        loadOrders();
      } else {
        setToast({ message: response.error || 'Failed to delete order', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setToast({ message: 'Failed to delete order', type: 'error' });
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    const currentOrders = orders || [];
    
    const filtered = currentOrders.filter(order => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total':
          return b.total - a.total;
        case 'supplier':
          return a.supplierName.localeCompare(b.supplierName);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, sortBy]);

  const stats = useMemo(() => {
    const currentOrders = orders || [];
    return {
      total: currentOrders.length,
      pending: currentOrders.filter(o => o.status === 'pending').length,
      confirmed: currentOrders.filter(o => o.status === 'confirmed').length,
      delivered: currentOrders.filter(o => o.status === 'delivered').length,
      totalValue: currentOrders.reduce((sum, o) => sum + o.total, 0),
      unpaid: currentOrders.filter(o => o.paymentStatus === 'unpaid').length
    };
  }, [orders]);

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

  const tableColumns = [
    { key: 'orderNumber', label: 'Order #', sortable: true },
    { key: 'supplier', label: 'Supplier', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
    { key: 'paymentStatus', label: 'Payment', sortable: false },
    { key: 'deliveryDate', label: 'Delivery Date', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedOrders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    supplier: order.supplierName,
    total: formatCurrency(order.total),
    status: (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
      </span>
    ),
    paymentStatus: (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
      </span>
    ),
    deliveryDate: order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-',
    actions: (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/orders/${order.id}`)}
        >
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDeleteOrder(order.id)}
        >
          Delete
        </Button>
      </div>
    )
  }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage purchase orders and inventory restocking
            </p>
          </div>
          <Button onClick={() => router.push('/orders/new')}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Order
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Orders"
            value={stats.total}
            icon={<ShoppingCartIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />

          <KPICard
            title="Pending"
            value={stats.pending}
            icon={<ClockIcon className="h-8 w-8 text-yellow-500" />}
          />

          <KPICard
            title="Delivered"
            value={stats.delivered}
            icon={<CheckCircleIcon className="h-8 w-8 text-green-500" />}
          />

          <KPICard
            title="Total Value"
            value={formatCurrency(stats.totalValue)}
            icon={<CurrencyDollarIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by order number, supplier, or notes..."
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
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />

          <Select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Payments' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'partial', label: 'Partial' },
              { value: 'paid', label: 'Paid' }
            ]}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'total' | 'supplier')}
            options={[
              { value: 'date', label: 'Sort by Date' },
              { value: 'total', label: 'Sort by Total' },
              { value: 'supplier', label: 'Sort by Supplier' }
            ]}
          />
        </div>

        {/* Orders Table */}
        <PaginatedTableCard
          title="Orders List"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
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
    </AppLayout>
  );
}
