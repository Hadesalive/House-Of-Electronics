/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { ItemsRangeIndicator } from '../multi-page-utils';

// Modern print styles optimized for A4
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 10mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .print-invoice * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-invoice {
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
    
    .print-invoice > div {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .invoice-page {
      page-break-after: always;
      page-break-before: auto;
      border: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .invoice-page:last-child {
      page-break-after: auto;
    }
    
    .pagination-controls {
      display: none !important;
    }
    
    /* Prevent footer from breaking across pages */
    .print-invoice .invoice-footer-section,
    .print-invoice .invoice-footer-message,
    .print-invoice .invoice-brand-logos,
    .print-invoice .invoice-totals {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
    }
  }
  
  @media screen {
    .print-invoice {
      color-scheme: light;
    }
  }
`;

interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
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
  taxes: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
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

export function ProCorporateRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const discountAmount = (subtotal * data.discount) / 100;
  
  const taxableSubtotal = data.items
    .filter(item => item.taxable !== false)
    .reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = taxableSubtotal - (discountAmount * (taxableSubtotal / subtotal));
  
  const calculatedTaxes = data.taxes?.map(tax => ({
    ...tax,
    amount: (taxableAmount * tax.rate) / 100
  })) || [];
  
  const totalTaxAmount = calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0);
  const total = (subtotal - discountAmount) + totalTaxAmount;
  
  const rawCurrency = data.currency || 'NLe';
  const currency = rawCurrency === 'SLL' || rawCurrency === 'SLE' || rawCurrency === 'NLE' || rawCurrency === 'NLe' ? 'NLe' : rawCurrency;

  const formatCurrency = (amount: number) => {
    const normalizedCurrency = currency === 'SLL' || currency === 'SLE' || currency === 'NLE' || currency === 'NLe' ? 'NLe' : currency;
    
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
    
    const symbol = currencySymbols[normalizedCurrency] || normalizedCurrency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Modern Header Component
  const InvoiceHeader = () => (
    <header style={{ marginBottom: '20px' }}>
      {/* Top Section: Logo Left, Company Info Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        {/* Left: Logo */}
        <div style={{ flex: '0 0 auto' }}>
          <img
            src="/images/hoe logo.png"
            alt="Company Logo"
            style={{
              height: '60px',
              width: 'auto',
              maxWidth: '200px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Right: Company Info */}
        <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: '1.6', color: '#374151' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px', color: '#111827' }}>
            {data.company.name}
          </div>
          <div>{data.company.address}</div>
          <div>{data.company.city}, {data.company.state} {data.company.zip}</div>
          <div style={{ marginTop: '6px' }}>Phone: {data.company.phone}</div>
          <div>{data.company.email}</div>
        </div>
      </div>

      {/* Invoice Type Badge with Horizontal Lines */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Left Horizontal Line */}
        <div style={{ flex: '1', height: '2px', background: 'linear-gradient(to right, transparent, #2563eb)' }}></div>
        
        {/* Invoice Type Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.075em',
            textTransform: 'uppercase',
            color: '#fff',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          {data.invoiceType === 'proforma' ? 'PROFORMA INVOICE' :
           data.invoiceType === 'quote' ? 'QUOTE' :
           data.invoiceType === 'credit_note' ? 'CREDIT NOTE' :
           (data.invoiceType as string) === 'delivery' ? 'DELIVERY NOTE' :
           (data.invoiceType as string) === 'recurring' ? 'RECURRING INVOICE' :
           'INVOICE'}
        </div>
        
        {/* Right Horizontal Line */}
        <div style={{ flex: '1', height: '2px', background: 'linear-gradient(to left, transparent, #2563eb)' }}></div>
      </div>

      {/* Bill To and Invoice Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '20px' }}>
        {/* Bill To */}
        <div style={{ flex: '1' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bill To
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#111827' }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{data.customer.name}</div>
            <div>{data.customer.address}</div>
            <div>{data.customer.city} {data.customer.state} {data.customer.zip}</div>
            {data.customer.phone && <div style={{ marginTop: '4px' }}>Phone: {data.customer.phone}</div>}
            {data.customer.email && <div>{data.customer.email}</div>}
          </div>
        </div>

        {/* Invoice Details */}
        <div style={{ flex: '1', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', lineHeight: '1.8', color: '#374151' }}>
            <div>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {data.invoiceType === 'proforma' ? 'Proforma #:' :
                 data.invoiceType === 'quote' ? 'Quote #:' :
                 data.invoiceType === 'credit_note' ? 'Credit Note #:' :
                 (data.invoiceType as string) === 'delivery' ? 'Delivery Note #:' :
                 (data.invoiceType as string) === 'recurring' ? 'Invoice #:' :
                 'Invoice #:'}
              </span> {data.invoiceNumber}
            </div>
            <div>
              <span style={{ fontWeight: '600', color: '#111827' }}>Date:</span> {data.date ? new Date(data.date).toLocaleDateString() : 'N/A'}
            </div>
            {data.invoiceType !== 'credit_note' && (
              <div>
                <span style={{ fontWeight: '600', color: '#111827' }}>
                  {data.invoiceType === 'quote' ? 'Valid Until:' :
                   (data.invoiceType as string) === 'delivery' ? 'Delivery Date:' :
                   (data.invoiceType as string) === 'recurring' ? 'Next Billing:' :
                   'Payment Due:'}
                </span> {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}
              </div>
            )}
          </div>
          
          {/* Amount Due Highlight */}
          {(data.invoiceType as string) !== 'delivery' && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #2563eb',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#2563eb',
                display: 'inline-block'
              }}
            >
              {data.invoiceType === 'credit_note' ? `Credit Amount: ${formatCurrency(total)}` :
               data.invoiceType === 'quote' ? `Estimated Total: ${formatCurrency(total)}` :
               (data.invoiceType as string) === 'recurring' ? `Recurring Amount: ${formatCurrency(total)}` :
               `Amount Due: ${formatCurrency(total)}`}
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // Modern Footer Component
  const InvoiceFooter = () => (
    <footer style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      {/* Notes & Terms */}
      {(data.notes || data.terms) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px', fontSize: '10px', lineHeight: '1.5', color: '#6b7280' }}>
          {data.notes && (
            <div>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Notes</div>
              <div>{data.notes}</div>
            </div>
          )}
          {data.terms && (
            <div>
              <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Terms</div>
              <div>{data.terms}</div>
            </div>
          )}
        </div>
      )}

      {/* Bank Details */}
      {data.bankDetails && (
        <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#6b7280', marginBottom: '12px' }}>
          <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Bank Details</div>
          <div>
            {data.bankDetails.bankName} | 
            {data.bankDetails.accountName && ` Account: ${data.bankDetails.accountName} |`}
            {` Account #: ${data.bankDetails.accountNumber}`}
            {data.bankDetails.routingNumber && ` | Routing: ${data.bankDetails.routingNumber}`}
            {data.bankDetails.swiftCode && ` | SWIFT: ${data.bankDetails.swiftCode}`}
          </div>
        </div>
      )}

      {/* Brand Logos */}
      {brandLogos.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          {brandLogos.map((logo, i) => {
            const logoSrc = logo.startsWith('/') ? `${window.location.origin}${logo}` : logo;
            return (
              <img 
                key={i} 
                src={logoSrc} 
                alt={`Brand ${i + 1}`} 
                style={{ height: '20px', width: 'auto', objectFit: 'contain', opacity: 0.7 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          })}
        </div>
      )}
    </footer>
  );

  // ============================================================================
  // FIXED PAGINATION: Same page layout on every page, only items table changes
  // ============================================================================
  // Every page has: Header + Items Table + Totals + Footer
  // Only the items in the table changes between pages
  
  const isDeliveryNote = (data.invoiceType as string) === 'delivery';
  
  // Calculate items per page based on actual available space
  // A4 page: 277mm available height (297mm - 20mm padding)
  // Item row height: ~12mm average
  
  // Regular invoices:
  // - Header: ~95mm (larger than hoe-classic), Recipient: ~40mm, Table header: ~8mm, Totals: ~45mm, Footer: ~35mm
  // - Used: ~223mm, Available: 277mm - 223mm = ~54mm → ~4-5 items
  // - Conservative: 8 items per page (allows for variation and matches hoe-classic approach)
  
  // Delivery notes (signature only on last page):
  // - Regular pages: Header: ~95mm, Recipient: ~40mm, Table header: ~8mm, Footer: ~35mm
  // - Used: ~178mm, Available: 277mm - 178mm = ~99mm → ~8 items
  // - Last page: Same + Signature: ~90mm, Used: ~268mm, Available: ~9mm → ~0-1 items
  // - Use same as regular invoices: 8 items per page (signature only on last page)
  
  const ITEMS_PER_PAGE = 8; // Reduced from 10 to account for larger header/footer in pro-corporate
  
  // Simple pagination: split items evenly across pages
  const totalItems = data.items.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const adjustedPages: Array<{
    pageNumber: number;
    totalPages: number;
    items: InvoiceItem[];
    itemsRange: { start: number; end: number };
  }> = [];
  
  for (let i = 0; i < totalPages; i++) {
    const start = i * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, totalItems);
    adjustedPages.push({
      pageNumber: i + 1,
      totalPages,
      items: data.items.slice(start, end),
      itemsRange: { start: start + 1, end: end }
    });
  }
  
  console.log('Pro Corporate - Fixed Pagination:', {
    type: isDeliveryNote ? 'Delivery Note' : 'Invoice',
    totalItems,
    itemsPerPage: ITEMS_PER_PAGE,
    totalPages,
    pages: adjustedPages.map(p => ({ page: p.pageNumber, items: p.items.length, range: p.itemsRange }))
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Multi-page info banner */}
      {adjustedPages.length > 1 && (
        <div className="pagination-controls mb-4 p-3 rounded-lg border text-center" style={{ backgroundColor: `${template.colors.primary}10`, borderColor: template.colors.primary }}>
          <div className="text-sm font-medium" style={{ color: template.colors.primary }}>
            {isDeliveryNote ? (
              <>📄 This delivery note has {adjustedPages.length} pages ({data.items.length} items)</>
            ) : (
              <>📄 This invoice has {adjustedPages.length} pages ({data.items.length} items)</>
            )}
          </div>
        </div>
      )}

      {/* Render each page */}
      {adjustedPages.map((page, pageIdx) => {
        const isLastPage = pageIdx === adjustedPages.length - 1;
        
        return (
          <React.Fragment key={page.pageNumber}>
            <div
              style={{
                width: '190mm', // A4 width (210mm) - margins (10mm left + 10mm right)
                backgroundColor: 'white',
                color: '#111827',
                fontFamily: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
                border: '1px solid #e5e7eb',
                boxSizing: 'border-box',
                position: 'relative',
                margin: '0mm',
                padding: '10mm', // Match hoe-classic padding for consistent spacing
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '277mm', // A4 height (297mm) - margins (10mm top + 10mm bottom)
                maxHeight: '277mm',
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                pageBreakInside: 'avoid'
              }}
              className={isLastPage ? '' : 'invoice-page'}
            >
              {/* Header - on every page */}
              <InvoiceHeader />

            {/* Items Table */}
            <section style={{ flexGrow: 1, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(data.invoiceType as string) === 'delivery' ? 'Items Delivered' : 
                   data.invoiceType === 'credit_note' ? 'Items Credited' :
                   data.invoiceType === 'quote' ? 'Items Quoted' :
                   'Items'}
                </div>
                {page.totalPages > 1 && (
                  <ItemsRangeIndicator 
                    start={page.itemsRange.start} 
                    end={page.itemsRange.end} 
                    total={data.items.length}
                  />
                )}
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed', overflow: 'hidden', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '14px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.075em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '14px 10px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.075em', width: '60px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Qty</th>
                    {(data.invoiceType as string) !== 'delivery' && (
                      <>
                        <th style={{ textAlign: 'right', padding: '14px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.075em', width: '130px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Rate</th>
                        <th style={{ textAlign: 'right', padding: '14px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.075em', width: '130px' }}>Amount</th>
                      </>
                    )}
                    {(data.invoiceType as string) === 'delivery' && (
                      <th style={{ textAlign: 'center', padding: '14px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.075em' }}>Status</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {page.items.filter((item: any) => item && item.id).map((item: any, idx: number) => (
                    <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 12px', verticalAlign: 'top', borderRight: '1px solid #e5e7eb', wordWrap: 'break-word' }}>
                        <div style={{ fontWeight: '600', color: '#111827', fontSize: '11px' }}>{item.description || 'No description'}</div>
                        {item.itemDescription && (
                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px', lineHeight: '1.4' }}>
                            {item.itemDescription}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#374151', fontWeight: '500', borderRight: '1px solid #e5e7eb' }}>{item.quantity}</td>
                      {(data.invoiceType as string) !== 'delivery' && (
                        <>
                          <td style={{ padding: '12px 12px', textAlign: 'right', color: '#374151', borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: '500' }}>{formatCurrency(item.rate)}</td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', fontSize: '11px' }}>{formatCurrency(item.amount)}</td>
                        </>
                      )}
                      {(data.invoiceType as string) === 'delivery' && (
                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '5px 10px', backgroundColor: '#10b981', color: 'white', borderRadius: '5px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.05em' }}>
                            DELIVERED
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
            </section>

            {/* Delivery Note Special Section - only on last page */}
            {isDeliveryNote && isLastPage && (
              <section style={{ marginBottom: '16px' }}>
                <div style={{ padding: '16px', border: '2px dashed #f59e0b', borderRadius: '6px', backgroundColor: '#fffbeb' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>DELIVERY CONFIRMATION</div>
                    <div style={{ fontSize: '10px', color: '#92400e' }}>
                      Please sign and return one copy as confirmation of delivery
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11px' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '8px', color: '#d97706' }}>Delivery Details:</div>
                      <div style={{ marginBottom: '4px' }}>Total Items: {data.items.length}</div>
                      <div style={{ marginBottom: '4px' }}>Delivery Date: {new Date(data.dueDate).toLocaleDateString()}</div>
                      <div>Document: {data.invoiceNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '8px', color: '#d97706' }}>Signatures:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#6b7280' }}>Delivered by (Driver):</div>
                          <div style={{ borderBottom: '1px solid #9ca3af', height: '24px' }}></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', marginBottom: '4px', color: '#6b7280' }}>Received by (Customer):</div>
                          <div style={{ borderBottom: '1px solid #9ca3af', height: '24px' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Totals - on every page (except delivery notes) */}
            {!isDeliveryNote && (
              <section style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', maxWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px', color: '#374151' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: '500' }}>{formatCurrency(subtotal)}</span>
                    </div>
                    {data.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px', color: '#374151' }}>
                        <span>Discount ({data.discount}%):</span>
                        <span style={{ fontWeight: '500', color: '#dc2626' }}>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {calculatedTaxes.map((tax) => (
                      <div key={tax.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px', color: '#374151' }}>
                        <span>{tax.name} ({tax.rate}%):</span>
                        <span style={{ fontWeight: '500' }}>{formatCurrency(tax.amount)}</span>
                      </div>
                    ))}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '8px', 
                      paddingTop: '12px', 
                      borderTop: '2px solid #2563eb',
                      fontSize: '13px'
                    }}>
                      <span style={{ fontWeight: '700', color: '#111827' }}>
                        {data.invoiceType === 'credit_note' ? 'Credit Total:' :
                         data.invoiceType === 'quote' ? 'Estimated Total:' :
                         data.invoiceType === 'proforma' ? 'Total:' :
                         (data.invoiceType as string) === 'recurring' ? 'Recurring Total:' :
                         'Total:'}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '16px', color: '#2563eb' }}>{formatCurrency(total)}</span>
                    </div>
                    {(data.paidAmount !== undefined && data.paidAmount > 0) && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px', color: '#10b981' }}>
                          <span style={{ fontWeight: '600' }}>Paid:</span>
                          <span style={{ fontWeight: '600' }}>-{formatCurrency(data.paidAmount)}</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginTop: '8px', 
                          paddingTop: '8px', 
                          borderTop: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981'
                        }}>
                          <span>Balance Due:</span>
                          <span>{formatCurrency(data.balance || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Footer - on every page */}
            <InvoiceFooter />
          </div>
        </React.Fragment>
        );
      })}
    </>
  );
}
