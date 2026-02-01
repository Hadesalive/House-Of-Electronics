'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { InvoiceTemplates, InvoiceTemplate } from '@/components/ui/invoice/invoice-templates';
import { DynamicInvoicePreview } from '@/components/ui/invoice/dynamic-invoice-preview';
import { allTemplates } from '@/components/ui/invoice/templates';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  EyeIcon, 
  EyeSlashIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from '@heroicons/react/24/outline';

export default function InvoiceTemplatesPage() {
  const router = useRouter();
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
            setAvailableTemplates(result.data);
            setSelectedTemplate(result.data[0].id);
            setCurrentTemplate(result.data[0]);
          } else {
            console.warn('No templates in database, using fallback');
            // Fallback to hardcoded templates if none in database
            const fallbackTemplates = allTemplates.slice(0, 2);
            setAvailableTemplates(fallbackTemplates);
            setSelectedTemplate(fallbackTemplates[0].id);
            setCurrentTemplate(fallbackTemplates[0]);
          }
        } else {
          console.warn('Electron IPC not available');
          setToast({ message: 'Unable to connect to database', type: 'error' });
          // Fallback to hardcoded templates
          const fallbackTemplates = allTemplates.slice(0, 2);
          setAvailableTemplates(fallbackTemplates);
          setSelectedTemplate(fallbackTemplates[0].id);
          setCurrentTemplate(fallbackTemplates[0]);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setToast({ message: 'Failed to load templates', type: 'error' });
        // Fallback to hardcoded templates
        const fallbackTemplates = allTemplates.slice(0, 2);
        setAvailableTemplates(fallbackTemplates);
        setSelectedTemplate(fallbackTemplates[0].id);
        setCurrentTemplate(fallbackTemplates[0]);
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
      name: 'Your Company Name',
      address: '123 Business Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      phone: '+1 (555) 123-4567',
      email: 'info@yourcompany.com'
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
    taxRate: 8.5,
    discount: 0
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
          {/* Header - Simplified */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                Invoice Templates
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {currentTemplate?.name || 'Select a template'} • {showPreview ? 'Preview Visible' : 'Preview Hidden'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {showPreview && (
                <div className="flex items-center gap-1 px-2 py-1 rounded border" style={{ borderColor: 'var(--border)' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={previewZoom <= 30}
                    className="h-7 w-7 p-0"
                  >
                    <MagnifyingGlassMinusIcon className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    onClick={handleResetZoom}
                    className="text-xs font-mono min-w-[2.5rem] text-center hover:underline"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {previewZoom}%
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={previewZoom >= 150}
                    className="h-7 w-7 p-0"
                  >
                    <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={togglePreview}
              >
                {showPreview ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                onClick={handleSaveTemplate}
              >
                Save
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/invoices')}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className={`grid gap-4 sm:gap-6 transition-all duration-300 ${
            showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          }`}>
            {/* Template Selection & Customization */}
            <div 
              className="rounded-lg border overflow-hidden"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Customize Template
                </h2>
              </div>
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
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

            {/* Live Preview */}
            {showPreview && (
              <div 
                className="rounded-lg border overflow-hidden sticky top-4"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  height: 'fit-content'
                }}
              >
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                    Preview
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded" 
                       style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                    <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                    Live
                  </div>
                </div>
                
                {currentTemplate ? (
                  <div className="p-4">
                    <div 
                      className="relative w-full overflow-auto bg-gray-50 dark:bg-gray-950 rounded"
                      style={{
                        maxHeight: 'calc(100vh - 200px)'
                      }}
                    >
                      <div className="flex justify-center items-start p-6" style={{ minWidth: 'fit-content' }}>
                        <div 
                          className="shadow-lg rounded border bg-white"
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
                      <EyeSlashIcon className="h-12 w-12 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        Select a template to preview
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
    </AppLayout>
  );
}
