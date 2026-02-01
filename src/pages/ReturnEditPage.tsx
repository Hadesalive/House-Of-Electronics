import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { returnService, customerService, productService } from '@/lib/services';
import { Product, ReturnItem, Customer, Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  PlusIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function EditReturnPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const returnId = params.id as string;
  
  const [originalReturn, setOriginalReturn] = useState<Return | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'store_credit' | 'original_payment' | 'exchange'>('cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'unopened' | 'opened' | 'defective' | 'damaged'>('unopened');

  useEffect(() => {
    loadReturn();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  const loadReturn = async () => {
    setLoading(true);
    try {
      const response = await returnService.getReturnById(returnId);
      if (response.success && response.data) {
        const returnData = response.data;
        setOriginalReturn(returnData);
        setSelectedCustomer(returnData.customerId || '');
        setReturnItems(returnData.items);
        setNotes(returnData.notes || '');
        setStatus(returnData.status);
        setRefundMethod(returnData.refundMethod);
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

  const loadData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customerService.getAllCustomers(),
        productService.getAllProducts()
      ]);

      if (customersRes.success && customersRes.data) setCustomers(customersRes.data);
      if (productsRes.success && productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) {
      setToast({ message: 'Please select a product and enter valid quantity', type: 'error' });
      return;
    }

    if (!reason.trim()) {
      setToast({ message: 'Please enter a return reason', type: 'error' });
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const unitPrice = customPrice !== null ? customPrice : product.price;
    const total = quantity * unitPrice;

    const newItem: ReturnItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total,
      reason: reason.trim(),
      condition
    };

    setReturnItems([...returnItems, newItem]);
    
    // Reset form
    setSelectedProduct('');
    setQuantity(1);
    setCustomPrice(null);
    setReason('');
    setCondition('unopened');
  };

  const removeItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: string | number) => {
    const updatedItems = [...returnItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setReturnItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = returnItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (returnItems.length === 0) {
      setToast({ message: 'Please add at least one item to return', type: 'error' });
      return;
    }

    const missingReasons = returnItems.some(item => !item.reason || !item.reason.trim());
    if (missingReasons) {
      setToast({ message: 'Please provide a reason for all returned items', type: 'error' });
      return;
    }

    setSaving(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
      
      const returnData = {
        customerId: selectedCustomer || undefined,
        customerName: selectedCustomerData?.name || 'Walk-in Customer',
        items: returnItems,
        subtotal,
        tax,
        total,
        refundAmount: total,
        refundMethod,
        status,
        notes: notes || undefined
      };

      const response = await returnService.updateReturn(returnId, returnData);
      
      if (response.success) {
        setToast({ message: 'Return updated successfully!', type: 'success' });
        setTimeout(() => {
          navigate(`/returns/${returnId}`);
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to update return', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating return:', error);
      setToast({ message: 'Failed to update return', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading return...</p>
        </div>
      </div>
    );
  }

  if (!originalReturn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Return not found</p>
          <Button onClick={() => navigate('/returns')} className="mt-4">
            Back to Returns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/returns/${returnId}`)}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              Edit Return {originalReturn.returnNumber}
            </h1>
            <p className="text-muted-foreground mt-1">
              Update return details and items
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Customer Information
                </h2>
                
                <Select
                  label="Customer"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  options={[
                    { value: '', label: 'Walk-in Customer' },
                    ...customers.map(c => ({
                      value: c.id,
                      label: c.name
                    }))
                  ]}
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
                  Add Return Items
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  
                  <Input
                    type="number"
                    label="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input
                    type="number"
                    label="Price (Optional)"
                    value={customPrice || ''}
                    onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Use product price"
                    step="0.01"
                  />

                  <Select
                    label="Condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as typeof condition)}
                    options={[
                      { value: 'unopened', label: 'Unopened' },
                      { value: 'opened', label: 'Opened' },
                      { value: 'defective', label: 'Defective' },
                      { value: 'damaged', label: 'Damaged' }
                    ]}
                  />
                </div>

                <Input
                  label="Return Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this item being returned?"
                  className="mb-4"
                />

                <Button
                  type="button"
                  onClick={addItem}
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add to Return
                </Button>
              </div>

              {/* Return Items */}
              {returnItems.length > 0 && (
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                    Return Items ({returnItems.length})
                  </h2>
                  
                  <div className="space-y-3">
                    {returnItems.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                              {item.productName}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                              {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                              Reason
                            </label>
                            <Input
                              value={item.reason}
                              onChange={(e) => updateItem(index, 'reason', e.target.value)}
                              placeholder="Return reason"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                              Condition
                            </label>
                            <Select
                              value={item.condition}
                              onChange={(e) => updateItem(index, 'condition', e.target.value)}
                              options={[
                                { value: 'unopened', label: 'Unopened' },
                                { value: 'opened', label: 'Opened' },
                                { value: 'defective', label: 'Defective' },
                                { value: 'damaged', label: 'Damaged' }
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Status & Refund */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Status & Refund
                </h2>
                
                <div className="space-y-4">
                  <Select
                    label="Return Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                      { value: 'completed', label: 'Completed' }
                    ]}
                  />

                  <Select
                    label="Refund Method"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                    options={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'store_credit', label: 'Store Credit' },
                      { value: 'original_payment', label: 'Original Payment Method' },
                      { value: 'exchange', label: 'Exchange' }
                    ]}
                  />

                  {refundMethod === 'store_credit' && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💳 Refund will be added to customer&apos;s store credit
                      </p>
                    </div>
                  )}
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
                    Refund Amount
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
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Refund Total:</span>
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
                  placeholder="Add any notes about this return..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/returns/${returnId}`)}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || returnItems.length === 0}
                  className="w-full"
                >
                  {saving ? 'Updating Return...' : 'Update Return'}
                </Button>
              </div>
            </div>
          </div>
        </form>

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

