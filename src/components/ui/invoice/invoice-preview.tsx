import React, { useState } from "react";
// import NextImage from "next/image"; // Removed - using regular img tag instead
import { cn } from "@/lib/utils";
import { Button } from "../core/button";
import { PrinterIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

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
  invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
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
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  notes: string;
  terms: string;
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

interface InvoicePreviewProps {
  data: InvoiceData;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

export function InvoicePreview({ 
  data, 
  onEdit, 
  onPrint, 
  onDownload, 
  onShare, 
  className = "" 
}: InvoicePreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Show 8 items per page for A4
  
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * data.discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * data.taxRate) / 100;
  const total = taxableAmount + taxAmount;

  // Pagination logic
  const totalPages = Math.ceil(data.items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.items.slice(startIndex, endIndex);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-6 print:hidden">
        {onEdit && (
          <Button variant="outline" onClick={onEdit}>
            Edit Invoice
          </Button>
        )}
        {onPrint && (
          <Button variant="outline" onClick={onPrint}>
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
        )}
      </div>

      {/* Invoice Document - A4 Size */}
      <div 
        className="bg-white shadow-lg print:shadow-none flex flex-col"
        style={{ 
          background: 'var(--card)',
          border: '1px solid var(--border)',
          width: '210mm',
          minHeight: '297mm',
          maxWidth: '100%',
          margin: '0 auto',
          padding: '20mm',
          boxSizing: 'border-box'
        }}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              {data.company.logo ? (
                <img
                  src={data.company.logo}
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="object-contain border"
                  style={{ borderColor: 'var(--border)' }}
                />
              ) : (
                <div 
                  className="w-16 h-16 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <span className="text-white font-bold text-xl">TN</span>
                </div>
              )}
              <div>
                <h1 
                  className="text-3xl font-bold mb-1"
                  style={{ color: 'var(--foreground)' }}
                >
                  {data.company.name}
                </h1>
                <p 
                  className="text-base"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Professional Electronics & Services
                </p>
              </div>
            </div>
            
            <div 
              className="text-sm space-y-1 leading-relaxed"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <p>{data.company.address}</p>
              <p>{data.company.city}, {data.company.state} {data.company.zip}</p>
              <p>{data.company.phone}</p>
              <p>{data.company.email}</p>
            </div>
          </div>

          <div className="text-right ml-8">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--accent)' }}
            >
              INVOICE
            </h2>
            <div 
              className="text-sm space-y-2"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <p><strong>Invoice #:</strong> {data.invoiceNumber}</p>
              <p><strong>Date:</strong> {formatDate(data.date)}</p>
              <p><strong>Due Date:</strong> {formatDate(data.dueDate)}</p>
            </div>
          </div>
        </div>

          {/* Bill To */}
          <div className="mb-12">
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--foreground)' }}
            >
              Bill To:
            </h3>
            <div 
              className="text-sm space-y-1 leading-relaxed"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <p className="font-medium text-base" style={{ color: 'var(--foreground)' }}>
                {data.customer.name}
              </p>
              <p>{data.customer.address}</p>
              <p>{data.customer.city}, {data.customer.state} {data.customer.zip}</p>
              {data.customer.phone && <p>{data.customer.phone}</p>}
              {data.customer.email && <p>{data.customer.email}</p>}
            </div>
          </div>
        </div>

        {/* Items Table - Flex Grow */}
        <div className="mb-12 flex-grow">
          {/* Items Header with Summary */}
          <div className="flex justify-between items-center mb-4">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--foreground)' }}
            >
              Items ({data.items.length})
            </h3>
            {data.items.length > itemsPerPage && (
              <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Showing {startIndex + 1}-{Math.min(endIndex, data.items.length)} of {data.items.length}
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr 
                className="border-b-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <th 
                  className="text-left py-3 px-4 font-semibold text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  Description
                </th>
                <th 
                  className="text-right py-3 px-4 font-semibold text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  Qty
                </th>
                <th 
                  className="text-right py-3 px-4 font-semibold text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  Rate
                </th>
                <th 
                  className="text-right py-3 px-4 font-semibold text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr 
                  key={item.id}
                  className="border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="py-3 px-4 text-sm" style={{ color: 'var(--foreground)' }}>
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-right text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {item.quantity}
                  </td>
                  <td className="py-3 px-4 text-right text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {data.items.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-2 mt-6 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Totals - Fixed */}
        <div className="flex justify-end mb-12 flex-shrink-0">
          <div className="w-80">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
                <span style={{ color: 'var(--foreground)' }}>{formatCurrency(subtotal)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>Discount ({data.discount}%):</span>
                  <span style={{ color: 'var(--foreground)' }}>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--muted-foreground)' }}>Tax ({data.taxRate}%):</span>
                <span style={{ color: 'var(--foreground)' }}>{formatCurrency(taxAmount)}</span>
              </div>
              <div 
                className="flex justify-between text-xl font-bold pt-3 border-t-2"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--accent)'
                }}
              >
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms - Fixed */}
        {(data.notes || data.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 flex-shrink-0">
            {data.notes && (
              <div>
                <h3 
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--foreground)' }}
                >
                  Notes:
                </h3>
                <p 
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {data.notes}
                </p>
              </div>
            )}
            {data.terms && (
              <div>
                <h3 
                  className="text-base font-semibold mb-4"
                  style={{ color: 'var(--foreground)' }}
                >
                  Terms & Conditions:
                </h3>
                <p 
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {data.terms}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer - Always at Bottom */}
        <div 
          className="mt-auto pt-8 border-t text-center text-sm flex-shrink-0"
          style={{ 
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)'
          }}
        >
          <p className="mb-2">Thank you for your business!</p>
          <p>
            For questions about this invoice, please contact us at {data.company.email}
          </p>
        </div>
      </div>
    </div>
  );
}
