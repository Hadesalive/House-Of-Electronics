import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { paginateInvoiceItems, PageBreak, ItemsRangeIndicator, needsSeparateTotalsPage } from '../multi-page-utils';
import { 
  paginateDeliveryNoteItems, 
  getDeliveryNotePaginationConfig, 
  deliveryNoteNeedsMultiplePages,
  getDeliveryNotePaginationInfo,
  deliveryNotePrintStyles,
  DeliveryNotePageBreak,
  DeliveryNoteItemsRange
} from '../delivery-note-pagination';

interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string; // Additional item-specific description
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery' | 'recurring';
  currency?: string;
  paidAmount?: number;
  balance?: number;
  status?: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  discount: number;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
}

// Add print styles to ensure proper layout when printed
const printStyles = `
  @media print {
    /* Zero page margins - clean print */
    @page {
      size: A4;
      margin: 0; /* No CSS margins - template has internal padding */
    }

    .print-invoice * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-invoice {
      margin: 0 !important; /* Let @page handle margins */
      box-shadow: none !important;
      border-width: 2px !important;
      border-style: solid !important;
      border-radius: 12px !important;
    }

    .print-invoice header {
      margin-bottom: 2rem !important;
    }

    .print-invoice .invoice-header-section {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      margin-bottom: 1.5rem !important;
    }

    .print-invoice .badge-row {
      display: grid !important;
      grid-template-columns: 1fr auto 1fr !important;
      align-items: center !important;
      gap: 1.5rem !important;
    }

    /* Ensure decorative backgrounds print correctly */
    .print-invoice .absolute {
      position: absolute !important;
    }

    .print-invoice svg {
      display: block !important;
    }

    /* Ensure SVG decorative elements print with their gradients and filters */
    .print-invoice svg,
    .print-invoice svg path,
    .print-invoice svg defs,
    .print-invoice svg linearGradient,
    .print-invoice svg filter {
      display: block !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Ensure gradients and complex backgrounds print */
    .print-invoice [style*="background"] {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Ensure background patterns with masks print correctly */
    .print-invoice [style*="backgroundImage"],
    .print-invoice [style*="maskImage"] {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Ensure proper text rendering */
    .print-invoice {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    /* Hide info banner when printing */
    .pagination-controls {
      display: none !important;
    }

    /* Page break handling */
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
    }

    /* Ensure border appears on all pages */
    .print-invoice {
      border: 2px solid var(--template-primary-color, #3b82f6) !important;
      border-radius: 12px !important;
    }
  }
  
  /* Fix for html2canvas lab() color parsing error */
  @media screen {
    .print-invoice {
      color-scheme: light;
    }
  }
`;

export function ModernStripeRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;
  const currency = data.currency || 'USD';

  const formatCurrency = (amount: number) => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'SLE': 'NLe ',
      'SLL': 'NLe ',
      'NLE': 'NLe ',
      'NLe': 'NLe ',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to convert relative paths to absolute URLs
  const getImageUrl = (src: string) => {
    if (src.startsWith('/')) {
      return `${window.location.origin}${src}`;
    }
    return src;
  };

  // Footer component
  const InvoiceFooter = () => (
    <footer className="pt-3 border-t" style={{ borderColor: template.colors.secondary }}>
      <div className="grid grid-cols-2 gap-4 text-xs">
        {data.notes && (
          <div>
            <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Notes</div>
            <div style={{ color: template.colors.secondary }}>{data.notes}</div>
          </div>
        )}
        {data.terms && (
          <div>
            <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Terms</div>
            <div style={{ color: template.colors.secondary }}>{data.terms}</div>
          </div>
        )}
      </div>
      
      {/* Bank Details - Full Width */}
      {data.bankDetails && (
        <div className="mt-3">
          <div className="font-semibold mb-1 text-xs" style={{ color: template.colors.primary }}>Bank Details</div>
          <div className="text-[10px]" style={{ color: template.colors.secondary }}>
            Bank: {data.bankDetails.bankName}
            {data.bankDetails.accountName && ` • Account: ${data.bankDetails.accountName}`}
            {` • Account #: ${data.bankDetails.accountNumber}`}
            {data.bankDetails.routingNumber && ` • Routing #: ${data.bankDetails.routingNumber}`}
            {data.bankDetails.swiftCode && ` • SWIFT: ${data.bankDetails.swiftCode}`}
          </div>
        </div>
      )}
      
      {brandLogos.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {brandLogos.map((logo, i) => {
            const logoSrc = getImageUrl(logo);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                key={i} 
                src={logoSrc} 
                alt={`Brand ${i + 1}`} 
                className="h-4 w-auto object-contain opacity-70"
                onError={(e) => {
                  // Hide broken images in PDF
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          })}
        </div>
      )}
    </footer>
  );

  // Modern Stripe pagination logic optimized for different invoice types
  const getModernStripePaginationConfig = (invoiceType: string) => {
    const baseConfig = {
      templateType: 'compact' as const,
      firstPageCapacity: 0.70,  // Base capacity for header and decorative elements
      lastPageCapacity: 0.60,   // Base capacity for totals and footer
      separateTotalsThreshold: 6
    };

    switch (invoiceType) {
      case 'delivery':
        return {
          ...baseConfig,
          firstPageCapacity: 0.65,  // Less space due to signature section
          lastPageCapacity: 0.50,   // Much less space for delivery confirmation
          separateTotalsThreshold: 4 // Lower threshold for delivery notes
        };
      
      case 'quote':
        return {
          ...baseConfig,
          firstPageCapacity: 0.68,  // Slightly less for "Valid Until" date
          lastPageCapacity: 0.58,   // Slightly less for estimated totals
          separateTotalsThreshold: 5
        };
      
      case 'credit_note':
        return {
          ...baseConfig,
          firstPageCapacity: 0.68,  // Slightly less for credit note styling
          lastPageCapacity: 0.58,   // Slightly less for credit totals
          separateTotalsThreshold: 5
        };
      
      case 'proforma':
        return {
          ...baseConfig,
          firstPageCapacity: 0.68,  // Slightly less for "Valid Until" date
          lastPageCapacity: 0.58,   // Slightly less for proforma totals
          separateTotalsThreshold: 5
        };
      
      case 'recurring':
        return {
          ...baseConfig,
          firstPageCapacity: 0.68,  // Slightly less for "Next Due" date
          lastPageCapacity: 0.58,   // Slightly less for recurring totals
          separateTotalsThreshold: 5
        };
      
      default: // Regular invoice
        return baseConfig;
    }
  };

  // Use specialized pagination for delivery notes
  const isDeliveryNote = (data.invoiceType as string) === 'delivery';
  
  let adjustedPages: any[];
  let needsSeparateTotals = false;
  let paginationInfo: any = null;
  
  if (isDeliveryNote) {
    // Use delivery note specific pagination
    const deliveryConfig = getDeliveryNotePaginationConfig('compact');
    adjustedPages = paginateDeliveryNoteItems(data.items, deliveryConfig);
    needsSeparateTotals = false; // Delivery notes never need separate totals page
    paginationInfo = getDeliveryNotePaginationInfo(adjustedPages);
  } else {
    // Use standard pagination for other invoice types
    const paginationConfig = getModernStripePaginationConfig(data.invoiceType || 'invoice');
    adjustedPages = paginateInvoiceItems(data.items, paginationConfig);
    needsSeparateTotals = needsSeparateTotalsPage(adjustedPages, paginationConfig.separateTotalsThreshold, 'compact');
  }

  // Helper function to get appropriate page title for different invoice types
  const getPageTitle = (invoiceType: string) => {
    switch (invoiceType) {
      case 'credit_note':
        return 'Credit Note Summary';
      case 'quote':
        return 'Quote Summary';
      case 'proforma':
        return 'Proforma Summary';
      case 'recurring':
        return 'Recurring Invoice Summary';
      case 'delivery':
        return 'Delivery Note Summary';
      default:
        return 'Invoice Summary';
    }
  };

  // Add Modern Stripe specific print optimizations
  const modernStripePrintStyles = `
    @media print {
      /* Modern Stripe specific optimizations */
      .print-invoice {
        /* Ensure proper spacing for decorative elements */
        padding-top: 6mm !important;
        padding-bottom: 8mm !important;
        padding-left: 8mm !important;
        padding-right: 8mm !important;
        /* Prevent content from being cut off */
        min-height: 297mm !important;
        max-height: 297mm !important;
        height: 297mm !important;
        overflow: visible !important;
      }
      
      /* Optimize for Modern Stripe's compact table design */
      .print-invoice .grid {
        gap: 0.5rem !important;
      }
      
      /* Ensure decorative SVG elements don't interfere with content */
      .print-invoice svg {
        pointer-events: none !important;
        user-select: none !important;
      }
      
      /* Optimize table spacing for Modern Stripe */
      .print-invoice .grid-cols-12 > div {
        padding: 0.5rem !important;
      }
      
      /* Ensure proper page breaks */
      .print-invoice {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Prevent table rows from breaking across pages */
      .print-invoice .grid-cols-12 {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Invoice type specific optimizations */
      .print-invoice[data-invoice-type="delivery"] {
        /* Delivery notes need extra space for signature section */
        padding-bottom: 10mm !important;
      }
      
      .print-invoice[data-invoice-type="quote"] {
        /* Quotes may have longer "Valid Until" text */
        padding-top: 7mm !important;
      }
      
      .print-invoice[data-invoice-type="credit_note"] {
        /* Credit notes may have different styling */
        padding-top: 7mm !important;
      }
      
      .print-invoice[data-invoice-type="proforma"] {
        /* Proforma invoices may have longer text */
        padding-top: 7mm !important;
      }
      
      .print-invoice[data-invoice-type="recurring"] {
        /* Recurring invoices may have "Next Due" text */
        padding-top: 7mm !important;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles + modernStripePrintStyles + (isDeliveryNote ? deliveryNotePrintStyles : '') }} />
      
      {/* Multi-page info banner (screen only) */}
      {(adjustedPages.length > 1 || needsSeparateTotals) && (
        <div className="pagination-controls mb-4 p-3 rounded-lg border text-center" style={{ backgroundColor: `${template.colors.primary}10`, borderColor: template.colors.primary }}>
          <div className="text-sm font-medium" style={{ color: template.colors.primary }}>
            {isDeliveryNote ? (
              <>📄 {paginationInfo?.message}</>
            ) : (
              <>📄 This invoice has {adjustedPages.length + (needsSeparateTotals ? 1 : 0)} pages ({data.items.length} items)
              {needsSeparateTotals && <span className="text-xs ml-2">(+ separate totals page)</span>}</>
            )}
          </div>
        </div>
      )}

      {/* Render each page as a complete A4 container */}
      {adjustedPages.map((page, pageIdx) => (
        <React.Fragment key={page.pageNumber}>
          <div
            className="relative overflow-hidden print-invoice"
            style={{
              width: '210mm',
              backgroundColor: template.colors.background,
              color: template.colors.text,
              fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
              // Remove external margins - @page has zero margins
              margin: '0mm',
              marginBottom: pageIdx < adjustedPages.length - 1 ? '5mm' : '0mm',
              // Proper internal padding for template design breathing room
              padding: '8mm',
              paddingTop: '6mm',
              paddingBottom: '8mm',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              // Full A4 height (297mm) - no @page margins
              minHeight: '297mm',
              height: '297mm',
              maxHeight: '297mm',
              // Add explicit border styling to match template design
              border: `2px solid ${template.colors.primary}30`,
              borderRadius: '12px'
            }}
          >
            {/* Decorative background: subtle dots (top-left) - on all pages */}
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage:
                  `radial-gradient(${template.colors.primary}18 1px, transparent 1px)`,
                backgroundSize: '10px 10px',
                backgroundPosition: '10mm 10mm',
                maskImage:
                  'radial-gradient(circle at 15% 10%, black 0%, black 35%, transparent 55%)',
                WebkitMaskImage:
                  'radial-gradient(circle at 15% 10%, black 0%, black 35%, transparent 55%)',
                opacity: 0.25
              }}
            />

            {/* Decorative background: top wave (polished) - on all pages */}
            <svg
              className="absolute top-0 left-0 z-0 w-full"
              height="120"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.25 }}
            >
              <defs>
                <linearGradient id={`ms-top-grad-${page.pageNumber}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={template.colors.primary} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={template.colors.secondary} stopOpacity="0.15" />
                </linearGradient>
                <filter id={`ms-top-blur-${page.pageNumber}`} x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </defs>
              <path
                d="M0,0 L1200,0 L1200,60 C1100,40 980,90 860,70 C740,50 640,20 520,40 C400,60 300,110 160,95 C80,86 30,70 0,78 Z"
                fill={`url(#ms-top-grad-${page.pageNumber})`}
                filter={`url(#ms-top-blur-${page.pageNumber})`}
              />
            </svg>

            {/* Decorative background: bottom wave (polished) - on all pages */}
            <svg
              className="absolute bottom-0 left-0 z-0 w-full"
              height="130"
              viewBox="0 0 1200 130"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.22 }}
            >
              <defs>
                <linearGradient id={`ms-bottom-grad-${page.pageNumber}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={template.colors.secondary} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={template.colors.primary} stopOpacity="0.12" />
                </linearGradient>
                <filter id={`ms-bottom-blur-${page.pageNumber}`} x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
                </filter>
              </defs>
              <path
                d="M0,130 L0,80 C140,86 220,108 360,100 C500,92 620,54 760,72 C900,90 1000,118 1200,96 L1200,130 Z"
                fill={`url(#ms-bottom-grad-${page.pageNumber})`}
                filter={`url(#ms-bottom-blur-${page.pageNumber})`}
              />
            </svg>

            {/* Page Container with Flexbox */}
            <div className="relative z-10 flex-grow flex flex-col">
              {/* Header - only on first page */}
              {page.isFirstPage && (
                <>
                  <div className="mb-12 flex items-start justify-between">
                    {/* Left: Company Brand Section */}
                    <div className="flex items-start gap-6">
                      {template.layout.showLogo && data.company.logo && (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: `${template.colors.primary}08` }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={getImageUrl(data.company.logo)} 
                              alt="Company Logo" 
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div>
                          <div className="text-2xl font-light tracking-tight mb-1" style={{ color: template.colors.text }}>{data.company.name}</div>
                          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: template.colors.primary }}></div>
                        </div>
                        <div className="space-y-1 text-sm" style={{ color: template.colors.secondary }}>
                          <div className="font-medium">{data.company.address}</div>
                          <div>{data.company.city}</div>
                          {(data.company.phone || data.company.email) && (
                            <div className="pt-1">
                              {data.company.phone && <span>{data.company.phone}</span>}
                              {data.company.phone && data.company.email && <span className="mx-2">•</span>}
                              {data.company.email && <span>{data.company.email}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-4">
                      <div className="inline-block px-3 py-1.5 rounded text-white font-medium text-xs tracking-wider uppercase" style={{ backgroundColor: template.colors.primary }}>
                        {data.invoiceType === 'proforma' ? 'PROFORMA' : 
                         data.invoiceType === 'quote' ? 'QUOTE' :
                         data.invoiceType === 'credit_note' ? 'CREDIT NOTE' :
                         data.invoiceType === 'delivery' ? 'DELIVERY NOTE' :
                         data.invoiceType === 'recurring' ? 'RECURRING INVOICE' :
                         'INVOICE'}
                      </div>
                      <div className="space-y-1 text-sm" style={{ color: template.colors.text }}>
                        <div className="font-medium">
                          {data.invoiceType === 'proforma' ? 'Proforma Number:' :
                           data.invoiceType === 'quote' ? 'Quote Number:' :
                           data.invoiceType === 'credit_note' ? 'Credit Note Number:' :
                           (data.invoiceType as string) === 'delivery' ? 'Delivery Note Number:' :
                           (data.invoiceType as string) === 'recurring' ? 'Recurring Invoice Number:' :
                           'Invoice Number:'} {data.invoiceNumber}
                        </div>
                        
                        {/* Conditional date fields based on invoice type */}
                        {data.invoiceType === 'credit_note' ? (
                          <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                        ) : data.invoiceType === 'quote' ? (
                          <>
                            <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                            <div className="font-medium">Valid Until: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                          </>
                        ) : (data.invoiceType as string) === 'delivery' ? (
                          <>
                            <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                            <div className="font-medium">Delivery Date: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                          </>
                        ) : data.invoiceType === 'proforma' ? (
                          <>
                            <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                            <div className="font-medium">Valid Until: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                          </>
                        ) : (data.invoiceType as string) === 'recurring' ? (
                          <>
                            <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                            <div className="font-medium">Next Due: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                          </>
                        ) : (
                          <>
                        <div className="font-medium">Date: {data.date ? new Date(data.date).toLocaleDateString() : 'Not specified'}</div>
                        <div className="font-medium">Due: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bill To + Summary */}
                  <div className="mb-12 grid grid-cols-2 gap-12">
                    <div>
                      <div className="text-xs font-medium mb-4 tracking-wider uppercase" style={{ color: template.colors.secondary }}>Bill To</div>
                      <div className="text-sm space-y-2">
                        {data.customer.name ? (
                          <>
                            <div className="font-medium text-lg" style={{ color: template.colors.text }}>{data.customer.name}</div>
                            {data.customer.address && <div style={{ color: template.colors.secondary }}>{data.customer.address}</div>}
                            {data.customer.city && (
                              <div style={{ color: template.colors.secondary }}>
                                {data.customer.city}
                              </div>
                            )}
                            {data.customer.phone && <div style={{ color: template.colors.secondary }}>{data.customer.phone}</div>}
                            {data.customer.email && <div style={{ color: template.colors.secondary }}>{data.customer.email}</div>}
                          </>
                        ) : (
                          <div className="text-sm" style={{ color: template.colors.secondary }}>No customer selected</div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-xs font-medium mb-2 tracking-wider uppercase" style={{ color: template.colors.secondary }}>
                          {data.invoiceType === 'credit_note' ? 'Credit Amount' :
                           data.invoiceType === 'quote' ? 'Estimated Total' :
                           data.invoiceType === 'proforma' ? 'Total' :
                           (data.invoiceType as string) === 'delivery' ? 'Items Delivered' :
                           (data.invoiceType as string) === 'recurring' ? 'Recurring Amount' :
                           'Amount Due'}
                        </div>
                        <div className="text-4xl font-light" style={{ color: template.colors.text }}>
                          {data.invoiceType === 'credit_note' ? formatCurrency(total) :
                           data.invoiceType === 'quote' ? formatCurrency(total) :
                           data.invoiceType === 'proforma' ? formatCurrency(total) :
                           (data.invoiceType as string) === 'delivery' ? `${data.items.length} items` :
                           (data.invoiceType as string) === 'recurring' ? formatCurrency(total) :
                           formatCurrency(total)}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Page indicator for continuation pages */}
              {!page.isFirstPage && (
                <div className="mb-4 text-center text-xs text-gray-500">
                  Page {page.pageNumber} of {page.totalPages} {page.isLastPage ? '' : '(continued)'}
                </div>
              )}

              {/* Items Table */}
              <div className="mb-8 flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold tracking-wide uppercase" style={{ color: template.colors.primary }}>
                    {(data.invoiceType as string) === 'delivery' ? 'Items Delivered' : 
                     data.invoiceType === 'credit_note' ? 'Items Credited' :
                     data.invoiceType === 'quote' ? 'Items Quoted' :
                     data.invoiceType === 'proforma' ? 'Items' :
                     'Items'} {page.totalPages > 1 ? `(Page ${page.pageNumber} of ${page.totalPages})` : ''}
                  </div>
                  {page.totalPages > 1 && (
                    <ItemsRangeIndicator 
                      start={page.itemsRange.start} 
                      end={page.itemsRange.end} 
                      total={data.items.length}
                    />
                  )}
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-12 text-xs font-bold py-4 px-2 tracking-wide uppercase rounded-t-lg" style={{ 
                  color: template.colors.primary,
                  backgroundColor: `${template.colors.primary}08`,
                  borderBottom: `2px solid ${template.colors.primary}20`
                }}>
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  {(data.invoiceType as string) !== 'delivery' && (
                    <>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                    </>
                  )}
                  {(data.invoiceType as string) === 'delivery' && (
                    <div className="col-span-4 text-center">Status</div>
                  )}
                </div>
                
                {/* Table Body */}
                <div className="border border-t-0 rounded-b-lg" style={{ borderColor: template.colors.primary + '20' }}>
                  {page.items.map((item: InvoiceItem, idx: number) => (
                    <div key={item.id} className="grid grid-cols-12 py-4 px-2 text-sm hover:opacity-90 transition-opacity" style={{ 
                      backgroundColor: idx % 2 === 0 ? 'transparent' : `${template.colors.primary}03`,
                      borderBottom: idx < page.items.length - 1 ? `1px solid ${template.colors.primary}10` : 'none'
                    }}>
                      <div className="col-span-6 pr-4">
                        <div className="font-semibold text-base" style={{ color: template.colors.text }}>{item.description}</div>
                        {item.itemDescription && (
                          <div className="text-xs mt-1 opacity-75" style={{ color: template.colors.secondary }}>
                            {item.itemDescription}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-medium" style={{ color: template.colors.text }}>{item.quantity}</div>
                      {(data.invoiceType as string) !== 'delivery' && (
                        <>
                      <div className="col-span-2 text-right font-medium" style={{ color: template.colors.text }}>{formatCurrency(item.rate)}</div>
                      <div className="col-span-2 text-right font-bold text-base" style={{ color: template.colors.text }}>{formatCurrency(item.amount)}</div>
                        </>
                      )}
                      {(data.invoiceType as string) === 'delivery' && (
                        <div className="col-span-4 text-center font-medium" style={{ color: template.colors.text }}>
                          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#10b981', color: 'white' }}>
                            Delivered
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Show "Continued on next page" only for middle pages */}
                {!page.isFirstPage && !page.isLastPage && (
                  <div className="text-xs text-gray-500 italic mt-3 text-right">
                    Continued on next page...
                  </div>
                )}
              </div>

              {/* Delivery Note Special Section */}
              {page.isLastPage && (data.invoiceType as string) === 'delivery' && (
                <section className="mb-4">
                  <div className="p-4 rounded-lg border-2 border-dashed" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
                    <div className="text-center mb-4">
                      <div className="text-lg font-bold" style={{ color: '#d97706' }}>DELIVERY CONFIRMATION</div>
                      <div className="text-sm mt-1" style={{ color: '#92400e' }}>
                        Please sign and return one copy as confirmation of delivery
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-semibold mb-2" style={{ color: '#d97706' }}>Delivery Details:</div>
                        <div>Total Items: {data.items.length}</div>
                        <div>Delivery Date: {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'Not specified'}</div>
                        <div>Document: {data.invoiceNumber}</div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2" style={{ color: '#d97706' }}>Signatures:</div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs mb-1">Delivered by (Driver):</div>
                            <div className="border-b border-gray-400 h-6"></div>
                          </div>
                          <div>
                            <div className="text-xs mb-1">Received by (Customer):</div>
                            <div className="border-b border-gray-400 h-6"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Totals - only on last page if there's room and not a delivery note */}
              {page.isLastPage && !needsSeparateTotals && (data.invoiceType as string) !== 'delivery' && (
                <div className="mb-12 flex justify-end">
                  <div className="w-full max-w-sm text-sm space-y-3">
                    <div className="flex justify-between py-1">
                      <span className="font-medium" style={{ color: template.colors.secondary }}>Subtotal</span>
                      <span className="font-medium" style={{ color: template.colors.text }}>{formatCurrency(subtotal)}</span>
                    </div>
                    {data.taxRate > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="font-medium" style={{ color: template.colors.secondary }}>Tax ({data.taxRate}%)</span>
                        <span className="font-medium" style={{ color: template.colors.text }}>{formatCurrency(tax)}</span>
                      </div>
                    )}
                    {data.discount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="font-medium" style={{ color: template.colors.secondary }}>Discount</span>
                        <span className="font-medium" style={{ color: template.colors.text }}>- {formatCurrency(data.discount)}</span>
                      </div>
                    )}
                    <div className="mt-6 pt-4 flex justify-between items-center border-t" style={{ borderColor: template.colors.primary + '30' }}>
                      <div className="text-lg font-medium" style={{ color: template.colors.text }}>
                        {data.invoiceType === 'credit_note' ? 'Credit Total:' :
                         data.invoiceType === 'quote' ? 'Estimated Total:' :
                         data.invoiceType === 'proforma' ? 'Total:' :
                         (data.invoiceType as string) === 'recurring' ? 'Recurring Total:' :
                         'Total:'}
                      </div>
                      <div className="text-2xl font-light" style={{ color: template.colors.text }}>{formatCurrency(total)}</div>
                    </div>
                    
                    {/* Payment Information */}
                    {data.paidAmount !== undefined && data.paidAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center mt-2 py-1" style={{ color: '#10b981' }}>
                          <span className="font-semibold">Paid:</span>
                          <span className="font-bold">-{formatCurrency(data.paidAmount)}</span>
                        </div>
                        <div 
                          className="flex justify-between items-center mt-2 pt-2 border-t-2 font-extrabold" 
                          style={{ 
                            borderColor: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981',
                            color: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981'
                          }}
                        >
                          <span>
                            {data.invoiceType === 'credit_note' ? 'Credit Amount:' :
                             data.invoiceType === 'quote' ? 'Estimated Amount:' :
                             data.invoiceType === 'proforma' ? 'Amount:' :
                             (data.invoiceType as string) === 'recurring' ? 'Recurring Amount:' :
                             'Balance Due:'}
                          </span>
                          <span>{formatCurrency(data.balance || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Footer - only on last page if there's room */}
              {page.isLastPage && !needsSeparateTotals && (
                <div className="mt-auto flex-shrink-0">
                  <InvoiceFooter />
                </div>
              )}
            </div>
          </div>
          
          {/* Page break for print (between pages) */}
          {!page.isLastPage && (isDeliveryNote ? <DeliveryNotePageBreak /> : <PageBreak />)}
        </React.Fragment>
      ))}

      {/* Separate Totals Page - only if needed and not a delivery note */}
      {needsSeparateTotals && (data.invoiceType as string) !== 'delivery' && (
        <>
          <PageBreak />
          <div
            className="relative overflow-hidden print-invoice"
            data-invoice-type={data.invoiceType || 'invoice'}
            style={{
              width: '210mm',
              backgroundColor: template.colors.background,
              color: template.colors.text,
              fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
              // Remove external margins - @page has zero margins
              margin: '0mm',
              // Proper internal padding for template design breathing room
              padding: '8mm',
              paddingTop: '6mm',
              paddingBottom: '8mm',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              // Full A4 height (297mm) - no @page margins
              minHeight: '297mm',
              height: '297mm',
              maxHeight: '297mm',
              // Add explicit border styling to match template design
              border: `2px solid ${template.colors.primary}30`,
              borderRadius: '12px'
            }}
          >
            {/* Decorative background: subtle dots (top-left) - on totals page */}
            <div
              className="absolute inset-0 z-0"
              style={{
                backgroundImage:
                  `radial-gradient(${template.colors.primary}18 1px, transparent 1px)`,
                backgroundSize: '10px 10px',
                backgroundPosition: '10mm 10mm',
                maskImage:
                  'radial-gradient(circle at 15% 10%, black 0%, black 35%, transparent 55%)',
                WebkitMaskImage:
                  'radial-gradient(circle at 15% 10%, black 0%, black 35%, transparent 55%)',
                opacity: 0.25
              }}
            />

            {/* Decorative background: top wave (polished) - on totals page */}
            <svg
              className="absolute top-0 left-0 z-0 w-full"
              height="120"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.25 }}
            >
              <defs>
                <linearGradient id="ms-totals-top-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={template.colors.primary} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={template.colors.secondary} stopOpacity="0.15" />
                </linearGradient>
                <filter id="ms-totals-top-blur" x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </defs>
              <path
                d="M0,0 L1200,0 L1200,60 C1100,40 980,90 860,70 C740,50 640,20 520,40 C400,60 300,110 160,95 C80,86 30,70 0,78 Z"
                fill="url(#ms-totals-top-grad)"
                filter="url(#ms-totals-top-blur)"
              />
            </svg>

            {/* Decorative background: bottom wave (polished) - on totals page */}
            <svg
              className="absolute bottom-0 left-0 z-0 w-full"
              height="130"
              viewBox="0 0 1200 130"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.22 }}
            >
              <defs>
                <linearGradient id="ms-totals-bottom-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={template.colors.secondary} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={template.colors.primary} stopOpacity="0.12" />
                </linearGradient>
                <filter id="ms-totals-bottom-blur" x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
                </filter>
              </defs>
              <path
                d="M0,130 L0,80 C140,86 220,108 360,100 C500,92 620,54 760,72 C900,90 1000,118 1200,96 L1200,130 Z"
                fill="url(#ms-totals-bottom-grad)"
                filter="url(#ms-totals-bottom-blur)"
              />
            </svg>

            {/* Page Container with Flexbox */}
            <div className="relative z-10 flex-grow flex flex-col">
              <div className="mb-4 text-center text-xs text-gray-500" style={{ flex: 'none' }}>
                Page {adjustedPages.length + 1} of {adjustedPages.length + 1} - {getPageTitle(data.invoiceType || 'invoice')}
              </div>

              {/* Totals Section */}
              <div className="mb-6 flex justify-end" style={{ flex: 'none' }}>
                <div className="w-full max-w-sm text-sm">
                  <div className="flex justify-between py-1"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {data.taxRate > 0 && (
                    <div className="flex justify-between py-1"><span>Tax ({data.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                  )}
                  {data.discount > 0 && (
                    <div className="flex justify-between py-1"><span>Discount</span><span>- {formatCurrency(data.discount)}</span></div>
                  )}
                  <div className="mt-2 pt-2 flex justify-between items-center border-t" style={{ borderColor: template.colors.secondary }}>
                    <div className="text-lg font-bold" style={{ color: template.colors.primary }}>
                      {data.invoiceType === 'credit_note' ? 'Credit Total:' :
                       data.invoiceType === 'quote' ? 'Estimated Total:' :
                       data.invoiceType === 'proforma' ? 'Total:' :
                       (data.invoiceType as string) === 'recurring' ? 'Recurring Total:' :
                       'Total:'}
                    </div>
                    <div className="text-2xl font-extrabold" style={{ color: template.colors.text }}>{formatCurrency(total)}</div>
                  </div>
                  
                  {/* Payment Information */}
                  {data.paidAmount !== undefined && data.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center mt-2 py-1" style={{ color: '#10b981' }}>
                        <span className="font-semibold">Paid:</span>
                        <span className="font-bold">-{formatCurrency(data.paidAmount)}</span>
                      </div>
                      <div 
                        className="flex justify-between items-center mt-2 pt-2 border-t-2 font-extrabold" 
                        style={{ 
                          borderColor: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981',
                          color: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981'
                        }}
                      >
                        <span>
                          {data.invoiceType === 'credit_note' ? 'Credit Amount:' :
                           data.invoiceType === 'quote' ? 'Estimated Amount:' :
                           data.invoiceType === 'proforma' ? 'Amount:' :
                           (data.invoiceType as string) === 'recurring' ? 'Recurring Amount:' :
                           'Balance Due:'}
                        </span>
                        <span>{formatCurrency(data.balance || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto flex-shrink-0">
                <InvoiceFooter />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
