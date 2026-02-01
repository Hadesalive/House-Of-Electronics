import React from "react";
import { useState, useEffect } from "react";
// import NextImage from "next/image"; // Removed - using regular img tag instead
import { cn } from "@/lib/utils";
import { Button } from "../core/button";
import { Input } from "../forms/input";
import { Textarea } from "../forms/textarea";
import { Tabs } from "../core/tabs";
import { PlusIcon, TrashIcon, CheckIcon, PhotoIcon, XMarkIcon, EyeIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useSettings } from '@/contexts/SettingsContext';
import { ConfirmationDialog } from '../dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { customerService, productService } from '@/lib/services';
import { Customer, Product, InvoiceItem } from '@/lib/types/core';
import { LiveInvoiceEditor } from './live-invoice-editor';

interface InvoiceData {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
    currency?: string;
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
    // New features
    delivery?: {
        trackingNumber?: string;
        carrier?: string;
        deliveryDate?: string;
        deliveryAddress?: string;
        specialInstructions?: string;
    };
    paymentTerms?: {
        method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'paypal' | 'other';
        dueDays: number;
        lateFee?: number;
        earlyPaymentDiscount?: number;
    };
}

interface InvoiceBuilderProps {
    initialData?: Partial<InvoiceData>;
    onSave?: (data: InvoiceData) => void;
    className?: string;
}

export function InvoiceBuilder({
    initialData,
    onSave,
    className = ""
}: InvoiceBuilderProps) {
    const { companySettings, formatCurrency, generateInvoiceNumber, preferences } = useSettings();
    const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();


    // Customer and Product state
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // Product search state
    const [productSearchTerm, setProductSearchTerm] = useState<string>('');

    const [invoiceData, setInvoiceData] = useState<InvoiceData>({
        invoiceNumber: initialData?.invoiceNumber || generateInvoiceNumber('INV'),
        date: initialData?.date || new Date().toISOString().split('T')[0],
        dueDate: initialData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceType: initialData?.invoiceType || 'invoice',
        currency: initialData?.currency || companySettings.currency || 'NLe',
        company: {
            name: initialData?.company?.name || companySettings.companyName || "House Of Electronics S/L LTD",
            address: initialData?.company?.address || companySettings.address || "13 A Sander Street Middle Floor",
            city: initialData?.company?.city || "Freetown",
            state: initialData?.company?.state || "Sierra Leone",
            zip: initialData?.company?.zip || "",
            phone: initialData?.company?.phone || companySettings.phone || "+232-77-593-479",
            email: initialData?.company?.email || companySettings.email || "sales@tahoe-sl.com",
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
        // New features
        delivery: initialData?.delivery,
        paymentTerms: initialData?.paymentTerms || {
            method: 'bank_transfer',
            dueDays: 30,
            lateFee: 0,
            earlyPaymentDiscount: 0
        }
    });

    // Function to reload products
    const loadProducts = async () => {
        try {
            const productsResponse = await productService.getAllProducts();
            if (productsResponse.success && productsResponse.data) {
                setProducts(productsResponse.data);
            }
        } catch (error) {
            console.error('Failed to reload products:', error);
        }
    };

    // Filter products based on search term
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

    // Load customers and products
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load customers
                const customersResponse = await customerService.getAllCustomers();
                if (customersResponse.success && customersResponse.data) {
                    setCustomers(customersResponse.data);
                }
                setLoadingCustomers(false);

                // Load products
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

    // Update state when initialData changes (e.g., when loading invoice in edit mode)
    // Use a ref to track if we've loaded initial data
    const [hasLoadedInitialData, setHasLoadedInitialData] = React.useState(false);

    useEffect(() => {
        console.log('InvoiceBuilder - useEffect triggered:', {
            hasInitialData: !!initialData,
            hasItems: (initialData?.items?.length || 0) > 0,
            hasLoadedInitialData,
            initialDataInvoiceType: initialData?.invoiceType
        });
        if (initialData && initialData.items && (initialData.items.length || 0) > 0 && !hasLoadedInitialData) {
            console.log('InvoiceBuilder - Resetting invoiceData with initialData');
            setInvoiceData({
                invoiceNumber: initialData?.invoiceNumber || generateInvoiceNumberForType(initialData?.invoiceType || 'invoice'),
                date: initialData?.date || new Date().toISOString().split('T')[0],
                dueDate: initialData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                invoiceType: initialData?.invoiceType || 'invoice',
                company: {
                    name: initialData?.company?.name || companySettings.companyName || "House Of Electronics S/L LTD",
                    address: initialData?.company?.address || companySettings.address || "13 A Sander Street Middle Floor",
                    city: initialData?.company?.city || "Freetown",
                    state: initialData?.company?.state || "Sierra Leone",
                    zip: initialData?.company?.zip || "",
                    phone: initialData?.company?.phone || companySettings.phone || "+232-77-593-479",
                    email: initialData?.company?.email || companySettings.email || "sales@tahoe-sl.com",
                    ...initialData?.company
                },
                customer: {
                    id: initialData?.customer?.id,
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
                taxes: initialData?.taxes || []
            });
            // Set selected customer ID if available
            if (initialData?.customer?.id) {
                setSelectedCustomerId(initialData.customer.id);
            }
            setHasLoadedInitialData(true);
        }
    }, [initialData, hasLoadedInitialData, companySettings, generateInvoiceNumber]);

    // Set default discount from preferences
    useEffect(() => {
        if (preferences?.defaultDiscountPercent && !initialData?.discount) {
            setInvoiceData(prev => ({
                ...prev,
                discount: preferences.defaultDiscountPercent
            }));
        }
    }, [preferences?.defaultDiscountPercent, initialData?.discount]);

    // Handle credit note data from sessionStorage (from returns page) - PRIORITY
    useEffect(() => {
        const creditNoteData = sessionStorage.getItem('creditNoteData');
        if (creditNoteData) {
            try {
                const parsedData = JSON.parse(creditNoteData);
                console.log('Loading credit note data from sessionStorage:', parsedData);
                setInvoiceData(prev => ({
                    ...prev,
                    ...parsedData,
                    invoiceNumber: generateInvoiceNumberForType('credit_note'), // Credit note prefix
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0], // Credit notes are immediate
                }));
                setHasLoadedInitialData(true);
                // Clear the sessionStorage data after using it
                sessionStorage.removeItem('creditNoteData');
            } catch (error) {
                console.error('Error parsing credit note data:', error);
            }
        }
    }, [generateInvoiceNumber]);

    const getInvoicePrefix = (invoiceType: string): string => {
        switch (invoiceType) {
            case 'credit_note': return 'CR';
            case 'proforma': return 'PF';
            case 'quote': return 'QUO';
            case 'delivery': return 'DEL';
            default: return 'INV';
        }
    };

    const generateInvoiceNumberForType = (invoiceType: string): string => {
        return generateInvoiceNumber(getInvoicePrefix(invoiceType));
    };

    const updateField = (field: string, value: string | number | object) => {
        setInvoiceData(prev => {
            const updated = {
                ...prev,
                [field]: value
            };

            // If invoice type changed, update the invoice number
            if (field === 'invoiceType' && typeof value === 'string') {
                updated.invoiceNumber = generateInvoiceNumberForType(value);
            }

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

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                updateCompanyField('logo', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        updateCompanyField('logo', '');
    };

    const handleCustomerSelect = (customerId: string) => {
        setSelectedCustomerId(customerId);

        if (customerId === '') {
            // Clear customer fields
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

    const updateCustomerField = (field: string, value: string) => {
        setInvoiceData(prev => ({
            ...prev,
            customer: {
                ...prev.customer,
                [field]: value
            }
        }));
    };

    // Auto-create customer and products when invoice is saved
    const handleSaveWithAutoCreate = async () => {
        console.log('Starting auto-creation process...');

        // Auto-create customer if they have name, address, and phone
        if (invoiceData.customer.name && invoiceData.customer.address && invoiceData.customer.phone) {
            console.log('Auto-creating customer...');
            await autoCreateCustomer({
                name: invoiceData.customer.name,
                address: invoiceData.customer.address,
                phone: invoiceData.customer.phone,
                email: invoiceData.customer.email
            });
        }

        // Auto-create products for all items that have description and rate
        // Skip custom items (isCustomItem === true)
        console.log('Checking items for auto-creation:', invoiceData.items);
        for (const item of invoiceData.items) {
            if (item.description && item.rate > 0 && !item.isCustomItem) {
                console.log('Auto-creating product for item:', item);
                await autoCreateProduct(item);
            }
        }

        // Call the original save function
        console.log('Calling original save function...');
        onSave?.(invoiceData);
    };

    const addItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            description: "",
            itemDescription: "",
            quantity: 1,
            rate: 0,
            amount: 0,
            stock: 0
        };
        setInvoiceData(prev => {
            const updated = {
                ...prev,
                items: [...prev.items, newItem]
            };
            return updated;
        });
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

                    // Note: Product auto-creation will happen when invoice is saved

                    return updatedItem;
                }
                return item;
            })
        }));
    };

    // Auto-create product when item is added with new description
    const autoCreateProduct = async (item: InvoiceItem) => {
        try {
            console.log('Auto-creating product for item:', item);

            // Check if product already exists (improved duplicate detection)
            const existingProduct = products.find(p => {
                const nameMatch = p.name.toLowerCase().trim() === item.description.toLowerCase().trim();
                const skuMatch = item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase();
                const priceMatch = Math.abs(p.price - item.rate) < 0.01; // Within 1 cent
                return nameMatch || (skuMatch && priceMatch);
            });

            if (existingProduct) {
                console.log('Product already exists:', existingProduct.name);
                return; // Product already exists
            }

            // Create new product
            const productData = {
                name: item.description,
                description: item.itemDescription || '',
                price: item.rate,
                cost: item.cost || 0, // Use actual cost from item
                sku: item.sku || `AUTO-${Date.now()}`,
                category: item.category || 'Auto-created',
                stock: item.stock || 0,
                minStock: item.minStock || 0,
                isActive: item.isActive !== false
            };

            // Validate that all required fields are present
            if (!productData.name || productData.price <= 0 || productData.cost < 0) {
                console.error('Invalid product data:', productData);
                return;
            }

            console.log('Creating product with data:', productData);
            const response = await productService.createProduct(productData);
            console.log('Product creation response:', response);

            if (response.success && response.data) {
                // Reload products to include the new one
                loadProducts();
                console.log('Auto-created product successfully:', response.data);
            } else {
                console.error('Failed to create product:', response.error);
            }
        } catch (error) {
            console.error('Failed to auto-create product:', error);
        }
    };

    // Auto-create customer when customer details are added
    const autoCreateCustomer = async (customerData: { name: string; address: string; phone: string; email?: string }) => {
        try {
            // Check if customer already exists
            const existingCustomer = customers.find(c =>
                c.name.toLowerCase() === customerData.name.toLowerCase() ||
                (c.phone && c.phone === customerData.phone)
            );

            if (existingCustomer) {
                return existingCustomer; // Customer already exists
            }

            // Create new customer
            const newCustomerData = {
                name: customerData.name,
                email: customerData.email || '',
                phone: customerData.phone,
                address: customerData.address,
                city: '',
                state: '',
                zip: '',
                country: '',
                company: '',
                notes: 'Auto-created from invoice',
                isActive: true
            };

            const response = await customerService.createCustomer(newCustomerData);
            if (response.success && response.data) {
                // Reload customers to include the new one
                loadCustomers();
                console.log('Auto-created customer:', response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to auto-create customer:', error);
        }
        return null;
    };

    // Function to reload customers
    const loadCustomers = async () => {
        try {
            const customersResponse = await customerService.getAllCustomers();
            if (customersResponse.success && customersResponse.data) {
                setCustomers(customersResponse.data);
            }
        } catch (error) {
            console.error('Failed to reload customers:', error);
        }
    };

    const removeItem = (id: string) => {
        confirm(
            {
                title: 'Delete Item',
                message: 'Are you sure you want to delete this item? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                variant: 'danger'
            },
            () => {
                setInvoiceData(prev => {
                    const updated = {
                        ...prev,
                        items: prev.items.filter(item => item.id !== id)
                    };
                    return updated;
                });
            }
        );
    };

    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = (subtotal * invoiceData.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * invoiceData.taxRate) / 100;
    const total = taxableAmount + taxAmount;

    // Check if sections are completed
    const isBasicInfoComplete = invoiceData.invoiceNumber && invoiceData.date && invoiceData.dueDate;
    const isCompanyComplete = invoiceData.company.name && invoiceData.company.address;
    const isCustomerComplete = invoiceData.customer.name;
    const isItemsComplete = invoiceData.items.length > 0 && invoiceData.items.every(item => item.description && item.quantity > 0 && item.rate > 0);


    return (
        <div
            className={cn("min-h-screen", className)}
            style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)'
            }}
        >
            <div className="space-y-8 p-6">
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
                                Invoice Builder
                            </div>
                        </div>

                        {/* Right line */}
                        <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: 'var(--accent)' }}
                        />
                    </div>
                    <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
                        Create professional invoices with ease
                    </p>
                </div>

                {/* Live Invoice Editor */}
                <LiveInvoiceEditor
                    initialData={invoiceData}
                    onSave={onSave}
                    className=""
                />
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isOpen}
                onClose={handleClose}
                onConfirm={handleConfirm}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
            />
        </div>
    );
}
