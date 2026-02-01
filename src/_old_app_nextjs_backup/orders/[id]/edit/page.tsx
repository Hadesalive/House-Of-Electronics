'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { orderService, productService } from '@/lib/services';
import { Product, OrderItem, Order } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  PlusIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency } = useSettings();
  const orderId = params.id as string;
  
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'>('pending');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other' | ''>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  useEffect(() => {
    loadOrder();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrderById(orderId);
      if (response.success && response.data) {
        const order = response.data;
        setOriginalOrder(order);
        setSupplierName(order.supplierName);
        setOrderItems(order.items);
        setNotes(order.notes || '');
        setStatus(order.status);
        setPaymentStatus(order.paymentStatus);
        setPaymentMethod(order.paymentMethod || '');
        setExpectedDeliveryDate(order.expectedDeliveryDate || '');
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

  const loadProducts = async () => {
    try {
      const response = await productService.getAllProducts();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) {
      setToast({ message: 'Please select a product and enter valid quantity', type: 'error' });
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const unitPrice = customPrice !== null ? customPrice : product.price;
    const total = quantity * unitPrice;

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total
    };

    setOrderItems([...orderItems, newItem]);
    
    // Reset form
    setSelectedProduct('');
    setQuantity(1);
    setCustomPrice(null);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setOrderItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierName.trim()) {
      setToast({ message: 'Please enter supplier name', type: 'error' });
      return;
    }

    if (orderItems.length === 0) {
      setToast({ message: 'Please add at least one item to the order', type: 'error' });
      return;
    }

    setSaving(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      const orderData = {
        supplierName,
        items: orderItems,
        subtotal,
        tax,
        discount: 0,
        total,
        status,
        paymentStatus,
        paymentMethod: paymentMethod || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined
      };

      const response = await orderService.updateOrder(orderId, orderData);
      
      if (response.success) {
        setToast({ message: 'Order updated successfully!', type: 'success' });
        setTimeout(() => {
          router.push(`/orders/${orderId}`);
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to update order', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setToast({ message: 'Failed to update order', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

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

  if (!originalOrder) {
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              Edit Order {originalOrder.orderNumber}
            </h1>
            <p className="text-muted-foreground mt-1">
              Update order details and items
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Supplier Information */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Supplier Information
                </h2>
                <Input
                  label="Supplier Name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              {/* Add Item */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Add Items
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Select
                      label="Product"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      options={[
                        { value: '', label: 'Select product' },
                        ...products.map(p => ({
                          value: p.id,
                          label: `${p.name} - ${formatCurrency(p.price)}`
                        }))
                      ]}
                    />
                  </div>
                  
                  <Input
                    type="number"
                    label="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                  
                  <Input
                    type="number"
                    label="Custom Price"
                    value={customPrice || ''}
                    onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Use product price"
                    step="0.01"
                  />
                </div>

                <Button
                  type="button"
                  onClick={addItem}
                  className="mt-4"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add to Order
                </Button>
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                    Order Items ({orderItems.length})
                  </h2>
                  
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                        <div className="md:col-span-2">
                          <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                            {item.productName}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                            Quantity
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                            Unit Price
                          </label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                              Total
                            </label>
                            <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
                              {formatCurrency(item.total)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Status & Payment */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Status & Payment
                </h2>
                
                <div className="space-y-4">
                  <Select
                    label="Order Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'shipped', label: 'Shipped' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ]}
                  />

                  <Select
                    label="Payment Status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
                    options={[
                      { value: 'unpaid', label: 'Unpaid' },
                      { value: 'partial', label: 'Partial' },
                      { value: 'paid', label: 'Paid' }
                    ]}
                  />

                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    options={[
                      { value: '', label: 'Select method' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'card', label: 'Card' },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'credit', label: 'Credit' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />

                  <Input
                    type="date"
                    label="Expected Delivery Date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Totals */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <CurrencyDollarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                    Totals
                  </h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted-foreground)' }}>Tax (15%):</span>
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(tax)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Total:</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
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
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this order..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || orderItems.length === 0}
                  className="w-full"
                >
                  {saving ? 'Updating Order...' : 'Update Order'}
                </Button>
              </div>
            </div>
          </div>
        </form>
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

