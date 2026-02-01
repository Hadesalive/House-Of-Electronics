import React, { useEffect, useMemo, useState } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { customerService, productService } from '@/lib/services';
import { creditService } from '@/lib/services/credit.service';
import { Customer, Product, SaleItem } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CubeIcon,
  ReceiptPercentIcon,
  ArrowLeftIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { ProductForm } from '@/components/ui/forms/product-form';

export default function CreditNewPage() {
  const navigate = useNavigate();
  const { formatCurrency, preferences, companySettings } = useSettings();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(preferences.defaultDiscountPercent || 0);
  const [initialDeposit, setInitialDeposit] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product search and selection
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customerService.getAllCustomers(),
        productService.getAllProducts()
      ]);

      if (customersRes.success) setCustomers(customersRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [products, productSearchTerm]);

  const handleProductCreated = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await productService.createProduct(productData);
      if (response.success && response.data) {
        setProducts(prev => [...prev, response.data!]);
        const newItem: SaleItem = {
          productId: response.data.id,
          productName: response.data.name,
          quantity: 1,
          unitPrice: response.data.price,
          total: response.data.price,
        };
        setItems(prev => [...prev, newItem]);
        setShowProductForm(false);
        setToast({ message: 'Product created and added', type: 'success' });
      } else {
        setToast({ message: response.error || 'Failed to create product', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      setToast({ message: 'Failed to create product', type: 'error' });
    }
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as SaleItem;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
    const discountAmount = (subtotal * (discount || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const taxRate = companySettings.taxRate || 0.15; // GST from settings
    const tax = discountedSubtotal * taxRate;
    const total = discountedSubtotal + tax;
    return { subtotal, discountAmount, taxRate, tax, total };
  }, [items, discount, companySettings.taxRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setToast({ message: 'Add at least one item', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Determine customer
      let finalCustomerId = selectedCustomer;
      if (!finalCustomerId && newCustomerName && newCustomerAddress && newCustomerPhone) {
        const createRes = await customerService.createCustomer({
          name: newCustomerName,
          address: newCustomerAddress,
          phone: newCustomerPhone,
          email: newCustomerEmail || ''
        } as any);
        if (createRes.success && createRes.data) {
          finalCustomerId = createRes.data.id;
          setCustomers(prev => [...prev, createRes.data!]);
        }
      }

      const payloadItems = items.map(it => ({ productId: it.productId, productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice }));
      const result = await creditService.addDebt({
        customerId: finalCustomerId || '',
        amount: totals.total,
        description: notes,
        items: payloadItems
      });
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create debt');
      }
      const depositNum = parseFloat(initialDeposit) || 0;
      if (depositNum > 0) {
        await creditService.addDebtPayment({ debtId: result.data.id, amount: depositNum });
      }
      setToast({ message: 'Debt created successfully', type: 'success' });
      setTimeout(() => navigate('/credit'), 800);
    } catch (error) {
      console.error('Failed to create debt:', error);
      setToast({ message: error instanceof Error ? error.message : 'Failed to create debt', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
            <span className="inline-block h-2 w-8 rounded" style={{ background: 'var(--accent)' }} />
            New Debt
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Record items taken on credit and optional initial deposit</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/credit')} className="flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Debts
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer */}
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Customer</h2>
              </div>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                placeholder="Select customer (optional)"
                options={[{ value: '', label: 'Walk-in / New' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
              />
              {!selectedCustomer && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Customer Name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                  <Input label="Phone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                  <Input label="Address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} className="md:col-span-2" />
                  <Input label="Email (optional)" type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
                </div>
              )}
            </div>

            {/* Products */}
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Add Products</h2>
              </div>
              <div className="space-y-4">
                <div className="relative product-dropdown">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                    <Input
                      placeholder="Search products..."
                      value={productSearchTerm}
                      onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg shadow-lg max-h-64 overflow-y-auto" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 20).map((product) => (
                          <button key={product.id} type="button" onClick={() => {
                            const existingIndex = items.findIndex(i => i.productId === product.id);
                            if (existingIndex >= 0) {
                              const updated = [...items];
                              updated[existingIndex].quantity += 1;
                              updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
                              setItems(updated);
                            } else {
                              const newItem: SaleItem = { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price, total: product.price };
                              setItems(prev => [...prev, newItem]);
                            }
                            setProductSearchTerm('');
                            setShowProductDropdown(false);
                            setToast({ message: `${product.name} added`, type: 'success' });
                          }} className="w-full p-3 text-left border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium" style={{ color: 'var(--foreground)' }}>{product.name}</p>
                                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{product.description || 'No description'} {product.sku && `• ${product.sku}`}</p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatCurrency(product.price)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                          {productSearchTerm ? 'No products found' : 'No products available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button type="button" onClick={() => setShowProductForm(true)} variant="outline" className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" /> Create New Item
                  </Button>
                </div>

                {(items || []).length > 0 && (
                  <div className="space-y-3">
                    {(items || []).map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div className="md:col-span-2">
                            <p className="font-medium" style={{ color: 'var(--foreground)' }}>{item.productName}</p>
                            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>ID: {item.productId?.substring(0, 8)}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Quantity</label>
                            <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} min="1" className="text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Unit Price</label>
                            <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" className="text-sm" />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Total</p>
                              <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatCurrency(item.total)}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Totals & Actions */}
          <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <ReceiptPercentIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Totals</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between"><span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span><span className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatCurrency(totals.subtotal)}</span></div>
                  {discount > 0 && (<div className="flex justify-between"><span style={{ color: 'var(--muted-foreground)' }}>Discount ({discount}%):</span><span className="font-semibold text-red-600">-{formatCurrency(totals.discountAmount)}</span></div>)}
                  <div className="flex justify-between"><span style={{ color: 'var(--muted-foreground)' }}>Tax ({Math.round((totals.taxRate) * 100)}%):</span><span className="font-semibold" style={{ color: 'var(--foreground)' }}>{formatCurrency(totals.tax)}</span></div>
                  <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between"><span className="font-semibold" style={{ color: 'var(--foreground)' }}>Total:</span><span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{formatCurrency(totals.total)}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Initial Deposit (optional)</h2>
                <Input type="number" step="0.01" min="0" value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} placeholder="0.00" />
              </div>

              <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                  <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  Notes
                </h2>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Reference notes..." />
              </div>

              <div className="flex flex-col gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/credit')} className="w-full">Cancel</Button>
                <Button type="submit" disabled={loading || items.length === 0} className="w-full">{loading ? 'Creating...' : 'Create Debt'}</Button>
              </div>
          </div>
        </div>
      </form>

      <ProductForm isOpen={showProductForm} onClose={() => setShowProductForm(false)} onSave={handleProductCreated} title="Create New Product" />

      {toast && (
        <Toast title={toast.message} variant={toast.type} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
    </div>
  );
}
