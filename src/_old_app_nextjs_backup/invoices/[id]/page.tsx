'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard';
import { Input, Textarea } from '@/components/ui/forms';
import { ReceiptPreview } from '@/components/ui/invoice/receipt-preview';
import { DynamicInvoicePreview } from '@/components/ui/invoice/dynamic-invoice-preview';
import { InvoiceTemplate } from '@/components/ui/invoice/invoice-templates';
import { allTemplates } from '@/components/ui/invoice/templates';
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
  ArrowDownTrayIcon,
  PrinterIcon,
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
  ShareIcon
} from '@heroicons/react/24/outline';

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
  invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'debit_note';
  currency: string;
  subtotal: number;
  tax: number;
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
  discount: 0,
  total: 0,
  paidAmount: 0,
  balance: 0,
  items: [],
  notes: '',
  terms: '',
  saleId: undefined,
  saleNumber: undefined,
});

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { formatCurrency, formatDate, companySettings } = useSettings();
  
  console.log('InvoiceDetailPage rendered with params:', params);
  console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  // PDF mode detection (for future use if needed)
  // const isPDFMode = typeof window !== 'undefined' && window.location.search.includes('pdf=true');

  const [invoice, setInvoice] = useState(getDefaultInvoice());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');
  const [selectedTemplate, setSelectedTemplate] = useState<'pro-corporate' | 'modern-stripe' | 'minimal-outline' | 'elegant-dark' | 'classic-column'>('pro-corporate');
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<InvoiceTemplate[]>([]);
  const [previewZoom, setPreviewZoom] = useState<number>(45); // Default zoom level for invoice preview
  const invoiceRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Editable header/footer state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('/Assets/topnotch-logo-dark.png');
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
    name: companySettings.companyName || "TopNotch Electronics",
    address: addressParts[0] || "123 Business St",
    city: addressParts[1] || "San Francisco",
    state: addressParts[2]?.split(' ')[0] || "CA",
    zip: addressParts[2]?.split(' ')[1] || "94105",
    phone: companySettings.phone || "+1 (555) 123-4567",
    email: companySettings.email || "info@topnotch.com",
    website: "www.topnotch.com", // Not in settings, use default
    logo: "/Assets/topnotch-logo-dark.png"
  };
  
  // Editable footer content
  const [footerContent, setFooterContent] = useState({
    thankYouMessage: "Thank you for your business!",
    termsAndConditions: "Payment due within 30 days of invoice date.",
    socialMedia: {
      twitter: "@topnotch",
      linkedin: "linkedin.com/company/topnotch"
    }
  });

  // New invoice fields
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma' | 'quote' | 'credit_note' | 'debit_note'>('invoice');
  const [currency, setCurrency] = useState('USD');
  
  // Payment tracking state
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [overpaymentAmount, setOverpaymentAmount] = useState(0);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [customerCredit, setCustomerCredit] = useState(0);
  
  const [bankDetails, setBankDetails] = useState({
    bankName: "Sierra Leone Commercial Bank LTD",
    accountName: "TopNotch Electronics SL Ltd",
    accountNumber: "0030103166411125",
    routingNumber: "0366551",
    swiftCode: ""
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'overdue':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'draft':
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };



  // Print Invoice/Receipt - using same rendering as PDF
  const handlePrintInvoice = async () => {
    try {
      // Get the actual rendered invoice HTML from the DOM
      const invoiceElement = invoiceRef.current;
      


      
      if (!invoiceElement) {
        setToast({ message: 'Invoice preview not found', type: 'error' });
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
            <title>Invoice ${invoice.number}</title>
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
              <title>Invoice ${invoice.number}</title>
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

        // Convert base64 to blob
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

      setToast({ message: 'Invoice downloaded successfully!', type: 'success' });
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
                    `Please find attached invoice ${invoice.number} for ${formatCurrency(invoice.total)}.\n\n` +
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
          `Please find attached invoice ${invoice.number} for ${formatCurrency(invoice.total)}.\n\n` +
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
          text: `Invoice for ${invoice.customerName} - ${formatCurrency(invoice.total)}`,
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

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!newPaymentAmount || parseFloat(newPaymentAmount) <= 0) {
      setToast({ message: 'Please enter a valid payment amount', type: 'error' });
      return;
    }

    try {
      const paymentAmount = parseFloat(newPaymentAmount);
      const currentPaid = invoice.paidAmount || 0;
      const newTotalPaid = currentPaid + paymentAmount;

      if (newTotalPaid > invoice.total) {
        setToast({ message: 'Payment amount exceeds invoice total', type: 'error' });
        return;
      }

      // Use Electron IPC to update payment
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        // Determine new status based on payment
        let newStatus = invoice.status;
        if (newTotalPaid >= invoice.total) {
          newStatus = 'paid';
        } else if (newTotalPaid > 0) {
          newStatus = 'sent'; // Partially paid
        }

        const result = await window.electron.ipcRenderer.invoke('update-invoice', {
          id: invoice.id,
          body: {
            paidAmount: newTotalPaid,
            status: newStatus,
          }
        }) as {
          success: boolean;
          data?: typeof invoice;
          error?: string;
        };

        if (!result.success) {
          throw new Error(result.error || 'Failed to update payment');
        }

        // Update local state
        setInvoice(prev => ({
          ...prev,
          paidAmount: newTotalPaid,
          status: newStatus,
        }));

        setNewPaymentAmount('');
        setToast({ message: `Payment of ${formatCurrency(paymentAmount)} recorded successfully`, type: 'success' });
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to update payment:', error);
      setToast({ message: 'Failed to record payment', type: 'error' });
    }
  };

  // Handle applying customer credit to invoice
  const handleApplyCredit = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      setToast({ message: 'Please enter a valid credit amount', type: 'error' });
      return;
    }

    try {
      const creditToApply = parseFloat(creditAmount);
      
      if (creditToApply > customerCredit) {
        setToast({ message: `Only ${formatCurrency(customerCredit)} credit available`, type: 'error' });
        return;
      }

      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('apply-customer-credit', {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          creditAmount: creditToApply
        }) as {
          success: boolean;
          message?: string;
          error?: string;
          data?: {
            creditApplied: number;
            remainingCredit: number;
            invoiceBalance: number;
          };
        };

        if (!result.success) {
          throw new Error(result.error || 'Failed to apply credit');
        }

        setToast({ 
          message: `${formatCurrency(creditToApply)} credit applied successfully!`, 
          type: 'success' 
        });
        setShowCreditDialog(false);
        setCreditAmount('');
        setCustomerCredit(result.data?.remainingCredit || 0);
        
        // Reload invoice to show updated payment
        window.location.reload();
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to apply credit:', error);
      setToast({ message: 'Failed to apply credit', type: 'error' });
    }
  };

  // Handle overpayment actions
  const handleOverpayment = async (action: 'store-credit' | 'refunded' | 'keep') => {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('handle-invoice-overpayment', {
          invoiceId: invoice.id,
          action,
          overpaymentAmount,
          customerId: invoice.customerId
        }) as {
          success: boolean;
          message?: string;
          error?: string;
          data?: {
            newStoreCredit?: number;
            refundedAmount?: number;
            overpaymentAmount?: number;
          };
        };

        if (!result.success) {
          throw new Error(result.error || 'Failed to handle overpayment');
        }

        setToast({ message: result.message || 'Overpayment handled successfully', type: 'success' });
        setShowOverpaymentDialog(false);
        setOverpaymentAmount(0);
        
        // Reload invoice to show updated data
        window.location.reload();
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Failed to handle overpayment:', error);
      setToast({ message: 'Failed to handle overpayment', type: 'error' });
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
    const template = allTemplates.find(t => t.id === templateId);
    return template || allTemplates[0]; // Fallback to first template if not found
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
          setAvailableTemplates(templates);
          // Find the selected template or use the first one
          const template = templates.find((t: InvoiceTemplate) => t.id === selectedTemplate) || templates[0];
          setCurrentTemplate(template);
        } else {
          // Fallback to hardcoded templates if none in database
          setAvailableTemplates(allTemplates);
          setCurrentTemplate(getDefaultTemplate(selectedTemplate));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to hardcoded templates
        setAvailableTemplates(allTemplates);
        setCurrentTemplate(getDefaultTemplate(selectedTemplate));
      }
    };

    loadTemplates();
  }, [selectedTemplate]);

  // Update current template when selectedTemplate changes and templates are loaded
  React.useEffect(() => {
    if (availableTemplates.length > 0) {
      const template = availableTemplates.find(t => t.id === selectedTemplate);
      if (template) {
        setCurrentTemplate(template);
      }
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
            invoiceType: "invoice" | "proforma" | "quote" | "credit_note" | "debit_note";
            currency: string;
            subtotal: number;
            tax: number;
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
          setInvoice(invoiceData);
          // Update other state based on loaded invoice
          setInvoiceType(invoiceData.invoiceType);
          setCurrency(invoiceData.currency);
          setBankDetails(invoiceData.bankDetails ? {
            bankName: invoiceData.bankDetails.bankName,
            accountName: invoiceData.bankDetails.accountName || '',
            accountNumber: invoiceData.bankDetails.accountNumber,
            routingNumber: invoiceData.bankDetails.routingNumber || '',
            swiftCode: invoiceData.bankDetails.swiftCode || '',
          } : bankDetails);
          
          // Check for overpayment
          const paidAmount = invoiceData.paidAmount || 0;
          const total = invoiceData.total || 0;
          if (paidAmount > total) {
            setOverpaymentAmount(paidAmount - total);
            // Check URL parameter for overpayment flag
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('overpayment') === 'true') {
              setShowOverpaymentDialog(true);
            }
          }
          
          // Load customer credit if customer exists
          if (invoiceData.customerId && typeof window !== 'undefined' && window.electron?.ipcRenderer) {
            const customerResult = await window.electron.ipcRenderer.invoke('get-customer-by-id', invoiceData.customerId) as {
              success: boolean;
              data?: { storeCredit?: number };
            };
            if (customerResult.success && customerResult.data) {
              setCustomerCredit(customerResult.data.storeCredit || 0);
            }
          }
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

    loadInvoice();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoice details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-x-4">
              <Button
                onClick={() => router.push('/invoices')}
                className="inline-flex items-center gap-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Invoices
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Reload the invoice
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/invoices')}
              className="p-2"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                Invoice Details
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                View and manage invoice information
              </p>
              {invoice.saleId && (
                <div className="mt-2">
                  <button
                    onClick={() => router.push(`/sales/${invoice.saleId}`)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ 
                      backgroundColor: 'var(--accent)10', 
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)30'
                    }}
                  >
                    <CurrencyDollarIcon className="h-3 w-3" />
                    Created from Sale #{invoice.saleNumber || invoice.saleId.substring(0, 8)}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={saveInvoiceChanges}
              className="flex items-center gap-2"
            >
              <CheckIcon className="h-4 w-4" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/invoices/templates')}
              className="flex items-center gap-2"
            >
              <SwatchIcon className="h-4 w-4" />
              Templates
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintInvoice}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Invoice Total"
            value={formatCurrency(invoice.total)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard
            title={overpaymentAmount > 0 ? "Overpayment" : "Balance Due"}
            value={formatCurrency(Math.abs((invoice.total || 0) - (invoice.paidAmount || 0)))}
            icon={overpaymentAmount > 0 ? 
              <CurrencyDollarIcon className="h-6 w-6 text-green-500" /> : 
              <ClockIcon className="h-6 w-6 text-orange-500" />
            }
          />
          {overpaymentAmount > 0 && (
            <button
              onClick={() => setShowOverpaymentDialog(true)}
              className="col-span-1 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all"
            >
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Handle Overpayment
                </span>
              </div>
            </button>
          )}
          <KPICard
            title="Status"
            value={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            icon={getStatusIcon(invoice.status)}
          />
          <KPICard
            title="Due Date"
            value={formatDate(invoice.dueDate || invoice.issueDate || new Date())}
            icon={<CalendarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Invoice Type & Currency Settings */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Invoice Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    Invoice Type
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'debit_note')}
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="proforma">Proforma Invoice</option>
                    <option value="quote">Quotation</option>
                    <option value="credit_note">Credit Note</option>
                    <option value="debit_note">Debit Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="SLL">SLL - Sierra Leone Leone</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Tracking */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Payment Tracking
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <div className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(invoice.total)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Paid Amount:</span>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(invoice.paidAmount || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Balance Due:</span>
                    <div className="font-semibold text-orange-600">
                      {formatCurrency((invoice.total || 0) - (invoice.paidAmount || 0))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Status:</span>
                    <div className={`font-semibold ${
                      (invoice.paidAmount || 0) >= (invoice.total || 0) 
                        ? 'text-green-600' 
                        : (invoice.paidAmount || 0) > 0 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                    }`}>
                      {(invoice.paidAmount || 0) >= (invoice.total || 0) 
                        ? 'Fully Paid' 
                        : (invoice.paidAmount || 0) > 0 
                          ? 'Partially Paid' 
                          : 'Unpaid'
                      }
                    </div>
                  </div>
                </div>
                
                {/* Payment Update Form */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    Record Payment
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={invoice.total}
                      step="0.01"
                      placeholder="Enter payment amount"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handlePaymentUpdate}
                      disabled={!newPaymentAmount || parseFloat(newPaymentAmount) <= 0}
                      className="flex items-center gap-2"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Record
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the amount received from the customer
                  </p>
                  
                  {/* Store Credit Option */}
                  {invoice.customerId && customerCredit > 0 && (invoice.total - (invoice.paidAmount || 0)) > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          Available Store Credit
                        </label>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(customerCredit)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreditDialog(true)}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <CurrencyDollarIcon className="h-4 w-4" />
                        Apply Store Credit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Header Editor */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Company Header
                </h3>
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
                        <Image src={companyLogo} alt="Company Logo" width={48} height={48} className="h-12 w-12 object-contain rounded" />
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
                      onClick={() => router.push('/settings')}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {companyLogo && (
                      <Image src={companyLogo} alt="Company Logo" width={40} height={40} className="h-10 w-10 object-contain rounded" />
                    )}
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {companyInfo.name}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        {companyInfo.address}, {companyInfo.city}, {companyInfo.state} {companyInfo.zip}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      {companyInfo.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4" />
                      {companyInfo.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="h-4 w-4" />
                      {companyInfo.website}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Footer Editor */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  Footer Content
                </h3>
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
                          <Image src={logo} alt={`Brand ${index + 1}`} width={32} height={32} className="h-8 w-8 object-contain" />
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
                          <Image key={index} src={logo} alt={`Brand ${index + 1}`} width={24} height={24} className="h-6 w-6 object-contain" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bank Details Editor */}
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Payment Details
              </h3>
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

          {/* Right Column - Invoice Preview */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Simplified Controls Bar */}
              <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
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
                      onChange={(e) => setSelectedTemplate(e.target.value as 'pro-corporate' | 'modern-stripe' | 'minimal-outline' | 'elegant-dark' | 'classic-column')}
                      className="px-2 py-1 border rounded text-xs h-7" 
                      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    >
                      <option value="pro-corporate">Pro Corporate</option>
                      <option value="modern-stripe">Modern Stripe</option>
                      <option value="minimal-outline">Minimal Outline</option>
                      <option value="elegant-dark">Elegant Dark</option>
                      <option value="classic-column">Classic Column</option>
                    </select>
                  )}
                  
                  <div className="flex items-center gap-0.5 px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setPreviewZoom(Math.max(30, previewZoom - 5))}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="font-bold">−</span>
                    </button>
                    <button
                      onClick={() => setPreviewZoom(45)}
                      className="font-mono w-10 text-center hover:underline"
                    >
                      {previewZoom}%
                    </button>
                    <button
                      onClick={() => setPreviewZoom(Math.min(100, previewZoom + 5))}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="font-bold">+</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={handlePrintInvoice}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title="Print"
                  >
                    <PrinterIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    onClick={viewMode === 'invoice' ? handleDownloadInvoice : handleDownloadReceipt}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title="Download PDF"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  </Button>
                  {viewMode === 'invoice' && (
                    <>
                      <Button
                        onClick={handleEmailInvoice}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Email"
                      >
                        <EnvelopeIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        onClick={handleShareInvoice}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Share"
                      >
                        <ShareIcon className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice/Receipt Preview with Zoom */}
              <div 
                className="relative w-full overflow-auto bg-gray-50 dark:bg-gray-950"
                style={{
                  minHeight: '600px',
                  maxHeight: 'calc(100vh - 250px)'
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
                        <DynamicInvoicePreview
                          data={{
                            invoiceNumber: invoice.number,
                            date: invoice.issueDate,
                            dueDate: invoice.dueDate,
                            invoiceType: invoiceType,
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
                            items: invoice.items,
                            notes: invoice.notes || footerContent.thankYouMessage,
                            terms: invoice.terms || footerContent.termsAndConditions,
                            taxRate: invoice.subtotal > 0 ? (invoice.tax / (invoice.subtotal - invoice.discount)) * 100 : 0,
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
                    <div ref={receiptRef}>
                      <ReceiptPreview
                        data={{
                          receiptNumber: invoice.number,
                          date: invoice.issueDate,
                          time: new Date().toLocaleTimeString(),
                          company: {
                            name: companyInfo.name,
                            address: `${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state} ${companyInfo.zip}`,
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
                            phone: invoice.customerPhone || ""
                          },
                          items: invoice.items,
                          paymentMethod: invoice.paidAmount >= invoice.total ? "Cash" : "Pending",
                          taxRate: invoice.subtotal > 0 ? (invoice.tax / (invoice.subtotal - invoice.discount)) * 100 : 0,
                          discount: invoice.subtotal > 0 ? (invoice.discount / invoice.subtotal) * 100 : 0
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Credit Dialog */}
        {showCreditDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Apply Store Credit</h3>
                <button
                  onClick={() => {
                    setShowCreditDialog(false);
                    setCreditAmount('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-800 dark:text-green-200">Available Credit:</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(customerCredit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding Balance:</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency((invoice.total || 0) - (invoice.paidAmount || 0))}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Credit Amount to Apply
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={Math.min(customerCredit, (invoice.total || 0) - (invoice.paidAmount || 0))}
                    step="0.01"
                    placeholder="Enter amount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: {formatCurrency(Math.min(customerCredit, (invoice.total || 0) - (invoice.paidAmount || 0)))}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const maxCredit = Math.min(customerCredit, (invoice.total || 0) - (invoice.paidAmount || 0));
                      setCreditAmount(maxCredit.toString());
                    }}
                    className="flex-1"
                  >
                    Use Maximum
                  </Button>
                  <Button
                    onClick={handleApplyCredit}
                    disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                    className="flex-1"
                  >
                    Apply Credit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overpayment Dialog */}
        {showOverpaymentDialog && overpaymentAmount > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Overpayment Detected</h3>
                <button
                  onClick={() => setShowOverpaymentDialog(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-muted-foreground mb-4">
                  Customer has overpaid by <span className="font-bold text-accent">{formatCurrency(overpaymentAmount)}</span>.
                  How would you like to handle this overpayment?
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleOverpayment('store-credit')}
                    className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <CurrencyDollarIcon className="h-6 w-6 text-accent flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-foreground">Convert to Store Credit</h4>
                        <p className="text-sm text-muted-foreground">
                          Add {formatCurrency(overpaymentAmount)} to customer&apos;s store credit balance
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleOverpayment('refunded')}
                    className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-foreground">Mark as Refunded</h4>
                        <p className="text-sm text-muted-foreground">
                          Customer has been refunded {formatCurrency(overpaymentAmount)}
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleOverpayment('keep')}
                    className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-foreground">Keep on Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Leave overpayment on account for future invoices
                        </p>
                      </div>
                    </div>
                  </button>
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
    </AppLayout>
  );
}
