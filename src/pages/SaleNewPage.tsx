import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { customerService, productService, salesService } from '@/lib/services';
import { Customer, Product, SaleItem } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    UserIcon,
    CubeIcon,
    CurrencyDollarIcon,
    ReceiptPercentIcon,
    ArrowLeftIcon,
    PrinterIcon
} from '@heroicons/react/24/outline';
import { CompactProductForm } from '@/components/ui/forms/compact-product-form';
import { CompactCustomerForm } from '@/components/ui/forms/compact-customer-form';
import { SimpleReceipt, renderSimpleReceiptHTML } from '@/components/ui/receipt/SimpleReceipt';
import { makeSaleReceiptData } from '@/components/ui/receipt/formatSimpleReceiptData';

export default function NewSalePage() {
    const navigate = useNavigate();
    const { formatCurrency, preferences, companySettings } = useSettings();
    const { user } = useAuth();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [notes, setNotes] = useState('');
    const [discount, setDiscount] = useState(preferences.defaultDiscountPercent || 0);
    const [taxEnabled, setTaxEnabled] = useState(true); // Tax toggle - enabled by default
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>(
        (preferences.defaultPaymentMethod as 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other') || 'cash'
    );
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Product search and selection
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // Modal states
    const [showProductForm, setShowProductForm] = useState(false);
    const [showCustomerForm, setShowCustomerForm] = useState(false);

    // Credit state
    const [customerCredit, setCustomerCredit] = useState(0);
    const [creditAmount, setCreditAmount] = useState('');
    const [appliedCredit, setAppliedCredit] = useState(0);

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

    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm.trim()) return customers;
        const term = customerSearchTerm.toLowerCase();
        return customers.filter((c) =>
            c.name.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term) ||
            c.phone?.toLowerCase().includes(term)
        );
    }, [customers, customerSearchTerm]);

    const loadCustomerCredit = async (customerId: string) => {
        if (!customerId) {
            setCustomerCredit(0);
            setAppliedCredit(0);
            setCreditAmount('');
            return;
        }

        try {
            const response = await customerService.getCustomerById(customerId);
            if (response.success && response.data) {
                setCustomerCredit(response.data.storeCredit || 0);
            }
        } catch (error) {
            console.error('Failed to load customer credit:', error);
        }
    };

    const handleCustomerSelect = async (customerId: string, displayLabel = '') => {
        setSelectedCustomer(customerId);
        setCustomerSearchTerm(displayLabel);
        setShowCustomerDropdown(false);
        await loadCustomerCredit(customerId);
    };

    const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
        try {
            const response = await customerService.createCustomer(customerData);
            if (response.success && response.data) {
                setCustomers(prev => [...prev, response.data!]);
                setSelectedCustomer(response.data.id);
                setCustomerSearchTerm(response.data.name);
                setShowCustomerForm(false);
                await loadCustomerCredit(response.data.id);
                setToast({ message: 'Customer created successfully', type: 'success' });
            } else {
                setToast({ message: response.error || 'Failed to create customer', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create customer:', error);
            setToast({ message: 'Failed to create customer', type: 'error' });
        }
    };


    // Filter products based on search term
    const filteredProducts = useMemo(() => {
        if (!productSearchTerm.trim()) return products;
        const searchLower = productSearchTerm.toLowerCase();
        return products.filter(product =>
            product.name.toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower) ||
            product.sku?.toLowerCase().includes(searchLower) ||
            product.category?.toLowerCase().includes(searchLower)
        );
    }, [products, productSearchTerm]);


    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.product-dropdown')) {
                setShowProductDropdown(false);
            }
            if (!target.closest('.customer-dropdown')) {
                setShowCustomerDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleProductCreated = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
        try {
            // Create the product
            const response = await productService.createProduct(productData);

            if (response.success && response.data) {
                // Add new product to products list
                setProducts(prev => [...prev, response.data!]);

                // Automatically add the product to the sale
                const currentSaleItems = saleItems || [];
                const newItem: SaleItem = {
                    productId: response.data.id,
                    productName: response.data.name,
                    quantity: 1,
                    unitPrice: response.data.price,
                    total: response.data.price,
                };

                setSaleItems([...currentSaleItems, newItem]);
                setShowProductForm(false);
                setToast({ message: 'Product created and added to sale', type: 'success' });
            } else {
                setToast({ message: response.error || 'Failed to create product', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create product:', error);
            setToast({ message: 'Failed to create product', type: 'error' });
        }
    };

    const updateItem = (index: number, field: keyof SaleItem, value: string | number | boolean | undefined) => {
        const updatedItems = [...saleItems];
        if (value === undefined && field === 'cost') {
            const { cost, ...rest } = updatedItems[index];
            updatedItems[index] = rest as SaleItem;
        } else if (value !== undefined) {
            updatedItems[index] = { ...updatedItems[index], [field]: value };
        }

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

        // Apply discount if set
        const discountAmount = (subtotal * discount) / 100;
        const discountedSubtotal = subtotal - discountAmount;

        // Calculate tax on discounted amount only if tax is enabled
        const taxRate = companySettings.taxRate || 0.15;
        const tax = taxEnabled ? discountedSubtotal * taxRate : 0;

        // Total is always the original amount (don't subtract credit)
        const total = discountedSubtotal + tax;

        // Calculate cash needed (if credit is applied)
        const creditApplied = appliedCredit;
        const cashNeeded = Math.max(0, total - creditApplied);

        return { subtotal, discount: discountAmount, tax, creditApplied, total, cashNeeded };
    };

    const handleApplyCredit = () => {
        if (!creditAmount || parseFloat(creditAmount) <= 0) {
            setToast({ message: 'Please enter a valid credit amount', type: 'error' });
            return;
        }

        const creditToApply = parseFloat(creditAmount);
        const currentTotal = calculateTotals().total;

        if (creditToApply > customerCredit) {
            setToast({ message: `Only ${formatCurrency(customerCredit)} credit available`, type: 'error' });
            return;
        }

        if (creditToApply > currentTotal) {
            setToast({ message: `Credit cannot exceed sale total of ${formatCurrency(currentTotal)}`, type: 'error' });
            return;
        }

        setAppliedCredit(creditToApply);
        setCreditAmount('');
        setToast({ message: `${formatCurrency(creditToApply)} credit applied`, type: 'success' });
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
                name: companySettings.companyName || "House Of Electronics S/L LTD",
                address: companySettings.address || "Pultney Street",
                city: "Freetown",
                state: "Western Area Urban, BO etc",
                zip: "94105",
                phone: companySettings.phone || "+232 74 123-4567",
                email: companySettings.email || "info@houseofelectronics.com",
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
            taxRate: taxEnabled ? Math.round((companySettings.taxRate || 0.15) * 100) : 0,
            discount: discount,
            footerMessage: preferences.receiptFooter || 'Thank you for your business!'
        };
    };

    // Print receipt
    const handlePrintReceipt = () => {
        if (saleItems.length === 0) {
            setToast({ message: 'Please add at least one item to print receipt', type: 'error' });
            return;
        }
        const receiptData = makeSaleReceiptData({
            id: 'TEMP',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtotal: calculateTotals().subtotal,
            tax: calculateTotals().tax,
            discount: calculateTotals().discount,
            total: calculateTotals().total,
            status: 'completed',
            paymentMethod,
            customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer',
            items: saleItems,
            // ...other Sale fields used by the converter
        }, {
            company: {
                name: companySettings.companyName,
                address: companySettings.address,
                city: (companySettings as any).city || '',
                state: (companySettings as any).state || '',
                zip: (companySettings as any).zip || '',
                phone: companySettings.phone,
                email: companySettings.email,
            },
            preferences,
        });
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt Print</title></head><body>${renderSimpleReceiptHTML(receiptData, formatCurrency)}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const currentSaleItems = saleItems || [];
        if (currentSaleItems.length === 0) {
            setToast({ message: 'Please add at least one item to the sale', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            const { subtotal, discount: discountAmount, tax, creditApplied, total } = calculateTotals();
            const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

            // Use selected customer
            const finalCustomerId = selectedCustomer;
            const finalCustomerName = selectedCustomerData?.name || 'Walk-in Customer';

            // Determine final credit applied and payment method
            let finalCreditApplied = creditApplied;
            let finalPaymentMethod = paymentMethod;

            if (paymentMethod === 'credit') {
                if (!finalCustomerId) {
                    setToast({ message: 'Customer is required when using credit payment', type: 'error' });
                    setLoading(false);
                    return;
                }

                if (customerCredit <= 0) {
                    setToast({ message: 'Customer has no store credit available', type: 'error' });
                    setLoading(false);
                    return;
                }

                // Auto-apply maximum credit if not already applied
                const totalBeforeCredit = subtotal + tax - discountAmount;
                finalCreditApplied = Math.min(customerCredit, totalBeforeCredit);

                if (finalCreditApplied <= 0) {
                    setToast({ message: 'Cannot use credit payment - no balance to cover', type: 'error' });
                    setLoading(false);
                    return;
                }

                // Payment method is credit (keep as is)
                finalPaymentMethod = 'credit';
            } else if (finalCreditApplied > 0) {
                // Credit was manually applied with another payment method
                // Determine if it's fully paid by credit or mixed payment
                const remainingBalance = total - finalCreditApplied;
                if (remainingBalance <= 0) {
                    // Fully paid by credit
                    finalPaymentMethod = 'credit';
                } else {
                    // Mixed payment - keep original payment method for remaining cash
                    finalPaymentMethod = paymentMethod; // Keep original method for cash portion
                }
            }

            // Update customer credit if credit was applied
            let finalNotes = notes || '';
            if (finalCreditApplied > 0 && finalCustomerId) {
                try {
                    const customer = await customerService.getCustomerById(finalCustomerId);
                    if (customer.success && customer.data) {
                        const currentCredit = customer.data.storeCredit || 0;
                        const newCredit = Math.max(0, currentCredit - finalCreditApplied);

                        // Ensure updates is a valid object
                        const updates = { storeCredit: newCredit };
                        const updateResponse = await customerService.updateCustomer(finalCustomerId, updates);

                        if (!updateResponse.success) {
                            throw new Error(updateResponse.error || 'Failed to update customer credit');
                        }

                        const cashNeeded = total - finalCreditApplied;
                        if (cashNeeded > 0) {
                            finalNotes = finalNotes
                                ? `${finalNotes}\nStore credit applied: ${formatCurrency(finalCreditApplied)}. Cash needed: ${formatCurrency(cashNeeded)}`
                                : `Store credit applied: ${formatCurrency(finalCreditApplied)}. Cash needed: ${formatCurrency(cashNeeded)}`;
                        } else {
                            finalNotes = finalNotes
                                ? `${finalNotes}\nStore credit applied: ${formatCurrency(finalCreditApplied)} (Fully paid by credit)`
                                : `Store credit applied: ${formatCurrency(finalCreditApplied)} (Fully paid by credit)`;
                        }
                    }
                } catch (error) {
                    console.error('Failed to apply credit:', error);
                    setToast({ message: `Failed to apply credit: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
                    setLoading(false);
                    return;
                }
            }

            // Total is always the original amount (subtotal + tax - discount)
            // Don't subtract credit from total
            const saleData = {
                customerId: finalCustomerId || undefined,
                customerName: finalCustomerName,
                items: saleItems,
                subtotal,
                tax,
                discount: discountAmount,
                total, // Original total, credit is separate
                status: 'completed' as const,
                paymentMethod: finalPaymentMethod, // Will be 'credit' if credit covers all or selected
                notes: finalNotes || undefined,
                // Add user info for RBAC tracking
                userId: user?.id,
                cashierName: user?.fullName,
                cashierEmployeeId: user?.employeeId,
            };

            const response = await salesService.createSale(saleData);

            if (response.success) {
                // Check for stock warnings (backorders) - if warnings exist in response
                if ((response as any).warnings && (response as any).warnings.length > 0) {
                    const warningMessage = `Sale created with backorders:\n${(response as any).warnings.map((w: any) =>
                        `${w.product}: ${w.available} available, ${w.requested} requested (${w.backorder} backordered)`
                    ).join('\n')}`;
                    setToast({ message: warningMessage, type: 'error' });
                } else {
                    setToast({ message: 'Sale created successfully!', type: 'success' });
                }

                setTimeout(() => {
                    navigate('/sales');
                }, 1000);
            } else {
                // Handle stock validation errors with details
                if (response.error === 'Stock validation failed' && (response as { details?: string[] }).details) {
                    const details = (response as { details?: string[] }).details!;
                    const errorMessage = details.join('\n');
                    setToast({ message: errorMessage, type: 'error' });
                } else {
                    setToast({ message: response.error || 'Failed to create sale', type: 'error' });
                }
            }
        } catch (error) {
            console.error('Error creating sale:', error);
            setToast({ message: 'Failed to create sale', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const totalDetails = calculateTotals();
    const { subtotal, discount: discountAmount, tax, creditApplied, total, cashNeeded } = totalDetails;

    return (
        <div
            className="min-h-screen p-6"
            style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)'
            }}
        >
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Pro Corporate Style Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center mb-6">
                        {/* Left line */}
                        <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: 'var(--accent)' }}
                        />

                        {/* Central title */}
                        <div className="mx-8">
                            <div
                                className="px-8 py-3 font-bold text-lg tracking-wide uppercase text-center"
                                style={{
                                    color: 'var(--accent)',
                                    backgroundColor: 'var(--card)',
                                    border: '2px solid var(--accent)',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '0.1em',
                                    minWidth: '200px'
                                }}
                            >
                                New Sale
                            </div>
                        </div>

                        {/* Right line */}
                        <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: 'var(--accent)' }}
                        />
                    </div>
                    <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
                        Create a new sales transaction with ease
                    </p>
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/sales')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to Sales
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Customer & Product Selection */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Customer Selection */}
                            <div
                                className="p-6 rounded-xl border transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)',
                                    borderWidth: '2px',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
                                    >
                                        <UserIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                                        Customer Information
                                    </h2>
                                </div>
                                <div className="relative space-y-3 customer-dropdown">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                                            <Input
                                                placeholder="Search customers by name, email, or phone..."
                                                value={customerSearchTerm}
                                                onChange={(e) => {
                                                    setCustomerSearchTerm(e.target.value);
                                                    setShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setShowCustomerDropdown(false);
                                                    }
                                                }}
                                                className="pl-10"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowCustomerForm(true)}
                                            className="flex items-center gap-1"
                                        >
                                            <UserIcon className="h-4 w-4" />
                                            New
                                        </Button>
                                    </div>

                                    {showCustomerDropdown && (
                                        <div
                                            className="absolute top-full left-0 right-0 z-50 mt-2 border rounded-lg shadow-lg overflow-hidden"
                                            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                        >
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredCustomers.length === 0 ? (
                                                    <div className="px-4 py-4 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                                                        <p className="text-xs mb-2" style={{ color: 'var(--foreground)' }}>
                                                            No customers found
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setShowCustomerDropdown(false);
                                                                setShowCustomerForm(true);
                                                            }}
                                                            className="text-xs"
                                                        >
                                                            Create New Customer
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    filteredCustomers.slice(0, 10).map((customer) => {
                                                        const label = `${customer.name}${customer.email ? ` (${customer.email})` : ''}`;
                                                        return (
                                                            <button
                                                                key={customer.id}
                                                                type="button"
                                                                onClick={() => handleCustomerSelect(customer.id, label)}
                                                                className="w-full text-left px-3 py-2.5 hover:bg-[var(--muted)] transition-colors cursor-pointer border-b last:border-b-0"
                                                                style={{
                                                                    color: 'var(--foreground)',
                                                                    borderColor: 'var(--border)'
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-sm font-medium truncate">{customer.name}</span>
                                                                            {customer.storeCredit && customer.storeCredit > 0 && (
                                                                                <span
                                                                                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                                                    style={{
                                                                                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                                                                        color: 'rgb(22, 163, 74)'
                                                                                    }}
                                                                                >
                                                                                    {formatCurrency(customer.storeCredit)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {(customer.phone || customer.email) && (
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                {customer.phone && (
                                                                                    <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                                                                                        {customer.phone}
                                                                                    </span>
                                                                                )}
                                                                                {customer.email && (
                                                                                    <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                                                                                        {customer.email}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedCustomer ? (
                                    <div
                                        className="mt-4 p-4 rounded-lg border-2 transition-all"
                                        style={{
                                            backgroundColor: 'rgba(255, 107, 0, 0.1)',
                                            borderColor: 'var(--accent)',
                                            borderStyle: 'dashed'
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                    ✓ Customer Selected
                                                </p>
                                                <p className="text-lg font-bold mt-1" style={{ color: 'var(--accent)' }}>
                                                    {customers.find(c => c.id === selectedCustomer)?.name}
                                                </p>
                                                {customerCredit > 0 && (
                                                    <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                                                        Store Credit: <span className="font-semibold text-green-600">{formatCurrency(customerCredit)}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCustomerSelect('', '')}
                                                className="text-xs"
                                            >
                                                Change
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Product Selection */}
                            <div
                                className="p-6 rounded-xl border transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)',
                                    borderWidth: '2px',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
                                    >
                                        <CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                                        Add Products
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {/* Product Search with Dropdown */}
                                    <div className="relative product-dropdown">
                                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                            Select Product
                                        </label>
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                                            <Input
                                                placeholder="Type to search products (name, SKU, category)..."
                                                value={productSearchTerm}
                                                onChange={(e) => {
                                                    setProductSearchTerm(e.target.value);
                                                    setShowProductDropdown(true);
                                                }}
                                                onFocus={() => {
                                                    if (filteredProducts.length > 0) {
                                                        setShowProductDropdown(true);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                        setShowProductDropdown(false);
                                                        setProductSearchTerm('');
                                                    }
                                                }}
                                                className="pl-10"
                                            />
                                        </div>

                                        {/* Product Dropdown */}
                                        {showProductDropdown && (
                                            <div
                                                className="absolute top-full left-0 right-0 z-50 mt-2 border rounded-lg shadow-lg overflow-hidden"
                                                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                            >

                                                {/* Product List */}
                                                <div className="max-h-60 overflow-y-auto">
                                                    {filteredProducts.length === 0 ? (
                                                        <div className="px-4 py-4 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                                                            <p className="text-xs mb-2" style={{ color: 'var(--foreground)' }}>
                                                                {productSearchTerm ? 'No products found' : 'No products available'}
                                                            </p>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setShowProductDropdown(false);
                                                                    setShowProductForm(true);
                                                                }}
                                                                className="text-xs"
                                                            >
                                                                Create New Product
                                                            </Button>
                                                        </div>
                                                    ) : filteredProducts.slice(0, 10).length > 0 ? (
                                                        <>
                                                            {filteredProducts.slice(0, 10).map((product) => (
                                                                <button
                                                                    key={product.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Check if product already exists in cart
                                                                        const existingItemIndex = saleItems.findIndex(item => item.productId === product.id);

                                                                        if (existingItemIndex >= 0) {
                                                                            // Update existing item quantity
                                                                            const updatedItems = [...saleItems];
                                                                            updatedItems[existingItemIndex].quantity += 1;
                                                                            updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
                                                                            setSaleItems(updatedItems);
                                                                            setToast({ message: `${product.name} quantity increased`, type: 'success' });
                                                                        } else {
                                                                            // Add new item
                                                                            const newItem: SaleItem = {
                                                                                productId: product.id,
                                                                                productName: product.name,
                                                                                quantity: 1,
                                                                                unitPrice: product.price,
                                                                                total: product.price,
                                                                            };
                                                                            setSaleItems([...saleItems, newItem]);
                                                                            setToast({ message: `${product.name} added to sale`, type: 'success' });
                                                                        }

                                                                        // Clear search and close dropdown
                                                                        setProductSearchTerm('');
                                                                        setShowProductDropdown(false);
                                                                    }}
                                                                    className="w-full p-2.5 text-left border-b last:border-b-0 hover:bg-[var(--muted)] transition-colors product-search-item cursor-pointer"
                                                                    style={{ borderColor: 'var(--border)' }}
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-medium text-sm truncate" style={{ color: 'var(--foreground)' }}>
                                                                                {product.name}
                                                                            </p>
                                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                                {product.sku && (
                                                                                    <span
                                                                                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                                                        style={{
                                                                                            backgroundColor: 'var(--muted)',
                                                                                            color: 'var(--muted-foreground)'
                                                                                        }}
                                                                                    >
                                                                                        {product.sku}
                                                                                    </span>
                                                                                )}
                                                                                {product.stock !== undefined && (
                                                                                    <span
                                                                                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                                                        style={{
                                                                                            backgroundColor: product.stock > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                                            color: product.stock > 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)'
                                                                                        }}
                                                                                    >
                                                                                        {product.stock}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0">
                                                                            <p className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                                                                                {formatCurrency(product.price)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </>
                                                    ) : null}
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Create New Item Button */}
                            <div className="flex justify-center pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setShowProductForm(true)}
                                    variant="outline"
                                    className="flex items-center justify-center gap-2 border-2 border-dashed hover:border-solid transition-all"
                                    style={{ borderColor: 'var(--accent)' }}
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    Create New Product
                                </Button>
                            </div>

                            {/* Sale Items */}
                            {(saleItems || []).length > 0 && (
                                <div
                                    className="p-4 rounded-lg border"
                                    style={{
                                        backgroundColor: 'var(--card)',
                                        borderColor: 'var(--border)'
                                    }}
                                >
                                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                                        Items ({(saleItems || []).length})
                                    </h3>

                                    <div className="space-y-2">
                                        {(saleItems || []).map((item, index) => (
                                            <div
                                                key={index}
                                                className="p-3 border rounded-lg"
                                                style={{
                                                    borderColor: 'var(--border)',
                                                    backgroundColor: 'var(--background)'
                                                }}
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                                                    <div className="md:col-span-2">
                                                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                            {item.productName}
                                                        </p>
                                                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                            {item.productId.substring(0, 8)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            min="1"
                                                            placeholder="Qty"
                                                            className="text-xs py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            step="0.01"
                                                            placeholder="Price"
                                                            className="text-xs py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.cost || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                updateItem(index, 'cost', val);
                                                            }}
                                                            placeholder="Cost"
                                                            className="text-xs py-1"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                                            {formatCurrency(item.total)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="text-red-600 hover:text-red-700 p-1"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Payment & Totals */}
                        <div className="space-y-6">
                            {/* Payment Method */}
                            <div
                                className="p-6 rounded-xl border transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)',
                                    borderWidth: '2px',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
                                    >
                                        <CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                                        Payment Details
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <Select
                                        label="Payment Method"
                                        value={paymentMethod}
                                        onChange={(e) => {
                                            const newMethod = e.target.value as 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
                                            setPaymentMethod(newMethod);

                                            // If credit is selected and customer has credit, auto-apply max credit
                                            if (newMethod === 'credit' && selectedCustomer && customerCredit > 0) {
                                                const totals = calculateTotals();
                                                const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                                                const maxCredit = Math.min(customerCredit, totalBeforeCredit);
                                                if (maxCredit > 0) {
                                                    setAppliedCredit(maxCredit);
                                                }
                                            } else if (newMethod !== 'credit') {
                                                // If switching away from credit, don't clear applied credit but reset payment method's auto-apply
                                                // Keep the credit if it was manually applied
                                            }
                                        }}
                                        options={[
                                            { value: 'cash', label: 'Cash' },
                                            { value: 'card', label: 'Card' },
                                            { value: 'bank_transfer', label: 'Bank Transfer' },
                                            { value: 'credit', label: 'Store Credit' },
                                            { value: 'other', label: 'Other' }
                                        ]}
                                    />

                                    <Input
                                        label="Discount (%)"
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="0"
                                    />

                                    {/* Tax Toggle */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="taxToggle"
                                            checked={taxEnabled}
                                            onChange={(e) => setTaxEnabled(e.target.checked)}
                                            className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                        />
                                        <label htmlFor="taxToggle" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                            Apply Tax ({Math.round((companySettings.taxRate || 0.15) * 100)}%)
                                        </label>
                                    </div>

                                    {/* Store Credit Section - Only show if payment method is NOT credit */}
                                    {selectedCustomer && customerCredit > 0 && paymentMethod !== 'credit' && (
                                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                    Available Store Credit
                                                </label>
                                                <span className="text-sm font-semibold text-green-600">
                                                    {formatCurrency(customerCredit)}
                                                </span>
                                            </div>

                                            {appliedCredit > 0 && (
                                                <div className="mb-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                                                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                        Applied: <span className="font-semibold text-green-600">{formatCurrency(appliedCredit)}</span>
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={Math.min(customerCredit, calculateTotals().total + creditApplied)}
                                                    step="0.01"
                                                    placeholder="Enter credit amount"
                                                    value={creditAmount}
                                                    onChange={(e) => setCreditAmount(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const totals = calculateTotals();
                                                            const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                                                            const maxCredit = Math.min(customerCredit, totalBeforeCredit);
                                                            setCreditAmount(maxCredit.toString());
                                                        }}
                                                        className="flex-1 text-xs"
                                                    >
                                                        Use Max
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleApplyCredit}
                                                        disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                                                        className="flex-1 text-xs"
                                                    >
                                                        Apply Credit
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Credit Payment Info - Show when credit payment method is selected */}
                                    {paymentMethod === 'credit' && selectedCustomer && customerCredit > 0 && (
                                        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                        Store Credit Payment
                                                    </span>
                                                    <span className="text-sm font-semibold text-green-600">
                                                        {formatCurrency(customerCredit)} available
                                                    </span>
                                                </div>
                                                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                    {appliedCredit > 0
                                                        ? `${formatCurrency(appliedCredit)} will be automatically applied to cover this sale.`
                                                        : `Maximum ${formatCurrency(Math.min(customerCredit, calculateTotals().subtotal + calculateTotals().tax - calculateTotals().discount))} will be applied automatically.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Totals */}
                            <div
                                className="p-4 rounded-lg border"
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)'
                                }}
                            >
                                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                                    Summary
                                </h3>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                                        <span style={{ color: 'var(--foreground)' }}>{formatCurrency(subtotal)}</span>
                                    </div>

                                    {discount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span style={{ color: 'var(--muted-foreground)' }}>Discount</span>
                                            <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}

                                    {taxEnabled && (
                                        <div className="flex justify-between text-xs">
                                            <span style={{ color: 'var(--muted-foreground)' }}>Tax</span>
                                            <span style={{ color: 'var(--foreground)' }}>{formatCurrency(tax)}</span>
                                        </div>
                                    )}

                                    {creditApplied > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span style={{ color: 'var(--muted-foreground)' }}>Credit</span>
                                            <span className="text-green-600">-{formatCurrency(creditApplied)}</span>
                                        </div>
                                    )}

                                    {creditApplied > 0 && cashNeeded > 0 && (
                                        <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                            <span style={{ color: 'var(--muted-foreground)' }}>Cash Due</span>
                                            <span className="font-medium text-orange-600">{formatCurrency(cashNeeded)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Total</span>
                                        <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                                            {formatCurrency(total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div
                                className="p-6 rounded-xl border transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)',
                                    borderWidth: '2px',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                                    Additional Notes
                                </h2>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes about this sale..."
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrintReceipt}
                                    disabled={(saleItems || []).length === 0}
                                    className="w-full border-2 transition-all hover:scale-[1.02]"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    <PrinterIcon className="h-5 w-5 mr-2" />
                                    Print Receipt
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/sales')}
                                    className="w-full border-2 transition-all hover:scale-[1.02]"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || (saleItems || []).length === 0}
                                    className="w-full text-lg font-bold py-4 transition-all hover:scale-[1.02] hover:shadow-lg"
                                    style={{
                                        backgroundColor: 'var(--accent)',
                                        color: 'var(--accent-contrast, white)'
                                    }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Creating Sale...
                                        </span>
                                    ) : (
                                        '✓ Create Sale'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Compact Product Form Modal */}
                <CompactProductForm
                    isOpen={showProductForm}
                    onClose={() => setShowProductForm(false)}
                    onSave={handleProductCreated}
                />

                {/* Compact Customer Form Modal */}
                <CompactCustomerForm
                    isOpen={showCustomerForm}
                    onClose={() => setShowCustomerForm(false)}
                    onSave={handleCustomerCreated}
                />

                {/* Toast Notifications */}
                {toast && (
                    <Toast
                        variant={toast.type}
                        onClose={() => setToast(null)}
                    >
                        {toast.message}
                    </Toast>
                )}
            </div>
        </div>
    );
}