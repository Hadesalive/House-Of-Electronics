/* eslint-disable @typescript-eslint/no-require-imports */
const React = require('react');
const ReactDOMServer = require('react-dom/server');

/**
 * Renders an invoice template to HTML string
 * This function creates React elements and renders them to static HTML
 * which can then be converted to PDF by Puppeteer
 */
function renderInvoiceTemplate(invoiceData /* , templateId = 'pro-corporate' */) {
  // Note: Currently using a simplified Pro Corporate template
  // Future enhancement: Add templateId parameter to support multiple templates
  // Calculate totals
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * ((invoiceData.discount || 0) / 100);
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * ((invoiceData.taxRate || 0) / 100);
  const total = taxableAmount + tax;
  
  // Improved pagination logic (matching shared utility)
  // Accounts for first page (header) and last page (totals/footer) having less capacity
  const itemsPerPage = 18;
  const firstPageCapacity = 0.85; // First page has header, needs less space
  const lastPageCapacity = 0.75;  // Last page has totals/footer, needs less space
  
  const firstPageItems = Math.floor(itemsPerPage * firstPageCapacity);
  const middlePageItems = itemsPerPage;
  const lastPageItems = Math.floor(itemsPerPage * lastPageCapacity);
  
  const items = invoiceData.items || [];
  const pages = [];
  let itemIndex = 0;
  
  if (items.length === 0) {
    pages.push({ items: [], pageNumber: 1, totalPages: 1, isFirstPage: true, isLastPage: true });
  } else if (items.length <= firstPageItems) {
    // All items fit on first page
    pages.push({ 
      items: [...items], 
      pageNumber: 1, 
      totalPages: 1, 
      isFirstPage: true, 
      isLastPage: true 
    });
  } else {
    // First page
    const firstPageCount = Math.min(firstPageItems, items.length);
    pages.push({
      items: items.slice(0, firstPageCount),
      pageNumber: 1,
      totalPages: 0, // Will be calculated
      isFirstPage: true,
      isLastPage: false
    });
    itemIndex = firstPageCount;
    
    // Middle pages
    let remainingItems = items.length - itemIndex;
    while (remainingItems > lastPageItems) {
      const middlePageCount = Math.min(middlePageItems, remainingItems - lastPageItems);
      if (middlePageCount > 0 && remainingItems - middlePageCount >= lastPageItems) {
        pages.push({
          items: items.slice(itemIndex, itemIndex + middlePageCount),
          pageNumber: pages.length + 1,
          totalPages: 0,
          isFirstPage: false,
          isLastPage: false
        });
        itemIndex += middlePageCount;
        remainingItems -= middlePageCount;
      } else {
        break;
      }
    }
    
    // Last page
    if (remainingItems > 0) {
      pages.push({
        items: items.slice(itemIndex),
        pageNumber: pages.length + 1,
        totalPages: 0,
        isFirstPage: false,
        isLastPage: true
      });
    }
    
    // Update total pages
    const totalPages = pages.length;
    pages.forEach(page => { page.totalPages = totalPages; });
  }
  
  // Determine if we need a separate totals page
  const needsSeparateTotalsPage = pages.length > 0 && 
    pages[pages.length - 1].items.length > 8 && 
    invoiceData.items.length > 12;
  
  // Create React elements for each page
  const pageElements = pages.map((page, pageIndex) => {
    const pageItems = page.items;
    const isLastPage = page.isLastPage;
    const showTotalsOnThisPage = isLastPage && !needsSeparateTotalsPage;
    
    return React.createElement('div', {
      key: `page-${pageIndex}`,
      className: 'invoice-page',
      style: {
        width: '210mm',
        minHeight: '297mm',
        padding: '12mm',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
        pageBreakAfter: isLastPage && !needsSeparateTotalsPage ? 'auto' : 'always',
        display: 'flex',
        flexDirection: 'column'
      }
    }, [
      // Header (only on first page)
      pageIndex === 0 && React.createElement('div', { key: 'header', className: 'mb-6' }, [
        React.createElement('div', { key: 'header-content', className: 'flex justify-between items-start mb-4' }, [
          React.createElement('div', { key: 'company' }, [
            React.createElement('h1', { 
              key: 'name', 
              className: 'text-2xl font-bold mb-1',
              style: { color: '#1e40af' }
            }, invoiceData.company.name),
            React.createElement('p', { key: 'address', className: 'text-sm' }, invoiceData.company.address),
            React.createElement('p', { key: 'city', className: 'text-sm' }, `${invoiceData.company.city}, ${invoiceData.company.state} ${invoiceData.company.zip}`),
            React.createElement('p', { key: 'phone', className: 'text-sm' }, invoiceData.company.phone),
            React.createElement('p', { key: 'email', className: 'text-sm' }, invoiceData.company.email),
          ]),
          React.createElement('div', { key: 'invoice-info', className: 'text-right' }, [
            React.createElement('h2', { 
              key: 'title', 
              className: 'text-3xl font-bold mb-2',
              style: { color: '#1e40af' }
            }, 'INVOICE'),
            React.createElement('p', { key: 'number', className: 'text-sm' }, `Invoice #: ${invoiceData.invoiceNumber}`),
            React.createElement('p', { key: 'date', className: 'text-sm' }, `Date: ${invoiceData.date}`),
            React.createElement('p', { key: 'due', className: 'text-sm' }, `Due Date: ${invoiceData.dueDate}`),
          ])
        ]),
        
        // Bill To and Payment Status
        React.createElement('div', { key: 'bill-to-section', className: 'flex justify-between gap-8 mb-4' }, [
          React.createElement('div', { key: 'bill-to', style: { flex: 1 } }, [
            React.createElement('h3', { 
              key: 'title', 
              className: 'font-semibold mb-2',
              style: { color: '#1e40af' }
            }, 'Bill To:'),
            React.createElement('p', { key: 'name', className: 'font-semibold' }, invoiceData.customer.name),
            React.createElement('p', { key: 'address', className: 'text-sm' }, invoiceData.customer.address),
            invoiceData.customer.city && React.createElement('p', { key: 'city', className: 'text-sm' }, `${invoiceData.customer.city}, ${invoiceData.customer.state} ${invoiceData.customer.zip}`),
            invoiceData.customer.phone && React.createElement('p', { key: 'phone', className: 'text-sm' }, invoiceData.customer.phone),
            invoiceData.customer.email && React.createElement('p', { key: 'email', className: 'text-sm' }, invoiceData.customer.email),
          ]),
          
          // Payment Status
          invoiceData.paidAmount !== undefined && invoiceData.paidAmount > 0 && React.createElement('div', { 
            key: 'payment-status', 
            className: 'text-right',
            style: { flex: 1 }
          }, [
            React.createElement('div', { 
              key: 'paid', 
              className: 'mb-2 p-2 rounded',
              style: { backgroundColor: '#d1fae5' }
            }, [
              React.createElement('p', { key: 'label', className: 'text-sm font-semibold' }, 'Paid'),
              React.createElement('p', { key: 'amount', className: 'text-lg font-bold', style: { color: '#10b981' } }, `$${invoiceData.paidAmount.toFixed(2)}`)
            ]),
            React.createElement('div', { 
              key: 'balance', 
              className: 'p-2 rounded',
              style: { backgroundColor: invoiceData.balance > 0 ? '#fef3c7' : '#d1fae5' }
            }, [
              React.createElement('p', { key: 'label', className: 'text-sm font-semibold' }, 'Balance Due'),
              React.createElement('p', { 
                key: 'amount', 
                className: 'text-lg font-bold',
                style: { color: invoiceData.balance > 0 ? '#f59e0b' : '#10b981' }
              }, `$${(invoiceData.balance || 0).toFixed(2)}`)
            ])
          ])
        ])
      ]),
      
      // Items Table
      React.createElement('div', { 
        key: 'items', 
        className: 'mb-4',
        style: { flexGrow: 1 }
      }, [
        React.createElement('table', { 
          key: 'table', 
          className: 'w-full',
          style: { 
            borderCollapse: 'collapse',
            border: '2px solid #1e40af'
          }
        }, [
          React.createElement('thead', { key: 'thead' }, 
            React.createElement('tr', { 
              style: { 
                backgroundColor: '#1e40af', 
                color: 'white' 
              } 
            }, [
              React.createElement('th', { key: 'desc', className: 'text-left py-3 px-4 font-semibold' }, 'Description'),
              React.createElement('th', { key: 'qty', className: 'text-right py-3 px-4 font-semibold', style: { width: '80px' } }, 'Qty'),
              React.createElement('th', { key: 'rate', className: 'text-right py-3 px-4 font-semibold', style: { width: '100px' } }, 'Rate'),
              React.createElement('th', { key: 'amount', className: 'text-right py-3 px-4 font-semibold', style: { width: '120px' } }, 'Amount'),
            ])
          ),
          React.createElement('tbody', { key: 'tbody' },
            pageItems.map((item, idx) =>
              React.createElement('tr', { 
                key: item.id || idx,
                style: {
                  backgroundColor: idx % 2 === 0 ? 'white' : '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb'
                }
              }, [
                React.createElement('td', { 
                  key: 'desc', 
                  className: 'py-3 px-4',
                  style: { wordWrap: 'break-word' }
                }, item.description),
                React.createElement('td', { key: 'qty', className: 'text-right py-3 px-4' }, item.quantity),
                React.createElement('td', { key: 'rate', className: 'text-right py-3 px-4' }, `$${item.rate.toFixed(2)}`),
                React.createElement('td', { key: 'amount', className: 'text-right py-3 px-4 font-semibold' }, `$${item.amount.toFixed(2)}`),
              ])
            )
          )
        ])
      ]),
      
      // Totals (on last page or separate totals page)
      showTotalsOnThisPage && React.createElement('div', { 
        key: 'totals', 
        className: 'flex justify-end mb-4',
        style: { marginTop: 'auto' }
      }, [
        React.createElement('div', { key: 'totals-box', style: { width: '300px' } }, [
          React.createElement('div', { key: 'subtotal', className: 'flex justify-between mb-2 pb-2', style: { borderBottom: '1px solid #e5e7eb' } }, [
            React.createElement('span', { key: 'label' }, 'Subtotal:'),
            React.createElement('span', { key: 'value', className: 'font-semibold' }, `$${subtotal.toFixed(2)}`)
          ]),
          invoiceData.discount > 0 && React.createElement('div', { key: 'discount', className: 'flex justify-between mb-2' }, [
            React.createElement('span', { key: 'label' }, `Discount (${invoiceData.discount}%):`),
            React.createElement('span', { key: 'value', className: 'font-semibold', style: { color: '#10b981' } }, `-$${discountAmount.toFixed(2)}`)
          ]),
          invoiceData.taxRate > 0 && React.createElement('div', { key: 'tax', className: 'flex justify-between mb-2' }, [
            React.createElement('span', { key: 'label' }, `Tax (${invoiceData.taxRate}%):`),
            React.createElement('span', { key: 'value', className: 'font-semibold' }, `$${tax.toFixed(2)}`)
          ]),
          React.createElement('div', { 
            key: 'total', 
            className: 'flex justify-between pt-2 mt-2',
            style: { 
              borderTop: '2px solid #1e40af',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#1e40af'
            }
          }, [
            React.createElement('span', { key: 'label' }, 'Total:'),
            React.createElement('span', { key: 'value' }, `$${total.toFixed(2)}`)
          ])
        ])
      ]),
      
      // Bank Details (on last page)
      isLastPage && invoiceData.bankDetails && React.createElement('div', { 
        key: 'bank-details',
        className: 'mb-4 p-4',
        style: { 
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '4px'
        }
      }, [
        React.createElement('h3', { 
          key: 'title', 
          className: 'font-semibold mb-2',
          style: { color: '#1e40af' }
        }, 'Bank Details'),
        React.createElement('div', { key: 'details', className: 'grid grid-cols-2 gap-2 text-sm' }, [
          React.createElement('p', { key: 'bank' }, `Bank: ${invoiceData.bankDetails.bankName}`),
          React.createElement('p', { key: 'account-name' }, `Account Name: ${invoiceData.bankDetails.accountName || 'N/A'}`),
          React.createElement('p', { key: 'account-num' }, `Account #: ${invoiceData.bankDetails.accountNumber}`),
          invoiceData.bankDetails.routingNumber && React.createElement('p', { key: 'routing' }, `Routing #: ${invoiceData.bankDetails.routingNumber}`),
          invoiceData.bankDetails.swiftCode && React.createElement('p', { key: 'swift' }, `SWIFT: ${invoiceData.bankDetails.swiftCode}`),
        ])
      ]),
      
      // Footer (always at bottom)
      React.createElement('div', { 
        key: 'footer',
        className: 'text-center pt-4',
        style: { 
          borderTop: '2px solid #1e40af',
          marginTop: 'auto'
        }
      }, [
        invoiceData.notes && React.createElement('p', { key: 'notes', className: 'text-sm mb-2' }, invoiceData.notes),
        invoiceData.terms && React.createElement('p', { key: 'terms', className: 'text-xs', style: { color: '#6b7280' } }, invoiceData.terms),
        React.createElement('p', { key: 'thank-you', className: 'text-sm font-semibold mt-2', style: { color: '#1e40af' } }, 'Thank you for your business!')
      ]),
      
      // Page Number
      React.createElement('div', { 
        key: 'page-num',
        className: 'text-right text-xs mt-2',
        style: { color: '#9ca3af' }
      }, `Page ${pageIndex + 1} of ${needsSeparateTotalsPage ? pages.length + 1 : pages.length}`)
    ]);
  });
  
  // Add separate totals page if needed
  if (needsSeparateTotalsPage) {
    pageElements.push(
      React.createElement('div', {
        key: 'totals-page',
        className: 'invoice-page',
        style: {
          width: '210mm',
          minHeight: '297mm',
          padding: '12mm',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }
      }, [
        React.createElement('div', { 
          key: 'totals', 
          className: 'flex justify-end mb-4',
          style: { marginTop: '40px' }
        }, [
          React.createElement('div', { key: 'totals-box', style: { width: '300px' } }, [
            React.createElement('div', { key: 'subtotal', className: 'flex justify-between mb-2 pb-2', style: { borderBottom: '1px solid #e5e7eb' } }, [
              React.createElement('span', { key: 'label' }, 'Subtotal:'),
              React.createElement('span', { key: 'value', className: 'font-semibold' }, `$${subtotal.toFixed(2)}`)
            ]),
            invoiceData.discount > 0 && React.createElement('div', { key: 'discount', className: 'flex justify-between mb-2' }, [
              React.createElement('span', { key: 'label' }, `Discount (${invoiceData.discount}%):`),
              React.createElement('span', { key: 'value', className: 'font-semibold', style: { color: '#10b981' } }, `-$${discountAmount.toFixed(2)}`)
            ]),
            invoiceData.taxRate > 0 && React.createElement('div', { key: 'tax', className: 'flex justify-between mb-2' }, [
              React.createElement('span', { key: 'label' }, `Tax (${invoiceData.taxRate}%):`),
              React.createElement('span', { key: 'value', className: 'font-semibold' }, `$${tax.toFixed(2)}`)
            ]),
            React.createElement('div', { 
              key: 'total', 
              className: 'flex justify-between pt-2 mt-2',
              style: { 
                borderTop: '2px solid #1e40af',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#1e40af'
              }
            }, [
              React.createElement('span', { key: 'label' }, 'Total:'),
              React.createElement('span', { key: 'value' }, `$${total.toFixed(2)}`)
            ])
          ])
        ]),
        
        // Bank Details
        invoiceData.bankDetails && React.createElement('div', { 
          key: 'bank-details',
          className: 'mb-4 p-4',
          style: { 
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '4px'
          }
        }, [
          React.createElement('h3', { 
            key: 'title', 
            className: 'font-semibold mb-2',
            style: { color: '#1e40af' }
          }, 'Bank Details'),
          React.createElement('div', { key: 'details', className: 'grid grid-cols-2 gap-2 text-sm' }, [
            React.createElement('p', { key: 'bank' }, `Bank: ${invoiceData.bankDetails.bankName}`),
            React.createElement('p', { key: 'account-name' }, `Account Name: ${invoiceData.bankDetails.accountName || 'N/A'}`),
            React.createElement('p', { key: 'account-num' }, `Account #: ${invoiceData.bankDetails.accountNumber}`),
            invoiceData.bankDetails.routingNumber && React.createElement('p', { key: 'routing' }, `Routing #: ${invoiceData.bankDetails.routingNumber}`),
            invoiceData.bankDetails.swiftCode && React.createElement('p', { key: 'swift' }, `SWIFT: ${invoiceData.bankDetails.swiftCode}`),
          ])
        ]),
        
        // Footer
        React.createElement('div', { 
          key: 'footer',
          className: 'text-center pt-4',
          style: { 
            borderTop: '2px solid #1e40af',
            marginTop: 'auto'
          }
        }, [
          invoiceData.notes && React.createElement('p', { key: 'notes', className: 'text-sm mb-2' }, invoiceData.notes),
          invoiceData.terms && React.createElement('p', { key: 'terms', className: 'text-xs', style: { color: '#6b7280' } }, invoiceData.terms),
          React.createElement('p', { key: 'thank-you', className: 'text-sm font-semibold mt-2', style: { color: '#1e40af' } }, 'Thank you for your business!')
        ]),
        
        // Page Number
        React.createElement('div', { 
          key: 'page-num',
          className: 'text-right text-xs mt-2',
          style: { color: '#9ca3af' }
        }, `Page ${pages.length + 1} of ${pages.length + 1}`)
      ])
    );
  }
  
  // Wrap all pages in a container
  const invoiceComponent = React.createElement('div', { id: 'invoice-container' }, pageElements);
  
  // Render to HTML string
  const htmlContent = ReactDOMServer.renderToStaticMarkup(invoiceComponent);
  
  // Wrap in full HTML document with Tailwind
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
          }
          .page-break { 
            page-break-after: always; 
            break-after: page;
          }
          @media print {
            body { margin: 0; }
            @page {
              size: A4;
              margin: 0;
            }
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;
}

module.exports = {
  renderInvoiceTemplate
};

