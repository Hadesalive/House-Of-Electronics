import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { useSettings } from '@/contexts/SettingsContext';
import { paginateInvoiceItems, PageBreak, ItemsRangeIndicator } from '../multi-page-utils';

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

export function ElegantDarkRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const { formatCurrency } = useSettings();
  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;

  const safeDate = (value: string) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'Not specified' : d.toLocaleDateString();
  };

  const pages = paginateInvoiceItems(data.items, {
    templateType: 'compact',
    firstPageCapacity: 0.75,  // Leave 25% margin at bottom
    lastPageCapacity: 0.65,   // Leave 35% margin for totals and footer
    separateTotalsThreshold: 12
  });
  const needsSeparateTotalsPage = pages.length > 0 && pages[pages.length - 1].items.length > 12;

  // Dark body palette (also fixes missing names in earlier refs)
  const bodyBg = '#0b0f19'; // deep background
  const bodySurface = '#111827'; // card/table surface
  const bodyText = '#f3f4f6'; // light text
  const bodyMuted = '#9ca3af'; // muted
  const bodyBorder = '#374151'; // outline

  // Footer component
  const InvoiceFooter = () => (
    <footer className="pt-4 border-t" style={{ borderColor: template.colors.secondary }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        {data.notes && (
          <div>
            <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Notes</div>
            <div className="text-xs">{data.notes}</div>
          </div>
        )}
        {data.terms && (
          <div>
            <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Terms & Conditions</div>
            <div className="text-xs">{data.terms}</div>
          </div>
        )}
      </div>
      
      {data.bankDetails && (
        <div className="mb-3">
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Bank Details</div>
          <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="font-medium">Bank:</span> {data.bankDetails.bankName}</div>
            {data.bankDetails.accountName && (
              <div><span className="font-medium">Account Name:</span> {data.bankDetails.accountName}</div>
            )}
            <div><span className="font-medium">Account Number:</span> {data.bankDetails.accountNumber}</div>
            {data.bankDetails.routingNumber && (
              <div><span className="font-medium">Routing:</span> {data.bankDetails.routingNumber}</div>
            )}
            {data.bankDetails.swiftCode && (
              <div><span className="font-medium">SWIFT:</span> {data.bankDetails.swiftCode}</div>
            )}
          </div>
        </div>
      )}
      
      {brandLogos.length > 0 && (
        <div className="flex items-center gap-3 mt-2">
          {brandLogos.map((logo, i) => (
            <div
              key={i}
              className="rounded-lg"
              style={{
                minHeight: 28,
                minWidth: 56,
                padding: '4px 8px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.55))', // frosted black with a touch of white
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={`Brand ${i + 1}`}
                className="object-contain"
                style={{
                  maxHeight: 16,
                  maxWidth: 64,
                  // Subtle lift for dark marks to keep black logos visible
                  filter: 'brightness(1.2) drop-shadow(0 0 1.5px rgba(255,255,255,0.6)) drop-shadow(0 1px 2px rgba(0,0,0,0.6))'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </footer>
  );

  return (
    <div style={{ width: '210mm', minHeight: '297mm', backgroundColor: template.colors.background, color: template.colors.text, fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif` }}>
      {pages.map((page) => (
        <React.Fragment key={page.pageNumber}>
          <div style={{ minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
            {/* Dark header - only on first page */}
            {page.isFirstPage && (
              <div className="px-10 py-8 flex-shrink-0" style={{
                background: `linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.secondary || template.colors.primary} 60%)`
              }}>
                <div className="flex items-start justify-between text-white">
                  <div className="flex items-center gap-4">
                    {template.layout.showLogo && data.company.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.company.logo} alt="Logo" className="h-12 w-auto object-contain" />
                    )}
                    <div>
                      <div className="text-xl font-semibold tracking-wide">{data.company.name}</div>
                      <div className="text-sm opacity-80">{data.company.phone} • {data.company.email}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {data.company.address}, {data.company.city}, {data.company.state} {data.company.zip}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold uppercase" style={{ color: template.colors.accent }}>
                      {data.invoiceType?.replace('_', ' ') || 'INVOICE'}
                    </div>
                    <div className="text-sm opacity-85">No: {data.invoiceNumber}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Meta (first page only) */}
            {page.isFirstPage && (
              <div className="px-10 py-6 flex-shrink-0">
                <div className="flex items-start justify-between mb-6 text-sm" style={{ color: bodyText }}>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Bill To</div>
                    {data.customer?.name ? (
                      <>
                        <div className="font-medium">{data.customer.name}</div>
                        {data.customer.address && <div>{data.customer.address}</div>}
                        {(data.customer.city || data.customer.state || data.customer.zip) && (
                          <div>{[data.customer.city, data.customer.state, data.customer.zip].filter(Boolean).join(', ')}</div>
                        )}
                        {data.customer.phone && <div style={{ color: bodyMuted }}>{data.customer.phone}</div>}
                        {data.customer.email && <div style={{ color: bodyMuted }}>{data.customer.email}</div>}
                      </>
                    ) : (
                      <div className="italic" style={{ color: bodyMuted }}>No customer selected</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div><span style={{ color: bodyMuted }}>Date:</span> {safeDate(data.date)}</div>
                    <div><span style={{ color: bodyMuted }}>Due:</span> {safeDate(data.dueDate)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Area - Items */}
            <div className="flex-grow px-10" style={{ backgroundColor: bodyBg }}>
              <div className="mb-6">
                <table className="w-full border-collapse" style={{ color: bodyText, backgroundColor: bodySurface, borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: template.colors.primary, color: '#fff' }}>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-right py-3 px-4">Qty</th>
                      <th className="text-right py-3 px-4">Rate</th>
                      <th className="text-right py-3 px-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item, i) => (
                      <tr key={item.id} style={{ backgroundColor: i % 2 ? '#0f172a' : bodySurface }}>
                        <td className="py-3 px-4" style={{ borderBottom: `1px solid ${bodyBorder}` }}>{item.description}</td>
                        <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${bodyBorder}` }}>{item.quantity}</td>
                        <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${bodyBorder}` }}>{formatCurrency(item.rate)}</td>
                        <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${bodyBorder}` }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {page.totalPages > 1 && (
                  <div className="flex justify-between items-center text-xs mt-2 opacity-80">
                    <div>Items <ItemsRangeIndicator start={page.itemsRange.start} end={page.itemsRange.end} total={data.items.length} /></div>
                    <div>Page {page.pageNumber} of {page.totalPages}</div>
                  </div>
                )}
              </div>

              {/* Totals (last page only) */}
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
                    <div className="mt-2 pt-2 flex justify-between items-center border-t" style={{ borderColor: template.colors.secondary }}>
                      <div className="text-lg font-bold" style={{ color: template.colors.accent }}>Total</div>
                      <div className="text-2xl font-extrabold" style={{ color: template.colors.text }}>{formatCurrency(total)}</div>
                    </div>
                    {data.paidAmount !== undefined && data.paidAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center mt-2 py-1" style={{ color: '#10b981' }}>
                          <span className="font-semibold">Paid:</span>
                          <span className="font-bold">-{formatCurrency(data.paidAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t-2 font-extrabold" style={{ borderColor: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981', color: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981' }}>
                          <span>Balance Due:</span>
                          <span>{formatCurrency(data.balance || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - only on last page */}
            {page.isLastPage && (
              <div className="mt-auto px-10 pb-10 flex-shrink-0">
                <InvoiceFooter />
              </div>
            )}
          </div>
          {!page.isLastPage && <PageBreak />}
        </React.Fragment>
      ))}
    </div>
  );
}
