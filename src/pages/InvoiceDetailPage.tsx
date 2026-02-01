/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard';
import { Input, Textarea } from '@/components/ui/forms';
import { DynamicInvoicePreview } from '@/components/ui/invoice/dynamic-invoice-preview';
import { ReceiptRenderer } from '@/components/ui/invoice/template-renderers/receipt-renderer';
import { convertFromLeones, convertToLeones, formatCurrency as formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { InvoiceTemplate } from '@/components/ui/invoice/invoice-templates';
import { visibleTemplates } from '@/components/ui/invoice/templates';
import { useSettings } from '@/contexts/SettingsContext';

// IPC Response type for Electron
interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
import html2canvas from 'html2canvas';
import { 
  ArrowLeftIcon,
  PencilIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  SwatchIcon,
  PhotoIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
// Tabler Icons - Clean and unique design
import {
  IconCurrencyDollar,
  IconWallet,
  IconAlertTriangle,
  IconCalendar,
  IconCreditCard,
  IconBuildingStore,
  IconDeviceMobile,
  IconAt,
  IconWorld,
  IconFileText,
  IconClipboardCheck,
  IconClock,
} from '@tabler/icons-react';

// Default invoice structure for new invoices or when no data is available
const getDefaultInvoice = (): {
  id: string;
  number: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerPhone: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
  currency: string;
  subtotal: number;
  tax: number;
  taxes: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  notes: string;
  terms: string;
  saleId?: string;
  saleNumber?: string;
  salesRep?: string;
  salesRepId?: string;
} => ({
  id: '',
  number: '',
  customerId: undefined,
  customerName: '',
  customerEmail: '',
  customerAddress: '',
  customerPhone: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  status: 'draft',
  invoiceType: 'invoice',
  currency: 'USD',
  subtotal: 0,
  tax: 0,
  taxes: [],
  discount: 0,
  total: 0,
  paidAmount: 0,
  balance: 0,
  items: [],
  notes: '',
  terms: '',
  saleId: undefined,
  saleNumber: undefined,
  salesRep: undefined,
  salesRepId: undefined,
});

export default function InvoiceDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { formatDate, companySettings } = useSettings();
  
  console.log('InvoiceDetailPage rendered with params:', params);
  console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  // PDF mode detection (for future use if needed)
  // const isPDFMode = typeof window !== 'undefined' && window.location.search.includes('pdf=true');

  const [invoice, setInvoice] = useState(getDefaultInvoice());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');
const [selectedTemplate, setSelectedTemplate] = useState<'hoe-classic' | 'hoe-classic-ekhlas'>('hoe-classic');
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<InvoiceTemplate[]>([]);
  const [previewZoom, setPreviewZoom] = useState<number>(45); // Default zoom level for invoice preview
  const invoiceRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Editable header/footer state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('/images/hoe logo.png');
  const [brandLogos, setBrandLogos] = useState<string[]>([
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
  ]);
  
  // Company info from settings (use settings or fallback to defaults)
  // Parse address to get city, state, zip if available
  const addressParts = (companySettings.address || "").split(',').map(s => s.trim());
  const companyInfo = {
    name: companySettings.companyName || "House Of Electronics S/L LTD",
    address: addressParts[0] || "13 A Sander Street Middle Floor",
    city: addressParts[1] || "Freetown",
    state: addressParts[2]?.split(' ')[0] || "Sierra Leone",
    zip: addressParts[2]?.split(' ')[1] || "",
    phone: companySettings.phone || "+232-77-593-479",
    email: companySettings.email || "sales@tahoe-sl.com",
    website: "www.tahoe-sl.com", // Not in settings, use default
    logo: "/images/hoe logo.png"
  };
  
  // Editable footer content
  const [footerContent, setFooterContent] = useState({
    thankYouMessage: "Thank you for your business!",
    termsAndConditions: "Payment due within 30 days of invoice date.",
    socialMedia: {
      twitter: "@houseofelectronics",
      linkedin: "linkedin.com/company/houseofelectronics"
    }
  });

  // New invoice fields
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery' | 'recurring'>('invoice');
  const [currency, setCurrency] = useState('USD');
  
  // Helper function to format currency using invoice's currency
  const formatInvoiceCurrency = (amount: number): string => {
    const rawCurrency = invoice.currency || currency || companySettings.currency || 'NLe';
    // Normalize currency code (handle old SLL/SLE/NLE -> NLe)
    const invoiceCurrency = rawCurrency === 'SLL' || rawCurrency === 'SLE' || rawCurrency === 'NLE' || rawCurrency === 'NLe' ? 'NLe' : rawCurrency;
    return formatCurrencyWithSymbol(amount, invoiceCurrency);
  };
  
  
  // Make loadInvoice accessible for refreshing data
  const loadInvoiceRef = useRef<(() => Promise<void>) | null>(null);
  
  const [bankDetails, setBankDetails] = useState({
    bankName: "Sierra Leone Commercial Bank LTD",
    accountName: "House Of Electronics S/L LTD",
    accountNumber: "0030103166411125",
    routingNumber: "0366551",
    swiftCode: ""
  });

  const getStatusIcon = (status: string) => {
    const iconStyle = { height: '24px', width: '24px', strokeWidth: 1.5 };
    switch (status) {
      case 'paid':
        return <IconClipboardCheck style={{ ...iconStyle, color: 'var(--success)' }} />;
      case 'pending':
        return <IconClock style={{ ...iconStyle, color: 'var(--warning)' }} />;
      case 'overdue':
        return <IconAlertTriangle style={{ ...iconStyle, color: 'var(--destructive)' }} />;
      case 'draft':
        return <IconFileText style={{ ...iconStyle, color: 'var(--muted-foreground)' }} />;
      default:
        return <IconClock style={{ ...iconStyle, color: 'var(--muted-foreground)' }} />;
    }
  };



  // Print Invoice/Receipt - using same rendering as PDF
  const handlePrintInvoice = async () => {
    try {
      // Get the actual rendered invoice/receipt HTML from the DOM
      const invoiceElement = viewMode === 'receipt' ? receiptRef.current : invoiceRef.current;
      


      
      if (!invoiceElement) {
        setToast({ message: `${viewMode === 'receipt' ? 'Receipt' : 'Invoice'} preview not found`, type: 'error' });
        return;
      }

      
      // Get all computed styles and inline them
      const clonedElement = invoiceElement.cloneNode(true) as HTMLElement;
      
      // Capture actual computed styles from the live DOM elements
      const originalElements = invoiceElement.querySelectorAll('.print-invoice');
      const printInvoiceElements = clonedElement.querySelectorAll('.print-invoice');
      
      printInvoiceElements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const originalElement = originalElements[index] as HTMLElement;
        
        // Get the actual computed styles from the rendered preview
        const computedStyle = window.getComputedStyle(originalElement);
        
        // Capture ALL the important styles from the actual rendered element (same as download)
        const stylesToCapture = [
          'width', 'height', 'backgroundColor', 'color', 'fontFamily',
          'border', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
          'boxShadow', 'boxSizing', 'position', 'overflow', 'display', 'flexDirection'
        ];
        
        const capturedStyles = stylesToCapture
          .map(prop => {
            const kebabCaseProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            const value = computedStyle.getPropertyValue(kebabCaseProp);
            return value ? `${kebabCaseProp}: ${value} !important;` : '';
          })
          .filter(Boolean)
          .join('\n            ');
        
        // Preserve captured padding styles - margins now handled by @page
        const paddingValue = computedStyle.getPropertyValue('padding-top') || '10mm';
        
        const preservedStyles = `
          padding: ${paddingValue} !important;
        `;
        
        htmlElement.setAttribute('style', capturedStyles + '\n            ' + preservedStyles);
      });
      
      // Get all stylesheets - but filter out print media queries that remove borders
      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => {
                // Handle @media print rules specifically
                if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) {
                  // Filter out rules that strip borders
                  const filteredRules = Array.from(rule.cssRules)
                    .filter(nestedRule => !nestedRule.cssText.includes('border: none'))
                    .map(nestedRule => nestedRule.cssText)
                    .join('\n');
                  return filteredRules ? `@media print { ${filteredRules} }` : '';
                }
                return rule.cssText;
              })
              .filter(Boolean)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');

      // Extract border styles to force them in print with explicit values
      let borderOverridesGeneral = '';
      let borderOverridesPrint = '';
      
        printInvoiceElements.forEach((element, index) => {
          const originalElement = originalElements[index] as HTMLElement;
          const computedStyle = window.getComputedStyle(originalElement);

          // Get actual computed border values
          const borderWidth = computedStyle.getPropertyValue('border-width');
          const borderStyle = computedStyle.getPropertyValue('border-style');
          const borderColor = computedStyle.getPropertyValue('border-color');
          const borderRadius = computedStyle.getPropertyValue('border-radius');
          const boxShadow = computedStyle.getPropertyValue('box-shadow');

          if (borderWidth && borderWidth !== '0px' && borderWidth !== 'none') {
            // Use maximum specificity selectors
            const selector1 = `html body .print-invoice:nth-of-type(${index + 1})`;
            const selector2 = `html body div[class*="print-invoice"]:nth-of-type(${index + 1})`;
            const selector3 = `[style*="${borderWidth}"][style*="${borderColor}"]`;

            const borderStyles = `
              border-width: ${borderWidth} !important;
              border-style: ${borderStyle} !important;
              border-color: ${borderColor} !important;
              border-radius: ${borderRadius} !important;
              box-shadow: ${boxShadow} !important;
            `;

            // Add to general styles (highest specificity)
            borderOverridesGeneral += `${selector1} { ${borderStyles} }\n`;
            borderOverridesGeneral += `${selector2} { ${borderStyles} }\n`;
            borderOverridesGeneral += `.print-invoice:nth-of-type(${index + 1})${selector3} { ${borderStyles} }\n`;

            // Add to print styles (even more specific for @media print)
            borderOverridesPrint += `${selector1} { ${borderStyles} }\n`;
            borderOverridesPrint += `${selector2} { ${borderStyles} }\n`;
            borderOverridesPrint += `.print-invoice:nth-of-type(${index + 1})${selector3} { ${borderStyles} }\n`;

            // Add explicit border styles to the inline style attribute as well
            const inlineBorderStyles = `
              border-width: ${borderWidth} !important;
              border-style: ${borderStyle} !important;
              border-color: ${borderColor} !important;
              border-radius: ${borderRadius} !important;
              box-shadow: ${boxShadow} !important;
            `;

            element.setAttribute('style', element.getAttribute('style') + '\n            ' + inlineBorderStyles);
          }
        });
      

      // Create full HTML document with styles
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${viewMode === 'receipt' ? 'Receipt' : 'Invoice'} ${invoice.number}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              ${styles}
              
              body {
                margin: 0;
                padding: 0;
                background: white;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
              }
              
              .print-invoice:last-child {
                page-break-after: avoid !important;
              }
              
              /* Ensure colors and borders are preserved in print */
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              /* Force border styles - general (loaded BEFORE @media print) */
              ${borderOverridesGeneral}
              
              @media print {
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                  justify-content: initial !important;
                  align-items: initial !important;
                  min-height: 100vh;
                }
                @page {
                  size: A4;
                  margin: 0; /* Completely zero - no margins at all */
                }
                
                /* Remove custom margins - let @page handle it */
                .print-invoice {
                  margin: 0 !important;
                }
              }
              
              /* Force borders to appear in print - LOADED LAST to override everything */
              @media print {
                ${borderOverridesPrint}

                /* Additional border enforcement - maximum specificity */
                html body .print-invoice {
                  border: inherit !important;
                  border-width: inherit !important;
                  border-style: inherit !important;
                  border-color: inherit !important;
                  border-radius: inherit !important;
                  box-shadow: inherit !important;
                }

                /* Final override - target specific elements */
                .print-invoice[style*="border-width"] {
                  border-width: inherit !important;
                  border-style: inherit !important;
                  border-color: inherit !important;
                }
              }
            </style>
          </head>
          <body>
            ${clonedElement.innerHTML}
            <script>
              window.onload = function() {
    window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `;

      // Open new window with the styled invoice
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        // Fallback if popup blocked
        setToast({ message: 'Please allow popups for printing', type: 'error' });
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      setToast({ message: 'Failed to print invoice', type: 'error' });
    }
  };

  // Download Invoice as PDF by capturing actual rendered HTML
  const handleDownloadInvoice = async () => {
    try {
      setToast({ message: 'Generating PDF...', type: 'success' });

      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        // Get the actual rendered invoice HTML from the DOM
        const invoiceElement = invoiceRef.current;
        
        if (!invoiceElement) {
          throw new Error('Invoice preview not found');
        }

        
        // Get all computed styles and inline them
        const clonedElement = invoiceElement.cloneNode(true) as HTMLElement;
        
        // Capture actual computed styles from the live DOM elements
        const originalElements = invoiceElement.querySelectorAll('.print-invoice');
        const printInvoiceElements = clonedElement.querySelectorAll('.print-invoice');
        
        printInvoiceElements.forEach((element, index) => {
          const originalElement = originalElements[index] as HTMLElement;

          // Get the actual computed styles from the rendered preview
          const computedStyle = window.getComputedStyle(originalElement);

          // Capture ALL the important styles from the actual rendered element (excluding margins)
          const stylesToCapture = [
            'width', 'height', 'backgroundColor', 'color', 'fontFamily',
            'border', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
            'boxShadow', 'boxSizing', 'position', 'overflow', 'display', 'flexDirection'
          ];

          const capturedStyles = stylesToCapture
            .map(prop => {
              const kebabCaseProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
              const value = computedStyle.getPropertyValue(kebabCaseProp);
              return value ? `${kebabCaseProp}: ${value} !important;` : '';
            })
            .filter(Boolean)
            .join('\n            ');

          // Preserve captured padding styles - margins now handled by @page
          const paddingValue = computedStyle.getPropertyValue('padding-top') || '10mm';
          
          const preservedStyles = `
            padding: ${paddingValue} !important;
          `;

          element.setAttribute('style', capturedStyles + '\n            ' + preservedStyles);
        });
        
        // Get all stylesheets - but filter out print media queries that remove borders
        const styles = Array.from(document.styleSheets)
          .map(styleSheet => {
            try {
              return Array.from(styleSheet.cssRules)
                .map(rule => {
                  // Handle @media print rules specifically
                  if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) {
                    // Filter out rules that strip borders
                    const filteredRules = Array.from(rule.cssRules)
                      .filter(nestedRule => !nestedRule.cssText.includes('border: none'))
                      .map(nestedRule => nestedRule.cssText)
                      .join('\n');
                    return filteredRules ? `@media print { ${filteredRules} }` : '';
                  }
                  return rule.cssText;
                })
                .filter(Boolean)
                .join('\n');
            } catch {
              // Skip external stylesheets that can't be accessed
              return '';
            }
          })
          .join('\n');

        // Extract border styles to force them in PDF with explicit values
        let borderOverridesGeneral = '';
        let borderOverridesPrint = '';
        
        printInvoiceElements.forEach((element, index) => {
          const originalElement = originalElements[index] as HTMLElement;
          const computedStyle = window.getComputedStyle(originalElement);
          
          // Get actual computed border values
          const borderWidth = computedStyle.getPropertyValue('border-width');
          const borderStyle = computedStyle.getPropertyValue('border-style');
          const borderColor = computedStyle.getPropertyValue('border-color');
          const borderRadius = computedStyle.getPropertyValue('border-radius');
          const boxShadow = computedStyle.getPropertyValue('box-shadow');
          
          if (borderWidth && borderWidth !== '0px' && borderWidth !== 'none') {
            // Use maximum specificity selectors
            const selector1 = `html body .print-invoice:nth-of-type(${index + 1})`;
            const selector2 = `html body div[class*="print-invoice"]:nth-of-type(${index + 1})`;
            const selector3 = `[style*="${borderWidth}"][style*="${borderColor}"]`;

            const borderStyles = `
              border-width: ${borderWidth} !important;
              border-style: ${borderStyle} !important;
              border-color: ${borderColor} !important;
              border-radius: ${borderRadius} !important;
              box-shadow: ${boxShadow} !important;
            `;

            // Add to general styles (highest specificity)
            borderOverridesGeneral += `${selector1} { ${borderStyles} }\n`;
            borderOverridesGeneral += `${selector2} { ${borderStyles} }\n`;
            borderOverridesGeneral += `.print-invoice:nth-of-type(${index + 1})${selector3} { ${borderStyles} }\n`;

            // Add to print styles (even more specific for @media print)
            borderOverridesPrint += `${selector1} { ${borderStyles} }\n`;
            borderOverridesPrint += `${selector2} { ${borderStyles} }\n`;
            borderOverridesPrint += `.print-invoice:nth-of-type(${index + 1})${selector3} { ${borderStyles} }\n`;
          }
        });
        

        // Create full HTML document with styles
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${viewMode === 'receipt' ? 'Receipt' : 'Invoice'} ${invoice.number}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                ${styles}
                
                body {
                  margin: 0;
                  padding: 0;
                  background: transparent;
                  display: flex;
                  justify-content: center;
                  align-items: flex-start;
                  min-height: 100vh;
                }
                
                .print-invoice:last-child {
                  page-break-after: avoid !important;
                }
                
                /* Ensure colors and borders are preserved in PDF */
                * {
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                /* Force border styles - general (loaded BEFORE @media print) */
                ${borderOverridesGeneral}
                
                @media print {
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  display: block !important;
                  justify-content: initial !important;
                  align-items: initial !important;
                  min-height: 100vh;
                }
                  @page {
                    size: A4;
                    margin: 0; /* Completely zero - no margins at all */
                  }
                  
                  /* Remove custom margins - let @page handle it */
                  .print-invoice {
                    margin: 0 !important;
                  }
                }
                
                /* Force borders to appear in PDF - LOADED LAST to override everything */
                @media print {
                  ${borderOverridesPrint}

                  /* Additional border enforcement - maximum specificity */
                  html body .print-invoice {
                    border: inherit !important;
                    border-width: inherit !important;
                    border-style: inherit !important;
                    border-color: inherit !important;
                    border-radius: inherit !important;
                    box-shadow: inherit !important;
                  }

                  /* Final override - target specific elements */
                  .print-invoice[style*="border-width"] {
                    border-width: inherit !important;
                    border-style: inherit !important;
                    border-color: inherit !important;
                  }
                }
              </style>
            </head>
            <body>
              ${clonedElement.innerHTML}
            </body>
          </html>
        `;


        const pdfBase64 = await window.electron.ipcRenderer.invoke('generate-invoice-pdf-from-html', {
          htmlContent
        }) as string;


        if (!pdfBase64) {
          throw new Error('No PDF data received from Electron');
        }

        // Use Electron's native file dialog for better Windows compatibility
        if (window.electronAPI && window.electronAPI.downloadPdfFile) {
          const result = await window.electronAPI.downloadPdfFile(pdfBase64, `Invoice-${invoice.number}.pdf`);
          if (!result.success) {
            throw new Error(result.error || 'Failed to save PDF file');
          }
        } else {
          // Fallback to browser download method
          const byteCharacters = atob(pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

          // Create download link
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Invoice-${invoice.number}.pdf`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          window.URL.revokeObjectURL(url);
        }
      }

      setToast({ message: 'Invoice downloaded successfully!', type: 'success' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToast({ message: 'Failed to generate PDF', type: 'error' });
    }
  };

  // Download Invoice as PDF (High Quality)
  const handleDownloadPDF = async () => {
    try {
      setToast({ message: `Generating high-quality PDF...`, type: 'success' });

      // Get the actual rendered invoice/receipt HTML from the DOM
      const invoiceElement = viewMode === 'receipt' ? receiptRef.current : invoiceRef.current;
      
      if (!invoiceElement) {
        setToast({ message: `${viewMode === 'receipt' ? 'Receipt' : 'Invoice'} preview not found`, type: 'error' });
        return;
      }

      // Clone the invoice element
      const clonedElement = invoiceElement.cloneNode(true) as HTMLElement;
      
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
              
              .print-invoice {
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

      const pdfBase64 = await window.electron.ipcRenderer.invoke('generate-invoice-pdf-from-html', {
        htmlContent
      }) as string;

      if (!pdfBase64) {
        throw new Error('No PDF data received');
      }

      // Use Electron's native file dialog
      const fileName = viewMode === 'receipt' ? `Receipt-${invoice.number}.pdf` : `Invoice-${invoice.number}.pdf`;
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

  // Download Receipt as PDF (keeping html2canvas for thermal receipts)
  const handleDownloadReceipt = async () => {
    try {
      const element = receiptRef.current;
      if (!element) {
        setToast({ message: 'Receipt element not found', type: 'error' });
        return;
      }

      setToast({ message: 'Generating receipt PDF...', type: 'success' });

      // For receipts, we'll use a simple approach since they're smaller
      // You could also create a separate receipt API endpoint if needed
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create a simple PDF using canvas
      const imgData = canvas.toDataURL('image/png');
      
      // Create a simple download link for the image
      const link = document.createElement('a');
      link.download = `Receipt-${invoice.number}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({ message: 'Receipt downloaded successfully!', type: 'success' });
    } catch (error) {
      console.error('Error generating receipt:', error);
      setToast({ message: 'Failed to generate receipt', type: 'error' });
    }
  };

  // Email Invoice with PDF attachment
  const handleEmailInvoice = async () => {
    try {
      if (!invoice.customerEmail) {
        setToast({ message: 'No customer email address', type: 'error' });
        return;
      }

      setToast({ message: 'Generating PDF for email...', type: 'success' });

      // Generate PDF using Electron IPC
      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron not available');
      }
      
      const result = await window.electron.ipcRenderer.invoke('generate-invoice-pdf', {
        invoiceId: invoice.id,
        templateId: selectedTemplate
      }) as IpcResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      const pdfBlob = result.data as Blob;

      // Check if running in Electron
      if (typeof window !== 'undefined' && window.electron) {
        // Convert blob to base64 for Electron
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix to get pure base64
          const base64 = base64data.split(',')[1];
          
          // Call Electron IPC to save PDF and open email
          try {
            const result = await window.electron?.ipcRenderer.invoke('email-invoice', {
              to: invoice.customerEmail,
              subject: `Invoice ${invoice.number}`,
              body: `Dear ${invoice.customerName},\n\n` +
                    `Please find attached invoice ${invoice.number} for ${formatInvoiceCurrency(invoice.total)}.\n\n` +
                    `Due Date: ${formatDate(invoice.dueDate)}\n\n` +
                    `Thank you for your business!\n\n` +
                    `Best regards,\n${companyInfo.name}`,
              pdfBase64: base64,
              fileName: `Invoice-${invoice.number}.pdf`
            }) as { success: boolean; error?: string };
            
            if (result?.success) {
              setToast({ message: 'Email client opened with invoice attached!', type: 'success' });
            } else {
              throw new Error(result?.error || 'Unknown error');
            }
          } catch (error) {
            console.error('Error sending email via Electron:', error);
            // Fallback to simple mailto
            fallbackMailto();
          }
        };
        
        reader.readAsDataURL(pdfBlob);
      } else {
        // For web: use mailto with instructions (can't attach files via mailto in browsers)
        fallbackMailto();
      }

      function fallbackMailto() {
        const subject = encodeURIComponent(`Invoice ${invoice.number}`);
        const body = encodeURIComponent(
          `Dear ${invoice.customerName},\n\n` +
          `Please find attached invoice ${invoice.number} for ${formatInvoiceCurrency(invoice.total)}.\n\n` +
          `Due Date: ${formatDate(invoice.dueDate)}\n\n` +
          `NOTE: Please download the invoice PDF separately and attach it to this email.\n\n` +
          `Thank you for your business!\n\n` +
          `Best regards,\n${companyInfo.name}`
        );
        const mailtoLink = `mailto:${invoice.customerEmail}?subject=${subject}&body=${body}`;
        
        window.location.href = mailtoLink;
        setToast({ message: 'Email opened - Please manually attach the PDF', type: 'success' });
        
        // Automatically download the PDF for user to attach
        setTimeout(() => {
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Invoice-${invoice.number}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 500);
      }
    } catch (error) {
      console.error('Error preparing email:', error);
      setToast({ message: 'Failed to prepare email', type: 'error' });
    }
  };

  // Share Invoice
  const handleShareInvoice = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoice.number}`,
          text: `Invoice for ${invoice.customerName} - ${formatInvoiceCurrency(invoice.total)}`,
          url: window.location.href
        });
        setToast({ message: 'Invoice shared successfully!', type: 'success' });
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setToast({ message: 'Invoice link copied to clipboard!', type: 'success' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setToast({ message: 'Failed to share invoice', type: 'error' });
    }
  };

  // Logo handling functions
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCompanyLogo(result);
        setToast({ message: 'Company logo uploaded successfully!', type: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBrandLogos(prev => [...prev, result]);
        setToast({ message: 'Brand logo added successfully!', type: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle mark as paid (only for standard invoices)
  const handleMarkAsPaid = async () => {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const invoiceCurrency = invoice.currency || currency || companySettings.currency || 'NLe';
        const totalInLeones = convertToLeones(invoice.total, invoiceCurrency);

        const result = await window.electron.ipcRenderer.invoke('update-invoice', {
          id: invoice.id,
          body: {
            paidAmount: totalInLeones,
            status: 'paid',
          }
        }) as {
          success: boolean;
          data?: typeof invoice;
          error?: string;
        };

        if (!result.success) {
          throw new Error(result.error || 'Failed to mark invoice as paid');
        }

        // Refresh invoice data
        await refreshInvoice();
        setToast({ message: 'Invoice marked as paid successfully', type: 'success' });
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      setToast({ message: 'Failed to mark invoice as paid', type: 'error' });
    }
  };

  const removeBrandLogo = (index: number) => {
    setBrandLogos(prev => prev.filter((_, i) => i !== index));
    setToast({ message: 'Brand logo removed', type: 'success' });
  };

  const saveHeaderChanges = () => {
    setIsEditingHeader(false);
    setToast({ message: 'Header information saved successfully!', type: 'success' });
  };

  const saveFooterChanges = () => {
    setIsEditingFooter(false);
    setToast({ message: 'Footer information saved successfully!', type: 'success' });
  };

  // Template management functions
  const getDefaultTemplate = (templateId: string): InvoiceTemplate => {
    const template = visibleTemplates.find(t => t.id === templateId);
    return (
      template ||
      visibleTemplates.find(t => t.id === 'hoe-classic') ||
      visibleTemplates.find(t => t.id === 'hoe-classic-ekhlas') ||
      visibleTemplates[0]
    );
  };

  // Template update handler (available for child components)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTemplateUpdate = (template: InvoiceTemplate) => {
    setCurrentTemplate(template);
    setToast({ message: 'Template updated successfully!', type: 'success' });
  };

  const saveInvoiceChanges = async () => {
    try {
      // Prepare bank details - only include if we have the required fields
      const bankDetailsToSave = bankDetails.bankName && bankDetails.accountNumber
        ? {
            bankName: bankDetails.bankName,
            accountName: bankDetails.accountName || '',
            accountNumber: bankDetails.accountNumber,
            routingNumber: bankDetails.routingNumber || '',
            swiftCode: bankDetails.swiftCode || '',
          }
        : undefined;

        // Use Electron IPC if available, otherwise fallback to API
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('update-invoice', {
            id: invoice.id,
            body: {
              invoiceType,
              currency,
              bankDetails: bankDetailsToSave,
              status: invoice.status,
            }
          }) as IpcResponse;

          if (!result.success) {
            throw new Error(result.error || 'Failed to update invoice');
          }

          setToast({ message: 'Invoice saved successfully!', type: 'success' });
        }
    } catch (error) {
      console.error('Error saving invoice:', error);
      setToast({ message: 'Failed to save invoice', type: 'error' });
    }
  };

  // Load templates from Electron IPC or API
  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        let templates: InvoiceTemplate[] = [];

        // Use Electron IPC
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('get-invoice-templates') as {
            success: boolean;
            data?: InvoiceTemplate[];
            error?: string;
          };
          if (result.success) {
            templates = result.data || [];
          } else {
            throw new Error(result.error || 'Failed to fetch templates');
          }
        } else {
          throw new Error('Electron IPC not available');
        }

        if (templates && templates.length > 0) {
          // Merge fetched templates with built-ins to guarantee HOE Classic exists
          // Filter templates to only show the House Of Electronics classic variant
          const filteredTemplates = templates.filter(t => 
            t.id === 'hoe-classic'
          );
          const mergedTemplates = [
            ...filteredTemplates,
            ...visibleTemplates.filter(
              (builtin: InvoiceTemplate) => !filteredTemplates.some(t => t.id === builtin.id)
            ),
          ];

          setAvailableTemplates(mergedTemplates);

          // Find the selected template or fallback to HOE Classic, then first available
          const template =
            mergedTemplates.find((t: InvoiceTemplate) => t.id === selectedTemplate) ||
            mergedTemplates.find(t => t.id === 'hoe-classic') ||
            mergedTemplates[0];

          setCurrentTemplate(template);
        } else {
          // Fallback to hardcoded templates if none in database
          setAvailableTemplates(visibleTemplates);
          setCurrentTemplate(getDefaultTemplate(selectedTemplate));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to hardcoded templates
        setAvailableTemplates(visibleTemplates);
        setCurrentTemplate(getDefaultTemplate(selectedTemplate));
      }
    };

    loadTemplates();
  }, [selectedTemplate]);

  // Update current template when selectedTemplate changes and templates are loaded
  React.useEffect(() => {
    const templatePool = availableTemplates.length > 0 ? availableTemplates : visibleTemplates;
    const template = templatePool.find(t => t.id === selectedTemplate) || templatePool[0];
    if (template) {
      setCurrentTemplate(template);
    }
  }, [selectedTemplate, availableTemplates]);

  // Load invoice data from database
  React.useEffect(() => {
    const loadInvoice = async () => {
      if (!params.id) {
        return;
      }

      try {
        let invoiceData;

        // Use Electron IPC
        if (!window.electron?.ipcRenderer) {
          throw new Error('Electron not available');
        }
        
        const result = await window.electron.ipcRenderer.invoke('get-invoice-by-id', params.id) as IpcResponse;
        
        if (result.success && result.data) {
          invoiceData = result.data as {
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
            taxes: Array<{
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
            notes: string;
            terms: string;
            bankDetails?: {
              bankName: string;
              accountName?: string;
              accountNumber: string;
              routingNumber?: string;
              swiftCode?: string;
            };
            createdAt: string;
            updatedAt: string;
            saleId?: string;
            saleNumber?: string;
          };
          // Convert amounts from stored Leones to display currency
          // Normalize currency code (handle old SLL -> SLE, NLE -> SLE)
          const rawCurrency = invoiceData.currency || companySettings.currency || 'NLe';
          const displayCurrency = rawCurrency === 'SLL' || rawCurrency === 'SLE' || rawCurrency === 'NLE' || rawCurrency === 'NLe' ? 'NLe' : rawCurrency;
          
          // Helper function to parse JSON strings (handles double-encoding)
          const parseJsonField = (value: any): any[] => {
            if (Array.isArray(value)) {
              return value;
            }
            if (typeof value === 'string') {
              // Skip if it's the string "null"
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
          const itemsArray = parseJsonField(invoiceData.items);
          const taxesArray = parseJsonField(invoiceData.taxes);
          
          const invoiceWithTaxes = {
            ...invoiceData,
            currency: displayCurrency, // Use normalized currency
            taxes: taxesArray.map(tax => ({
              ...tax,
              // Convert tax amounts from Leones to display currency
              amount: convertFromLeones(tax.amount, displayCurrency)
            })),
            // Convert item amounts from Leones to display currency
            items: itemsArray.map(item => ({
              ...item,
              rate: convertFromLeones(item.rate, displayCurrency),
              amount: convertFromLeones(item.amount, displayCurrency)
            })),
            // Convert totals from Leones to display currency
            subtotal: convertFromLeones(invoiceData.subtotal, displayCurrency),
            tax: convertFromLeones(invoiceData.tax, displayCurrency),
            discount: convertFromLeones(invoiceData.discount, displayCurrency),
            total: convertFromLeones(invoiceData.total, displayCurrency),
            paidAmount: convertFromLeones(invoiceData.paidAmount, displayCurrency),
            balance: convertFromLeones(invoiceData.balance, displayCurrency)
          };
          setInvoice(invoiceWithTaxes);
          // Update other state based on loaded invoice
          console.log('InvoiceDetailPage - Loaded invoiceType from database:', invoiceData.invoiceType);
          console.log('InvoiceDetailPage - Loaded taxes from database:', invoiceData.taxes);
          setInvoiceType(invoiceData.invoiceType);
          // Normalize currency code when setting state
          setCurrency(displayCurrency);
          setBankDetails(invoiceData.bankDetails ? {
            bankName: invoiceData.bankDetails.bankName,
            accountName: invoiceData.bankDetails.accountName || '',
            accountNumber: invoiceData.bankDetails.accountNumber,
            routingNumber: invoiceData.bankDetails.routingNumber || '',
            swiftCode: invoiceData.bankDetails.swiftCode || '',
          } : bankDetails);
          
        } else {
          setError(result.error || 'Invoice not found');
          setToast({ message: result.error || 'Invoice not found', type: 'error' });
          return;
        }
      } catch (error) {
        console.error('Error loading invoice:', error);
        setError('Failed to load invoice');
        setToast({ message: 'Failed to load invoice', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    // Store function reference for refreshing
    loadInvoiceRef.current = loadInvoice;
    loadInvoice();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Helper function to refresh invoice data
  const refreshInvoice = async () => {
    if (loadInvoiceRef.current) {
      setLoading(true);
      await loadInvoiceRef.current();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Invoice Not Found</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-x-4">
            <Button
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Invoices
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setError(null);
                setLoading(true);
                // Reload the invoice data
                await refreshInvoice();
              }}
              className="inline-flex items-center gap-2"
            >
              Try Again
            </Button>
          </div>
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
              onClick={() => navigate('/invoices')}
              className="p-2 mt-1 flex-shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  Invoice #{invoice.number || 'N/A'}
                </h1>
                <span 
                  className="px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: invoice.status === 'paid' ? 'var(--success)15' : invoice.status === 'pending' ? 'var(--warning)15' : invoice.status === 'overdue' ? 'var(--destructive)15' : 'var(--muted)',
                    color: invoice.status === 'paid' ? 'var(--success)' : invoice.status === 'pending' ? 'var(--warning)' : invoice.status === 'overdue' ? 'var(--destructive)' : 'var(--foreground)'
                  }}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {invoice.customerName || 'Customer'}
                </p>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>•</span>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {formatDate(invoice.issueDate || new Date())}
                </p>
                {invoice.saleId && (
                  <>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>•</span>
                    <button
                      onClick={() => navigate(`/sales/${invoice.saleId}`)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ 
                        backgroundColor: 'var(--accent)10', 
                        color: 'var(--accent)'
                      }}
                    >
                      <CurrencyDollarIcon className="h-3 w-3" />
                      Sale #{invoice.saleNumber || invoice.saleId.substring(0, 8)}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
            <Button
              onClick={saveInvoiceChanges}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <CheckIcon className="h-4 w-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
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
              onClick={handlePrintInvoice}
              className="flex items-center gap-1.5"
              title="Print"
            >
              <PrinterIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/invoices/templates')}
              className="flex items-center gap-1.5"
              title="Templates"
            >
              <SwatchIcon className="h-4 w-4" />
            </Button>
          {/* Convert to Sale - only if not linked yet */}
          {!invoice.saleId && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  if (!window.electron?.ipcRenderer) throw new Error('Electron IPC not available');
                  const result = await window.electron.ipcRenderer.invoke('convert-invoice-to-sale', invoice.id) as {
                    success: boolean;
                    data?: { sale: { id: string }, invoiceId: string };
                    error?: string;
                  };
                  if (!result.success) throw new Error(result.error || 'Failed to convert invoice to sale');
                  
                  setToast({ message: 'Invoice converted to sale successfully', type: 'success' });
                  
                  // Refresh the invoice data to show it's now linked
                  if (result.data?.sale?.id) {
                    // Refresh invoice to show sale link, then navigate to sale
                    await refreshInvoice();
                    setTimeout(() => {
                      navigate(`/sales/${result.data?.sale?.id}`);
                    }, 500);
                  } else {
                    navigate('/sales');
                  }
                } catch (err) {
                  console.error('Convert to sale failed:', err);
                  setToast({ message: err instanceof Error ? err.message : 'Failed to convert invoice to sale', type: 'error' });
                }
              }}
              className="flex items-center gap-1.5"
            >
              <CheckIcon className="h-4 w-4" />
              Convert
            </Button>
          )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <KPICard
            title="Invoice Total"
            value={formatInvoiceCurrency(invoice.total)}
            icon={<IconCurrencyDollar className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor="#3b82f6"
          />
          <KPICard
            title="Balance Due"
            value={formatInvoiceCurrency(Math.abs((invoice.total || 0) - (invoice.paidAmount || 0)))}
            icon={<IconWallet className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor={invoice.status === 'paid' ? "#22c55e" : "#f59e0b"}
          />
          <KPICard
            title="Status"
            value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            icon={getStatusIcon(invoice.status)}
            accentColor={
              invoice.status === 'paid' ? "#22c55e" :
              invoice.status === 'pending' ? "#eab308" :
              invoice.status === 'overdue' ? "#ef4444" :
              "#6b7280"
            }
          />
          <KPICard
            title="Due Date"
            value={formatDate(invoice.dueDate || invoice.issueDate || new Date())}
            icon={<IconCalendar className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor="#06b6d4"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Invoice Information */}
          <div className="lg:col-span-1 space-y-4">
            {/* Mark as Paid - Only for standard invoices */}
            {(invoice.invoiceType || invoiceType) === 'invoice' && (invoice.status as string) !== 'paid' && (
              <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <IconCreditCard className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Payment Status
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>Status: </span>
                    <span className="font-semibold" style={{ color: 'var(--destructive)' }}>
                      {(invoice.status as string) === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <Button
                    onClick={handleMarkAsPaid}
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={(invoice.status as string) === 'paid'}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Mark as Paid
                  </Button>
                </div>
              </div>
            )}

            {/* Invoice Header Editor */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IconBuildingStore className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Company Information
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingHeader(!isEditingHeader)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  {isEditingHeader ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              {isEditingHeader ? (
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Company Logo
                    </label>
                    <div className="flex items-center gap-4">
                      {companyLogo && (
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-12 w-12 object-contain rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = '1';
                              target.src = '/images/hoe%20logo.png';
                            } else if (!target.dataset.fallback2) {
                              target.dataset.fallback2 = '1';
                              target.src = '/images/hoe logo.png';
                            } else {
                              target.style.display = 'none';
                            }
                          }}
                        />
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <PhotoIcon className="h-4 w-4" />
                          {companyLogo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* Company Information - From Settings */}
                  <div className="p-4 rounded-lg border mb-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Company information is loaded from Settings. To update, go to Settings → Company Info.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/settings')}
                      className="mt-2"
                    >
                      Go to Settings
                    </Button>
                  </div>
                  
                  <Input
                    label="Company Name"
                    value={companyInfo.name}
                    disabled
                  />
                  <Input
                    label="Address"
                    value={companyInfo.address}
                    disabled
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={companyInfo.city}
                      disabled
                    />
                    <Input
                      label="State"
                      value={companyInfo.state}
                      disabled
                    />
                  </div>
                  <Input
                    label="ZIP Code"
                    value={companyInfo.zip}
                    disabled
                  />
                  <Input
                    label="Phone"
                    value={companyInfo.phone}
                    disabled
                  />
                  <Input
                    label="Email"
                    value={companyInfo.email}
                    disabled
                  />

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveHeaderChanges} className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingHeader(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {companyLogo && (
                      <img 
                        src={companyLogo} 
                        alt="Company Logo" 
                        className="h-12 w-12 object-contain rounded flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = '1';
                            target.src = '/images/hoe%20logo.png';
                          } else if (!target.dataset.fallback2) {
                            target.dataset.fallback2 = '1';
                            target.src = '/images/hoe logo.png';
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1" style={{ color: 'var(--foreground)' }}>
                        {companyInfo.name}
                      </h4>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                        {companyInfo.address}, {companyInfo.city}, {companyInfo.state} {companyInfo.zip}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <IconDeviceMobile className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} stroke={1.5} />
                      <span className="truncate">{companyInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <IconAt className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} stroke={1.5} />
                      <span className="truncate">{companyInfo.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <IconWorld className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} stroke={1.5} />
                      <span className="truncate">{companyInfo.website}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Footer Editor */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IconFileText className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Footer Content
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingFooter(!isEditingFooter)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  {isEditingFooter ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              {isEditingFooter ? (
                <div className="space-y-4">
                  <Textarea
                    label="Thank You Message"
                    value={footerContent.thankYouMessage}
                    onChange={(e) => setFooterContent(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                    rows={2}
                  />
                  <Textarea
                    label="Terms & Conditions"
                    value={footerContent.termsAndConditions}
                    onChange={(e) => setFooterContent(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    rows={2}
                  />
                  
                  {/* Brand Logos */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Brand Logos
                    </label>
                    <div className="space-y-3">
                      {brandLogos.map((logo, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded" style={{ borderColor: 'var(--border)' }}>
                          <img src={logo} alt={`Brand ${index + 1}`} className="h-8 w-8 object-contain" />
                          <span className="flex-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                            Brand Logo {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBrandLogo(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBrandLogoUpload}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" className="flex items-center gap-2 w-full">
                          <PlusIcon className="h-4 w-4" />
                          Add Brand Logo
                        </Button>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveFooterChanges} className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingFooter(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                      Thank You Message
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {footerContent.thankYouMessage}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                      Terms & Conditions
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {footerContent.termsAndConditions}
                    </p>
                  </div>
                  {brandLogos.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Partner Brands
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {brandLogos.map((logo, index) => (
                          <img key={index} src={logo} alt={`Brand ${index + 1}`} className="h-6 w-6 object-contain" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bank Details Editor */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <IconCreditCard className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Payment Details
                </h3>
              </div>
              <div className="space-y-4">
                <Input
                  label="Bank Name"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Enter bank name"
                />
                <Input
                  label="Account Name (Optional)"
                  value={bankDetails.accountName || ''}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Enter account name"
                />
                <Input
                  label="Account Number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                />
                <Input
                  label="Routing/Sort Code (Optional)"
                  value={bankDetails.routingNumber || ''}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, routingNumber: e.target.value }))}
                  placeholder="Enter routing or sort code"
                />
                <Input
                  label="SWIFT/BIC Code (Optional)"
                  value={bankDetails.swiftCode || ''}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, swiftCode: e.target.value }))}
                  placeholder="Enter SWIFT or BIC code"
                />
              </div>
            </div>
          </div>

          {/* Full Width - Invoice Preview */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Simplified Controls Bar */}
              <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center rounded-lg p-0.5"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <Button
                      variant={viewMode === 'invoice' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('invoice')}
                      className="px-2.5 py-1 h-7 text-xs"
                    >
                      Invoice
                    </Button>
                    <Button
                      variant={viewMode === 'receipt' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('receipt')}
                      className="px-2.5 py-1 h-7 text-xs"
                    >
                      Receipt
                    </Button>
                  </div>

                  {viewMode === 'invoice' && (
                    <select
                      value={selectedTemplate}
                    onChange={(e) => {
                      const value = e.target.value as 'hoe-classic' | 'hoe-classic-ekhlas';
                      if (value === 'hoe-classic' || value === 'hoe-classic-ekhlas') {
                        setSelectedTemplate(value);
                      }
                    }}
                      className="px-2 py-1 border rounded text-xs h-7" 
                      style={{ 
                        backgroundColor: 'var(--background)', 
                        borderColor: 'var(--border)', 
                        color: 'var(--foreground)'
                      }}
                    >
                      <option value="hoe-classic">HOE Classic (House Of Electronics)</option>
                      <option value="hoe-classic-ekhlas">HOE Classic (Legacy)</option>
                    </select>
                  )}
                  
                  <div 
                    className="flex items-center gap-0.5 px-2 py-1 rounded border text-xs" 
                    style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--background)'
                    }}
                  >
                    <button
                      onClick={() => setPreviewZoom(Math.max(30, previewZoom - 5))}
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:opacity-80"
                      style={{ 
                        color: 'var(--foreground)',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <span className="font-bold">−</span>
                    </button>
                    <button
                      onClick={() => setPreviewZoom(45)}
                      className="font-mono w-10 text-center hover:underline"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {previewZoom}%
                    </button>
                    <button
                      onClick={() => setPreviewZoom(Math.min(100, previewZoom + 5))}
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:opacity-80"
                      style={{ 
                        color: 'var(--foreground)',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <span className="font-bold">+</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title="Download PDF"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={handlePrintInvoice}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title="Print"
                  >
                    <PrinterIcon className="h-3.5 w-3.5" />
                  </Button>
                  {viewMode === 'invoice' && (
                    <Button
                      onClick={handleEmailInvoice}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      title="Email"
                    >
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Invoice/Receipt Preview with Zoom */}
              <div 
                className="relative w-full overflow-auto"
                style={{
                  minHeight: '600px',
                  maxHeight: 'calc(100vh - 250px)',
                  backgroundColor: 'var(--muted)'
                }}
              >
                <div className="flex justify-center items-start p-4" style={{ minWidth: 'fit-content' }}>
                  {viewMode === 'invoice' ? (
                    currentTemplate ? (
                      <div 
                        ref={invoiceRef}
                        data-invoice-preview
                        className="shadow-xl rounded-lg border transition-transform duration-300 overflow-hidden bg-white"
                        style={{
                          transform: `scale(${previewZoom / 100})`,
                          transformOrigin: 'top center',
                          borderColor: 'var(--border)',
                          marginBottom: `${(100 - previewZoom) * 3}px`
                        }}
                      >
                        {(() => {
                          console.log('InvoiceDetailPage - invoice object:', invoice);
                          console.log('InvoiceDetailPage - invoice.issueDate:', invoice.issueDate);
                          console.log('InvoiceDetailPage - invoice.dueDate:', invoice.dueDate);
                          return null;
                        })()}
                        {(() => {
                          const previewData = {
                            invoiceNumber: invoice.number,
                            date: invoice.issueDate,
                            dueDate: invoice.dueDate,
                            invoiceType: invoice.invoiceType || invoiceType,
                            currency: currency,
                            status: invoice.status,
                            paidAmount: invoice.paidAmount,
                            balance: invoice.balance,
                            company: {
                              name: companyInfo.name,
                              address: companyInfo.address,
                              city: companyInfo.city,
                              state: companyInfo.state,
                              zip: companyInfo.zip,
                              phone: companyInfo.phone,
                              email: companyInfo.email,
                              logo: companyLogo
                            },
                            customer: {
                              name: invoice.customerName,
                              email: invoice.customerEmail,
                              address: invoice.customerAddress,
                              phone: invoice.customerPhone
                            },
                            items: Array.isArray(invoice.items) ? invoice.items : [],
                            subtotal: invoice.subtotal,
                            tax: invoice.tax,
                            taxes: invoice.taxes || [],
                            discount: invoice.discount,
                            total: invoice.total,
                            notes: invoice.notes,
                            terms: invoice.terms,
                            bankDetails: bankDetails
                          };
                          console.log('InvoiceDetailPage - Preview data being passed to renderer:', previewData);
                          console.log('InvoiceDetailPage - invoice.invoiceType:', invoice.invoiceType);
                          console.log('InvoiceDetailPage - local invoiceType state:', invoiceType);
                          console.log('InvoiceDetailPage - final invoiceType being passed:', previewData.invoiceType);
                          return null;
                        })()}
                        <DynamicInvoicePreview
                          data={{
                            invoiceNumber: invoice.number,
                            date: invoice.issueDate,
                            dueDate: invoice.dueDate,
                            invoiceType: invoice.invoiceType || invoiceType,
                            salesRep: invoice.salesRep || '',
                            salesRepId: invoice.salesRepId || '',
                            currency: currency,
                            status: invoice.status,
                            paidAmount: invoice.paidAmount,
                            balance: invoice.balance,
                            company: {
                              name: companyInfo.name,
                              address: companyInfo.address,
                              city: companyInfo.city,
                              state: companyInfo.state,
                              zip: companyInfo.zip,
                              phone: companyInfo.phone,
                              email: companyInfo.email,
                              logo: companyLogo
                            },
                            customer: {
                              name: invoice.customerName,
                              address: invoice.customerAddress,
                              city: "",
                              state: "",
                              zip: "",
                              phone: invoice.customerPhone || "",
                              email: invoice.customerEmail
                            },
                            items: Array.isArray(invoice.items) ? invoice.items : [],
                            notes: invoice.notes || footerContent.thankYouMessage,
                            terms: invoice.terms || footerContent.termsAndConditions,
                            taxRate: invoice.subtotal > 0 ? (invoice.tax / (invoice.subtotal - invoice.discount)) * 100 : 0,
                            taxes: Array.isArray(invoice.taxes) ? invoice.taxes : [],
                            discount: invoice.subtotal > 0 ? (invoice.discount / invoice.subtotal) * 100 : 0,
                            bankDetails: bankDetails
                          }}
                          template={currentTemplate}
                          brandLogos={brandLogos}
                          className=""
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading template...</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div 
                      ref={receiptRef}
                      className="shadow-xl rounded-lg border transition-transform duration-300 overflow-hidden bg-white"
                      style={{
                        transform: `scale(${previewZoom / 100})`,
                        transformOrigin: 'top center',
                        borderColor: 'var(--border)',
                        width: 'fit-content',
                        margin: '0 auto'
                      }}
                    >
                      <ReceiptRenderer
                        data={{
                          invoiceNumber: invoice.number,
                          date: invoice.issueDate,
                          dueDate: invoice.dueDate,
                          invoiceType: 'receipt',
                          salesRep: (invoice as any).salesRep || '',
                          salesRepId: (invoice as any).salesRepId || '',
                          company: {
                            name: companyInfo.name,
                            address: companyInfo.address,
                            city: companyInfo.city,
                            state: companyInfo.state,
                            zip: companyInfo.zip,
                            phone: companyInfo.phone,
                            email: companyInfo.email,
                            logo: companyLogo
                          },
                          customer: {
                            name: invoice.customerName,
                            address: invoice.customerAddress || '',
                            city: '',
                            state: '',
                            zip: '',
                            phone: invoice.customerPhone || '',
                            email: invoice.customerEmail || ''
                          },
                          items: Array.isArray(invoice.items) ? invoice.items : [],
                          taxRate: invoice.subtotal > 0 ? (invoice.tax / (invoice.subtotal - invoice.discount)) * 100 : 0,
                          discount: invoice.subtotal > 0 ? (invoice.discount / invoice.subtotal) * 100 : 0,
                          currency: invoice.currency,
                          notes: invoice.notes,
                          terms: invoice.terms
                        }}
                        template={currentTemplate || visibleTemplates[0]}
                        brandLogos={brandLogos}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
