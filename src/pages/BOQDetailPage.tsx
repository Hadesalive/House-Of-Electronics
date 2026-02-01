import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard';
import { BOQRenderer } from '@/components/ui/boq/boq-renderer';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  PencilIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  DocumentTextIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from '@heroicons/react/24/outline';
import {
  IconCalendar,
  IconCurrencyDollar,
  IconFileText,
  IconBuildingStore,
  IconUser,
} from '@tabler/icons-react';

interface BOQItem {
  id: string;
  description: string;
  units: string;
  quantity: number;
  unitPriceLE: number;
  amountLE: number;
  amountUSD: number;
}

interface BOQData {
  id: string;
  boqNumber: string;
  date: string;
  projectTitle: string;
  company: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    logo?: string;
  };
  client: {
    name: string;
    address: string;
  };
  items: BOQItem[];
  notes?: string[];
  managerSignature?: string;
}

export default function BOQDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatCurrency, formatDate } = useSettings();
  const [boq, setBoq] = useState<BOQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [zoom, setZoom] = useState(45); // Default zoom to fit A4 on screen
  const boqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBOQ = async () => {
      try {
        setLoading(true);
        
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('get-boq-by-id', id) as { 
            success: boolean; 
            data?: BOQData; 
            error?: string 
          };
          
          if (result.success && result.data) {
            setBoq(result.data);
          } else {
            setToast({ message: result.error || 'Failed to load BOQ', type: 'error' });
            setTimeout(() => navigate('/boq'), 2000);
          }
        }
      } catch (error) {
        console.error('Failed to load BOQ:', error);
        setToast({ message: 'Failed to load BOQ', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBOQ();
    }
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setToast({ message: 'Generating high-quality PDF...', type: 'success' });

      // Get the actual rendered BOQ HTML from the DOM
      if (!boqRef.current) {
        setToast({ message: 'BOQ preview not found', type: 'error' });
        return;
      }

      // Clone the BOQ element
      const clonedElement = boqRef.current.cloneNode(true) as HTMLElement;
      
      // Remove zoom scaling for PDF
      const zoomedContainer = clonedElement.querySelector('[style*="transform: scale"]') as HTMLElement;
      if (zoomedContainer) {
        zoomedContainer.style.transform = 'scale(1)';
        zoomedContainer.style.transformOrigin = 'top left';
      }

      // Convert all images to data URLs for PDF
      const images = clonedElement.querySelectorAll('img');
      const imagePromises = Array.from(images).map(async (img) => {
        try {
          // Create a canvas to convert image to data URL
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Wait for image to load if it hasn't already
          if (!img.complete) {
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              setTimeout(reject, 5000); // 5 second timeout
            });
          }
          
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            img.src = dataUrl;
          }
        } catch (error) {
          console.warn('Failed to convert image to data URL:', error);
        }
      });
      
      // Wait for all images to be converted
      await Promise.all(imagePromises);

      // Get all stylesheets
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

      // Create a complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              ${styles}
              
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
              }
              
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                min-height: 100vh;
                background: white;
              }
              
              @page {
                size: A4;
                margin: 0;
              }
              
              .print-boq {
                margin: 0 !important;
              }
            </style>
          </head>
          <body>
            ${clonedElement.innerHTML}
          </body>
        </html>
      `;

      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron not available');
      }

      const pdfBase64 = await window.electron.ipcRenderer.invoke('generate-boq-pdf-from-html', {
        htmlContent
      }) as string;

      if (!pdfBase64) {
        throw new Error('No PDF data received');
      }

      // Use Electron's native file dialog
      const fileName = `BOQ-${boq.boqNumber}.pdf`;
      if (window.electronAPI && window.electronAPI.downloadPdfFile) {
        const result = await window.electronAPI.downloadPdfFile(pdfBase64, fileName);
        if (!result.success) {
          throw new Error(result.error || 'Failed to save PDF');
        }
        setToast({ message: 'PDF downloaded successfully!', type: 'success' });
      } else {
        // Fallback to browser download
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
        setToast({ message: 'PDF downloaded successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToast({ message: 'Failed to generate PDF', type: 'error' });
    }
  };

  // Calculate totals
  const totalLE = boq?.items.reduce((sum, item) => sum + (item.amountLE || 0), 0) || 0;
  const totalUSD = boq?.items.reduce((sum, item) => sum + (item.amountUSD || 0), 0) || 0;
  const itemCount = boq?.items.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading BOQ...</p>
        </div>
      </div>
    );
  }

  if (!boq) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div 
          className="rounded-lg border p-4"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }}
        >
          <p style={{ color: '#ef4444' }}>BOQ not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/boq')}
            className="p-2 mt-1 flex-shrink-0"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                BOQ #{boq.boqNumber}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {boq.projectTitle || 'No project title'}
              </p>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>•</span>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {formatDate(boq.date)}
              </p>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>•</span>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {boq.client.name || 'No client'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          {/* Zoom Controls */}
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
              onClick={() => setZoom(Math.max(30, zoom - 5))}
              disabled={zoom <= 30}
              className="h-6 w-6 p-0"
              title="Zoom Out"
            >
              <MagnifyingGlassMinusIcon className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setZoom(45)}
              className="font-mono w-10 text-center hover:underline"
              style={{ color: 'var(--foreground)' }}
              title="Reset Zoom"
            >
              {zoom}%
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(150, zoom + 5))}
              disabled={zoom >= 150}
              className="h-6 w-6 p-0"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/boq/${id}/edit`)}
            className="flex items-center gap-1.5"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5"
            title="Download PDF"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
            title="Print"
          >
            <PrinterIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <KPICard
          title="Total (LE)"
          value={formatCurrency(totalLE)}
          icon={<IconCurrencyDollar className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
          accentColor="#3b82f6"
        />
        <KPICard
          title="Total (USD)"
          value={`$${totalUSD.toFixed(2)}`}
          icon={<IconCurrencyDollar className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
          accentColor="#22c55e"
        />
        <KPICard
          title="Items"
          value={itemCount.toString()}
          icon={<IconFileText className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
          accentColor="#f59e0b"
        />
        <KPICard
          title="Date"
          value={formatDate(boq.date)}
          icon={<IconCalendar className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
          accentColor="#06b6d4"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - BOQ Information */}
        <div className="lg:col-span-1 space-y-4">
          {/* Client Information */}
          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <IconUser className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Client Information
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Client Name</p>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {boq.client.name || '—'}
                </p>
              </div>
              {boq.client.address && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Address</p>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {boq.client.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Company Information */}
          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <IconBuildingStore className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Company Information
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Company Name</p>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {boq.company.name || '—'}
                </p>
              </div>
              {boq.company.address && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Address</p>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {boq.company.address}
                  </p>
                </div>
              )}
              {boq.company.phone && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</p>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {boq.company.phone}
                  </p>
                </div>
              )}
              {boq.company.email && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</p>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {boq.company.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BOQ Details */}
          <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <IconFileText className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                BOQ Details
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>BOQ Number</p>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {boq.boqNumber}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Project Title</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {boq.projectTitle || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Date</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {formatDate(boq.date)}
                </p>
              </div>
              {boq.managerSignature && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Manager</p>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {boq.managerSignature}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - BOQ Renderer */}
        <div className="lg:col-span-3">
          <div 
            className="rounded-xl border overflow-auto"
            style={{ 
              backgroundColor: 'var(--muted)',
              borderColor: 'var(--border)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '20px',
              minHeight: 'calc(100vh - 300px)'
            }}
          >
            <div
              ref={boqRef}
              style={{
                width: '210mm',
                maxWidth: '100%',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                margin: '0 auto',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease'
              }}
            >
              <BOQRenderer data={boq} />
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
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
