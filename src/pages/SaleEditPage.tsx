import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { ProductSearchModal } from '@/components/ui/modals';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { customerService, productService, salesService } from '@/lib/services';
import { Customer, Product, SaleItem, Sale } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  UserIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  PlusIcon,
  TrashIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

export default function EditSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  
  const saleId = params.id as string;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalSale, setOriginalSale] = useState<Sale | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [status, setStatus] = useState<'pending' | 'completed' | 'refunded' | 'cancelled'>('completed');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Product search and selection
  const [showProductModal, setShowProductModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [customersRes, productsRes, saleRes] = await Promise.all([
        customerService.getAllCustomers(),
        productService.getAllProducts(),
        salesService.getSaleById(saleId)
      ]);

      if (customersRes.success) setCustomers(customersRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      
      if (saleRes.success && saleRes.data) {
        const sale = saleRes.data;
        setOriginalSale(sale);
        setSelectedCustomer(sale.customerId || '');
        setSaleItems(sale.items || []);
        setNotes(sale.notes || '');
        setPaymentMethod(sale.paymentMethod);
        setStatus(sale.status);
      } else {
        setToast({ message: 'Sale not found', type: 'error' });
        setTimeout(() => navigate('/sales'), 2000);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load sale data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [saleId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleProductSelect = (product: Product, quantity: number, customPrice?: number) => {
    const unitPrice = customPrice || product.price;
    const total = unitPrice * quantity;
    
    const newItem: SaleItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total
    };
    
    setSaleItems(prev => [...prev, newItem]);
    setToast({ message: `${product.name} added to sale`, type: 'success' });
  };


  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total if quantity or unitPrice changed
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setSaleItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const currentSaleItems = saleItems || [];
    setSaleItems(currentSaleItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const currentSaleItems = saleItems || [];
    const subtotal = currentSaleItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15; // 15% tax rate
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  // Prepare receipt data
  const getReceiptData = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tax, total } = calculateTotals();
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
    const now = new Date();
    
    return {
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      company: {
        name: "House Of Electronics S/L LTD",
        address: "13 A Sander Street Middle Floor",
        city: "Freetown",
        state: "Sierra Leone",
        zip: "",
        phone: "+232-77-593-479",
        email: "sales@tahoe-sl.com",
        logo: "/images/hoe logo.png"
      },
      customer: {
        name: selectedCustomerData?.name || 'Walk-in Customer',
        email: selectedCustomerData?.email || '',
        phone: selectedCustomerData?.phone || ''
      },
      items: saleItems.map(item => ({
        id: item.productId,
        description: item.productName,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: item.total
      })),
      paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' '),
      taxRate: 15,
      discount: 0
    };
  };

  // Print receipt
  const handlePrintReceipt = () => {
    if (saleItems.length === 0) {
      setToast({ message: 'Please add at least one item to print receipt', type: 'error' });
      return;
    }
    
    // Create a new window with the receipt preview
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      const receiptData = getReceiptData();
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt Print</title>
          <style>
            body { margin: 0; padding: 20px; font-family: monospace; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .company-details { font-size: 12px; line-height: 1.4; }
            .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
            .receipt-info { text-align: center; font-size: 12px; margin-bottom: 20px; }
            .customer-section { margin-bottom: 20px; }
            .customer-title { font-size: 12px; font-weight: bold; margin-bottom: 5px; }
            .customer-details { font-size: 12px; }
            .items-section { margin-bottom: 20px; }
            .item-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .item { margin-bottom: 10px; font-size: 12px; }
            .item-description { margin-bottom: 3px; }
            .item-details { font-size: 10px; color: #666; }
            .totals { margin-bottom: 20px; }
            .total-line { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
            .total-final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
            .payment-method { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
            .footer { text-align: center; font-size: 10px; line-height: 1.4; }
            @media print { body { margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="company-name">${receiptData.company.name}</div>
              <div class="company-details">
                ${receiptData.company.address}<br>
                ${receiptData.company.city}, ${receiptData.company.state} ${receiptData.company.zip}<br>
                ${receiptData.company.phone}
              </div>
            </div>
            
            <div class="receipt-title">RECEIPT</div>
            
            <div class="receipt-info">
              <div><strong>Receipt #:</strong> ${receiptData.receiptNumber}</div>
              <div><strong>Date:</strong> ${receiptData.date}</div>
              <div><strong>Time:</strong> ${receiptData.time}</div>
            </div>
            
            <div class="customer-section">
              <div class="customer-title">Customer:</div>
              <div class="customer-details">
                ${receiptData.customer.name}<br>
                ${receiptData.customer.email ? receiptData.customer.email + '<br>' : ''}
                ${receiptData.customer.phone || ''}
              </div>
            </div>
            
            <div class="items-section">
              <div class="item-header">
                <span>Item</span>
                <span>Total</span>
              </div>
              ${receiptData.items.map(item => `
                <div class="item">
                  <div class="item-description">${item.description}</div>
                  <div class="item-details">${item.quantity} × ${formatCurrency(item.rate)}</div>
                </div>
                <div style="text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>${formatCurrency(receiptData.items.reduce((sum, item) => sum + item.amount, 0))}</span>
              </div>
              <div class="total-line">
                <span>Tax (15%):</span>
                <span>${formatCurrency(tax)}</span>
              </div>
              <div class="total-line total-final">
                <span>Total:</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>
            
            <div class="payment-method">
              <span>Payment Method:</span>
              <span>${receiptData.paymentMethod}</span>
            </div>
            
            <div class="footer">
              <div>Thank you for your business!</div>
              <div>Keep this receipt for your records</div>
              <div>Questions? Contact us at ${receiptData.company.email}</div>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSaleItems = saleItems || [];
    if (currentSaleItems.length === 0) {
      setToast({ message: 'Please add at least one item to the sale', type: 'error' });
      return;
    }

    setSaving(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
      
      const saleData = {
        customerId: selectedCustomer || undefined,
        customerName: selectedCustomerData?.name || 'Walk-in Customer',
        items: currentSaleItems,
        subtotal,
        tax,
        discount: originalSale?.discount || 0,
        total,
        status,
        paymentMethod,
        notes: notes || undefined,
      };

      const response = await salesService.updateSale(saleId, saleData);
      
      if (response.success) {
        setToast({ message: 'Sale updated successfully!', type: 'success' });
        setTimeout(() => {
          navigate(`/sales/${saleId}`);
        }, 1000);
      } else {
        // Handle stock validation errors with details
        if (response.error === 'Stock validation failed' && (response as { details?: string[] }).details) {
          const details = (response as unknown as { details: string[] }).details;
          const errorMessage = details.join('\n');
          setToast({ message: errorMessage, type: 'error' });
        } else {
          setToast({ message: response.error || 'Failed to update sale', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      setToast({ message: 'Failed to update sale', type: 'error' });
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
          <p className="text-muted-foreground">Loading sale data...</p>
        </div>
      </div>
    );
  }

  if (!originalSale) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Sale not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Edit Sale #{originalSale.id.substring(0, 8)}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Modify sale details and items
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/sales/${saleId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Sale
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Customer & Product Selection */}
            <div className="xl:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                    Customer
                  </h2>
                </div>
                
                <Select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  placeholder="Select customer (optional)"
                  options={[
                    { value: '', label: 'Walk-in Customer' },
                    ...customers.map(customer => ({
                      value: customer.id,
                      label: `${customer.name}${customer.email ? ` (${customer.email})` : ''}`
                    }))
                  ]}
                />
                
                {selectedCustomer ? (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Customer selected: {customers.find(c => c.id === selectedCustomer)?.name}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Walk-in Customer - No customer account required
                    </p>
                  </div>
                )}
              </div>

              {/* Sale Status */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Sale Status
                </h2>
                
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'pending' | 'completed' | 'refunded' | 'cancelled')}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'refunded', label: 'Refunded' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                />
              </div>

              {/* Product Selection */}
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                      Add Products
                    </h2>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Browse Products
                  </Button>
                </div>
                
                <div className="text-center py-8">
                  <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                    Click &quot;Browse Products&quot; to search and select products from your inventory
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    You can search by name, SKU, category, or description
                  </p>
                </div>
              </div>

              {/* Sale Items */}
              {(saleItems || []).length > 0 && (
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                      <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                      Sale Items ({(saleItems || []).length})
                    </h2>
                    <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Total: <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(saleItems.reduce((sum, item) => sum + item.total, 0))}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {(saleItems || []).map((item, index) => (
                      <div 
                        key={index} 
                        className="p-4 rounded-lg border transition-all hover:shadow-md" 
                        style={{ 
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                          {/* Product Info */}
                          <div className="sm:col-span-2 lg:col-span-4">
                            <div className="space-y-1">
                              <h3 className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                {item.productName}
                              </h3>
                              <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                                ID: {item.productId.substring(0, 8)}
                              </p>
                            </div>
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-1 lg:col-span-2">
                            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                              Quantity
                            </label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              className="text-sm"
                              style={{ textAlign: 'center' }}
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-1 lg:col-span-2">
                            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                              Unit Price
                            </label>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              className="text-sm"
                              style={{ textAlign: 'right' }}
                            />
                          </div>

                          {/* Total */}
                          <div className="sm:col-span-1 lg:col-span-2">
                            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                              Total
                            </label>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                                {formatCurrency(item.total)}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="sm:col-span-1 lg:col-span-2 flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remove Item"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {(saleItems || []).length === 0 && (
                    <div className="text-center py-12">
                      <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                      <p className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        No items in this sale
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        Add products using the &quot;Browse Products&quot; button above
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Payment & Totals */}
            <div className="space-y-6">
              {/* Payment Method */}
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
                    Payment
                  </h2>
                </div>
                
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other')}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'credit', label: 'Credit' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
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
                  <ReceiptPercentIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
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
                  placeholder="Add any notes about this sale..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintReceipt}
                  disabled={(saleItems || []).length === 0}
                  className="w-full"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/sales/${saleId}`)}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || (saleItems || []).length === 0}
                  className="w-full"
                >
                  {saving ? 'Updating Sale...' : 'Update Sale'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Product Search Modal */}
        <ProductSearchModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          onSelectProduct={handleProductSelect}
          products={products}
          title="Add Product to Sale"
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
