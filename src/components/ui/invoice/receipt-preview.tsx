import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../core/button";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { useSettings } from '@/contexts/SettingsContext';

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  time: string;
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
    email: string;
    phone: string;
  };
  items: ReceiptItem[];
  paymentMethod: string;
  taxRate: number;
  discount: number;
}

interface ReceiptPreviewProps {
  data: ReceiptData;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ReceiptPreview({ 
  data, 
  onPrint, 
  onDownload, 
  onShare, 
  className = "" 
}: ReceiptPreviewProps) {
  const { formatCurrency, formatDate, preferences } = useSettings();
  
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * data.discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * data.taxRate) / 100;
  const total = taxableAmount + taxAmount;


  return (
    <div className={cn("max-w-md mx-auto", className)}>
      {/* Action Buttons - Hidden by default (controlled by parent) */}
      {(onPrint || onDownload || onShare) && (
        <div className="flex justify-center gap-3 mb-6 print:hidden">
          {onPrint && (
            <Button variant="outline" size="sm" onClick={onPrint}>
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      )}

      {/* Receipt Document */}
      <div 
        className="bg-white rounded-lg shadow-lg p-6 print:shadow-none print:rounded-none"
        style={{ 
          background: 'var(--card)',
          border: '1px solid var(--border)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 
            className="text-xl font-bold mb-3"
            style={{ color: 'var(--foreground)' }}
          >
            {data.company.name}
          </h1>
          
          <div 
            className="text-xs space-y-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <p>{data.company.address}</p>
            <p>{data.company.city}, {data.company.state} {data.company.zip}</p>
            <p>{data.company.phone}</p>
          </div>
        </div>

        {/* Receipt Info */}
        <div className="text-center mb-6">
          <h2 
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--accent)' }}
          >
            RECEIPT
          </h2>
          <div 
            className="text-sm space-y-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <p><strong>Receipt #:</strong> {data.receiptNumber}</p>
            <p><strong>Date:</strong> {formatDate(data.date)}</p>
            <p><strong>Time:</strong> {data.time}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-6">
          <h3 
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--foreground)' }}
          >
            Customer:
          </h3>
          <div 
            className="text-sm space-y-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <p>{data.customer.name}</p>
            {data.customer.email && <p>{data.customer.email}</p>}
            {data.customer.phone && <p>{data.customer.phone}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <div 
            className="border-b pb-2 mb-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex justify-between text-sm font-semibold">
              <span style={{ color: 'var(--foreground)' }}>Item</span>
              <span style={{ color: 'var(--foreground)' }}>Total</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between gap-2 mb-1">
                  <p className="flex-1 break-words leading-tight" style={{ color: 'var(--foreground)' }}>
                    {item.description}
                  </p>
                  <p className="font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {item.quantity} × {formatCurrency(item.rate)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>Subtotal:</span>
              <span style={{ color: 'var(--foreground)' }}>{formatCurrency(subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Discount:</span>
                <span style={{ color: 'var(--foreground)' }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>Tax:</span>
              <span style={{ color: 'var(--foreground)' }}>{formatCurrency(taxAmount)}</span>
            </div>
            <div 
              className="flex justify-between text-lg font-bold pt-2 border-t"
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

        {/* Payment Method */}
        <div className="mb-6">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--muted-foreground)' }}>Payment Method:</span>
            <span style={{ color: 'var(--foreground)' }}>{data.paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="text-center text-xs space-y-2"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <p>{preferences.receiptFooter || 'Thank you for your business!'}</p>
          <p>Keep this receipt for your records</p>
          <p>Questions? Contact us at {data.company.email}</p>
        </div>
      </div>
    </div>
  );
}
