import React, { useState, useEffect } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceTemplates, InvoiceTemplate } from '@/components/ui/invoice/invoice-templates';
import { DynamicInvoicePreview } from '@/components/ui/invoice/dynamic-invoice-preview';
import { visibleTemplates } from '@/components/ui/invoice/templates';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    EyeIcon,
    EyeSlashIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon
} from '@heroicons/react/24/outline';

export default function InvoiceTemplatesPage() {
    const navigate = useNavigate();
    const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
    const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null);
    const [availableTemplates, setAvailableTemplates] = useState<InvoiceTemplate[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [previewZoom, setPreviewZoom] = useState(45); // Start at 45% to show full A4 width

    // Load templates using Electron IPC
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                // Use Electron IPC if available
                if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                    console.log('Loading templates via IPC...');
                    const result = await window.electron.ipcRenderer.invoke('get-invoice-templates') as {
                        success: boolean;
                        data?: InvoiceTemplate[];
                        error?: string;
                    };

                    if (result.success && result.data && result.data.length > 0) {
                        console.log('Templates loaded via IPC:', result.data.length);
                        // Filter to only show hoe-classic (hide pro-corporate from UI)
                        const filteredTemplates = result.data.filter(t =>
                            t.id === 'hoe-classic' || t.id === 'hoe-classic-type-b' || t.id === 'hoe-classic-type-c'
                        );

                        // If filtered templates exist, use them; otherwise merge with built-ins
                        let templatesToUse = filteredTemplates.length > 0
                            ? filteredTemplates
                            : result.data.filter(t => t.id === 'hoe-classic' || t.id === 'hoe-classic-type-b' || t.id === 'hoe-classic-type-c');

                        // Ensure we have at least hoe-classic from built-ins
                        const builtInTemplates = visibleTemplates;

                        // Merge, prioritizing database templates but ensuring built-ins exist
                        const mergedTemplates = [
                            ...templatesToUse,
                            ...builtInTemplates.filter(
                                builtin => !templatesToUse.some(t => t.id === builtin.id)
                            )
                        ];

                        setAvailableTemplates(mergedTemplates);
                        const defaultTemplate = mergedTemplates.find(t => t.id === 'hoe-classic') || mergedTemplates[0];
                        setSelectedTemplate(defaultTemplate.id);
                        setCurrentTemplate(defaultTemplate);
                    } else {
                        console.warn('No templates in database, using fallback');
                        // Use only hoe-classic from built-ins
                        const fallbackTemplates = visibleTemplates;
                        setAvailableTemplates(fallbackTemplates);
                        const defaultTemplate = fallbackTemplates.find(t => t.id === 'hoe-classic') || fallbackTemplates[0];
                        setSelectedTemplate(defaultTemplate.id);
                        setCurrentTemplate(defaultTemplate);
                    }
                } else {
                    console.warn('Electron IPC not available');
                    setToast({ message: 'Unable to connect to database', type: 'error' });
                    // Use only hoe-classic from built-ins
                    const fallbackTemplates = visibleTemplates;
                    setAvailableTemplates(fallbackTemplates);
                    const defaultTemplate = fallbackTemplates.find(t => t.id === 'hoe-classic') || fallbackTemplates[0];
                    setSelectedTemplate(defaultTemplate.id);
                    setCurrentTemplate(defaultTemplate);
                }
            } catch (error) {
                console.error('Error loading templates:', error);
                setToast({ message: 'Failed to load templates', type: 'error' });
                // Use only hoe-classic from built-ins
                const fallbackTemplates = visibleTemplates;
                setAvailableTemplates(fallbackTemplates);
                const defaultTemplate = fallbackTemplates.find(t => t.id === 'hoe-classic') || fallbackTemplates[0];
                setSelectedTemplate(defaultTemplate.id);
                setCurrentTemplate(defaultTemplate);
            }
        };

        loadTemplates();
    }, []);

    const handleTemplateSelect = (templateId: string) => {
        const template = availableTemplates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            setCurrentTemplate(template);
            setToast({ message: `Template "${template.name}" selected`, type: 'success' });
        }
    };

    const handleCustomize = async (template: InvoiceTemplate) => {
        try {
            // Use Electron IPC to update template
            if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                const result = await window.electron.ipcRenderer.invoke('update-invoice-template', {
                    id: template.id,
                    data: template
                }) as {
                    success: boolean;
                    data?: InvoiceTemplate;
                    error?: string;
                };

                if (!result.success) {
                    throw new Error(result.error || 'Failed to update template');
                }

                setCurrentTemplate(template);
                setToast({ message: 'Template customized successfully!', type: 'success' });
            } else {
                throw new Error('Electron IPC not available');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            setToast({ message: 'Failed to save template', type: 'error' });
        }
    };

    const handleTemplateUpdate = (template: InvoiceTemplate) => {
        setCurrentTemplate(template);
        // No toast for live updates to avoid spam
    };

    const handleSaveTemplate = async () => {
        if (!currentTemplate) return;

        try {
            // Use Electron IPC to save template
            if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                const result = await window.electron.ipcRenderer.invoke('update-invoice-template', {
                    id: currentTemplate.id,
                    data: currentTemplate
                }) as {
                    success: boolean;
                    data?: InvoiceTemplate;
                    error?: string;
                };

                if (!result.success) {
                    throw new Error(result.error || 'Failed to save template');
                }

                setToast({ message: 'Template saved successfully!', type: 'success' });
            } else {
                throw new Error('Electron IPC not available');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            setToast({ message: 'Failed to save template', type: 'error' });
        }
    };

    const togglePreview = () => {
        setShowPreview(!showPreview);
    };

    const handleZoomIn = () => {
        setPreviewZoom(Math.min(previewZoom + 10, 150));
    };

    const handleZoomOut = () => {
        setPreviewZoom(Math.max(previewZoom - 10, 30));
    };

    const handleResetZoom = () => {
        setPreviewZoom(45); // Reset to 45% to fit the page width
    };

    // Mock invoice data for preview
    const mockInvoiceData = {
        invoiceNumber: 'INV-2024-001',
        date: '2024-01-15',
        dueDate: '2024-02-15',
        company: {
            name: 'House Of Electronics S/L LTD',
            address: '13 A Sander Street Middle Floor',
            city: 'Freetown',
            state: 'Sierra Leone',
            zip: '',
            phone: '+232-77-593-479',
            email: 'sales@tahoe-sl.com'
        },
        customer: {
            name: 'Customer Name',
            address: '456 Customer Avenue',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90210',
            phone: '+1 (555) 987-6543',
            email: 'customer@example.com'
        },
        items: [
            {
                id: '1',
                description: 'Professional Web Design',
                quantity: 1,
                rate: 2500,
                amount: 2500
            },
            {
                id: '2',
                description: 'SEO Optimization',
                quantity: 1,
                rate: 800,
                amount: 800
            },
            {
                id: '3',
                description: 'Content Management System',
                quantity: 1,
                rate: 1200,
                amount: 1200
            }
        ],
        notes: 'Thank you for your business! We appreciate the opportunity to work with you.',
        terms: 'Payment is due within 30 days of invoice date. Late payments may incur additional fees.',
        taxRate: 0,
        discount: 0
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/invoices')}
                        className="p-2 mt-1 flex-shrink-0"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                            Invoice Templates
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                {currentTemplate?.name || 'Select a template'}
                            </p>
                            {currentTemplate && (
                                <>
                                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>•</span>
                                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                        {showPreview ? 'Preview Visible' : 'Preview Hidden'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                    {showPreview && (
                        <div
                            className="flex items-center gap-0.5 px-2 py-1 rounded border text-xs"
                            style={{
                                borderColor: 'var(--border)',
                                backgroundColor: 'var(--background)'
                            }}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleZoomOut}
                                disabled={previewZoom <= 30}
                                className="h-6 w-6 p-0"
                            >
                                <MagnifyingGlassMinusIcon className="h-3.5 w-3.5" />
                            </Button>
                            <button
                                onClick={handleResetZoom}
                                className="font-mono w-10 text-center hover:underline"
                                style={{ color: 'var(--foreground)' }}
                            >
                                {previewZoom}%
                            </button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleZoomIn}
                                disabled={previewZoom >= 150}
                                className="h-6 w-6 p-0"
                            >
                                <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    <Button
                        variant={showPreview ? "default" : "outline"}
                        size="sm"
                        onClick={togglePreview}
                        className="flex items-center gap-1.5"
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleSaveTemplate}
                        className="flex items-center gap-1.5"
                    >
                        Save
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className={`grid gap-6 transition-all duration-300 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
                }`}>
                {/* Template Selection & Customization */}
                <div
                    className="rounded-xl border shadow-sm overflow-hidden flex flex-col"
                    style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                    }}
                >
                    <div className="p-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                            Select Template
                        </h2>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                            Choose a template to customize and preview
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                        <div className="p-5">
                            <InvoiceTemplates
                                selectedTemplate={selectedTemplate}
                                templates={availableTemplates}
                                onTemplateSelect={handleTemplateSelect}
                                onCustomize={handleCustomize}
                                onTemplateUpdate={handleTemplateUpdate}
                                currentInvoiceData={mockInvoiceData}
                            />
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                {showPreview && (
                    <div
                        className="rounded-xl border shadow-sm overflow-hidden sticky top-4"
                        style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--border)',
                            height: 'fit-content'
                        }}
                    >
                        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                Live Preview
                            </h2>
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: 'var(--accent)15', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>
                                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></div>
                                Live
                            </div>
                        </div>

                        {currentTemplate ? (
                            <div className="p-5">
                                <div
                                    className="relative w-full overflow-auto rounded-lg"
                                    style={{
                                        maxHeight: 'calc(100vh - 250px)',
                                        backgroundColor: 'var(--muted)'
                                    }}
                                >
                                    <div className="flex justify-center items-start p-6" style={{ minWidth: 'fit-content' }}>
                                        <div
                                            className="shadow-xl rounded-lg border bg-white transition-transform"
                                            style={{
                                                transform: `scale(${previewZoom / 100})`,
                                                transformOrigin: 'top center',
                                                borderColor: 'var(--border)',
                                                marginBottom: `${(100 - previewZoom) * 2}px`
                                            }}
                                        >
                                            <DynamicInvoicePreview
                                                data={mockInvoiceData}
                                                template={currentTemplate}
                                                brandLogos={[]}
                                                className=""
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-96 p-6">
                                <div className="text-center">
                                    <EyeSlashIcon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
                                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                                        No Template Selected
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                        Select a template from the left to see a live preview
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
