/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { paginateInvoiceItems, ItemsRangeIndicator } from '../multi-page-utils';

interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string; // Additional details/specifications
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType?: string;
  salesRep?: string;
  salesRepId?: string;
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
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  taxes?: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  discount: number;
  currency?: string;
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
}

const formatDateValue = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const formatInvoiceType = (value?: string) => {
  if (!value) return '';
  return value.replace(/_/g, ' ').toUpperCase();
};

const normalizeCurrency = (currency?: string): string => {
  const raw = currency || 'NLe';
  return raw === 'SLL' || raw === 'SLE' || raw === 'NLE' || raw === 'NLe' ? 'NLe' : raw;
};

const currencySymbols: Record<string, string> = {
  USD: '$',
  SLE: 'NLe ',
  SLL: 'NLe ',
  NLE: 'NLe ',
  NLe: 'NLe ',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
};

const formatCurrency = (amount: number, currency?: string) => {
  const normalized = normalizeCurrency(currency);
  const symbol = currencySymbols[normalized] || normalized;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const currencyNames: Record<string, string> = {
  NLe: 'Leones', USD: 'Dollars', EUR: 'Euros', GBP: 'Pounds', CAD: 'Dollars', AUD: 'Dollars',
};

const amountToWords = (amount: number, currency?: string): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1_000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
    if (n < 1_000_000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 1_000_000_000) return toWords(Math.floor(n / 1_000_000)) + ' Million' + (n % 1_000_000 ? ' ' + toWords(n % 1_000_000) : '');
    return toWords(Math.floor(n / 1_000_000_000)) + ' Billion' + (n % 1_000_000_000 ? ' ' + toWords(n % 1_000_000_000) : '');
  };

  const normalized = normalizeCurrency(currency);
  const currencyLabel = currencyNames[normalized] || normalized;
  const intPart = Math.floor(amount);
  const cents = Math.round((amount - intPart) * 100);
  const intWords = intPart === 0 ? 'Zero' : toWords(intPart);

  return cents > 0
    ? `${intWords} ${currencyLabel} and ${toWords(cents)} Cents`
    : `${intWords} ${currencyLabel} Only`;
};

const printStyles = `
  @media print {
    @page { 
      size: A4; 
      margin: 10mm; 
      border: none !important;
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
      outline: none !important;
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
    /* Remove any gaps between pages */
    .print-invoice > div {
      margin: 0 !important;
      padding: 0 !important;
    }
    .pagination-controls {
      display: none !important;
    }
    table {
      border: none !important;
      border-collapse: collapse !important;
    }
    table, th, td {
      border-color: rgba(0, 0, 0, 0.05) !important;
    }
    /* Preserve border-radius wrapper in print */
    .print-invoice .items-table-wrapper {
      border-radius: 8px !important;
      overflow: hidden !important;
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
    /* Ensure footer section stays together on last page */
    .print-invoice .invoice-page:last-child,
    .print-invoice > div:last-child {
      display: flex !important;
      flex-direction: column !important;
    }
    /* Keep footer at bottom and prevent breaking */
    .print-invoice .invoice-footer-section {
      margin-top: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`;

export function HoeClassicRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const currency = normalizeCurrency(data.currency);
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (data.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  
  // Tax calculation: use taxes array if it has entries with rate > 0,
  // otherwise fall back to taxRate as a GST line.
  // GST always shown by default at 15%. Uses configured taxes array if available,
  // then taxRate, then falls back to the default 15% rate.
  const DEFAULT_GST_RATE = 15;

  const taxesFromArray = (data.taxes ?? [])
    .filter(tax => tax.rate > 0)
    .map(tax => ({
      ...tax,
      amount: Math.round((taxableAmount * tax.rate) / 100 * 100) / 100
    }));

  const gstRate = taxesFromArray.length > 0 ? null
    : (data.taxRate && data.taxRate > 0) ? data.taxRate
    : DEFAULT_GST_RATE;

  const calculatedTaxes: Array<{ id: string; name: string; rate: number; amount: number }> =
    taxesFromArray.length > 0
      ? taxesFromArray
      : [{
          id: 'gst',
          name: 'GST',
          rate: gstRate!,
          amount: Math.round((taxableAmount * gstRate!) / 100 * 100) / 100
        }];
  
  const totalTaxAmount = Math.round(calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0) * 100) / 100;
  const total = taxableAmount + totalTaxAmount;

  // Detect template type
  const templateType = template.id === 'hoe-classic-type-b' ? 'type-b' : 
                       template.id === 'hoe-classic-type-c' ? 'type-c' : 'type-a';

  const accent = template.colors.primary || '#2563eb';
  const borderColor = `${accent}22`;
  const headerBg = `${accent}10`;
  const lineColor = 'rgba(0, 0, 0, 0.05)'; // Very soft, natural-looking borders
  const mutedText = template.colors.secondary || '#475569';

  // Type-specific styling
  const headerPadding = templateType === 'type-b' ? 12 : templateType === 'type-c' ? 20 : 16;
  const companyNameSize = templateType === 'type-b' ? 'text-xl' : templateType === 'type-c' ? 'text-3xl' : 'text-2xl';
  const logoWidth = templateType === 'type-b' ? 100 : templateType === 'type-c' ? 140 : 120;

  // Always use the House Of Electronics logo asset; try plain path first, then encoded fallback on error
  const logoSrc = '/images/hoe logo.png';

  // Mock/fallback reps
  const salesRepName = data.salesRep || '—';
  const salesRepCode = data.salesRepId || '—';

  // Check invoice type for special rendering
  const isDeliveryNote = (data.invoiceType as string) === 'delivery';
  const isQuote = (data.invoiceType as string) === 'quote' || (data.invoiceType as string) === 'proforma';

  // ============================================================================
  // DYNAMIC PAGINATION: Height-estimation based bin packing (mm units)
  // ============================================================================
  // Page: A4 297mm - 10mm top margin - 10mm bottom margin = 277mm outer height
  // CSS padding: 10mm all sides → inner content height = 277 - 10 - 10 = 257mm
  //
  // Section heights (measured from rendered output, in mm):
  //   Header (logo + company info + mb-5):              ~42mm
  //   Recipient row (bill-to + sales rep + dates + mb-6): ~28mm
  //   Table header row (py-2 th):                        ~8mm
  //   Footer message (paddingTop 6mm + text + pb):       ~16mm
  //   Footer with brand logos (+ pt-6 + logos + mb):    ~36mm
  //   Totals block (subtotal + GST + total, last page):  ~22mm
  //   Delivery confirmation section (last page):         ~38mm
  //   Item row base (py-2, text-xs, single line):        ~7.5mm
  //   Item row with itemDescription (+mt-1 text-[10px]):  +4.5mm extra

  const PAGE_H = 257; // mm — inner content height

  const SECTION_H = {
    header:       42,
    recipient:    28,
    tableHead:     8,
    footer:       16,
    footerLogos:  36,
    totals:       42,  // last page only: excl-GST + words + GST + total-with-GST + words
    delivery:     38,  // last page only (delivery notes)
    itemBase:    7.5,  // base row height
    itemDesc:    4.5,  // extra when itemDescription is present
  };

  const getItemH = (item: InvoiceItem) =>
    SECTION_H.itemBase + (item.itemDescription ? SECTION_H.itemDesc : 0);

  const footerH = brandLogos.length > 0 ? SECTION_H.footerLogos : SECTION_H.footer;
  const fixedOverhead = SECTION_H.header + SECTION_H.recipient + SECTION_H.tableHead + footerH;
  const lastPageExtra = isDeliveryNote ? SECTION_H.delivery : SECTION_H.totals;

  const baseAvail = PAGE_H - fixedOverhead;        // space for items on a regular page
  const lastAvail = baseAvail - lastPageExtra;     // space for items on the last page

  // Step 1 — greedy packing treating every page as a regular (non-last) page
  const rawPages: InvoiceItem[][] = [];
  let remaining = [...data.items];

  while (remaining.length > 0) {
    const page: InvoiceItem[] = [];
    let used = 0;
    for (const item of remaining) {
      const h = getItemH(item);
      if (used + h <= baseAvail) { page.push(item); used += h; }
      else break;
    }
    if (page.length === 0) page.push(remaining[0]); // safety: always advance
    rawPages.push(page);
    remaining = remaining.slice(page.length);
  }

  // Step 2 — shrink the last page until it fits with last-page extras
  // Iterate in case the overflow page itself needs shrinking too
  let safetyLimit = 20;
  while (rawPages.length > 0 && safetyLimit-- > 0) {
    const last = rawPages[rawPages.length - 1];
    let lastUsed = last.reduce((s, item) => s + getItemH(item), 0);
    if (lastUsed <= lastAvail) break; // fits — done

    const overflow: InvoiceItem[] = [];
    while (last.length > 1 && lastUsed > lastAvail) {
      const item = last.pop()!;
      overflow.unshift(item);
      lastUsed -= getItemH(item);
    }
    if (overflow.length > 0) rawPages.push(overflow);
    else break; // can't shrink further (single item remains)
  }

  // Step 3 — build final structure
  let offset = 0;
  const totalPages = rawPages.length;
  const adjustedPages = rawPages.map((items, i) => {
    const start = offset + 1;
    const end   = offset + items.length;
    offset = end;
    return { pageNumber: i + 1, totalPages, items, itemsRange: { start, end } };
  });

  console.log('HOE Classic - Dynamic Pagination:', {
    type: isDeliveryNote ? 'Delivery Note' : 'Invoice',
    totalItems: data.items.length,
    baseAvail: `${baseAvail.toFixed(1)}mm`,
    lastAvail: `${lastAvail.toFixed(1)}mm`,
    totalPages,
    pages: adjustedPages.map(p => ({ page: p.pageNumber, items: p.items.length, range: p.itemsRange }))
  });

  return (
    <div className="print-invoice">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Multi-page info banner */}
      {adjustedPages.length > 1 && (
        <div className="pagination-controls mb-4 p-3 rounded-lg border text-center" style={{ backgroundColor: `${accent}10`, borderColor: accent }}>
          <div className="text-sm font-medium" style={{ color: accent }}>
            {isDeliveryNote ? (
              <>📄 This delivery note has {adjustedPages.length} pages ({data.items.length} items)</>
            ) : (
              <>📄 This invoice has {adjustedPages.length} pages ({data.items.length} items)</>
            )}
          </div>
        </div>
      )}
      
      {adjustedPages.map((page, pageIndex) => {
        const isLastPage = pageIndex === adjustedPages.length - 1;
        const startItemNumber = page.itemsRange.start - 1;
        const pageRows = page.items;

        return (
          <div
            key={pageIndex}
            className={pageIndex === adjustedPages.length - 1 ? '' : 'invoice-page'}
            style={{
              width: '190mm', // A4 width (210mm) - margins (10mm left + 10mm right)
              minHeight: '277mm', // A4 height (297mm) - margins (10mm top + 10mm bottom)
              maxHeight: '277mm',
              backgroundColor: '#ffffff',
              color: template.colors.text,
              fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
              border: 'none',
              borderWidth: 0,
              boxShadow: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              padding: '10mm',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              margin: 0,
              pageBreakAfter: pageIndex === adjustedPages.length - 1 ? 'auto' : 'always',
              pageBreakInside: 'avoid'
            }}
          >
            {/* Quote/Proforma Watermark - on every page */}
            {isQuote && (
          <div
            style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-45deg)',
                  fontSize: '80px',
                  fontWeight: 'bold',
                  color: `${accent}15`,
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                  zIndex: 0,
                  letterSpacing: '0.1em'
                }}
              >
                {(data.invoiceType as string) === 'quote' ? 'Quote' : 'Proforma'}
              </div>
            )}

            {/* House Of Electronics Logo Watermark - on every page */}
            <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.08,
                  zIndex: 0,
                  pointerEvents: 'none'
                }}
              >
                <img
                  src="/images/hoe logo.png"
                  alt="House Of Electronics Watermark"
                  style={{ width: '220px', height: '220px', objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = '/images/hoe%20logo.png';
                    } else {
                      target.style.display = 'none';
                    }
                }}
              />
            </div>

            {/* Header - on every page */}
            <div
              className="flex items-start justify-between gap-6 mb-5"
              style={{ paddingBottom: 6, borderBottom: `1px solid ${borderColor}`, position: 'relative', zIndex: 1 }}
            >
              <div style={{ width: logoWidth, flexShrink: 0 }}>
            <img
                  src="/images/hoe logo.png"
                  alt="House Of Electronics Logo"
                  style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = '/images/hoe%20logo.png';
                    } else {
                      target.style.display = 'none';
                    }
              }}
            />
          </div>

              <div
                className="space-y-1"
                style={{ flex: 1, minWidth: 0, paddingLeft: headerPadding, position: 'relative' }}
              >
                <div className={`${companyNameSize} font-bold leading-tight`} style={{ color: template.colors.text }}>
                  <span style={{ marginRight: '8px' }}>
                    {templateType === 'type-b' ? 'Type B' : templateType === 'type-c' ? 'Type C' : 'Type A'}
                  </span>
                  House Of Electronics S/L LTD
            </div>
                {data.invoiceType && (
                  <div
                    className="text-[10px] font-semibold uppercase px-2 py-1 rounded"
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: headerBg,
                      color: accent,
                      border: `1px solid ${borderColor}`,
                      letterSpacing: '0.08em'
                    }}
                  >
                    {formatInvoiceType(data.invoiceType)}
                  </div>
                )}
                <div className="text-sm font-medium" style={{ color: accent }}>
                  Importer of Computers, Stationaries, Phones and General Accessories.
          </div>
                <div className="text-sm" style={{ color: mutedText, lineHeight: '1.5' }}>
                  Providing Hardware Maintenance, Networking and General ICT Supports
        </div>
                <div className="text-xs" style={{ color: mutedText }}>
                  {(() => {
                    // Normalize old default values to new ones
                    const address = (data.company.address === '123 Business St' || data.company.address === '123 Business Street' || !data.company.address) 
                      ? '13 A Sander Street Middle Floor' 
                      : data.company.address;
                    const city = (data.company.city === 'San Francisco' || !data.company.city) 
                      ? 'Freetown' 
                      : data.company.city;
                    const state = (data.company.state === 'CA' || data.company.state === 'Western Area Urban, BO etc' || !data.company.state) 
                      ? 'Sierra Leone' 
                      : data.company.state;
                    return `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''} ${data.company.zip || ''}`;
                  })()}
          </div>
                <div className="flex flex-wrap gap-3 text-[11px] items-center" style={{ color: mutedText, lineHeight: '1.4' }}>
                  <span className="flex items-center gap-1">
                    <img src="/images/whatsaap.png" alt="WhatsApp" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    {(() => {
                      // Normalize old phone numbers
                      const phone = data.company.phone || '+232-77-593-479';
                      return (phone === '+1 (555) 123-4567' || phone === '+232 74 123-4567' || phone.startsWith('+1')) 
                        ? '+232-77-593-479' 
                        : phone;
                    })()}
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/images/instagram.png" alt="Instagram" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    @hoe_sl
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/images/facebook.png" alt="Facebook" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    facebook.com/hoesl
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/images/hoe logo.png" alt="Website" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    www.tahoe-sl.com
                  </span>
                  <span>{(() => {
                    // Normalize old email
                    const email = data.company.email || 'sales@tahoe-sl.com';
                    return (email === 'info@houseofelectronics.com') 
                      ? 'sales@tahoe-sl.com' 
                      : email;
                  })()}</span>
          </div>
        </div>
      </div>

            {/* Recipient & dates - on every page */}
            <div className="grid grid-cols-3 gap-3 text-sm mb-6">
                <div className="space-y-1">
                <div className="font-semibold" style={{ color: accent }}>Bill To</div>
                <div>{data.customer.name}</div>
                <div className="text-xs" style={{ color: mutedText }}>
                  {[data.customer.address, data.customer.city, data.customer.state, data.customer.zip].filter(Boolean).join(', ')}
          </div>
                <div className="text-xs" style={{ color: mutedText }}>{data.customer.email || data.customer.phone}</div>
                </div>
                <div className="space-y-1 text-left">
                <div className="text-xs" style={{ color: mutedText, lineHeight: '1.4' }}>
                  <strong style={{ color: accent }}>Sales Rep</strong> {salesRepName} {salesRepCode ? `(${salesRepCode})` : ''}
        </div>
                <div className="text-xs" style={{ color: mutedText, lineHeight: '1.4' }}>
                  <strong style={{ color: accent }}>Invoice:</strong> {data.invoiceNumber}
                  {data.invoiceType && (
                    <span style={{ marginLeft: 4, color: accent }}>
                      ({formatInvoiceType(data.invoiceType)})
                    </span>
                  )}
                </div>
                </div>
                <div className="space-y-1 text-right">
                <div className="font-semibold" style={{ color: accent }}>Date</div>
                <div className="text-xs" style={{ color: mutedText }}>Issued: {formatDateValue(data.date)}</div>
                <div className="text-xs" style={{ color: mutedText }}>Due: {formatDateValue(data.dueDate)}</div>
                </div>
              </div>

            {/* Items table - on every page */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                className="items-table-wrapper"
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '0px'
                }}
              >
                <table
                  className="w-full border-collapse"
                  style={{ 
                    border: 'none',
                    borderSpacing: 0,
                    margin: 0,
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                >
        <thead>
                  <tr style={{ background: '#f8fafc', color: '#0f172a' }}>
                    <th className="py-2 px-2 text-left text-xs w-14" style={{ 
                      border: `1px solid ${lineColor}`, 
                      borderTop: 'none', 
                      borderLeft: 'none',
                      borderRight: `1px solid ${lineColor}`
                    }}>#</th>
                    <th className="py-2 px-2 text-left text-xs" style={{ 
                      border: `1px solid ${lineColor}`, 
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: `1px solid ${lineColor}`
                    }}>Description</th>
                    <th className="py-2 px-2 text-center text-xs" style={{ 
                      border: `1px solid ${lineColor}`, 
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: `1px solid ${lineColor}`,
                      width: '60px', 
                      minWidth: '50px' 
                    }}>Qty</th>
                    {!isDeliveryNote && (
                      <>
                        <th className="py-2 px-2 text-right text-xs" style={{ 
                          border: `1px solid ${lineColor}`, 
                          borderTop: 'none',
                          borderLeft: 'none',
                          borderRight: `1px solid ${lineColor}`,
                          width: '100px', 
                          minWidth: '80px' 
                        }}>Unit</th>
                        <th className="py-2 px-2 text-right text-xs" style={{ 
                          border: `1px solid ${lineColor}`, 
                          borderTop: 'none', 
                          borderRight: 'none',
                          borderLeft: 'none',
                          width: '110px', 
                          minWidth: '90px' 
                        }}>Amount</th>
                      </>
                    )}
                    {isDeliveryNote && (
                      <th className="py-2 px-2 text-center text-xs" style={{ 
                        border: `1px solid ${lineColor}`, 
                        borderTop: 'none', 
                        borderRight: 'none',
                        borderLeft: 'none',
                        width: '100px' 
                      }}>Status</th>
                    )}
          </tr>
        </thead>
        <tbody>
                  {pageRows.map((item, idx) => (
              <tr
                      key={item.id || `${pageIndex}-${idx}`}
                style={{
                        background: idx % 2 === 0 ? '#fff' : '#f9fbff'
                      }}
                    >
                      <td className="py-2 px-2 text-xs text-center" style={{ 
                        color: mutedText, 
                        border: `1px solid ${lineColor}`, 
                        borderLeft: 'none', 
                        borderTop: 'none',
                        borderRight: `1px solid ${lineColor}`,
                        verticalAlign: 'top'
                      }}>{startItemNumber + idx + 1}</td>
                      <td className="py-2 px-2 text-xs" style={{ 
                        color: template.colors.text, 
                        border: `1px solid ${lineColor}`, 
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: `1px solid ${lineColor}`,
                        whiteSpace: 'pre-wrap', 
                        verticalAlign: 'top', 
                        wordBreak: 'break-word' 
                      }}>
                        <div>
                          <div>{item.description || '\u00A0'}</div>
                          {item.itemDescription && (
                            <div className="mt-1 text-[10px]" style={{ color: mutedText, fontStyle: 'italic', lineHeight: '1.3' }}>
                              {item.itemDescription}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-xs text-center" style={{ color: template.colors.text, border: `1px solid ${lineColor}`, borderTop: 'none', verticalAlign: 'top', width: '60px', minWidth: '50px' }}>
                        {item.quantity ? item.quantity.toLocaleString() : '\u00A0'}
                      </td>
                      {!isDeliveryNote && (
                        <>
                          <td className="py-2 px-1 text-right" style={{ color: template.colors.text, border: `1px solid ${lineColor}`, borderTop: 'none', verticalAlign: 'top', fontSize: '10px', width: '100px', minWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.rate ? formatCurrency(item.rate, currency) : '\u00A0'}
                          </td>
                          <td className="py-2 px-1 text-right" style={{ 
                            color: template.colors.text, 
                            border: `1px solid ${lineColor}`, 
                            borderTop: 'none', 
                            borderRight: 'none', 
                            verticalAlign: 'top', 
                            fontSize: '10px', 
                            width: '110px', 
                            minWidth: '90px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis'
                          }}>
                            {item.amount ? formatCurrency(item.amount, currency) : '\u00A0'}
                          </td>
                        </>
                      )}
                      {isDeliveryNote && (
                        <td className="py-2 px-2 text-center" style={{ 
                          border: `1px solid ${lineColor}`, 
                          borderTop: 'none', 
                          borderRight: 'none', 
                          verticalAlign: 'top'
                        }}>
                          <span className="inline-block px-2 py-1 rounded text-[9px] font-semibold uppercase" style={{ backgroundColor: '#10b981', color: 'white', letterSpacing: '0.05em' }}>
                            Delivered
                          </span>
                        </td>
                      )}
              </tr>
                  ))}
        </tbody>
      </table>
              </div>

            </div>

            {/* Totals - only on last page, at bottom (except delivery notes) */}
            {!isDeliveryNote && isLastPage && (
              <div
                className="flex justify-end mt-auto mb-4 invoice-totals"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                <div style={{ minWidth: '280px' }}>

                  {/* Subtotal + discount rows — only shown when a discount applies */}
                  {discountAmount > 0 && (
                    <div className="space-y-1 pb-2 mb-2" style={{ borderBottom: `1px solid ${lineColor}` }}>
                      <div className="flex justify-between text-sm" style={{ color: mutedText }}>
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal, currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm" style={{ color: mutedText }}>
                        <span>Discount ({data.discount}%)</span>
                        <span>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    </div>
                  )}

                  {/* — secondary rows: excl. GST + GST breakdown — */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs" style={{ color: mutedText }}>
                      <span>Total excl. GST</span>
                      <span>{formatCurrency(taxableAmount, currency)}</span>
                    </div>
                    <div
                      className="text-right text-[10px] italic"
                      style={{ color: mutedText, opacity: 0.7, lineHeight: '1.4' }}
                    >
                      {amountToWords(taxableAmount, currency)}
                    </div>
                    {calculatedTaxes.map((tax) => (
                      <div key={tax.id} className="flex justify-between text-xs" style={{ color: mutedText }}>
                        <span>{tax.name} ({parseFloat(tax.rate.toFixed(2))}%)</span>
                        <span>{formatCurrency(tax.amount, currency)}</span>
                      </div>
                    ))}
                  </div>

                  {/* — primary row: Total with GST — */}
                  <div
                    className="flex justify-between items-baseline pt-2"
                    style={{ borderTop: `2px solid ${accent}` }}
                  >
                    <span className="text-sm font-bold" style={{ color: accent }}>Total with GST</span>
                    <span className="text-lg font-bold" style={{ color: accent }}>{formatCurrency(total, currency)}</span>
                  </div>

                </div>
              </div>
            )}

            {/* Delivery Note Confirmation Section - only on last page for delivery notes */}
            {isDeliveryNote && isLastPage && (
              <div className="mb-6 p-4 rounded-lg" style={{ border: `2px dashed ${accent}`, backgroundColor: `${accent}10` }}>
                <div className="text-center mb-4">
                  <div className="text-sm font-bold mb-1" style={{ color: accent }}>DELIVERY CONFIRMATION</div>
                  <div className="text-xs" style={{ color: mutedText }}>
                    Please sign and return one copy as confirmation of delivery
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
                    <div className="font-semibold mb-2" style={{ color: accent }}>Delivery Details:</div>
                    <div className="space-y-1" style={{ color: mutedText }}>
                      <div>Total Items: {data.items.length}</div>
                      <div>Delivery Date: {formatDateValue(data.dueDate)}</div>
                      <div>Document: {data.invoiceNumber}</div>
          </div>
        </div>
        <div>
                    <div className="font-semibold mb-2" style={{ color: accent }}>Signatures:</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] mb-1" style={{ color: mutedText }}>Delivered by (Driver):</div>
                        <div style={{ borderBottom: `1px solid ${mutedText}`, height: '24px' }}></div>
                      </div>
                      <div>
                        <div className="text-[10px] mb-1" style={{ color: mutedText }}>Received by (Customer):</div>
                        <div style={{ borderBottom: `1px solid ${mutedText}`, height: '24px' }}></div>
                      </div>
          </div>
          </div>
        </div>
      </div>
            )}

            {/* Footer section - on every page (brand logos + message) */}
            <div 
              className="invoice-footer-section"
              style={{ 
                  marginTop: 'auto',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  paddingTop: '24px'
                }}
              >
                {/* Brand logos */}
                {brandLogos.length > 0 && (
                  <div 
                    className="pt-6 border-t invoice-brand-logos" 
                    style={{ 
                      borderColor: lineColor,
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      marginBottom: '16px'
                    }}
                  >
                    <div className="flex flex-wrap justify-center gap-4 items-center">
              {brandLogos.map((logo, idx) => (
                <img
                  key={idx}
                  src={logo}
                  alt="Brand"
                  style={{ height: 28, objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
                    </div>
                  </div>
                )}

                {/* Single-line footer message */}
                <div 
                  className="text-sm text-center invoice-footer-message" 
                  style={{ 
                    color: mutedText,
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    paddingTop: '12px',
                    paddingBottom: '8px'
                  }}
                >
                  <span style={{ 
                    display: 'inline-block',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    hyphens: 'auto'
                  }}>
                    {[data.notes || 'Thank you for your business!', data.terms].filter(Boolean).join(' • ')}
                  </span>
                </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
