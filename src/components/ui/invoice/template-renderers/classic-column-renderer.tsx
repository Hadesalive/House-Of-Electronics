import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { paginateInvoiceItems, PageBreak, ItemsRangeIndicator, needsSeparateTotalsPage } from '../multi-page-utils';

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

// Print styles for classic template
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    .print-invoice * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-invoice {
      margin: 0 !important;
      box-shadow: none !important;
      border: inherit !important;
    }

    .pagination-controls {
      display: none !important;
    }
  }
`;

export function ClassicColumnRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
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

  // Dynamic pagination for classic template
  const adjustedPages = paginateInvoiceItems(data.items, { 
    templateType: 'detailed',
    // Classic template needs more space for detailed layout
    firstPageCapacity: 0.75,  // Leave 25% margin at bottom
    lastPageCapacity: 0.65,   // Leave 35% margin for totals and footer
    separateTotalsThreshold: 6
  });
  
  // Determine if we need a separate totals page
  const needsSeparateTotals = needsSeparateTotalsPage(adjustedPages, 6, 'detailed');

  // Footer component
  const InvoiceFooter = () => (
    <footer className="pt-4 border-t" style={{ borderColor: template.colors.secondary }}>
      {data.notes && (
        <div className="mb-3">
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Notes</div>
          <div className="text-xs">{data.notes}</div>
        </div>
      )}
      {data.terms && (
        <div className="mb-3">
          <div className="font-semibold mb-1 text-sm" style={{ color: template.colors.primary }}>Terms</div>
          <div className="text-xs">{data.terms}</div>
        </div>
      )}
      
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
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={logo} alt={`Brand ${i + 1}`} className="h-6 w-auto object-contain opacity-80" />
          ))}
        </div>
      )}
    </footer>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Multi-page info banner (screen only) */}
      {(adjustedPages.length > 1 || needsSeparateTotals) && (
        <div className="pagination-controls mb-4 p-3 rounded-lg border text-center" style={{ backgroundColor: `${template.colors.primary}10`, borderColor: template.colors.primary }}>
          <div className="text-sm font-medium" style={{ color: template.colors.primary }}>
            📄 This invoice has {adjustedPages.length + (needsSeparateTotals ? 1 : 0)} pages ({data.items.length} items)
            {needsSeparateTotals && <span className="text-xs ml-2">(+ separate totals page)</span>}
          </div>
        </div>
      )}

      {/* Render each page as a complete A4 container */}
      {adjustedPages.map((page, pageIdx) => (
        <React.Fragment key={page.pageNumber}>
          <div
            style={{
              width: '210mm',
              backgroundColor: template.colors.background,
              color: template.colors.text,
              fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
              border: 'none',
              borderRadius: '0px',
              boxSizing: 'border-box',
              position: 'relative',
              boxShadow: 'none',
              margin: '0mm',
              marginBottom: pageIdx < adjustedPages.length - 1 ? '5mm' : '0mm',
              padding: '8mm',
              paddingTop: '6mm',
              paddingBottom: '8mm',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '297mm',
              height: '297mm',
              maxHeight: '297mm'
            }}
            className="print-invoice"
          >
            {/* Header - only on first page */}
            {page.isFirstPage && (
              <div className="mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {template.layout.showLogo && data.company.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.company.logo} alt="Logo" className="h-12 w-auto object-contain" />
                    )}
                    <div>
                      <div className="text-xl font-bold" style={{ color: template.colors.text }}>{data.company.name}</div>
                      <div className="text-sm" style={{ color: template.colors.secondary }}>{data.company.address}, {data.company.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold" style={{ color: template.colors.accent }}>INVOICE</div>
                    <div className="text-sm"><span className="text-gray-500">No:</span> {data.invoiceNumber}</div>
                    <div className="text-sm"><span className="text-gray-500">Date:</span> {new Date(data.date).toLocaleDateString()}</div>
                    <div className="text-sm"><span className="text-gray-500">Due:</span> {new Date(data.dueDate).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <div className="text-sm font-semibold mb-1" style={{ color: template.colors.primary }}>Bill To</div>
                    <div className="text-sm">
                      <div className="font-medium">{data.customer.name}</div>
                      <div>{data.customer.address}</div>
                      <div>{data.customer.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold mb-1" style={{ color: template.colors.primary }}>Payment Info</div>
                    <div className="text-sm">
                      <div><span className="text-gray-500">Subtotal:</span> {formatCurrency(subtotal)}</div>
                      <div><span className="text-gray-500">Tax:</span> {formatCurrency(tax)}</div>
                      <div><span className="text-gray-500">Total:</span> {formatCurrency(total)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Page indicator for continuation pages */}
            {!page.isFirstPage && (
              <div className="mb-4 text-center text-xs text-gray-500">
                Page {page.pageNumber} of {page.totalPages} {page.isLastPage ? '' : '(continued)'}
              </div>
            )}

            {/* Items Table - Classic Column Style with Unique Design */}
            <section style={{ flexGrow: 1, marginBottom: '12px' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold" style={{ color: template.colors.primary }}>
                  Items {page.totalPages > 1 ? `(Page ${page.pageNumber} of ${page.totalPages})` : ''}
                </div>
                {page.totalPages > 1 && (
                  <ItemsRangeIndicator 
                    start={page.itemsRange.start} 
                    end={page.itemsRange.end} 
                    total={data.items.length}
                  />
                )}
              </div>
              
              {/* Classic Column Table - Unique Design with Rounded Borders */}
              <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: template.colors.primary }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: template.colors.primary, color: '#fff' }}>
                      <th className="text-left py-3 px-4 font-bold text-sm border-r" style={{ borderColor: '#fff' }}>Description</th>
                      <th className="text-center py-3 px-4 font-bold text-sm border-r" style={{ borderColor: '#fff' }}>Qty</th>
                      <th className="text-right py-3 px-4 font-bold text-sm border-r" style={{ borderColor: '#fff' }}>Rate</th>
                      <th className="text-right py-3 px-4 font-bold text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 ? '#f8f9fa' : 'white' }}>
                        <td className="py-3 px-4 text-sm border-r" style={{ borderColor: template.colors.secondary + '30' }}>
                          <div className="font-medium">{item.description}</div>
                          {item.itemDescription && (
                            <div className="text-xs mt-1 opacity-75" style={{ color: template.colors.secondary }}>
                              {item.itemDescription}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-sm border-r" style={{ borderColor: template.colors.secondary + '30' }}>{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-sm border-r" style={{ borderColor: template.colors.secondary + '30' }}>{formatCurrency(item.rate)}</td>
                        <td className="py-3 px-4 text-right text-sm font-bold" style={{ borderColor: template.colors.secondary + '30' }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Show "Continued on next page" only for middle pages */}
              {!page.isFirstPage && !page.isLastPage && (
                <div className="text-xs text-gray-500 italic mt-2 text-right">
                  Continued on next page...
                </div>
              )}
            </section>

            {/* Totals - only on last page if there's room */}
            {page.isLastPage && !needsSeparateTotals && (
              <section className="mb-4 flex justify-end">
                <div className="w-full max-w-xs">
                  <div className="flex justify-between py-1 text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {data.taxRate > 0 && (
                    <div className="flex justify-between py-1 text-sm">
                      <span>{currency === 'USD' ? 'GST' : 'Tax'} {data.taxRate}%:</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                  )}
                  {data.discount > 0 && (
                    <div className="flex justify-between py-1 text-sm">
                      <span>Discount:</span>
                      <span>- {formatCurrency(data.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t-2" style={{ borderColor: template.colors.accent }}>
                    <div className="text-base font-bold" style={{ color: template.colors.primary }}>Total:</div>
                    <div className="text-xl font-extrabold" style={{ color: template.colors.accent }}>{formatCurrency(total)}</div>
                  </div>
                </div>
              </section>
            )}

            {/* Footer - only on last page if there's room */}
            {page.isLastPage && !needsSeparateTotals && (
              <div style={{ marginTop: 'auto', marginBottom: '5mm', flexShrink: 0 }}>
                <InvoiceFooter />
              </div>
            )}
          </div>
          
          {/* Page break for print (between pages) */}
          {!page.isLastPage && <PageBreak />}
        </React.Fragment>
      ))}

      {/* Separate Totals Page - only if needed */}
      {needsSeparateTotals && (
        <>
          <PageBreak />
          <div
            style={{
              width: '210mm',
              backgroundColor: template.colors.background,
              color: template.colors.text,
              fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
              border: 'none',
              borderRadius: '0px',
              boxSizing: 'border-box',
              position: 'relative',
              boxShadow: 'none',
              margin: '0mm',
              padding: '8mm',
              paddingTop: '6mm',
              paddingBottom: '8mm',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '297mm',
              height: '297mm',
              maxHeight: '297mm'
            }}
            className="print-invoice"
          >
            <div className="mb-4 text-center text-xs text-gray-500" style={{ flex: 'none' }}>
              Page {adjustedPages.length + 1} of {adjustedPages.length + 1} - Invoice Summary
            </div>

            {/* Totals Section */}
            <section style={{ marginBottom: '12px', flex: 'none', display: 'flex', justifyContent: 'flex-end' }}>
              <div className="w-full max-w-xs">
                <div className="flex justify-between py-0.5 text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {data.taxRate > 0 && (
                  <div className="flex justify-between py-0.5 text-xs">
                    <span>{currency === 'USD' ? 'GST' : 'Tax'} {data.taxRate}%:</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                {data.discount > 0 && (
                  <div className="flex justify-between py-0.5 text-xs">
                    <span>Discount:</span>
                    <span>- {formatCurrency(data.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-1 pt-1 border-t-2" style={{ borderColor: template.colors.accent }}>
                  <div className="text-sm font-bold" style={{ color: template.colors.primary }}>Total:</div>
                  <div className="text-lg font-extrabold" style={{ color: template.colors.accent }}>{formatCurrency(total)}</div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div style={{ marginTop: 'auto', marginBottom: '5mm', flexShrink: 0 }}>
              <InvoiceFooter />
            </div>
          </div>
        </>
      )}
    </>
  );
}