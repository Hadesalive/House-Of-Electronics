/**
 * House Of Electronics Invoice HTML Renderer
 * Generates the exact same HTML as the desktop hoe-classic-ekhlas-renderer.tsx
 * Used by the PDF API server
 */

// Helper functions
const formatDateValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const formatInvoiceType = (value) => {
  if (!value) return '';
  return value.replace(/_/g, ' ').toUpperCase();
};

const normalizeCurrency = (currency) => {
  const raw = currency || 'NLe';
  return raw === 'SLL' || raw === 'SLE' || raw === 'NLE' || raw === 'NLe' ? 'NLe' : raw;
};

const currencySymbols = {
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

const formatCurrency = (amount, currency) => {
  const normalized = normalizeCurrency(currency);
  const symbol = currencySymbols[normalized] || normalized;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const escapeHtml = (text) => {
  if (!text) return '';
  const str = String(text);
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m]));
};

/**
 * Generate House Of Electronics Invoice HTML
 * @param {Object} data - Invoice data matching desktop InvoiceData interface
 * @param {string} logoBase64 - Optional base64 logo image
 * @returns {string} Full HTML document
 */
function generateHouse Of ElectronicsInvoiceHTML(data, logoBase64) {
  const currency = normalizeCurrency(data.currency);
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * ((data.discount || 0) / 100);
  const taxableAmount = subtotal - discountAmount;

  // Tax calculation
  let calculatedTaxes = [];
  if (data.taxes !== undefined && data.taxes !== null) {
    if (data.taxes.length > 0) {
      calculatedTaxes = data.taxes
        .filter(tax => tax.rate > 0)
        .map(tax => ({
          ...tax,
          amount: Math.round((taxableAmount * tax.rate) / 100 * 100) / 100
        }));
    }
  } else if (data.taxRate && data.taxRate > 0) {
    calculatedTaxes = [{
      id: 'default-tax',
      name: currency === 'USD' ? 'GST' : 'Tax',
      rate: data.taxRate,
      amount: Math.round((taxableAmount * data.taxRate) / 100 * 100) / 100
    }];
  }

  const totalTaxAmount = Math.round(calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0) * 100) / 100;
  const total = taxableAmount + totalTaxAmount;

  // Colors
  const accent = '#2563eb';
  const borderColor = `${accent}22`;
  const headerBg = `${accent}10`;
  const lineColor = 'rgba(0, 0, 0, 0.05)';
  const mutedText = '#475569';
  const textColor = '#0f172a';

  const salesRepName = data.salesRep || '—';
  const salesRepCode = data.salesRepId || '—';
  const isDeliveryNote = data.invoiceType === 'delivery';
  const isQuote = data.invoiceType === 'quote' || data.invoiceType === 'proforma';

  // Pagination - 10 items per page
  const ITEMS_PER_PAGE = 10;
  const totalItems = data.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const start = i * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, totalItems);
    pages.push({
      pageNumber: i + 1,
      totalPages,
      items: data.items.slice(start, end),
      itemsRange: { start: start + 1, end: end }
    });
  }

  // Normalize company info
  const normalizeAddress = () => {
    const address = (data.company.address === '123 Business St' || data.company.address === '123 Business Street' || !data.company.address)
      ? '44A Banga Farm Junction, Waterloo'
      : data.company.address;
    const city = (data.company.city === 'San Francisco' || !data.company.city) ? '' : data.company.city;
    const state = (data.company.state === 'CA' || data.company.state === 'Western Area Urban, BO etc' || !data.company.state) ? '' : data.company.state;
    return [address, city, state, data.company.zip].filter(Boolean).join(', ');
  };

  const normalizePhone = () => {
    const phone = data.company.phone || '077 588 528 / 079 088 995';
    return (phone === '+1 (555) 123-4567' || phone === '+232 74 123-4567' || phone.startsWith('+1'))
      ? '077 588 528 / 079 088 995'
      : phone;
  };

  const normalizeEmail = () => {
    const email = data.company.email || '';
    return email === 'info@houseofelectronics.com' ? '' : email;
  };

  // Logo - use base64 if provided, otherwise use a placeholder
  const logoSrc = logoBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9IiMyNTYzZWIiIG9wYWNpdHk9IjAuMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMyNTYzZWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FS0hMQVM8L3RleHQ+PC9zdmc+';

  // Generate page HTML
  const generatePageHTML = (page, pageIndex) => {
    const isLastPage = pageIndex === pages.length - 1;
    const startItemNumber = page.itemsRange.start - 1;

    // Quote watermark
    const watermarkHTML = isQuote ? `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: ${accent}15; text-transform: uppercase; pointer-events: none; z-index: 0; letter-spacing: 0.1em;">
        ${data.invoiceType === 'quote' ? 'Quote' : 'Proforma'}
      </div>
    ` : '';

    // Logo watermark
    const logoWatermarkHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none;">
        <img src="${logoSrc}" alt="Watermark" style="width: 220px; height: 220px; object-fit: contain;" />
      </div>
    `;

    // Header
    const headerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid ${borderColor}; position: relative; z-index: 1;">
        <div style="width: 120px; flex-shrink: 0;">
          <img src="${logoSrc}" alt="House Of Electronics Solar Logo" style="width: 100%; height: auto; object-fit: contain;" />
        </div>
        <div style="flex: 1; min-width: 0; padding-left: 16px; position: relative;">
          ${data.invoiceType ? `
            <div style="position: absolute; top: 0; right: 0; background: ${headerBg}; color: ${accent}; border: 1px solid ${borderColor}; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
              ${escapeHtml(formatInvoiceType(data.invoiceType))}
            </div>
          ` : ''}
          <div style="font-weight: bold; line-height: 1.25; color: ${textColor}; font-size: 20px; letter-spacing: 0.6px;">
            House Of Electronics
          </div>
          <div style="font-size: 14px; font-weight: 500; color: ${accent}; margin-top: 4px;">Solar & Electrical Installations</div>
          <div style="font-size: 12px; color: ${mutedText}; line-height: 1.5; margin-top: 4px;">Professional solar and electrical solutions.</div>
          <div style="font-size: 11px; color: ${mutedText}; margin-top: 4px;">${escapeHtml(normalizeAddress())}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: ${mutedText}; line-height: 1.4; margin-top: 4px; align-items: center;">
            <span style="display: flex; align-items: center; gap: 4px;">📞 ${escapeHtml(normalizePhone())}</span>
            ${normalizeEmail() ? `<span>${escapeHtml(normalizeEmail())}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    // Recipient section
    const recipientHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 24px;">
        <div style="space-y: 4px;">
          <div style="font-weight: 600; color: ${accent}; margin-bottom: 4px;">Bill To</div>
          <div style="margin-bottom: 4px;">${escapeHtml(data.customer.name)}</div>
          <div style="font-size: 11px; color: ${mutedText}; margin-bottom: 2px;">
            ${escapeHtml([data.customer.address, data.customer.city, data.customer.state, data.customer.zip].filter(Boolean).join(', '))}
          </div>
          <div style="font-size: 11px; color: ${mutedText};">${escapeHtml(data.customer.email || data.customer.phone || '')}</div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 11px; color: ${mutedText}; line-height: 1.4; margin-bottom: 4px;">
            <strong style="color: ${accent};">Sales Rep</strong> ${escapeHtml(salesRepName)} ${salesRepCode ? `(${escapeHtml(salesRepCode)})` : ''}
          </div>
          <div style="font-size: 11px; color: ${mutedText}; line-height: 1.4;">
            <strong style="color: ${accent};">Invoice:</strong> ${escapeHtml(data.invoiceNumber)}
            ${data.invoiceType ? `<span style="margin-left: 4px; color: ${accent};">(${escapeHtml(formatInvoiceType(data.invoiceType))})</span>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: ${accent}; margin-bottom: 4px;">Date</div>
          <div style="font-size: 11px; color: ${mutedText}; margin-bottom: 2px;">Issued: ${escapeHtml(formatDateValue(data.date))}</div>
          <div style="font-size: 11px; color: ${mutedText};">Due: ${escapeHtml(formatDateValue(data.dueDate))}</div>
        </div>
      </div>
    `;

    // Items table
    const itemsRowsHTML = page.items.map((item, idx) => {
      const rowBg = idx % 2 === 0 ? '#fff' : '#f9fbff';
      const itemDescHTML = item.itemDescription
        ? `<div style="margin-top: 4px; font-size: 10px; color: ${mutedText}; font-style: italic; line-height: 1.3;">${escapeHtml(item.itemDescription)}</div>`
        : '';

      if (isDeliveryNote) {
        return `
          <tr style="background: ${rowBg};">
            <td style="padding: 8px; font-size: 11px; text-align: center; color: ${mutedText}; border: 1px solid ${lineColor}; border-left: none; border-top: none; vertical-align: top;">${startItemNumber + idx + 1}</td>
            <td style="padding: 8px; font-size: 11px; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; border-left: none; white-space: pre-wrap; vertical-align: top; word-break: break-word;">
              <div>${escapeHtml(item.description || '')}</div>
              ${itemDescHTML}
            </td>
            <td style="padding: 8px; font-size: 11px; text-align: center; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; vertical-align: top; width: 60px;">${item.quantity ? item.quantity.toLocaleString() : ''}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid ${lineColor}; border-top: none; border-right: none; vertical-align: top;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: #10b981; color: white; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Delivered</span>
            </td>
          </tr>
        `;
      }

      return `
        <tr style="background: ${rowBg};">
          <td style="padding: 8px; font-size: 11px; text-align: center; color: ${mutedText}; border: 1px solid ${lineColor}; border-left: none; border-top: none; vertical-align: top;">${startItemNumber + idx + 1}</td>
          <td style="padding: 8px; font-size: 11px; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; border-left: none; white-space: pre-wrap; vertical-align: top; word-break: break-word;">
            <div>${escapeHtml(item.description || '')}</div>
            ${itemDescHTML}
          </td>
          <td style="padding: 8px; font-size: 11px; text-align: center; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; vertical-align: top; width: 60px;">${item.quantity ? item.quantity.toLocaleString() : ''}</td>
          <td style="padding: 8px; font-size: 10px; text-align: right; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; vertical-align: top; width: 100px; white-space: nowrap;">${item.rate ? escapeHtml(formatCurrency(item.rate, currency)) : ''}</td>
          <td style="padding: 8px; font-size: 10px; text-align: right; color: ${textColor}; border: 1px solid ${lineColor}; border-top: none; border-right: none; vertical-align: top; width: 110px; white-space: nowrap;">${item.amount ? escapeHtml(formatCurrency(item.amount, currency)) : ''}</td>
        </tr>
      `;
    }).join('');

    const tableHeadersHTML = isDeliveryNote ? `
      <th style="padding: 8px; text-align: left; font-size: 11px; width: 40px; border: 1px solid ${lineColor}; border-top: none; border-left: none; background: #f8fafc; color: ${textColor};">#</th>
      <th style="padding: 8px; text-align: left; font-size: 11px; border: 1px solid ${lineColor}; border-top: none; border-left: none; background: #f8fafc; color: ${textColor};">Description</th>
      <th style="padding: 8px; text-align: center; font-size: 11px; width: 60px; border: 1px solid ${lineColor}; border-top: none; background: #f8fafc; color: ${textColor};">Qty</th>
      <th style="padding: 8px; text-align: center; font-size: 11px; width: 100px; border: 1px solid ${lineColor}; border-top: none; border-right: none; background: #f8fafc; color: ${textColor};">Status</th>
    ` : `
      <th style="padding: 8px; text-align: left; font-size: 11px; width: 40px; border: 1px solid ${lineColor}; border-top: none; border-left: none; background: #f8fafc; color: ${textColor};">#</th>
      <th style="padding: 8px; text-align: left; font-size: 11px; border: 1px solid ${lineColor}; border-top: none; border-left: none; background: #f8fafc; color: ${textColor};">Description</th>
      <th style="padding: 8px; text-align: center; font-size: 11px; width: 60px; border: 1px solid ${lineColor}; border-top: none; background: #f8fafc; color: ${textColor};">Qty</th>
      <th style="padding: 8px; text-align: right; font-size: 11px; width: 100px; border: 1px solid ${lineColor}; border-top: none; background: #f8fafc; color: ${textColor};">Unit</th>
      <th style="padding: 8px; text-align: right; font-size: 11px; width: 110px; border: 1px solid ${lineColor}; border-top: none; border-right: none; background: #f8fafc; color: ${textColor};">Amount</th>
    `;

    // Totals
    const totalsHTML = !isDeliveryNote ? `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px; margin-top: auto;">
        <div style="font-size: 12px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; color: ${mutedText}; margin-bottom: 4px;">
            <span>Subtotal</span>
            <span>${escapeHtml(formatCurrency(subtotal, currency))}</span>
          </div>
          ${discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: ${mutedText}; margin-bottom: 4px;">
            <span>Discount</span>
            <span>-${escapeHtml(formatCurrency(discountAmount, currency))}</span>
          </div>
          ` : ''}
          ${calculatedTaxes.map(tax => `
            <div style="display: flex; justify-content: space-between; color: ${mutedText}; margin-bottom: 4px;">
              <span>${escapeHtml(tax.name)} (${parseFloat(tax.rate.toFixed(2))}%)</span>
              <span>${escapeHtml(formatCurrency(tax.amount, currency))}</span>
            </div>
          `).join('')}
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; padding-top: 8px; color: ${accent}; border-top: 1px solid ${lineColor};">
            <span>Total</span>
            <span>${escapeHtml(formatCurrency(total, currency))}</span>
          </div>
        </div>
      </div>
    ` : '';

    // Delivery confirmation
    const deliveryConfirmHTML = isDeliveryNote && isLastPage ? `
      <div style="margin-bottom: 24px; padding: 16px; border-radius: 8px; border: 2px dashed ${accent}; background-color: ${headerBg};">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px; color: ${accent};">DELIVERY CONFIRMATION</div>
          <div style="font-size: 11px; color: ${mutedText};">Please sign and return one copy as confirmation of delivery</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
          <div>
            <div style="font-weight: 600; margin-bottom: 8px; color: ${accent};">Delivery Details:</div>
            <div style="color: ${mutedText};">
              <div>Total Items: ${data.items.length}</div>
              <div>Delivery Date: ${escapeHtml(formatDateValue(data.dueDate))}</div>
              <div>Document: ${escapeHtml(data.invoiceNumber)}</div>
            </div>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 8px; color: ${accent};">Signatures:</div>
            <div>
              <div style="margin-bottom: 12px;">
                <div style="font-size: 10px; margin-bottom: 4px; color: ${mutedText};">Delivered by (Driver):</div>
                <div style="border-bottom: 1px solid ${mutedText}; height: 24px;"></div>
              </div>
              <div>
                <div style="font-size: 10px; margin-bottom: 4px; color: ${mutedText};">Received by (Customer):</div>
                <div style="border-bottom: 1px solid ${mutedText}; height: 24px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ` : '';

    // Brand logos
    const brandLogos = data.brandLogos || [];
    const brandLogosHTML = brandLogos.length > 0 ? `
      <div style="padding-top: 24px; border-top: 1px solid ${lineColor}; margin-bottom: 16px;">
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; align-items: center;">
          ${brandLogos.map(logo => `<img src="${escapeHtml(logo)}" alt="Brand" style="height: 28px; object-fit: contain;" />`).join('')}
        </div>
      </div>
    ` : '';

    // Footer message
    const footerMessage = [data.notes || 'Thank you for your business!', data.terms].filter(Boolean).join(' • ');
    const footerHTML = `
      <div style="margin-top: auto; padding-top: 24px;">
        ${brandLogosHTML}
        <div style="font-size: 12px; text-align: center; color: ${mutedText}; padding-top: 12px; padding-bottom: 8px;">
          <span style="display: inline-block; max-width: 100%; word-break: break-word;">${escapeHtml(footerMessage)}</span>
        </div>
      </div>
    `;

    return `
      <div class="invoice-page" style="width: 190mm; min-height: 277mm; max-height: 277mm; background-color: #ffffff; color: ${textColor}; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; border: none; box-sizing: border-box; padding: 10mm; display: flex; flex-direction: column; position: relative; overflow: hidden; margin: 0; page-break-after: ${isLastPage ? 'auto' : 'always'}; page-break-inside: avoid;">
        ${watermarkHTML}
        ${logoWatermarkHTML}
        ${headerHTML}
        ${recipientHTML}
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse; border: none; border-spacing: 0; margin: 0;">
              <thead>
                <tr style="background: #f8fafc; color: ${textColor};">
                  ${tableHeadersHTML}
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHTML}
              </tbody>
            </table>
          </div>
          ${totalsHTML}
        </div>
        ${deliveryConfirmHTML}
        ${footerHTML}
      </div>
    `;
  };

  // Generate all pages
  const pagesHTML = pages.map((page, index) => generatePageHTML(page, index)).join('');

  // Full HTML document
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
          }
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            .invoice-page {
              page-break-after: always;
              page-break-inside: avoid;
            }
            .invoice-page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHTML}
      </body>
    </html>
  `;
}

module.exports = generateHouse Of ElectronicsInvoiceHTML;

