import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceBuilder } from '@/components/ui/invoice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { convertFromLeones, convertToLeones } from '@/lib/utils/currency';
import { useSettings } from '@/contexts/SettingsContext';

// Default invoice data structure
const getDefaultInvoiceData = (): {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    company: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        email: string;
        website: string;
        logo: string;
    };
    customer: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        email: string;
    };
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        rate: number;
        amount: number;
    }>;
    notes: string;
    terms: string;
    taxRate: number;
    taxes: Array<{
        id: string;
        name: string;
        rate: number;
        amount: number;
    }>;
    discount: number;
    invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
    currency: string;
} => ({
    invoiceNumber: 'INV-2024-001',
    date: '2024-01-15',
    dueDate: '2024-02-15',
    currency: 'NLe',
    company: {
        name: "House Of Electronics S/L LTD",
        address: "13 A Sander Street Middle Floor",
        city: "Freetown",
        state: "Sierra Leone",
        zip: "",
        phone: "+232-77-593-479",
        email: "sales@tahoe-sl.com",
        website: "",
        logo: ""
    },
    customer: {
        name: "House Of Electronics S/L LTD",
        address: "123 Business Ave, Suite 100",
        city: "Freetown",
        state: "Western Area Urban, BO etc",
        zip: "00232",
        phone: "+232 74 123-4567",
        email: "info@houseofelectronics.com"
    },
    items: [
        {
            id: "1",
            description: "Website Development",
            quantity: 1,
            rate: 2000,
            amount: 2000
        },
        {
            id: "2",
            description: "SEO Optimization",
            quantity: 1,
            rate: 500,
            amount: 500
        }
    ],
    notes: "Thank you for your business!",
    terms: "Payment due within 30 days of invoice date.",
    taxRate: 0,
    taxes: [],
    discount: 0,
    invoiceType: 'invoice'
});

export default function EditInvoicePage() {
    const params = useParams();
    const navigate = useNavigate();
    const { companySettings } = useSettings();

    const invoiceId = params.id as string;
    const [invoiceData, setInvoiceData] = useState(() => {
        const base = getDefaultInvoiceData();
        return { ...base, currency: companySettings.currency || 'NLe' };
    });
    const [loading, setLoading] = useState(false);
    const [, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const loadInvoiceData = useCallback(async () => {
        try {
            setLoading(true);

            if (!window.electron?.ipcRenderer) {
                throw new Error('Electron not available');
            }

            const result = await window.electron.ipcRenderer.invoke('get-invoice-by-id', invoiceId) as {
                success: boolean;
                data?: unknown;
                error?: string;
            };

            if (!result.success) {
                throw new Error(result.error || 'Failed to load invoice');
            }

            const invoice = result.data as {
                id: string;
                number: string;
                customerId?: string;
                customerName: string;
                customerEmail: string;
                customerAddress: string;
                customerPhone: string;
                issueDate: string;
                dueDate: string;
                invoiceType: "invoice" | "proforma" | "quote" | "credit_note" | "delivery";
                currency: string;
                subtotal: number;
                tax: number;
                taxes?: Array<{
                    id: string;
                    name: string;
                    rate: number;
                    amount: number;
                }>;
                discount: number;
                total: number;
                paidAmount: number;
                balance: number;
                status: "draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled";
                items: Array<{
                    id: string;
                    description: string;
                    quantity: number;
                    rate: number;
                    amount: number;
                }>;
                notes?: string;
                terms?: string;
                bankDetails?: {
                    bankName: string;
                    accountName?: string;
                    accountNumber: string;
                    routingNumber?: string;
                    swiftCode?: string;
                };
                createdAt: string;
                updatedAt: string;
            };

            // Transform API data to InvoiceBuilder format
            const customerAddressParts = (invoice.customerAddress || '').split(',').map((s: string) => s.trim());

            // Helper function to parse JSON strings (handles double-encoding and various formats)
            const parseJsonField = (value: any): any[] => {
                if (Array.isArray(value)) {
                    return value;
                }
                if (typeof value === 'string') {
                    // Skip if it's the string "null" or empty
                    if (value === 'null' || value.trim() === '') {
                        return [];
                    }
                    try {
                        let parsed = JSON.parse(value);
                        // Handle double-encoded JSON (string containing JSON string)
                        if (typeof parsed === 'string') {
                            parsed = JSON.parse(parsed);
                        }
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        console.error('Error parsing JSON field:', e, 'Value:', value);
                        return [];
                    }
                }
                return [];
            };

            // Parse items and taxes from JSON strings if needed
            const itemsArray = parseJsonField(invoice.items);
            const taxesArray = parseJsonField(invoice.taxes);

            // IMPORTANT: Load invoice with its original currency from database
            // All amounts in database are stored in Leones (SLE)
            // We need to convert them to the invoice's original currency for display/editing

            // CRITICAL: Ensure we have a valid currency - if missing, log error
            if (!invoice.currency) {
                console.error('⚠️ InvoiceEditPage - WARNING: Invoice currency is missing from database!', {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.number
                });
            }

            const displayCurrency = invoice.currency || companySettings.currency || 'NLe'; // Use invoice's currency, default to settings

            console.log('InvoiceEditPage - Loading invoice:');
            console.log('  - Invoice currency from database:', invoice.currency);
            console.log('  - Display currency will be:', displayCurrency);
            console.log('  - Items (raw):', invoice.items);
            console.log('  - Items (parsed):', itemsArray);
            console.log('  - First item from DB (stored in Leones):', itemsArray?.[0]);
            console.log('  - Subtotal from DB (in Leones):', invoice.subtotal);
            console.log('  - Total from DB (in Leones):', invoice.total);

            // Verify conversion is working
            if (itemsArray && itemsArray.length > 0) {
                const firstItem = itemsArray[0];
                const convertedRate = convertFromLeones(firstItem.rate, displayCurrency);
                const convertedAmount = convertFromLeones(firstItem.amount, displayCurrency);
                console.log('  - CONVERSION TEST:');
                console.log(`    Raw from DB - Rate: ${firstItem.rate} SLE, Amount: ${firstItem.amount} SLE`);
                console.log(`    Converted - Rate: ${convertedRate} ${displayCurrency}, Amount: ${convertedAmount} ${displayCurrency}`);

                // If conversion didn't work (same value and currency is not SLE), there's a problem
                if (displayCurrency !== 'NLe' && convertedRate === firstItem.rate) {
                    console.error('⚠️ InvoiceEditPage - ERROR: Conversion failed! Amount unchanged.', {
                        original: firstItem.rate,
                        converted: convertedRate,
                        currency: displayCurrency
                    });
                }
            }

            setInvoiceData({
                invoiceNumber: invoice.number,
                date: invoice.createdAt.split('T')[0],
                dueDate: invoice.dueDate || '',
                currency: displayCurrency,
                company: {
                    name: "House Of Electronics S/L LTD",
                    address: "13 A Sander Street Middle Floor",
                    city: "Freetown",
                    state: "Sierra Leone",
                    zip: "",
                    phone: "+232-77-593-479",
                    email: "sales@tahoe-sl.com",
                    website: "",
                    logo: ""
                },
                customer: {
                    name: invoice.customerName || '',
                    email: invoice.customerEmail || '',
                    address: customerAddressParts[0] || '',
                    city: customerAddressParts[1] || '',
                    state: customerAddressParts[2] || '',
                    zip: customerAddressParts[3] || '',
                    phone: invoice.customerPhone || ''
                },
                items: itemsArray.map(item => {
                    const convertedRate = convertFromLeones(item.rate, displayCurrency);
                    const convertedAmount = convertFromLeones(item.amount, displayCurrency);
                    console.log(`  - Converting item: ${item.rate} SLE -> ${convertedRate} ${displayCurrency}, ${item.amount} SLE -> ${convertedAmount} ${displayCurrency}`);
                    return {
                        ...item,
                        // Convert item amounts from Leones to display currency
                        rate: convertedRate,
                        amount: convertedAmount
                    };
                }),
                notes: invoice.notes || '',
                terms: invoice.terms || '',
                taxRate: invoice.tax && invoice.subtotal ? (invoice.tax / (invoice.subtotal - (invoice.discount || 0))) * 100 : 0,
                taxes: taxesArray.map(tax => ({
                    ...tax,
                    // Convert tax amounts from Leones to display currency
                    amount: convertFromLeones(tax.amount, displayCurrency)
                })),
                discount: invoice.discount && invoice.subtotal ? (invoice.discount / invoice.subtotal) * 100 : 0,
                invoiceType: invoice.invoiceType || 'invoice'
            });
        } catch (error) {
            console.error('Failed to load invoice:', error);
            setToast({ message: 'Failed to load invoice data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        loadInvoiceData();
    }, [loadInvoiceData]);

    const handleSave = async (updatedInvoiceData: {
        invoiceNumber?: string;
        date?: string;
        dueDate?: string;
        invoiceType?: string;
        currency?: string;
        subtotal?: number; // Already in Leones from LiveInvoiceEditor
        tax?: number; // Already in Leones from LiveInvoiceEditor (totalTaxAmount)
        total?: number; // Already in Leones from LiveInvoiceEditor
        // Note: discount from LiveInvoiceEditor is an amount in Leones, not a percentage
        company?: {
            name?: string;
            address?: string;
            city?: string;
            state?: string;
            zip?: string;
            phone?: string;
            email?: string;
            website?: string;
        };
        customer?: {
            id?: string;
            name?: string;
            email?: string;
            address?: string;
            city?: string;
            state?: string;
            zip?: string;
            phone?: string;
        };
        items?: Array<{
            id?: string;
            description?: string;
            quantity?: number;
            rate?: number;
            amount?: number;
            taxable?: boolean;
        }>;
        notes?: string;
        terms?: string;
        taxRate?: number;
        taxes?: Array<{
            id: string;
            name: string;
            rate: number;
            amount: number;
        }>;
        discount?: number;
    }) => {
        try {
            console.log('InvoiceEditPage - Received invoiceType:', updatedInvoiceData.invoiceType);
            console.log('InvoiceEditPage - Full updatedInvoiceData:', updatedInvoiceData);
            setSaving(true);

            // Get the currency from updatedInvoiceData or fall back to invoiceData currency
            const currency = updatedInvoiceData.currency || invoiceData.currency || companySettings.currency || 'NLe';

            // IMPORTANT: LiveInvoiceEditor already converts all amounts to Leones before calling onSave
            // So updatedInvoiceData.items, updatedInvoiceData.subtotal, etc. are already in Leones
            // We should NOT convert them again!

            // Use the amounts directly from updatedInvoiceData (already in Leones)
            // LiveInvoiceEditor's invoiceDataForStorage includes:
            // - items (converted to Leones)
            // - subtotal (converted to Leones - amount, not percentage)
            // - discount (converted to Leones - amount, not percentage)
            // - tax (converted to Leones - totalTaxAmount)
            // - total (converted to Leones)
            // - taxes (converted to Leones)

            const items = updatedInvoiceData.items || [];
            const subtotal = updatedInvoiceData.subtotal ?? items.reduce((sum, item) => sum + (item.amount || 0), 0);
            const discountAmount = updatedInvoiceData.discount ?? 0;
            const totalTaxAmount = updatedInvoiceData.tax ?? 0;
            const taxes = updatedInvoiceData.taxes || [];
            const total = updatedInvoiceData.total ?? (subtotal - discountAmount + totalTaxAmount);

            // Prepare customer address
            const customer = updatedInvoiceData.customer;
            const customerAddress = customer ?
                `${customer.address || ''}${customer.city ? ', ' + customer.city : ''}${customer.state ? ', ' + customer.state : ''}${customer.zip ? ' ' + customer.zip : ''}`.trim()
                : '';

            // All amounts are already in Leones from LiveInvoiceEditor - use them directly
            const requestBody = {
                number: updatedInvoiceData.invoiceNumber,
                customerId: customer?.id || undefined,
                customerName: customer?.name || '',
                customerEmail: customer?.email || '',
                customerAddress: customerAddress,
                customerPhone: customer?.phone || '',
                items: items, // Already in Leones
                subtotal: subtotal, // Already in Leones
                tax: totalTaxAmount, // Already in Leones
                taxes: taxes, // Already in Leones
                discount: discountAmount, // Already in Leones
                total: total, // Already in Leones
                invoiceType: updatedInvoiceData.invoiceType || 'invoice',
                currency: currency,
                dueDate: updatedInvoiceData.dueDate || '',
                notes: updatedInvoiceData.notes || '',
                terms: updatedInvoiceData.terms || '',
            };

            console.log('InvoiceEditPage - Request body invoiceType:', requestBody.invoiceType);
            console.log('InvoiceEditPage - Full request body:', requestBody);

            if (!window.electron?.ipcRenderer) {
                throw new Error('Electron not available');
            }

            const result = await window.electron.ipcRenderer.invoke('update-invoice', {
                id: invoiceId,
                body: requestBody
            }) as {
                success: boolean;
                data?: unknown;
                error?: string;
            };

            if (!result.success) {
                throw new Error(result.error || 'Failed to update invoice');
            }

            setToast({ message: 'Invoice updated successfully!', type: 'success' });

            // Redirect to invoice details after a short delay
            setTimeout(() => {
                navigate(`/invoices/${invoiceId}`);
            }, 1000);
        } catch (error) {
            console.error('Failed to update invoice:', error);
            setToast({ message: 'Failed to update invoice', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = () => {
        setToast({ message: 'Invoice preview updated', type: 'success' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading invoice...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                        Edit Invoice {invoiceData.invoiceNumber}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        Modify invoice details and items
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate(`/invoices/${invoiceId}`)}
                    className="flex items-center gap-2"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Invoice
                </Button>
            </div>

            {/* Invoice Builder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <InvoiceBuilder
                    initialData={invoiceData}
                    onSave={handleSave}
                    className="p-6"
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
        </div>
    );
}
