/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface BOQItem {
  id: string;
  description: string;
  units: string; // e.g., "pcs", "set"
  quantity: number;
  unitPriceLE: number; // Unit price in local currency (LE)
  amountLE: number; // Total amount in LE
  amountUSD: number; // Total amount in USD
}

interface BOQData {
  boqNumber: string;
  date: string;
  projectTitle: string;
  company: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    logo?: string;
  };
  client: {
    name: string;
    address: string;
  };
  items: BOQItem[];
  notes?: string[];
  managerSignature?: string;
}

interface BOQRendererProps {
  data: BOQData;
}

const printStyles = `
  @media print {
    @page { 
      size: A4; 
      margin: 10mm; 
    }
    .print-boq * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-boq { 
      margin: 0 !important; 
      box-shadow: none !important;
      border: none !important;
    }
    .print-boq > div {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .boq-page {
      page-break-after: always;
      page-break-before: auto;
      border: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .boq-page:last-child {
      page-break-after: auto;
    }
    .pagination-controls {
      display: none !important;
    }
    /* Prevent footer from breaking across pages */
    .print-boq .boq-notes-section,
    .print-boq .boq-signature-section,
    .print-boq .boq-totals-row {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
    }
  }
  
  @media screen {
    .print-boq {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  }
`;

export function BOQRenderer({ data }: BOQRendererProps) {
  const totalLE = data.items.reduce((sum, item) => sum + item.amountLE, 0);
  const totalUSD = data.items.reduce((sum, item) => sum + item.amountUSD, 0);

  // Format BOQ number to start with "BOQ" if it doesn't already
  const formatBOQNumber = (boqNumber: string) => {
    if (!boqNumber) return 'BOQ-0001';
    const upperNumber = boqNumber.toUpperCase();
    if (upperNumber.startsWith('BOQ')) {
      return boqNumber;
    }
    return `BOQ-${boqNumber}`;
  };

  const formattedBOQNumber = formatBOQNumber(data.boqNumber);

  const formatCurrency = (amount: number, currency: 'LE' | 'USD') => {
    if (currency === 'USD') {
      return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Pagination logic (similar to hoe-classic-renderer)
  // A4 page: 277mm available height (297mm - 20mm padding)
  // Header: ~85mm, Client: ~25mm, Table header: ~8mm, Notes/Signature: ~60mm, Totals: ~15mm
  // Used: ~193mm, Available: 277mm - 193mm = ~84mm → ~8-10 items per page
  const ITEMS_PER_PAGE = 8; // Conservative to ensure at least 8 items visible
  const MIN_VISIBLE_ROWS = 8; // Always show at least 8 rows total (filled + empty)
  
  const totalItems = data.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  
  const adjustedPages: Array<{
    pageNumber: number;
    totalPages: number;
    items: BOQItem[];
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

  // Render header section (reused on every page)
  const renderHeader = () => (
    <div style={{ marginBottom: '20px' }}>
      {/* Logo + Company block */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '6px',
        marginBottom: '10px'
      }}>
        <img 
          src="/images/hoe logo.png"
          alt="House Of Electronics Logo"
          style={{ 
            height: '68px', 
            objectFit: 'contain',
            marginBottom: '4px'
          }}
        />
        <div style={{ 
          textAlign: 'center', 
          fontSize: '15px', 
          fontWeight: 'bold', 
          color: '#1e3a8a',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          lineHeight: '1.3'
        }}>
          House Of Electronics S/L LTD
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a' }}>
          <div>Address: {data.company.address || '44A Banga Farm Junction, Waterloo'}</div>
          <div>Mobile: {data.company.phone || '077 588 528 / 079 088 995'}</div>
          {data.company.email && (
            <div>Email: {data.company.email}</div>
          )}
        </div>
      </div>
      
      {/* Horizontal Separator */}
      <div style={{ 
        height: '4px', 
        backgroundColor: '#1e40af', 
        marginBottom: '15px',
        borderRadius: '2px'
      }}></div>
      
      {/* Document Title Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'stretch', 
        marginBottom: '20px',
        gap: '16px'
      }}>
        <div>
          {/* Bill of Quantities Title */}
          <div style={{ 
            backgroundColor: '#22c55e', 
            color: '#fff', 
            padding: '10px 25px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            display: 'inline-block',
            marginBottom: '8px',
            borderRadius: '4px 0 0 4px'
          }}>
            Bill of Quantities
          </div>
          {/* Project Title */}
          <div style={{ 
            fontSize: '18px', 
            color: '#1e3a8a', 
            marginTop: '8px', 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: '1.3'
          }}>
            {data.projectTitle}
          </div>
        </div>
        
        {/* Document Details */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '6px',
          minWidth: '220px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            width: '100%',
            justifyContent: 'flex-end'
          }}>
            <span style={{ 
              backgroundColor: '#e5e7eb', 
              padding: '5px 10px', 
              fontSize: '11px', 
              border: '1px solid #3b82f6',
              borderRadius: '2px',
              lineHeight: '1',
              display: 'inline-block',
              width: '52px',
              textAlign: 'center'
            }}>NO.:</span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: '#000', 
              whiteSpace: 'nowrap',
              minWidth: '120px',
              textAlign: 'left'
            }}>
              {formattedBOQNumber}
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            width: '100%',
            justifyContent: 'flex-end'
          }}>
            <span style={{ 
              backgroundColor: '#e5e7eb', 
              padding: '5px 10px', 
              fontSize: '11px', 
              border: '1px solid #3b82f6',
              borderRadius: '2px',
              lineHeight: '1',
              display: 'inline-block',
              width: '52px',
              textAlign: 'center'
            }}>DATE:</span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              color: '#000', 
              whiteSpace: 'nowrap',
              minWidth: '120px',
              textAlign: 'left'
            }}>
              {new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render client info (reused on every page)
  const renderClientInfo = () => (
    <div style={{ marginBottom: '20px', fontSize: '12px' }}>
      <div style={{ marginBottom: '5px' }}>
        <strong>Name:</strong> <span style={{ textDecoration: 'underline' }}>{data.client.name}</span>
      </div>
      <div>
        <strong>Address:</strong> <span style={{ textDecoration: 'underline' }}>{data.client.address}</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-boq">
        {/* Multi-page info banner */}
        {adjustedPages.length > 1 && (
          <div className="pagination-controls mb-4 p-3 rounded-lg border text-center" style={{ 
            backgroundColor: '#1e40af10', 
            borderColor: '#1e40af',
            marginBottom: '16px'
          }}>
            <div className="text-sm font-medium" style={{ color: '#1e40af' }}>
              📄 This BOQ has {adjustedPages.length} pages ({data.items.length} items)
            </div>
          </div>
        )}
        
        {adjustedPages.map((page, pageIndex) => {
          const isLastPage = pageIndex === adjustedPages.length - 1;
          const pageItems = page.items;
          const visibleRows = Math.max(MIN_VISIBLE_ROWS, pageItems.length);
          const emptyRows = Math.max(0, visibleRows - pageItems.length);
          
          return (
            <div
              key={pageIndex}
              className={isLastPage ? '' : 'boq-page'}
              style={{
                width: '190mm', // A4 width (210mm) - margins (10mm left + 10mm right)
                minHeight: '277mm', // A4 height (297mm) - margins (10mm top + 10mm bottom)
                maxHeight: '277mm',
                backgroundColor: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                border: 'none',
                boxSizing: 'border-box',
                padding: '10mm',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                margin: 0,
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                pageBreakInside: 'avoid'
              }}
            >
              {/* Header - on every page */}
              {renderHeader()}
              
              {/* Client Info - on every page */}
              {renderClientInfo()}
              
              {/* Items Table */}
              <div style={{ marginBottom: '20px', flexGrow: 1 }}>
                <div style={{ border: '1px solid #000', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    fontSize: '11px'
                  }}>
                  {/* Table Header */}
                  <thead>
                    <tr style={{ backgroundColor: '#4b5563', color: '#fff' }}>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>Description</th>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>Units</th>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>QTY</th>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>Unit Price (LE)</th>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>Amount (LE)</th>
                      <th style={{ 
                        border: '1px solid #000', 
                        padding: '8px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        backgroundColor: '#86efac'
                      }}>Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Data Rows */}
                    {pageItems.map((item, index) => (
                      <tr key={item.id || index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px' }}>{item.description}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.units}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>
                          {formatCurrency(item.unitPriceLE, 'LE')}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>
                          {formatCurrency(item.amountLE, 'LE')}
                        </td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '8px', 
                          textAlign: 'right',
                          fontSize: '11px',
                          backgroundColor: '#86efac'
                        }}>
                          {formatCurrency(item.amountUSD, 'USD')}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Empty rows for additional items */}
                    {Array.from({ length: emptyRows }).map((_, index) => (
                      <tr key={`empty-${index}`} style={{ backgroundColor: '#fff' }}>
                        <td style={{ border: '1px solid #000', padding: '8px', borderStyle: 'dashed' }}>
                          <div style={{ borderBottom: '1px dashed #9ca3af', minHeight: '20px' }}></div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#9ca3af' }}>---</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#9ca3af' }}>---</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', color: '#9ca3af' }}>---</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', color: '#9ca3af' }}>---</td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '8px', 
                          textAlign: 'right',
                          color: '#9ca3af',
                          backgroundColor: '#86efac'
                        }}>---</td>
                      </tr>
                    ))}
                    
                    {/* Total Row - only on last page */}
                    {isLastPage && (
                      <tr className="boq-totals-row" style={{ backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                        <td 
                          colSpan={4} 
                          style={{ 
                            border: '1px solid #000', 
                            padding: '8px',
                            textAlign: 'right',
                            fontSize: '11px'
                          }}
                        >
                          TOTAL LE
                        </td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '8px', 
                          textAlign: 'right',
                          fontSize: '11px'
                        }}>
                          {formatCurrency(totalLE, 'LE')}
                        </td>
                        <td style={{ 
                          border: '1px solid #000', 
                          padding: '8px', 
                          textAlign: 'right',
                          fontSize: '11px',
                          backgroundColor: '#86efac'
                        }}>
                          {formatCurrency(totalUSD, 'USD')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
              
              {/* Notes Section - only on last page */}
              {isLastPage && data.notes && Array.isArray(data.notes) && data.notes.length > 0 && (
                <div className="boq-notes-section" style={{ marginBottom: '20px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>PLEASE NOTE:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {data.notes.map((note, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span style={{ fontWeight: 'bold' }}>{index + 1}.</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Signature Area - only on last page */}
              {isLastPage && (
                <div className="boq-signature-section" style={{ marginBottom: '20px', fontSize: '11px' }}>
                  <div>
                    <strong>Manager's Signature:</strong>{' '}
                    <span style={{ 
                      borderBottom: '1px solid #000', 
                      display: 'inline-block', 
                      minWidth: '200px',
                      marginLeft: '10px'
                    }}>
                      {data.managerSignature || ''}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Bottom Separator - only on last page */}
              {isLastPage && (
                <div style={{ 
                  height: '4px', 
                  backgroundColor: '#1e40af', 
                  marginTop: 'auto',
                  borderRadius: '2px'
                }}></div>
              )}
              
              {/* Page number for multi-page BOQs */}
              {totalPages > 1 && (
                <div style={{ 
                  textAlign: 'center', 
                  fontSize: '10px', 
                  color: '#6b7280',
                  marginTop: '10px'
                }}>
                  Page {page.pageNumber} of {page.totalPages}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
