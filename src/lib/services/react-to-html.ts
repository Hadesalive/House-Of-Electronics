/**
 * React to HTML Server-Side Rendering Utility
 * 
 * This utility converts React components to HTML strings for PDF generation
 * without requiring react-dom/server in API routes.
 */

import { paginateInvoiceItems } from '@/components/ui/invoice/multi-page-utils';

// TODO: Import template configurations when adding multi-template support

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
  invoiceType?: string;
  currency?: string;
  paidAmount?: number;
  balance?: number;
  status?: string;
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

/**
 * Convert React component to HTML string using a simplified approach
 * This creates HTML that matches the ProCorporateRenderer structure
 */
export function renderInvoiceToHTML(data: InvoiceData, templateId: string = 'pro-corporate'): string {
  // For now, we only support pro-corporate template
  // TODO: Add support for other templates using templateId
  console.log(`Rendering template: ${templateId}`);
  
  // For now, we'll use a hybrid approach - get the structure from the component
  // but render it as HTML to avoid React dependencies in API routes
  
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - (data.discount || 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    const currencySymbol = data.currency === 'USD'
      ? '$'
      : (data.currency === 'SLE' || data.currency === 'SLL' || data.currency === 'NLE' || data.currency === 'NLe')
        ? 'NLe '
        : '$';
    return `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Use the same pagination logic as ProCorporateRenderer
  const adjustedPages = paginateInvoiceItems(data.items, { itemsPerPage: 18 });
  
  // Determine if we need a separate totals page
  // If last page has more than 5 items, totals/footer need their own page
  // But only if we have enough items to justify the extra page
  const lastPageItems = adjustedPages.length > 0 ? adjustedPages[adjustedPages.length - 1].items.length : 0;
  const needsSeparateTotalsPage = adjustedPages.length > 0 &&
    lastPageItems > 5 &&
    data.items.length > 12; // Only create separate page if we have more than 12 total items

  let pagesHTML = '';

  // Render each page as a complete A4 container
  adjustedPages.forEach((page) => {
    // Determine if this page should show totals/footer
    // Only show totals on the last page, and only if we don't need a separate totals page
    const shouldShowTotals = page.isLastPage && !needsSeparateTotalsPage;
    
    pagesHTML += generatePageHTML(
      data, 
      page.items, 
      page.pageNumber, 
      page.totalPages, 
      page.isFirstPage, 
      shouldShowTotals,
      formatCurrency, 
      subtotal, 
      tax, 
      total,
      page.itemsRange
    );
    
    // Page break for print (between pages)
    if (!page.isLastPage) {
      pagesHTML += '<div class="page-break"></div>';
    }
  });

  // Separate Totals Page - only if needed
  if (needsSeparateTotalsPage) {
    pagesHTML += '<div class="page-break"></div>';
    pagesHTML += generateTotalsPageHTML(
      data, 
      adjustedPages.length + 1, 
      adjustedPages.length + 1, 
      formatCurrency, 
      subtotal, 
      tax, 
      total
    );
  }

  // Wrap in complete HTML document with inline styles only
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${data.invoiceNumber}</title>
      
      <style>
        ${getInvoiceStyles()}
      </style>
    </head>
    <body>
      ${pagesHTML}
    </body>
    </html>
  `;
}

// Pagination is now imported from shared utility - no duplicate code

/**
 * Generate HTML for a single page
 */
function generatePageHTML(
  data: InvoiceData,
  items: InvoiceItem[],
  pageNum: number,
  totalPages: number,
  isFirstPage: boolean,
  isLastPage: boolean,
  formatCurrency: (amount: number) => string,
  subtotal: number,
  tax: number,
  total: number,
  itemsRange?: { start: number; end: number }
): string {
  return `
    <div class="invoice-page">
      ${isFirstPage ? `
        <!-- Header -->
        <header class="invoice-header">
          <div class="header-content">
            <div class="company-section">
              ${data.company.logo ? `<img src="${data.company.logo}" alt="Logo" class="company-logo" />` : ''}
              <div>
                <h1 class="company-name">${data.company.name}</h1>
                <div class="company-details">
                  <div>${data.company.address}</div>
                  <div>${data.company.city}, ${data.company.state} ${data.company.zip}</div>
                  <div class="mt-1">${data.company.phone}</div>
                  <div>${data.company.email}</div>
                </div>
              </div>
            </div>

            <div class="invoice-meta">
              <div class="invoice-meta-row">
                <span class="label">Invoice Number:</span>
                <span>${data.invoiceNumber}</span>
              </div>
              <div class="invoice-meta-row">
                <span class="label">Invoice Date:</span>
                <span>${new Date(data.date).toLocaleDateString()}</span>
              </div>
              <div class="invoice-meta-row">
                <span class="label">Payment Date:</span>
                <span>${new Date(data.dueDate).toLocaleDateString()}</span>
              </div>
              <div class="invoice-meta-row total-due">
                <span class="label-bold">Amount Due (${data.currency || 'USD'}):</span>
                <span class="amount-accent">${formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <!-- Invoice Type Badge -->
          <div class="badge-row">
            <div class="badge-line"></div>
            <div class="badge-container">
              <span class="badge-text">${data.invoiceType?.charAt(0).toUpperCase()}${data.invoiceType?.slice(1) || 'Invoice'}</span>
            </div>
            <div class="badge-line"></div>
          </div>
        </header>

        <!-- Bill To Section -->
        <section class="bill-to-section">
          <div class="bill-to-container">
            <div class="bill-to-left">
              <div class="section-title">Bill To:</div>
              <div class="customer-info">
                <div class="customer-name">${data.customer.name}</div>
                <div>${data.customer.address}</div>
                <div>${data.customer.city}, ${data.customer.state} ${data.customer.zip}</div>
                ${data.customer.phone ? `<div>${data.customer.phone}</div>` : ''}
                ${data.customer.email ? `<div>${data.customer.email}</div>` : ''}
              </div>
            </div>
            ${data.paidAmount !== undefined && data.paidAmount > 0 ? `
              <div class="payment-status">
                <div class="section-title">Payment Status:</div>
                <div class="payment-info">
                  <div class="payment-row paid-row">
                    <span class="payment-label">Paid:</span>
                    <span class="payment-value">-${formatCurrency(data.paidAmount)}</span>
                  </div>
                  <div class="payment-row balance-row">
                    <span class="payment-label">Balance Due:</span>
                    <span class="payment-value">${formatCurrency(data.balance || 0)}</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </section>
      ` : `
        <!-- Continuation Page Header -->
        <div class="continuation-header">
          Page ${pageNum} of ${totalPages} (continued)
        </div>
      `}

      <!-- Items Table -->
      <section class="items-section">
        ${totalPages > 1 ? `
          <div class="items-header">
            <span class="section-title">Items (Page ${pageNum} of ${totalPages})</span>
            <span class="items-range">Items ${itemsRange?.start || 1}–${itemsRange?.end || items.length} of ${data.items.length}</span>
          </div>
        ` : '<div class="section-title">Items</div>'}
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr class="${idx % 2 ? 'row-alt' : ''}">
                <td>${item.description}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.rate)}</td>
                <td class="text-right amount-col">${formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${!isLastPage ? '<div class="continued-text">Continued on next page...</div>' : ''}
      </section>

        ${isLastPage ? `
          <!-- Totals Section -->
          <section class="totals-section">
            <div class="totals-container">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              ${data.taxRate > 0 ? `
                <div class="total-row">
                  <span>${data.currency === 'USD' ? 'GST' : 'Tax'} ${data.taxRate}%:</span>
                  <span>${formatCurrency(tax)}</span>
                </div>
              ` : ''}
              ${data.discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>- ${formatCurrency(data.discount)}</span>
                </div>
              ` : ''}
              <div class="total-row-final">
                <span class="total-label">Total:</span>
                <span class="total-amount">${formatCurrency(total)}</span>
              </div>
              <div class="amount-due-row">
                <span class="label-bold">Amount Due (${data.currency || 'USD'}):</span>
                <span class="amount-accent">${formatCurrency(total)}</span>
              </div>
            </div>
          </section>

          <!-- Footer -->
          <footer class="invoice-footer">
            ${data.bankDetails ? `
              <div class="bank-details">
                <div class="bank-title">Payment Details</div>
                <div class="bank-row">
                  <span class="bank-label">Bank:</span>
                  <span>${data.bankDetails.bankName}</span>
                </div>
                ${data.bankDetails.accountName ? `
                  <div class="bank-row">
                    <span class="bank-label">Account Name:</span>
                    <span>${data.bankDetails.accountName}</span>
                  </div>
                ` : ''}
                <div class="bank-row">
                  <span class="bank-label">Account Number:</span>
                  <span>${data.bankDetails.accountNumber}</span>
                </div>
                ${data.bankDetails.routingNumber ? `
                  <div class="bank-row">
                    <span class="bank-label">Routing/Sort Code:</span>
                    <span>${data.bankDetails.routingNumber}</span>
                  </div>
                ` : ''}
                ${data.bankDetails.swiftCode ? `
                  <div class="bank-row">
                    <span class="bank-label">SWIFT/BIC:</span>
                    <span>${data.bankDetails.swiftCode}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="notes-terms">
              ${data.notes ? `
                <div class="notes">
                  <div class="notes-title">Notes</div>
                  <div class="notes-content">${data.notes}</div>
                </div>
              ` : ''}
              ${data.terms ? `
                <div class="terms">
                  <div class="terms-title">Terms</div>
                  <div class="terms-content">${data.terms}</div>
                </div>
              ` : ''}
            </div>
          </footer>
        ` : ''}
    </div>
  `;
}

/**
 * Generate HTML for totals-only page
 */
function generateTotalsPageHTML(
  data: InvoiceData,
  pageNum: number,
  totalPages: number,
  formatCurrency: (amount: number) => string,
  subtotal: number,
  tax: number,
  total: number
): string {
  return `
    <div class="invoice-page">
      <div class="continuation-header">
        Page ${pageNum} of ${totalPages} - Invoice Summary
      </div>

      <!-- Totals Section -->
      <section class="totals-section">
        <div class="totals-container">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${data.taxRate > 0 ? `
            <div class="total-row">
              <span>${data.currency === 'USD' ? 'GST' : 'Tax'} ${data.taxRate}%:</span>
              <span>${formatCurrency(tax)}</span>
            </div>
          ` : ''}
          ${data.discount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>- ${formatCurrency(data.discount)}</span>
            </div>
          ` : ''}
          <div class="total-row-final">
            <span class="total-label">Total:</span>
            <span class="total-amount">${formatCurrency(total)}</span>
          </div>
          <div class="amount-due-row">
            <span class="label-bold">Amount Due (${data.currency || 'USD'}):</span>
            <span class="amount-accent">${formatCurrency(total)}</span>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="invoice-footer">
        ${data.bankDetails ? `
          <div class="bank-details">
            <div class="bank-title">Payment Details</div>
            <div class="bank-row">
              <span class="bank-label">Bank:</span>
              <span>${data.bankDetails.bankName}</span>
            </div>
            ${data.bankDetails.accountName ? `
              <div class="bank-row">
                <span class="bank-label">Account Name:</span>
                <span>${data.bankDetails.accountName}</span>
              </div>
            ` : ''}
            <div class="bank-row">
              <span class="bank-label">Account Number:</span>
              <span>${data.bankDetails.accountNumber}</span>
            </div>
            ${data.bankDetails.routingNumber ? `
              <div class="bank-row">
                <span class="bank-label">Routing/Sort Code:</span>
                <span>${data.bankDetails.routingNumber}</span>
              </div>
            ` : ''}
            ${data.bankDetails.swiftCode ? `
              <div class="bank-row">
                <span class="bank-label">SWIFT/BIC:</span>
                <span>${data.bankDetails.swiftCode}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="notes-terms">
          ${data.notes ? `
            <div class="notes">
              <div class="notes-title">Notes</div>
              <div class="notes-content">${data.notes}</div>
            </div>
          ` : ''}
          ${data.terms ? `
            <div class="terms">
              <div class="terms-title">Terms</div>
              <div class="terms-content">${data.terms}</div>
            </div>
          ` : ''}
        </div>
      </footer>
    </div>
  `;
}

/**
 * Get CSS styles matching the Pro Corporate template
 */
function getInvoiceStyles(): string {
  return `
    /* A4 Page Setup */
    @page {
      size: A4;
      margin: 0;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      background: white;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.5;
    }

    .invoice-page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm;
      background: white;
      position: relative;
      border: 3px solid #f97316;
      border-radius: 8px;
      box-shadow: 0 3px 15px rgba(0,0,0,0.12);
      margin: 0 auto 5mm auto;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .invoice-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 2rem;
    }

    .company-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .company-logo {
      height: 64px;
      width: auto;
      object-fit: contain;
    }

    .company-name {
      font-size: 24px;
      font-weight: 700;
      color: #f97316;
      margin-bottom: 0.25rem;
    }

    .company-details {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .mt-1 {
      margin-top: 0.25rem;
    }

    .invoice-meta {
      text-align: right;
      min-width: 200px;
      font-size: 12px;
    }

    .invoice-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 0.25rem;
    }

    .invoice-meta-row.total-due {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #6b7280;
    }

    .label {
      font-weight: 600;
    }

    .label-bold {
      font-weight: 700;
    }

    .amount-accent {
      font-weight: 700;
      color: #f97316;
    }

    /* Badge Row */
    .badge-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .badge-line {
      height: 4px;
      background-color: #f97316;
    }

    .badge-container {
      position: relative;
      padding: 0.75rem 2rem;
      background: white;
      border: 2px solid #f97316;
      border-radius: 8px;
    }

    .badge-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #f97316;
    }

    /* Bill To Section */
    .bill-to-section {
      margin-bottom: 1.5rem;
    }

    .bill-to-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 3rem;
    }

    .bill-to-left {
      flex: 2;
      min-width: 0; /* Allow flex item to shrink */
    }

    .payment-status {
      flex: 1;
      max-width: 280px;
      min-width: 200px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #f97316;
      margin-bottom: 0.5rem;
    }

    .customer-info {
      font-size: 12px;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .customer-name {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 0.25rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .payment-info {
      font-size: 12px;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
      padding: 0.25rem 0;
    }

    .payment-label {
      font-weight: 600;
    }

    .payment-value {
      font-weight: 700;
    }

    .paid-row {
      color: #10b981;
    }

    .balance-row {
      color: #10b981;
      font-weight: 700;
      border-top: 1px solid #10b981;
      padding-top: 0.5rem;
      margin-top: 0.25rem;
    }

    /* Continuation Header */
    .continuation-header {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    /* Items Section */
    .items-section {
      margin-bottom: 1.5rem;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    
    .items-table {
      flex-grow: 1;
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .items-range {
      font-size: 12px;
      color: #6b7280;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th {
      background: #f97316;
      color: white;
      padding: 0.5rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
    }

    .items-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(107, 114, 128, 0.2);
      font-size: 12px;
      line-height: 1.4;
    }

    .items-table tr.row-alt {
      background: rgba(0, 0, 0, 0.02);
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .amount-col {
      font-weight: 500;
    }

    .continued-text {
      font-size: 12px;
      color: #6b7280;
      font-style: italic;
      margin-top: 0.5rem;
      text-align: right;
    }

    /* Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1.5rem;
      margin-top: auto;
    }

    .totals-container {
      width: 100%;
      max-width: 360px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
      font-size: 14px;
    }

    .total-row-final {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 2px solid #f97316;
    }

    .total-label {
      font-size: 16px;
      font-weight: 700;
      color: #f97316;
    }

    .total-amount {
      font-size: 20px;
      font-weight: 800;
      color: #f97316;
    }

    .amount-due-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.25rem;
      padding: 0.25rem 0;
      font-size: 14px;
      background: rgba(249, 115, 22, 0.1);
    }


    /* Footer */
    .invoice-footer {
      padding-top: 1.5rem;
      border-top: 2px solid #f97316;
      margin-top: auto;
    }

    .bank-details {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 8px;
      background: rgba(249, 115, 22, 0.06);
    }

    .bank-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 14px;
      color: #f97316;
    }

    .bank-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 0.25rem;
    }

    .bank-label {
      font-weight: 500;
    }

    .notes-terms {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .notes-title, .terms-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      font-size: 12px;
      color: #f97316;
    }

    .notes-content, .terms-content {
      font-size: 12px;
    }

    /* Page Break - Critical for PDF generation */
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
      height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Ensure each invoice page is treated as a separate page */
    .invoice-page {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;
}
