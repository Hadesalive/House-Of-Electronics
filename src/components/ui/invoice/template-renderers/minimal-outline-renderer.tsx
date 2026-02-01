import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { paginateInvoiceItems, PageBreak, ItemsRangeIndicator } from '../multi-page-utils';

interface InvoiceItem {
  id: string;
  description: string;
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
      border: inherit !important;
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
    
    /* Hide info banner when printing */
    .pagination-controls {
      display: none !important;
    }
  }
  
  /* Fix for html2canvas lab() color parsing error */
  @media screen {
    .print-invoice {
      color-scheme: light;
    }
  }
`;

export function MinimalOutlineRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
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
    <footer className="pt-4 border-t" style={{ borderColor: '#d1d5db' }}>
      {data.notes && (
        <div className="mb-3">
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.text }}>Notes</div>
          <div className="text-xs" style={{ color: template.colors.text }}>{data.notes}</div>
        </div>
      )}
      {data.terms && (
        <div className="mb-3">
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.text }}>Terms</div>
          <div className="text-xs" style={{ color: template.colors.text }}>{data.terms}</div>
        </div>
      )}
      
      {/* Bank Details */}
      {data.bankDetails && (
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: `${template.colors.primary}05` }}>
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Bank Details</div>
          <div className="text-xs">
            <div>Bank: {data.bankDetails.bankName}</div>
            {data.bankDetails.accountName && <div>Account: {data.bankDetails.accountName}</div>}
            <div>Account #: {data.bankDetails.accountNumber}</div>
            {data.bankDetails.routingNumber && <div>Routing #: {data.bankDetails.routingNumber}</div>}
            {data.bankDetails.swiftCode && <div>SWIFT: {data.bankDetails.swiftCode}</div>}
          </div>
        </div>
      )}
      
      {brandLogos.length > 0 && (
        <div className="flex items-center gap-3 mt-2">
          {brandLogos.map((logo, i) => {
            const logoSrc = getImageUrl(logo);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                key={i} 
                src={logoSrc} 
                alt={`Brand ${i + 1}`} 
                className="h-6 w-auto object-contain opacity-80"
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

  // Split items into pages for pagination (minimal outline capacity)
  const pages = paginateInvoiceItems(data.items, {
    templateType: 'compact',
    firstPageCapacity: 0.75,  // Leave 25% margin at bottom
    lastPageCapacity: 0.65,   // Leave 35% margin for totals and footer
    separateTotalsThreshold: 10
  });

  const needsSeparateTotalsPage = pages.length > 0 && pages[pages.length - 1].items.length > 10;

  const safeDate = (value: string) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'Not specified' : d.toLocaleDateString();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: template.colors.background,
          color: template.colors.text,
          fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`
        }}
        className="print-invoice"
      >
      {pages.map((page) => (
        <React.Fragment key={page.pageNumber}>
      {/* Page Container with Flexbox */}
      <div style={{ minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
        {/* Header and Content */}
        <div className="p-6 pb-0 flex-shrink-0">
          {/* Distinct Header: centered brand block */}
          <div className="mb-6 flex flex-col items-center text-center gap-4">
            {template.layout.showLogo && data.company.logo && (
              <div className="relative">
                <div
                  className="rounded-2xl shadow-sm"
                  style={{
                    width: 96,
                    height: 96,
                    background: `linear-gradient(135deg, ${template.colors.primary}22, ${template.colors.secondary}18)`,
                    border: `1px solid ${template.colors.primary}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.company.logo}
                    alt="Logo"
                    className="object-contain"
                    style={{ width: 72, height: 72 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>
            )}
            <div className="text-2xl font-semibold tracking-tight" style={{ color: template.colors.text }}>{data.company.name}</div>
            <div className="text-sm" style={{ color: template.colors.secondary }}>{data.company.address}, {data.company.city}</div>
            <div className="h-px w-48" style={{ background: `linear-gradient(90deg, transparent, ${template.colors.primary}, transparent)` }} />
            <div className="flex items-center gap-3 text-xs" style={{ color: template.colors.text }}>
              <span className="inline-block px-2 py-1 rounded border" style={{ borderColor: '#d1d5db', backgroundColor: `${template.colors.primary}08` }}>
                {data.invoiceType === 'proforma' ? 'PROFORMA' : 
                 data.invoiceType === 'quote' ? 'QUOTE' :
                 data.invoiceType === 'credit_note' ? 'CREDIT NOTE' :
                 data.invoiceType === 'delivery' ? 'DELIVERY NOTE' :
                 'INVOICE'}
              </span>
              <span>No: {data.invoiceNumber}</span>
              <span>• Date: {new Date(data.date).toLocaleDateString()}</span>
              <span>• Due: {new Date(data.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Outline Boxes */}
          {/* Simple, clean two-column layout */}
          <div className="mb-10 rounded-xl border p-6" style={{ borderColor: '#e5e7eb' }}>
            <div className="grid grid-cols-12 gap-6">
              {/* Bill To */}
              <div className="col-span-7">
                <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: template.colors.secondary }}>Bill To</div>
                {data.customer?.name ? (
                  <>
                    <div className="text-xl font-semibold tracking-tight" style={{ color: template.colors.text }}>{data.customer.name}</div>
                    {data.customer.address && <div className="text-sm mt-1" style={{ color: template.colors.text }}>{data.customer.address}</div>}
                    {data.customer.city && (
                      <div className="text-sm" style={{ color: template.colors.text }}>{data.customer.city}</div>
                    )}
                    {(data.customer.phone || data.customer.email) && (
                      <div className="text-sm mt-2" style={{ color: template.colors.secondary }}>
                        {data.customer.phone && <span>{data.customer.phone}</span>}
                        {data.customer.phone && data.customer.email && <span className="mx-2">•</span>}
                        {data.customer.email && <span>{data.customer.email}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm italic" style={{ color: template.colors.secondary }}>No customer selected</div>
                )}
              </div>

              {/* Summary with Amount Due */}
              <div className="col-span-5">
                <div className="rounded-lg border p-4" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: template.colors.secondary }}>Summary</div>
                    <div className="text-sm" style={{ color: template.colors.secondary }}>#{data.invoiceNumber}</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="space-y-1 text-sm" style={{ color: template.colors.text }}>
                      <div className="flex justify-between gap-6"><span>Items</span><span className="font-medium">{data.items.length}</span></div>
                      <div className="flex justify-between gap-6"><span>Date</span><span className="font-medium">{safeDate(data.date)}</span></div>
                      <div className="flex justify-between gap-6"><span>Due</span><span className="font-medium">{safeDate(data.dueDate)}</span></div>
                      {data.status && <div className="flex justify-between gap-6"><span>Status</span><span className="font-medium">{data.status.toUpperCase()}</span></div>}
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: template.colors.secondary }}>Amount Due</div>
                      <div className="text-3xl font-semibold tracking-tight" style={{ color: template.colors.text }}>{formatCurrency((data.balance ?? total) || 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Grows */}
        <div className="flex-grow px-6">
          {/* Items - clean table */}
          <div className="mb-6">
            <div className="grid grid-cols-12 text-[11px] uppercase py-2 px-3 rounded-t-md" style={{ backgroundColor: `${template.colors.primary}06`, color: template.colors.secondary, border: `1px solid #e5e7eb`, borderBottom: 'none' }}>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="border rounded-b-md" style={{ borderColor: '#e5e7eb', borderTop: 'none' }}>
              {page.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 py-3 text-sm px-3" style={{ backgroundColor: idx % 2 === 1 ? `${template.colors.primary}03` : 'transparent', borderBottom: idx === page.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <div className="col-span-6 pr-4">{item.description}</div>
                  <div className="col-span-2 text-right">{item.quantity}</div>
                  <div className="col-span-2 text-right">{formatCurrency(item.rate)}</div>
                  <div className="col-span-2 text-right font-medium">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
            {page.totalPages > 1 && (
              <div className="flex justify-between items-center text-xs mt-2" style={{ color: template.colors.secondary }}>
                <div>Items <ItemsRangeIndicator start={page.itemsRange.start} end={page.itemsRange.end} total={data.items.length} /></div>
                <div>Page {page.pageNumber} of {page.totalPages}</div>
              </div>
            )}
          </div>

          {/* Totals (only on last page when space allows) */}
          {page.isLastPage && !needsSeparateTotalsPage && (
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-sm text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {data.taxRate > 0 && (
                <div className="flex justify-between py-1"><span>Tax ({data.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
              )}
              {data.discount > 0 && (
                <div className="flex justify-between py-1"><span>Discount</span><span>- {formatCurrency(data.discount)}</span></div>
              )}
              <div className="mt-2 pt-2 flex justify-between items-center border-t" style={{ borderColor: '#d1d5db' }}>
                <div className="text-lg font-bold" style={{ color: template.colors.accent }}>Total</div>
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
                    <span>Balance Due:</span>
                    <span>{formatCurrency(data.balance || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Footer - Always at Bottom */}
        <div className="mt-auto p-6 pt-0 flex-shrink-0">
          <div className="rounded-xl border p-4" style={{ borderColor: '#e5e7eb' }}>
            <InvoiceFooter />
          </div>
        </div>
      </div>
      {/* Page break between pages */}
      {!page.isLastPage && <PageBreak />}
      </React.Fragment>
      ))}
      </div>
    </>
  );
}
