import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { returnService, customerService, productService, salesService } from '@/lib/services';
import { Product, ReturnItem, Customer, Sale } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  PlusIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

function NewReturnPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Array<{ saleId?: string; status: string }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<string>('');
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'store_credit' | 'original_payment' | 'exchange'>('cash');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'unopened' | 'opened' | 'defective' | 'damaged'>('unopened');

  useEffect(() => {
    loadData();
    
    // Check if pre-filled from sale
    const saleId = searchParams.get('saleId');
    if (saleId) {
      setSelectedSale(saleId);
      loadSaleItems(saleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes, salesRes, returnsRes] = await Promise.all([
        customerService.getAllCustomers(),
        productService.getAllProducts(),
        salesService.getAllSales(),
        returnService.getAllReturns()
      ]);

      if (customersRes.success && customersRes.data) setCustomers(customersRes.data);
      if (productsRes.success && productsRes.data) setProducts(productsRes.data);
      if (salesRes.success && salesRes.data) setSales(salesRes.data);
      if (returnsRes.success && returnsRes.data) {
        setReturns(returnsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Filter out sales that have already been returned/refunded
  const availableSales = useMemo(() => {
    // Get sale IDs that have completed/approved returns
    const returnedSaleIds = new Set(
      returns
        .filter(ret => ret.saleId && ['completed', 'approved'].includes(ret.status))
        .map(ret => ret.saleId!)
    );
    
    // Also filter out sales with status 'refunded'
    return sales.filter(sale => 
      !returnedSaleIds.has(sale.id) && 
      sale.status !== 'refunded'
    );
  }, [sales, returns]);

  // Filter sales based on search term
  const filteredSales = useMemo(() => {
    if (!saleSearchTerm.trim()) return availableSales;
    const term = saleSearchTerm.toLowerCase();
    return availableSales.filter(sale =>
      sale.id.toLowerCase().includes(term) ||
      (sale.customerName || '').toLowerCase().includes(term) ||
      formatCurrency(sale.total).toLowerCase().includes(term)
    );
  }, [availableSales, saleSearchTerm, formatCurrency]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sale-dropdown')) {
        setShowSaleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaleSelect = async (saleId: string) => {
    setSelectedSale(saleId);
    const sale = availableSales.find(s => s.id === saleId);
    if (sale) {
      setSaleSearchTerm(`Sale #${sale.id.substring(0, 8)} - ${formatCurrency(sale.total)} - ${sale.customerName || 'Walk-in'}`);
    }
    setShowSaleDropdown(false);
    if (saleId) await loadSaleItems(saleId);
  };

  const loadSaleItems = async (saleId: string) => {
    try {
      const response = await salesService.getSaleById(saleId);
      if (response.success && response.data) {
        const sale = response.data;
        setSelectedCustomer(sale.customerId || '');
        
        // Convert sale items to return items
        const items: ReturnItem[] = sale.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          reason: '',
          condition: 'unopened' as const
        }));
        
        setReturnItems(items);
      }
    } catch (error) {
      console.error('Error loading sale:', error);
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

    // Validate all items have reasons
    const missingReasons = returnItems.some(item => !item.reason || !item.reason.trim());
    if (missingReasons) {
      setToast({ message: 'Please provide a reason for all returned items', type: 'error' });
      return;
    }

    setLoading(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
      
      const returnData = {
        saleId: selectedSale || undefined,
        customerId: selectedCustomer || undefined,
        customerName: selectedCustomerData?.name || 'Walk-in Customer',
        items: returnItems,
        subtotal,
        tax,
        total,
        refundAmount: total,
        refundMethod,
        status,
        notes: notes || undefined,
        returnNumber: `RET-${Date.now().toString().slice(-6)}`
      };

      const response = await returnService.createReturn(returnData);
      
      if (response.success) {
        setToast({ message: 'Return created successfully!', type: 'success' });
        setTimeout(() => {
          navigate('/returns');
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to create return', type: 'error' });
      }
    } catch (error) {
      console.error('Error creating return:', error);
      setToast({ message: 'Failed to create return', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/returns')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>New Return</h1>
            <p className="text-muted-foreground mt-1">
              Process a product return and refund
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Return Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer & Sale Selection */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Customer & Sale Information
                </h2>
                
                <div className="space-y-4">
                  <div className="relative sale-dropdown">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Link to Sale (Optional)
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                      <Input
                        placeholder="Search sales by ID, customer, or amount..."
                        value={saleSearchTerm}
                        onChange={(e) => {
                          setSaleSearchTerm(e.target.value);
                          setShowSaleDropdown(true);
                        }}
                        onFocus={() => {
                          if (filteredSales.length > 0) {
                            setShowSaleDropdown(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowSaleDropdown(false);
                            if (!selectedSale) setSaleSearchTerm('');
                          }
                        }}
                        className="pl-10"
                      />
                    </div>
                    
                    {showSaleDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 z-50 mt-2 border rounded-lg shadow-lg overflow-hidden" 
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                      >
                        <div className="max-h-60 overflow-y-auto">
                          {filteredSales.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                              {saleSearchTerm ? 'No available sales found' : 'No available sales'}
                              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                                Sales that have been returned or refunded are not shown
                              </p>
                            </div>
                          ) : (
                            filteredSales.slice(0, 10).map((sale) => (
                              <button
                                key={sale.id}
                                type="button"
                                onClick={() => handleSaleSelect(sale.id)}
                                className="w-full text-left px-3 py-2.5 hover:bg-[var(--muted)] transition-colors cursor-pointer border-b last:border-b-0"
                                style={{ 
                                  color: 'var(--foreground)',
                                  borderColor: 'var(--border)'
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium">Sale #{sale.id.substring(0, 8)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                                        {sale.customerName || 'Walk-in Customer'}
                                      </span>
                                      <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                                        {formatCurrency(sale.total)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedSale && (
                    <div 
                      className="p-3 rounded-lg border-2 transition-all"
                      style={{ 
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                        borderColor: 'var(--accent)',
                        borderStyle: 'dashed'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            ✓ Sale Linked
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                            {saleSearchTerm}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSale('');
                            setSaleSearchTerm('');
                            setReturnItems([]);
                          }}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}

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
                  onClick={() => navigate('/returns')}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || returnItems.length === 0}
                  className="w-full"
                >
                  {loading ? 'Creating Return...' : 'Create Return'}
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

export default function NewReturnPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewReturnPageContent />
    </Suspense>
  );
}

