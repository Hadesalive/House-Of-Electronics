import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "../core/button";
import { Input } from "../forms/input";
import { Textarea } from "../forms/textarea";
import { RichTextEditor } from "../forms/rich-text-editor";
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useSettings } from '@/contexts/SettingsContext';
import { customerService, productService } from '@/lib/services';
import { Customer, Product, InvoiceItem } from '@/lib/types/core';
import { CustomerForm } from '../forms/customer-form';
import { getAllCurrencies, formatCurrency as formatCurrencyWithSymbol, convertToLeones, convertFromLeones } from '@/lib/utils/currency';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
  currency: string; // Display currency (e.g., 'USD', 'EUR', 'SLE')
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    logo?: string;
  };
  customer: {
    id?: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  notes: string;
  terms: string;
  taxRate: number;
  discount: number;
  taxes: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

interface LiveInvoiceEditorProps {
  initialData?: Partial<InvoiceData>;
  onSave?: (data: InvoiceData) => void;
  className?: string;
}

export function LiveInvoiceEditor({ 
  initialData, 
  onSave, 
  className = "" 
}: LiveInvoiceEditorProps) {
  console.log('LiveInvoiceEditor - Received initialData:', initialData);
  console.log('LiveInvoiceEditor - initialData.invoiceType:', initialData?.invoiceType);
  const { companySettings, formatCurrency, generateInvoiceNumber } = useSettings();
  
  // Customer and Product state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: initialData?.invoiceNumber || generateInvoiceNumber('INV'),
    date: initialData?.date || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoiceType: initialData?.invoiceType || 'invoice',
    currency: initialData?.currency || companySettings.currency || 'NLe',
    company: {
      name: initialData?.company?.name || companySettings.companyName || "House Of Electronics",
      address: initialData?.company?.address || companySettings.address || "44A Banga Farm Junction, Waterloo",
      city: initialData?.company?.city || "Waterloo",
      state: initialData?.company?.state || "Sierra Leone",
      zip: initialData?.company?.zip || "",
      phone: initialData?.company?.phone || companySettings.phone || "077 588 528 / 079 088 995",
      email: initialData?.company?.email || companySettings.email || "",
      ...initialData?.company
    },
    customer: {
      name: initialData?.customer?.name || "",
      address: initialData?.customer?.address || "",
      city: initialData?.customer?.city || "",
      state: initialData?.customer?.state || "",
      zip: initialData?.customer?.zip || "",
      phone: initialData?.customer?.phone || "",
      email: initialData?.customer?.email || "",
      ...initialData?.customer
    },
    items: initialData?.items || [],
    notes: initialData?.notes || "",
    terms: initialData?.terms || "Payment due within 30 days",
    taxRate: initialData?.taxRate || 0,
    discount: initialData?.discount || 0,
    taxes: initialData?.taxes || [],
    bankDetails: initialData?.bankDetails
  });

  // Load customers and products
  useEffect(() => {
    const loadData = async () => {
      try {
        const customersResponse = await customerService.getAllCustomers();
        if (customersResponse.success && customersResponse.data) {
          setCustomers(customersResponse.data);
        }
        setLoadingCustomers(false);

        const productsResponse = await productService.getAllProducts();
        if (productsResponse.success && productsResponse.data) {
          setProducts(productsResponse.data);
        }
        setLoadingProducts(false);
      } catch (error) {
        console.error('Failed to load customers/products:', error);
        setLoadingCustomers(false);
        setLoadingProducts(false);
      }
    };
    loadData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-dropdown') && !target.closest('.product-dropdown')) {
        setShowCustomerDropdown(false);
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers and products based on search terms
  const filteredCustomers = customers.filter(customer => {
    if (!customerSearchTerm) return true;
    const searchTerm = customerSearchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm) ||
      customer.phone?.toLowerCase().includes(searchTerm) ||
      customer.company?.toLowerCase().includes(searchTerm)
    );
  });

  const filteredProducts = products.filter(product => {
    if (!productSearchTerm) return true;
    const searchTerm = productSearchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm)
    );
  });

  const updateField = (field: string, value: string | number | object) => {
    console.log('LiveInvoiceEditor - updateField called:', { field, value });
    setInvoiceData(prev => {
      console.log('LiveInvoiceEditor - Previous state:', prev.invoiceType);
      const updated = {
        ...prev,
        [field]: value
      };
      
      // If invoice type changed, update the invoice number
      if (field === 'invoiceType' && typeof value === 'string') {
        console.log('LiveInvoiceEditor - Invoice type changed to:', value);
        const getInvoicePrefix = (invoiceType: string): string => {
          switch (invoiceType) {
            case 'credit_note': return 'CR';
            case 'proforma': return 'PF';
            case 'quote': return 'QUO';
            case 'delivery': return 'DEL';
            default: return 'INV';
          }
        };
        updated.invoiceNumber = generateInvoiceNumber(getInvoicePrefix(value));
        console.log('LiveInvoiceEditor - Updated invoice number:', updated.invoiceNumber);
      }
      
      // If currency changed, convert all existing items to new currency
      if (field === 'currency' && typeof value === 'string') {
        console.log('LiveInvoiceEditor - Currency changed to:', value);
        const newCurrency = value as string;
        const oldCurrency = prev.currency;
        
        // Convert all items from old currency to new currency
        updated.items = prev.items.map(item => {
          // First convert from old display currency back to Leones
          const amountInLeones = convertToLeones(item.amount, oldCurrency);
          // Then convert from Leones to new display currency
          const newAmount = convertFromLeones(amountInLeones, newCurrency);
          
          return {
            ...item,
            rate: newAmount,
            amount: newAmount
          };
        });
        
        console.log('LiveInvoiceEditor - Converted items to new currency:', updated.items);
      }
      
      console.log('LiveInvoiceEditor - New state:', updated.invoiceType);
      return updated;
    });
  };

  const updateCompanyField = (field: string, value: string) => {
    setInvoiceData(prev => ({
      ...prev,
      company: {
        ...prev.company,
        [field]: value
      }
    }));
  };



  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowCustomerDropdown(false);
    
    if (customerId === '') {
      setInvoiceData(prev => ({
        ...prev,
        customer: {
          id: undefined,
          name: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          phone: '',
          email: ''
        }
      }));
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoiceData(prev => ({
        ...prev,
        customer: {
          id: customer.id,
          name: customer.name,
          address: customer.address || '',
          city: '',
          state: '',
          zip: '',
          phone: customer.phone || '',
          email: customer.email || ''
        }
      }));
    }
  };

  const handleProductSelect = (productId: string) => {
    setShowProductDropdown(false);
    setProductSearchTerm('');
    
    if (productId === '') return;

    const product = products.find(p => p.id === productId);
    if (product) {
      // Convert product price from stored Leones to display currency
      const displayPrice = convertFromLeones(product.price, invoiceData.currency);
      
      // Check if this product already exists in the items list
      // Match by product ID if available, or by description and rate
      const existingItemIndex = invoiceData.items.findIndex(item => {
        // If item has a productId, match by that
        if ((item as any).productId === productId) {
          return true;
        }
        // Otherwise match by description and rate (within 0.01 tolerance)
        return item.description === product.name && 
               Math.abs(item.rate - displayPrice) < 0.01;
      });
      
      if (existingItemIndex >= 0) {
        // Product already exists - increase quantity instead of adding duplicate
        setInvoiceData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => {
            if (index === existingItemIndex) {
              const updatedItem = {
                ...item,
                quantity: item.quantity + 1,
                amount: (item.quantity + 1) * item.rate
              };
              return updatedItem;
            }
            return item;
          })
        }));
      } else {
        // New product - add as new item
        const newItem: InvoiceItem = {
          id: Date.now().toString(),
          description: product.name,
          itemDescription: product.description || '',
          quantity: 1,
          rate: displayPrice,
          amount: displayPrice,
          taxable: true, // Default to taxable
          stock: product.stock || 0,
          cost: product.cost || 0,
          sku: product.sku || '',
          category: product.category || '',
          minStock: product.minStock || 0,
          isActive: product.isActive !== false,
          isCustomItem: false, // Product from catalog
          productId: product.id // Store product ID for future matching
        } as InvoiceItem & { productId: string };
        setInvoiceData(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));
      }
    }
  };

  const addEmptyItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      itemDescription: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      taxable: true,
      isCustomItem: true // Mark as custom item - won't create product
    };
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };


  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number | boolean) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveEdit = () => {
    if (editingField) {
      if (editingField.startsWith('item.')) {
        // Handle item fields: item.{id}.{field}
        const parts = editingField.split('.');
        if (parts.length === 3) {
          const itemId = parts[1];
          const field = parts[2] as keyof InvoiceItem;
          let value: string | number | boolean = tempValue;
          
          // Convert value based on field type
          if (field === 'quantity' || field === 'rate') {
            value = parseFloat(tempValue) || 0;
          } else if (field === 'taxable') {
            value = tempValue === 'true' || tempValue === '1';
          } else if (field === 'description' || field === 'itemDescription') {
            // Allow empty strings for these fields
            value = tempValue;
          }
          
          updateItem(itemId, field, value);
        }
      } else if (editingField.startsWith('company.')) {
        const field = editingField.replace('company.', '');
        updateCompanyField(field, tempValue);
      } else if (editingField.startsWith('bankDetails.')) {
        const field = editingField.replace('bankDetails.', '');
        setInvoiceData(prev => ({
          ...prev,
          bankDetails: {
            bankName: prev.bankDetails?.bankName || '',
            accountName: prev.bankDetails?.accountName || '',
            accountNumber: prev.bankDetails?.accountNumber || '',
            routingNumber: prev.bankDetails?.routingNumber || '',
            swiftCode: prev.bankDetails?.swiftCode || '',
            ...prev.bankDetails,
            [field]: tempValue
          }
        }));
      } else if (editingField.startsWith('taxes.')) {
        const parts = editingField.split('.');
        const taxIndex = parseInt(parts[1]);
        const field = parts[2];
        updateTax(invoiceData.taxes[taxIndex].id, field, tempValue);
      } else {
        updateField(editingField, tempValue);
      }
    }
    setEditingField(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await customerService.createCustomer(customerData);
      if (response.success && response.data) {
        setCustomers(prev => [...prev, response.data!]);
        handleCustomerSelect(response.data!.id);
        setShowCustomerModal(false);
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };


  // Tax management functions
  const addTax = () => {
    const newTax = {
      id: Date.now().toString(),
      name: 'Tax',
      rate: 0,
      amount: 0
    };
    setInvoiceData(prev => ({
      ...prev,
      taxes: [...prev.taxes, newTax]
    }));
  };

  const updateTax = (id: string, field: string, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      taxes: prev.taxes.map(tax => {
        if (tax.id === id) {
          // Convert rate to number if it's the rate field
          const processedValue = field === 'rate' 
            ? (typeof value === 'string' ? parseFloat(value) || 0 : (typeof value === 'number' ? value : 0))
            : value;
          
          const updatedTax = { ...tax, [field]: processedValue };
          if (field === 'rate') {
            // Ensure rate is a number for calculation
            const rate = typeof updatedTax.rate === 'number' ? updatedTax.rate : parseFloat(String(updatedTax.rate)) || 0;
            updatedTax.amount = (subtotal * rate) / 100;
          }
          return updatedTax;
        }
        return tax;
      })
    }));
  };

  const removeTax = (id: string) => {
    setInvoiceData(prev => {
      const remainingTaxes = prev.taxes.filter(tax => tax.id !== id);
      // If removing the last tax, also clear taxRate to ensure no taxes are applied
      return {
        ...prev,
        taxes: remainingTaxes,
        taxRate: remainingTaxes.length === 0 ? 0 : prev.taxRate
      };
    });
  };

  // Calculate amounts in display currency
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * invoiceData.discount) / 100;
  const taxableSubtotal = invoiceData.items
    .filter(item => item.taxable !== false)
    .reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = taxableSubtotal - (discountAmount * (taxableSubtotal / subtotal));
  
  // Calculate taxes in display currency
  // Ensure all tax rates are numbers before calculation
  // Only include taxes with rate > 0
  const calculatedTaxes = invoiceData.taxes
    .filter(tax => {
      const rate = typeof tax.rate === 'number' ? tax.rate : parseFloat(String(tax.rate)) || 0;
      return rate > 0;
    })
    .map(tax => {
      const rate = typeof tax.rate === 'number' ? tax.rate : parseFloat(String(tax.rate)) || 0;
      return {
        ...tax,
        rate: rate, // Ensure rate is always a number
        amount: Math.round((taxableAmount * rate) / 100 * 100) / 100
      };
    });
  
  const totalTaxAmount = Math.round(calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0) * 100) / 100;
  const total = (subtotal - discountAmount) + totalTaxAmount;

  // Convert to Leones for database storage (but keep display amounts in original currency)
  const subtotalInLeones = convertToLeones(subtotal, invoiceData.currency);
  const discountAmountInLeones = convertToLeones(discountAmount, invoiceData.currency);
  const totalTaxAmountInLeones = convertToLeones(totalTaxAmount, invoiceData.currency);
  const totalInLeones = convertToLeones(total, invoiceData.currency);



  return (
    <div 
      className={cn("min-h-screen p-6", className)}
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)'
      }}
    >
      <div
        className="print-invoice flex flex-col"
        style={{
          width: 'min(210mm, 100%)',
          maxWidth: '100%',
          backgroundColor: 'var(--card, #ffffff)',
          color: 'var(--foreground, #0f172a)',
          fontFamily: 'Arial, sans-serif',
          border: '4px solid var(--accent, #2563eb)',
          borderRadius: '8px',
          boxSizing: 'border-box',
          position: 'relative',
          margin: '0 auto',
          padding: '10mm',
          paddingTop: '8mm',
          paddingBottom: '10mm',
          minHeight: '297mm',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.14)',
          alignSelf: 'center'
        }}
      >
        {/* Header Section */}
        <header className="mb-8">
          {/* Top Section: Logo + Company Name Left, Contact Info Right */}
          <div className="flex justify-between items-start mb-8">
            {/* Left: Logo */}
            <div className="relative" style={{ width: 0, height: 0 }}>
              {invoiceData.company.logo ? (
                <img
                  src={invoiceData.company.logo}
                  alt="Company Logo"
                  className="absolute object-contain"
                  style={{
                    width: '300px',
                    height: '120px',
                    maxWidth: '300px',
                    maxHeight: '120px',
                    top: '5mm',
                    left: '2mm',
                    display: 'block',
                    margin: 0,
                    padding: 0,
                    verticalAlign: 'top',
                    lineHeight: 0,
                    fontSize: 0,
                    objectFit: 'contain',
                    zIndex: 1
                  }}
                />
              ) : null}
              
              {/* Default House Of Electronics Logo */}
              <img
                src="/images/hoe logo.png"
                alt="House Of Electronics Logo"
                className="absolute object-contain"
                style={{
                  width: '300px',
                  height: '120px',
                  maxWidth: '300px',
                  maxHeight: '120px',
                  top: '5mm',
                  left: '2mm',
                  display: 'block',
                  margin: 0,
                  padding: 0,
                  verticalAlign: 'top',
                  lineHeight: 0,
                  fontSize: 0,
                  objectFit: 'contain',
                  zIndex: 1,
                  opacity: invoiceData.company.logo ? 0 : 1
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Right: Company Contact Information */}
            <div className="text-right text-sm">
              <div 
                className="font-bold mb-1 text-base cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => startEditing('company.name', invoiceData.company.name)}
              >
                {editingField === 'company.name' ? (
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    className="w-full border-none outline-none bg-transparent"
                    autoFocus
                  />
                ) : (
                  invoiceData.company.name
                )}
              </div>
              <div 
                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => startEditing('company.address', invoiceData.company.address)}
              >
                {editingField === 'company.address' ? (
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    className="w-full border-none outline-none bg-transparent"
                    autoFocus
                  />
                ) : (
                  invoiceData.company.address
                )}
              </div>
              <div 
                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => startEditing('company.city', invoiceData.company.city)}
              >
                {editingField === 'company.city' ? (
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    className="w-full border-none outline-none bg-transparent"
                    autoFocus
                  />
                ) : (
                  invoiceData.company.city
                )}
              </div>
              <div className="mt-2">
                Mobile: <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                  onClick={() => startEditing('company.phone', invoiceData.company.phone)}
                >
                  {editingField === 'company.phone' ? (
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyPress}
                      className="w-full border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    invoiceData.company.phone
                  )}
                </span>
              </div>
              <div 
                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => startEditing('company.email', invoiceData.company.email)}
              >
                {editingField === 'company.email' ? (
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    className="w-full border-none outline-none bg-transparent"
                    autoFocus
                  />
                ) : (
                  invoiceData.company.email
                )}
              </div>
            </div>
          </div>

          {/* Invoice Type Indicator */}
          <div className="my-8">
            <div className="flex items-center justify-center">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--accent)' }} />
              <div className="mx-8 relative">
                <select
                  value={invoiceData.invoiceType}
                  onChange={(e) => {
                    console.log('LiveInvoiceEditor - Dropdown changed to:', e.target.value);
                    updateField('invoiceType', e.target.value);
                  }}
                  className="px-8 py-3 pr-12 font-bold text-base tracking-wide uppercase text-center bg-white border-2 rounded-md focus:outline-none cursor-pointer appearance-none"
                  style={{ 
                    color: 'var(--accent)', 
                    borderColor: 'var(--accent)', 
                    boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.1em',
                    minWidth: '120px'
                  }}
                >
                  <option value="invoice">INVOICE</option>
                  <option value="proforma">PROFORMA</option>
                  <option value="quote">QUOTE</option>
                  <option value="credit_note">CREDIT NOTE</option>
                  <option value="delivery">DELIVERY NOTE</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--accent)' }} />
            </div>
          </div>

          {/* Currency Selector */}
          <div className="my-4">
            <div className="flex items-center justify-center">
              <div className="flex-1 h-px bg-gray-300" />
              <div className="mx-8 relative">
                <select
                  value={invoiceData.currency}
                  onChange={(e) => {
                    console.log('LiveInvoiceEditor - Currency changed to:', e.target.value);
                    updateField('currency', e.target.value);
                  }}
                  className="px-6 py-2 pr-10 font-medium text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 cursor-pointer appearance-none"
                  style={{ 
                    boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent)',
                    minWidth: '100px'
                  }}
                >
                  {getAllCurrencies().map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          </div>

          {/* Bottom Section: Bill To Left, Invoice Details Right */}
          <div className="flex justify-between items-start">
            {/* Left: Bill To */}
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>BILL TO</div>
              
              {/* Customer Search Dropdown */}
              <div className="relative mb-4 customer-dropdown">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowCustomerModal(true)}
                    className="flex items-center gap-1"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    New
                  </Button>
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleCustomerSelect(customer.id)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          {customer.email && (
                            <div className="text-gray-500 text-xs">{customer.email}</div>
                          )}
                          {customer.phone && (
                            <div className="text-gray-500 text-xs">{customer.phone}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {customerSearchTerm ? 'No customers found' : 'No customers available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-sm">
                <div className="font-bold">
                  {invoiceData.customer.name || 'No customer selected'}
                </div>
                {invoiceData.customer.address && (
                  <div>{invoiceData.customer.address}</div>
                )}
                {invoiceData.customer.city && (
                  <div>{invoiceData.customer.city}</div>
                )}
                {invoiceData.customer.phone && (
                  <div>Mobile: {invoiceData.customer.phone}</div>
                )}
                {invoiceData.customer.email && (
                  <div>{invoiceData.customer.email}</div>
                )}
              </div>
            </div>

            {/* Right: Invoice Details */}
            <div className="text-right text-sm">
              <div>
                <span className="font-semibold">Invoice Number:</span> 
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded ml-2"
                  onClick={() => startEditing('invoiceNumber', invoiceData.invoiceNumber)}
                >
                  {editingField === 'invoiceNumber' ? (
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyPress}
                      className="w-full border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    invoiceData.invoiceNumber
                  )}
                </span>
              </div>
              <div>
                <span className="font-semibold">Date:</span> 
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded ml-2"
                  onClick={() => startEditing('date', invoiceData.date)}
                >
                  {editingField === 'date' ? (
                    <input
                      type="date"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyPress}
                      className="w-full border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    invoiceData.date ? new Date(invoiceData.date).toLocaleDateString() : 'N/A'
                  )}
                </span>
              </div>
              <div>
                <span className="font-semibold">Payment Due:</span> 
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded ml-2"
                  onClick={() => startEditing('dueDate', invoiceData.dueDate)}
                >
                  {editingField === 'dueDate' ? (
                    <input
                      type="date"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyPress}
                      className="w-full border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString() : 'N/A'
                  )}
                </span>
              </div>
              <div
                className="mt-2 px-4 py-2 font-bold rounded"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--accent) 20%, transparent)'
                }}
              >
                Amount Due: {formatCurrencyWithSymbol(total, invoiceData.currency)}
              </div>
            </div>
          </div>
        </header>

        {/* Items Table */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Items
            </div>
            <div className="flex items-center gap-2">
              {/* Product Search Dropdown */}
              <div className="relative product-dropdown">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    />
                    <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <Button
                    size="sm"
                    onClick={addEmptyItem}
                    className="flex items-center gap-1"
                    variant="outline"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                {/* Product Dropdown */}
                {showProductDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleProductSelect(product.id)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-gray-500 text-xs">
                            {formatCurrencyWithSymbol(convertFromLeones(product.price, invoiceData.currency), invoiceData.currency)} 
                            {product.sku && ` • ${product.sku}`}
                            {product.stock !== undefined && ` • Stock: ${product.stock}`}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {productSearchTerm ? 'No products found' : 'No products available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast, #fff)' }}>
                <th className="text-left py-1 px-2 font-semibold text-xs">Description</th>
                <th className="text-center py-1 px-2 font-semibold text-xs">Quantity</th>
                <th className="text-right py-1 px-2 font-semibold text-xs">Price</th>
                <th className="text-right py-1 px-2 font-semibold text-xs">Amount</th>
                <th className="text-center py-1 px-2 font-semibold text-xs">Taxable</th>
                <th className="text-center py-1 px-2 font-semibold text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, idx) => (
                <tr key={item.id} style={{ backgroundColor: idx % 2 ? 'color-mix(in oklab, var(--accent) 5%, transparent)' : 'transparent' }}>
                  <td className="py-1 px-2 text-xs" style={{ borderBottom: '1px solid color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => startEditing(`item.${item.id}.description`, item.description || '')}
                    >
                      {editingField === `item.${item.id}.description` ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyPress}
                          placeholder="Enter description"
                          className="w-full border-none outline-none bg-transparent"
                          autoFocus
                        />
                      ) : (
                        item.description || <span className="text-gray-400 italic">Click to add description</span>
                      )}
                    </div>
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded mt-1"
                      onClick={() => startEditing(`item.${item.id}.itemDescription`, item.itemDescription || '')}
                    >
                      {editingField === `item.${item.id}.itemDescription` ? (
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyPress}
                          placeholder="Add details (optional)"
                          className="w-full border-none outline-none bg-transparent text-xs opacity-75"
                          autoFocus
                        />
                      ) : (
                        item.itemDescription ? (
                          <div className="text-xs opacity-75 text-gray-600">{item.itemDescription}</div>
                        ) : (
                          <div className="text-xs opacity-50 text-gray-400 italic">Click to add details</div>
                        )
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-2 text-center text-xs" style={{ borderBottom: '1px solid color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => startEditing(`item.${item.id}.quantity`, item.quantity.toString())}
                    >
                      {editingField === `item.${item.id}.quantity` ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyPress}
                          className="w-full border-none outline-none bg-transparent text-center"
                          autoFocus
                        />
                      ) : (
                        item.quantity
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-2 text-right text-xs" style={{ borderBottom: '1px solid color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => startEditing(`item.${item.id}.rate`, item.rate.toString())}
                    >
                      {editingField === `item.${item.id}.rate` ? (
                        <input
                          type="number"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyPress}
                          className="w-full border-none outline-none bg-transparent text-right"
                          autoFocus
                        />
                      ) : (
                        formatCurrencyWithSymbol(item.rate, invoiceData.currency)
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-2 text-right text-xs font-medium" style={{ borderBottom: '1px solid color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                    {formatCurrencyWithSymbol(item.amount, invoiceData.currency)}
                  </td>
                  <td className="py-1 px-2 text-center text-xs" style={{ borderBottom: '1px solid color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.taxable !== false}
                        onChange={(e) => updateItem(item.id, 'taxable', e.target.checked)}
                        className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-2"
                        style={{ color: 'var(--accent)', outlineColor: 'var(--accent)', boxShadow: '0 0 0 2px color-mix(in oklab, var(--accent) 40%, transparent)' }}
                      />
                    </label>
                  </td>
                  <td className="py-1 px-2 text-center text-xs" style={{ borderBottom: '1px solid #f9731630' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {invoiceData.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500 text-sm">
                    No items added yet. Click "Add Item" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Spacer to push totals and footer to bottom */}
        <div className="flex-1"></div>

        {/* Totals Section */}
        <section className="mb-4 flex justify-end">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-1 text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrencyWithSymbol(subtotal, invoiceData.currency)}</span>
            </div>
            {invoiceData.discount > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span>Discount:</span>
                <span>-{formatCurrencyWithSymbol(discountAmount, invoiceData.currency)}</span>
              </div>
            )}
            
            {/* Flexible Tax System */}
            {calculatedTaxes.map((tax, index) => (
              <div key={tax.id} className="flex justify-between py-1 text-sm">
                <div className="flex items-center gap-2">
                  <span 
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => startEditing(`taxes.${index}.name`, tax.name)}
                  >
                    {editingField === `taxes.${index}.name` ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      tax.name
                    )}
                  </span>
                  <span 
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => startEditing(`taxes.${index}.rate`, (typeof tax.rate === 'number' ? tax.rate : parseFloat(String(tax.rate)) || 0).toString())}
                  >
                    {editingField === `taxes.${index}.rate` ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      `${(typeof tax.rate === 'number' ? tax.rate : parseFloat(String(tax.rate)) || 0).toFixed(2)}%`
                    )}
                  </span>
                  <button
                    onClick={() => removeTax(tax.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove tax"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
                <span>{formatCurrencyWithSymbol(tax.amount, invoiceData.currency)}</span>
              </div>
            ))}
            
            {/* Add Tax Button */}
            <div className="flex justify-end py-1">
              <button
                onClick={addTax}
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <PlusIcon className="h-3 w-3" />
                Add Tax
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t-2" style={{ borderColor: 'var(--accent)' }}>
              <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>Total:</div>
              <div className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>{formatCurrencyWithSymbol(total, invoiceData.currency)}</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t-2" style={{ borderColor: 'var(--accent)' }}>
          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="font-semibold mb-1 text-xs" style={{ color: 'var(--accent)' }}>Notes</div>
              {editingField === 'notes' ? (
                <RichTextEditor
                  value={tempValue}
                  onChange={setTempValue}
                  onBlur={saveEdit}
                  placeholder="Click to add notes"
                  className="text-xs"
                />
              ) : (
                <div 
                  className="text-xs cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px]"
                  onClick={() => startEditing('notes', invoiceData.notes || '')}
                  dangerouslySetInnerHTML={{ __html: invoiceData.notes || '<span style="color: var(--muted-foreground); opacity: 0.5;">Click to add notes</span>' }}
                />
              )}
            </div>
            <div>
              <div className="font-semibold mb-1 text-xs" style={{ color: 'var(--accent)' }}>Terms</div>
              {editingField === 'terms' ? (
                <RichTextEditor
                  value={tempValue}
                  onChange={setTempValue}
                  onBlur={saveEdit}
                  placeholder="Click to add terms"
                  className="text-xs"
                />
              ) : (
                <div 
                  className="text-xs cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[60px]"
                  onClick={() => startEditing('terms', invoiceData.terms || '')}
                  dangerouslySetInnerHTML={{ __html: invoiceData.terms || '<span style="color: var(--muted-foreground); opacity: 0.5;">Click to add terms</span>' }}
                />
              )}
            </div>
          </div>

          {/* Bank Payment Details - Single horizontal line */}
          <div className="pt-2 border-t border-gray-200 mb-3">
            <div className="text-xs">
              {invoiceData.bankDetails ? (
                <span>
                  Bank Details Bank : 
                  <span 
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => startEditing('bankDetails.bankName', invoiceData.bankDetails?.bankName || '')}
                  >
                    {editingField === 'bankDetails.bankName' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      ` ${invoiceData.bankDetails.bankName}`
                    )}
                  </span>
                  {' BBAN#: '}
                  <span 
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => startEditing('bankDetails.accountNumber', invoiceData.bankDetails?.accountNumber || '')}
                  >
                    {editingField === 'bankDetails.accountNumber' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      invoiceData.bankDetails.accountNumber
                    )}
                  </span>
                  {' Account#: '}
                  <span 
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => startEditing('bankDetails.accountName', invoiceData.bankDetails?.accountName || '')}
                  >
                    {editingField === 'bankDetails.accountName' ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyPress}
                        className="w-full border-none outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      invoiceData.bankDetails.accountName
                    )}
                  </span>
                </span>
              ) : (
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded text-gray-500"
                  onClick={() => startEditing('bankDetails.bankName', '')}
                >
                  Click to add bank details
                </span>
              )}
            </div>
          </div>

          {/* Brand Logos */}
          <div className="flex items-center justify-center flex-wrap gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'color-mix(in oklab, var(--accent) 20%, transparent)' }}>
            <img 
              src="/logo/Apple-Logo.png" 
              alt="Apple" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/Asus-Logo.png" 
              alt="Asus" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/Dell Logo.png" 
              alt="Dell" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/DJI-logo.webp" 
              alt="DJI" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/Google-logo.png" 
              alt="Google" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/HP-Logо.png" 
              alt="HP" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/lenovo-logo.png" 
              alt="Lenovo" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/microsoft-logo.png" 
              alt="Microsoft" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/playstation-logo.png" 
              alt="PlayStation" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/samsung-Logo.png" 
              alt="Samsung" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/sony-logo.svg" 
              alt="Sony" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <img 
              src="/logo/Tplink-logo.png" 
              alt="TP-Link" 
              className="h-5 w-auto object-contain opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </footer>
      </div>

      {/* Save Button */}
      <div className="flex justify-center mt-6">
        <Button 
          onClick={() => {
            console.log('LiveInvoiceEditor - Saving with invoiceType:', invoiceData.invoiceType);
            console.log('LiveInvoiceEditor - Saving with taxes:', invoiceData.taxes);
            
            // Convert all amounts to Leones for database storage
            const invoiceDataForStorage = {
              ...invoiceData,
              // Convert items to Leones
              items: invoiceData.items.map(item => ({
                ...item,
                rate: convertToLeones(item.rate, invoiceData.currency),
                amount: convertToLeones(item.amount, invoiceData.currency)
              })),
              // Convert totals to Leones
              subtotal: convertToLeones(subtotal, invoiceData.currency),
              discount: convertToLeones(discountAmount, invoiceData.currency),
              tax: convertToLeones(totalTaxAmount, invoiceData.currency),
              total: convertToLeones(total, invoiceData.currency),
              // Convert taxes to Leones
              taxes: calculatedTaxes.map(tax => ({
                ...tax,
                amount: convertToLeones(tax.amount, invoiceData.currency)
              }))
            };
            
            console.log('LiveInvoiceEditor - Converted data for storage:', invoiceDataForStorage);
            onSave?.(invoiceDataForStorage);
          }}
          className="px-8 py-3 text-lg"
        >
          Save Invoice
        </Button>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerForm
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleCustomerCreated}
          title="Add New Customer"
        />
      )}
    </div>
  );
}
