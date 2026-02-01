import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Alert, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { salesService, customerService, productService } from '@/lib/services';
import { Sale, Customer, Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    CurrencyDollarIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    DocumentTextIcon,
    ReceiptPercentIcon,
    PrinterIcon,
    CubeIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { ReceiptRenderer } from '@/components/ui/invoice/template-renderers/receipt-renderer';
import { allTemplates } from '@/components/ui/invoice/templates';

interface SaleDetails {
    sale: Sale;
}

export default function SaleDetailsPage() {
    const params = useParams();
    const navigate = useNavigate();
    const { formatCurrency, preferences, companySettings, generateInvoiceNumber } = useSettings();
    const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
    const { user } = useAuth();
    const receiptRef = useRef<HTMLDivElement>(null);

    const saleId = params.id as string;

    const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [creatingInvoice, setCreatingInvoice] = useState(false);

    // Removed pagination state - PaginatedTableCard handles this internally

    const loadSaleDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Load sale details, customers, and products in parallel
            const [saleResponse, customersResponse, productsResponse] = await Promise.all([
                salesService.getSaleById(saleId),
                customerService.getAllCustomers(),
                productService.getAllProducts()
            ]);

            if (saleResponse.success && saleResponse.data) {
                const sale = saleResponse.data;

                // Validate that the sale has required fields
                if (!sale || !sale.id) {
                    console.error('Sale loaded but missing required fields:', sale);
                    setError('Sale data is invalid - missing ID');
                    return;
                }

                const details: SaleDetails = {
                    sale: sale
                };

                setSaleDetails(details);
                // Pagination now handled by PaginatedTableCard component
            } else {
                setError('Sale not found');
            }

            if (customersResponse.success) {
                setCustomers(customersResponse.data || []);
            }

            if (productsResponse.success) {
                setProducts(productsResponse.data || []);
            }
        } catch (error) {
            console.error('Failed to load sale details:', error);
            setError('Failed to load sale details');
        } finally {
            setLoading(false);
        }
    }, [saleId]);

    useEffect(() => {
        if (saleId) {
            loadSaleDetails();
        }
    }, [saleId, loadSaleDetails]);

    const handleCreateInvoice = async () => {
        if (!saleDetails?.sale) return;

        const sale = saleDetails.sale;

        // Check if invoice already exists
        if (sale.invoiceId) {
            setToast({ message: 'This sale already has an invoice', type: 'error' });
            setTimeout(() => {
                navigate(`/invoices/${sale.invoiceId}`);
            }, 1500);
            return;
        }

        setCreatingInvoice(true);

        try {
            // Get customer details if customerId exists
            const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;

            // Calculate totals
            const items = sale.items.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                return {
                    id: `item-${index}`,
                    description: product?.name || item.productName || `Product ${item.productId}`,
                    quantity: item.quantity,
                    rate: item.unitPrice,
                    amount: item.total
                };
            });

            const subtotal = sale.subtotal || items.reduce((sum, item) => sum + (item.amount || 0), 0);
            const discountAmount = sale.discount || 0;
            const taxableAmount = subtotal - discountAmount;
            const taxAmount = sale.tax || 0;
            const total = sale.total || taxableAmount + taxAmount;

            // Prepare customer address
            const customerAddress = customer?.address || '';

            // Generate invoice number
            const invoiceNumber = generateInvoiceNumber('INV');

            // Prepare the request body
            const requestBody = {
                number: invoiceNumber,
                saleId: sale.id,
                customerId: sale.customerId || undefined,
                customerName: sale.customerName || customer?.name || 'Walk-in Customer',
                customerEmail: customer?.email || '',
                customerAddress: customerAddress,
                customerPhone: customer?.phone || '',
                items: items,
                subtotal: subtotal,
                tax: taxAmount,
                taxes: sale.tax > 0 ? [{
                    id: 'default-tax',
                    name: 'Tax',
                    rate: sale.subtotal > 0 ? (sale.tax / sale.subtotal) * 100 : 0,
                    amount: taxAmount
                }] : [],
                discount: discountAmount,
                total: total,
                status: preferences.defaultInvoiceStatus || 'draft',
                invoiceType: 'invoice',
                currency: companySettings.currency || 'NLe',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: sale.notes || '',
                terms: 'Payment due within 30 days of invoice date.',
                bankDetails: undefined,
                // Add user info for RBAC tracking
                userId: user?.id,
                salesRepName: user?.fullName,
                salesRepId: user?.employeeId,
            };

            // Create invoice via IPC
            if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                const result = await window.electron.ipcRenderer.invoke('create-invoice', requestBody) as {
                    success: boolean;
                    data?: {
                        id: string;
                        number: string;
                    };
                    error?: string;
                    warning?: string;
                };

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create invoice');
                }

                const invoice = result.data;

                if (invoice?.id) {
                    setToast({
                        message: `Invoice ${invoice.number} created successfully!`,
                        type: 'success'
                    });

                    // Navigate to invoice detail page after a short delay
                    setTimeout(() => {
                        navigate(`/invoices/${invoice.id}`);
                    }, 1000);
                } else {
                    throw new Error('Invoice created but no ID returned');
                }
            } else {
                throw new Error('Electron IPC not available');
            }
        } catch (error) {
            console.error('Failed to create invoice:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to create invoice',
                type: 'error'
            });
        } finally {
            setCreatingInvoice(false);
        }
    };

    const handleDeleteSale = () => {
        if (!saleDetails?.sale) return;

        confirm({
            title: 'Delete Sale',
            message: `Are you sure you want to delete this sale? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger'
        }, async () => {
            try {
                const response = await salesService.deleteSale(saleId);
                if (response.success) {
                    setToast({ message: 'Sale deleted successfully', type: 'success' });
                    setTimeout(() => {
                        navigate('/sales');
                    }, 1000);
                } else {
                    setToast({ message: response.error || 'Failed to delete sale', type: 'error' });
                }
            } catch (error) {
                console.error('Failed to delete sale:', error);
                setToast({ message: 'Failed to delete sale', type: 'error' });
            }
        });
    };

    // Print receipt functionality - opens modal with receipt preview
    const handlePrintReceipt = () => {
        setShowReceiptModal(true);
    };

    // Print the receipt from modal
    const handlePrintReceiptFromModal = async () => {
        if (!receiptRef.current) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const receiptContent = receiptRef.current.innerHTML;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Sale ${saleDetails?.sale?.id?.substring(0, 8) || 'N/A'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { size: A4; margin: 0; }
            }
          </style>
        </head>
        <body>${receiptContent}</body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    // Download receipt as PDF
    const handleDownloadReceipt = async () => {
        if (!receiptRef.current || !saleDetails?.sale) return;

        try {
            const clonedElement = receiptRef.current.cloneNode(true) as HTMLElement;

            const styles = Array.from(document.styleSheets)
                .map(styleSheet => {
                    try {
                        return Array.from(styleSheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('\n');
                    } catch {
                        return '';
                    }
                })
                .join('\n');

            const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt ${saleDetails.sale.id.substring(0, 8)}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>${styles}</style>
          </head>
          <body>${clonedElement.innerHTML}</body>
        </html>
      `;

            if (!window.electron?.ipcRenderer) {
                throw new Error('Electron not available');
            }

            const pdfBase64 = await window.electron.ipcRenderer.invoke('generate-invoice-pdf-from-html', {
                htmlContent
            }) as string;

            if (!pdfBase64) {
                throw new Error('No PDF data received');
            }

            const fileName = `Receipt-${saleDetails.sale.id.substring(0, 8)}.pdf`;

            if (window.electronAPI && window.electronAPI.downloadPdfFile) {
                await window.electronAPI.downloadPdfFile(pdfBase64, fileName);
                setToast({ message: 'Receipt downloaded successfully!', type: 'success' });
            } else {
                const byteCharacters = atob(pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

                const url = window.URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                setToast({ message: 'Receipt downloaded successfully!', type: 'success' });
            }
        } catch (error) {
            console.error('Error generating receipt PDF:', error);
            setToast({ message: 'Failed to generate receipt PDF', type: 'error' });
        }
    };

    // Get receipt data for the renderer
    const getReceiptData = () => {
        if (!saleDetails?.sale) return null;
        const sale = saleDetails.sale;
        const customer = customers.find(c => c.id === sale.customerId);

        return {
            invoiceNumber: `RCP-${sale.id?.substring(0, 8) || 'N/A'}`,
            date: sale.createdAt || new Date().toISOString(),
            dueDate: sale.createdAt || new Date().toISOString(),
            invoiceType: 'receipt' as const,
            salesRep: (sale as any).cashierName || user?.fullName || '',
            salesRepId: (sale as any).cashierEmployeeId || user?.employeeId || '',
            company: {
                name: companySettings.companyName || 'House Of Electronics S/L LTD',
                address: companySettings.address || '',
                city: '',
                state: '',
                zip: '',
                phone: companySettings.phone || '',
                email: companySettings.email || '',
            },
            customer: {
                name: customer?.name || sale.customerName || 'Walk-in Customer',
                address: customer?.address || '',
                city: (customer as any)?.city || '',
                state: (customer as any)?.state || '',
                zip: (customer as any)?.zip || '',
                phone: customer?.phone || '',
                email: customer?.email || '',
            },
            items: (sale.items || []).map((item: any, index: number) => ({
                id: item.productId || `item-${index}`,
                description: item.productName || 'Item',
                quantity: item.quantity || 1,
                rate: item.price || 0,
                amount: (item.quantity || 1) * (item.price || 0),
            })),
            notes: sale.notes || 'Thank you for your purchase!',
            terms: '',
            taxRate: sale.tax && sale.subtotal ? (sale.tax / sale.subtotal) * 100 : 0,
            discount: sale.discount && sale.subtotal ? (sale.discount / sale.subtotal) * 100 : 0,
            currency: companySettings.currency || 'NLe',
        };
    };

    // Quick status update
    const updateSaleStatus = async (newStatus: Sale['status']) => {
        if (!saleDetails?.sale) return;

        try {
            const result = await salesService.updateSale(saleId, { status: newStatus });
            if (result.success) {
                setSaleDetails(prev => prev ? { ...prev, sale: { ...prev.sale, status: newStatus } } : null);
                setToast({ message: 'Sale status updated successfully', type: 'success' });
            } else {
                setToast({ message: result.error || 'Failed to update sale status', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to update sale status:', error);
            setToast({ message: 'Failed to update sale status', type: 'error' });
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'pending':
                return <ClockIcon className="h-5 w-5 text-yellow-500" />;
            case 'refunded':
                return <XCircleIcon className="h-5 w-5 text-red-500" />;
            default:
                return <ClockIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'refunded':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading sale details...</p>
                </div>
            </div>
        );
    }

    if (error || !saleDetails?.sale) {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/sales')}
                    className="flex items-center gap-2 mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Sales
                </Button>
                <Alert variant="error" title="Error">
                    {error || 'Sale not found'}
                </Alert>
            </div>
        );
    }

    const sale = saleDetails.sale;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/sales')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Sales
                </Button>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handlePrintReceipt}
                        className="flex items-center gap-2"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print Receipt
                    </Button>
                    <select
                        value={sale.status}
                        onChange={(e) => updateSaleStatus(e.target.value as Sale['status'])}
                        className="px-3 py-2 rounded-md border text-sm"
                        style={{
                            background: 'var(--input)',
                            borderColor: 'var(--border)',
                            color: 'var(--foreground)',
                        }}
                    >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                    {sale.invoiceId ? (
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/invoices/${sale.invoiceId}`)}
                            className="flex items-center gap-2"
                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        >
                            <DocumentTextIcon className="h-4 w-4" />
                            View Invoice
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            onClick={handleCreateInvoice}
                            disabled={creatingInvoice}
                            className="flex items-center gap-2"
                        >
                            {creatingInvoice ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <DocumentTextIcon className="h-4 w-4" />
                                    Create Invoice
                                </>
                            )}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => sale?.id && navigate(`/sales/${sale.id}/edit`)}
                        className="flex items-center gap-2"
                        disabled={!sale?.id}
                    >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDeleteSale}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Sale Info */}
            <div
                className="rounded-xl border bg-[color:var(--card)]/90 shadow-sm backdrop-blur-sm"
                style={{ borderColor: 'var(--border)' }}
            >
                <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                            <div
                                className="h-14 w-14 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                            >
                                <CurrencyDollarIcon className="h-7 w-7" />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                <span
                                    className="px-2 py-1 rounded-full"
                                    style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                                >
                                    Sale
                                </span>
                                <span
                                    className={`px-2 py-1 rounded-full text-[11px] font-medium ${getStatusColor(sale.status)}`}
                                >
                                    {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                                </span>
                                <span
                                    className="px-2 py-1 rounded-full"
                                    style={{ backgroundColor: 'var(--accent)10', color: 'var(--accent)' }}
                                >
                                    {sale.paymentMethod.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                                    Sale #{sale?.id && typeof sale.id === 'string' ? sale.id.substring(0, 8).toUpperCase() : sale?.id || 'N/A'}
                                </h1>
                                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                    {new Date(sale.createdAt).toLocaleDateString()} · {sale.customerName || 'Walk-in Customer'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                <div className="flex items-center gap-1.5">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    <span>{sale.customerName || 'Walk-in Customer'}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                    <ClockIcon className="h-3.5 w-3.5" />
                                    <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                                </div>
                                {sale.invoiceId && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5">
                                            <DocumentTextIcon className="h-3.5 w-3.5" />
                                            <span>Invoice linked</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Subtotal"
                    value={formatCurrency(sale.subtotal)}
                    icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                    accentColor="#3b82f6"
                />
                <KPICard
                    title="Tax"
                    value={formatCurrency(sale.tax)}
                    icon={<ReceiptPercentIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                    accentColor="#6366f1"
                />
                <KPICard
                    title="Discount"
                    value={formatCurrency(sale.discount)}
                    icon={<ReceiptPercentIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                    accentColor="#f59e0b"
                />
                <KPICard
                    title="Total"
                    value={formatCurrency(sale.total)}
                    icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                    accentColor="#10b981"
                />
            </div>

            {/* Cashier / User */}
            <div
                className="p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Cashier
                </div>
                <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {(sale.cashierName || '—')}{sale.cashierEmployeeId ? ` (ID: ${sale.cashierEmployeeId})` : ''}
                    {!sale.cashierEmployeeId && sale.userId ? ` (User: ${sale.userId.substring(0, 8)})` : ''}
                </div>
            </div>

            {/* Layout: Sidebar + Full Width Items */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Sale Information */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Customer Information */}
                    <div
                        className="p-4 rounded-xl border"
                        style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)'
                        }}
                    >
                        <h2 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <UserIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            Customer
                        </h2>

                        <div className="space-y-2">
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Name</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                    {sale.customerName || 'Walk-in Customer'}
                                </p>
                            </div>

                            {sale.customerId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/customers/${sale.customerId}`)}
                                    className="w-full text-xs"
                                >
                                    View Profile
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div
                        className="p-4 rounded-xl border"
                        style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)'
                        }}
                    >
                        <h2 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <CurrencyDollarIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            Summary
                        </h2>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                                <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                    {formatCurrency(sale.subtotal)}
                                </span>
                            </div>

                            {sale.discount > 0 && (
                                <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Discount</span>
                                    <span className="font-medium text-green-600">
                                        -{formatCurrency(sale.discount)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                                <span style={{ color: 'var(--muted-foreground)' }}>Tax</span>
                                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                    {formatCurrency(sale.tax)}
                                </span>
                            </div>

                            <div className="flex justify-between py-2 pt-3">
                                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Total</span>
                                <span className="text-base font-bold" style={{ color: 'var(--accent)' }}>
                                    {formatCurrency(sale.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div
                        className="p-4 rounded-xl border"
                        style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)'
                        }}
                    >
                        <h2 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            Details
                        </h2>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--muted-foreground)' }}>Payment</span>
                                <span style={{ color: 'var(--foreground)' }} className="capitalize font-medium">
                                    {sale.paymentMethod.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--muted-foreground)' }}>Created</span>
                                <span style={{ color: 'var(--foreground)' }}>
                                    {new Date(sale.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            {sale.invoiceId && (
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--muted-foreground)' }}>Invoice</span>
                                    <button
                                        onClick={() => navigate(`/invoices/${sale.invoiceId}`)}
                                        className="hover:underline font-medium"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        {sale.invoiceNumber || `INV-${sale.invoiceId.substring(0, 8)}`}
                                    </button>
                                </div>
                            )}
                        </div>

                        {sale.notes && (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                                    {sale.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Full Width Sale Items */}
                <div className="lg:col-span-3">
                    <div
                        className="rounded-xl border overflow-hidden"
                        style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)'
                        }}
                    >
                        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                                <CubeIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                                Sale Items
                            </h2>
                            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>

                        {sale.items.length === 0 ? (
                            <div className="text-center py-16">
                                <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                                <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                                    No items in this sale
                                </p>
                                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                    This sale doesn&apos;t contain any products
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                {sale.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="px-5 py-4 hover:bg-[color:var(--muted)]/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
                                                            {item.productName}
                                                        </h3>
                                                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                            <span>Quantity: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{item.quantity}</span></span>
                                                            <span>Unit Price: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(item.unitPrice)}</span></span>
                                                            {item.productId && (
                                                                <span className="truncate">ID: {item.productId.substring(0, 8)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-base font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                                                    {formatCurrency(item.total)}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                    {item.quantity} × {formatCurrency(item.unitPrice)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isOpen}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                onConfirm={handleConfirm}
                onClose={handleClose}
            />

            {/* Receipt Modal */}
            {showReceiptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowReceiptModal(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Preview</h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadReceipt}
                                    className="flex items-center gap-2"
                                >
                                    <DocumentArrowDownIcon className="h-4 w-4" />
                                    Download PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrintReceiptFromModal}
                                    className="flex items-center gap-2"
                                >
                                    <PrinterIcon className="h-4 w-4" />
                                    Print
                                </Button>
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Receipt Preview */}
                        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
                            <div className="flex justify-center">
                                <div ref={receiptRef} className="shadow-xl">
                                    {getReceiptData() && (
                                        <ReceiptRenderer
                                            data={getReceiptData()!}
                                            template={allTemplates[0]}
                                            brandLogos={[
                                                '/logo/Apple-Logo.png',
                                                '/logo/samsung-Logo.png',
                                                '/logo/Dell Logo.png',
                                                '/logo/playstation-logo.png',
                                                '/logo/Google-logo.png',
                                                '/logo/HP-Logо.png',
                                                '/logo/lenovo-logo.png',
                                                '/logo/microsoft-logo.png',
                                                '/logo/Asus-Logo.png',
                                                '/logo/Tplink-logo.png'
                                            ]}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
