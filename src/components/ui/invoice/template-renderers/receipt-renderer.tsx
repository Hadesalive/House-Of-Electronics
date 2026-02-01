/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string;
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
  discount: number;
  currency?: string;
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
}

// Helper functions
const normalizeCurrency = (currency?: string): string => {
  if (!currency) return 'NLe';
  const normalized = currency.toUpperCase();
  return ['SLL', 'SLE', 'NLE'].includes(normalized) ? 'NLe' : currency;
};

const formatCurrency = (amount: number, currency: string): string => {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'SLE': 'NLe ',
    'SLL': 'NLe ',
    'NLE': 'NLe ',
    'NLe': 'NLe ',
    'EUR': '€',
    'GBP': '£',
  };
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateValue = (dateValue: string | Date): string => {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
  };
  
  if (num < 1000) return convertLessThanThousand(num);
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '');
  }
  if (num < 1000000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    return convertLessThanThousand(millions) + ' Million' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  }
  return num.toLocaleString();
};

const printStyles = `
  @media print {
    @page { 
      size: A4; 
      margin: 0; 
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
    }
    table, th, td {
      border-color: rgba(0, 0, 0, 0.1) !important;
    }
  }
`;

export function ReceiptRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const currency = normalizeCurrency(data.currency);
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (data.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * (data.taxRate / 100);
  const total = taxableAmount + tax;

  const accent = template.colors.primary || '#2563eb';
  const borderColor = `${accent}22`;
  const headerBg = `${accent}10`;
  const lineColor = 'rgba(0, 0, 0, 0.08)';
  const mutedText = template.colors.secondary || '#475569';

  const salesRepName = data.salesRep || 'Aminata Kamara';
  const salesRepCode = data.salesRepId || 'SR-001';

  // Get amount in words
  const totalInWords = numberToWords(Math.floor(total));
  const cents = Math.round((total % 1) * 100);
  const amountInWords = `${totalInWords} ${currency}${cents > 0 ? ` and ${cents} cents` : ''} Only`;

  return (
    <div className="print-invoice">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div
        style={{
          width: '210mm',
          height: '297mm',
          backgroundColor: '#ffffff',
          color: template.colors.text,
          fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`,
          border: 'none',
          boxSizing: 'border-box',
          padding: '10mm',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* House Of Electronics Logo Watermark */}
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

        {/* Header - Same as HOE Classic */}
        <div
          className="flex items-start justify-between gap-6 mb-5"
          style={{ paddingBottom: 6, borderBottom: `1px solid ${borderColor}` }}
        >
          <div style={{ width: 120, flexShrink: 0 }}>
            <img
              src="/images/hoe logo.png"
              alt="House Of Electronics Solar Installations Logo"
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

          <div className="space-y-1.5" style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
            <div className="flex items-center justify-between">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: accent, fontFamily: 'cursive' }}
              >
                Type A
              </div>
              <div
                className="text-[10px] font-semibold uppercase px-2 py-1 rounded"
                style={{
                  background: headerBg,
                  color: accent,
                  border: `1px solid ${borderColor}`,
                  letterSpacing: '0.08em'
                }}
              >
                RECEIPT
              </div>
            </div>
            <div className="text-2xl font-bold leading-tight" style={{ color: template.colors.text }}>
              House Of Electronics S/L LTD
            </div>
            <div className="text-sm font-medium" style={{ color: accent }}>
              Importer of Computers, Stationaries, Phones and General Accessories.
            </div>
            <div className="text-sm" style={{ color: mutedText, lineHeight: '1.5' }}>
              Providing Hardware Maintenance, Networking and General ICT Supports
            </div>
            <div className="text-xs" style={{ color: mutedText }}>
              {data.company.address || '13 A Sander Street Middle Floor'}{data.company.city ? `, ${data.company.city}` : ', Freetown'}{data.company.state ? `, ${data.company.state}` : ', Sierra Leone'} {data.company.zip || ''}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] items-center" style={{ color: mutedText, lineHeight: '1.4' }}>
              <span className="flex items-center gap-1">
                <img src="/images/whatsaap.png" alt="WhatsApp" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                {data.company.phone || '+232-77-593-479'}
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
              <span>{data.company.email || 'sales@tahoe-sl.com'}</span>
            </div>
          </div>
        </div>

        {/* Receipt Info Bar */}
        <div className="flex items-center justify-between p-3 mb-4 rounded" style={{ backgroundColor: headerBg, border: `1px solid ${borderColor}` }}>
          <div className="text-sm">
            <span style={{ color: mutedText }}>Receipt No: </span>
            <span className="font-bold" style={{ color: accent }}>{data.invoiceNumber}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: mutedText }}>Date: </span>
            <span className="font-bold">{formatDateValue(data.date)}</span>
          </div>
        </div>

        {/* Receipt Form */}
        <div className="border rounded-lg p-6 mb-6" style={{ borderColor: lineColor }}>
          {/* Received From */}
          <div className="flex items-center gap-3 mb-5">
            <span className="font-semibold whitespace-nowrap" style={{ width: '160px' }}>Received From:</span>
            <div className="flex-1 border-b pb-2" style={{ borderColor: mutedText }}>
              <span className="font-medium">{data.customer.name}</span>
            </div>
          </div>

          {/* The sum of */}
          <div className="flex items-start gap-3 mb-6">
            <span className="font-semibold whitespace-nowrap" style={{ width: '160px', paddingTop: '8px' }}>The sum of:</span>
            <div className="flex-1">
              <div className="border rounded-lg p-4 mb-3" style={{ backgroundColor: `${accent}08`, borderColor: accent }}>
                <div className="text-2xl font-bold mb-2" style={{ color: accent }}>
                  {formatCurrency(total, currency)}
                </div>
                <div className="text-sm italic leading-relaxed" style={{ color: mutedText }}>
                  ({amountInWords})
                </div>
              </div>
            </div>
          </div>

          {/* Being payment for */}
          <div className="flex items-start gap-3 mb-6">
            <span className="font-semibold whitespace-nowrap" style={{ width: '160px', paddingTop: '6px' }}>Being payment for:</span>
            <div className="flex-1">
              <div className="border-b pb-2.5 min-h-[32px]" style={{ borderColor: mutedText }}>
                <span>{data.notes || data.items.map(item => item.description).join(', ')}</span>
              </div>
              <div className="border-b pb-2.5 mt-3" style={{ borderColor: mutedText }}></div>
              <div className="border-b pb-2.5 mt-3" style={{ borderColor: mutedText }}></div>
            </div>
          </div>

          {/* Paid by Cash/Cheque */}
          <div className="flex items-center gap-3 mb-6">
            <span className="font-semibold whitespace-nowrap" style={{ width: '160px' }}>Paid by Cash/Cheque No:</span>
            <div className="flex-1 border-b pb-2.5" style={{ borderColor: mutedText }}></div>
          </div>

          {/* Payment Type */}
          <div className="flex items-center justify-between pt-6 pb-6 border-t border-b" style={{ borderColor: lineColor }}>
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2" style={{ borderColor: mutedText }}></div>
                <span className="font-semibold">Full Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2" style={{ borderColor: mutedText }}></div>
                <span className="font-semibold">Part Payment</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">Balance:</span>
              <div className="border-b-2 pb-2 w-40" style={{ borderColor: mutedText }}></div>
            </div>
          </div>

          {/* Total and Signature */}
          <div className="flex items-end justify-between pt-8">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">TOTAL:</span>
              <div className="text-4xl font-bold" style={{ color: accent }}>
                {formatCurrency(total, currency)}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-3" style={{ color: mutedText }}>Signature:</div>
              <div className="border-b-2 w-64" style={{ borderColor: mutedText, paddingBottom: '40px' }}></div>
            </div>
          </div>
        </div>

        {/* Footer - Brand Logos (Same as HOE Classic) */}
        {brandLogos.length > 0 && (
          <div className="pt-4 mt-4 border-t" style={{ borderColor: lineColor, marginTop: 'auto' }}>
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

        {/* Single-line footer message (Same as HOE Classic) */}
        <div className="mt-3 text-sm text-center" style={{ color: mutedText }}>
          {[data.notes || 'Thank you for your business!', data.terms].filter(Boolean).join(' • ')}
        </div>
      </div>
    </div>
  );
}

