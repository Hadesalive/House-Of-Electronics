/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
import { ClassicHeaderRenderer } from './classic-header-renderer';
import { WaveDesignRenderer } from './wave-design-renderer';
import { GradientModernRenderer } from './gradient-modern-renderer';
import { ProCorporateRenderer } from './pro-corporate-renderer';
import { ModernStripeRenderer } from './modern-stripe-renderer';
import { MinimalOutlineRenderer } from './minimal-outline-renderer';
import { ElegantDarkRenderer } from './elegant-dark-renderer';
import { ClassicColumnRenderer } from './classic-column-renderer';
import { CustomSchemaRenderer } from './custom-schema-renderer';
import { HoeClassicRenderer } from './hoe-classic-renderer';
import { HoeClassicHouseOfElectronicsRenderer } from './hoe-classic-ekhlas-renderer';
import { ReceiptRenderer } from './receipt-renderer';

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
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  discount: number;
  taxes: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
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
  className?: string;
}


// For templates that don't have specific renderers yet, use a fallback
function FallbackRenderer({ data, template }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (data.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * (data.taxRate / 100);
  const total = taxableAmount + tax;

  return (
    <div 
      className="p-8 relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: template.colors.background,
        color: template.colors.text,
        fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif`
      }}
    >
      {/* Header - per-template variants with optional logo */}
      <div className="mb-8">
        {template.layout.showLogo && data.company.logo && (
          <div className="mb-3">
            <img src={data.company.logo} alt="Company Logo" style={{ maxHeight: 48 }} />
          </div>
        )}
        {template.id === 'dark-premium' && (
          <div className="w-full h-24 rounded mb-4 flex items-center justify-between px-6" style={{ background: template.colors.text, color: 'white' }}>
            <div className="text-xl font-extrabold tracking-wide">{data.company.name}</div>
            <div className="text-right">
              <div className="text-sm opacity-80">INVOICE</div>
              <div className="text-xs">No: {data.invoiceNumber}</div>
            </div>
          </div>
        )}
        {template.id === 'minimal-pink' && (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1" style={{ color: template.colors.primary }}>{data.company.name}</h1>
              <div className="h-1 w-20 rounded" style={{ backgroundColor: template.colors.accent }}></div>
            </div>
            <div className="text-right">
              <div className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: `${template.colors.primary}10`, color: template.colors.primary }}>INVOICE</div>
              <div className="text-xs mt-1" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
            </div>
          </div>
        )}
        {template.id === 'orange-clean' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded" style={{ backgroundColor: template.colors.accent }}></div>
              <div className="text-xl font-bold" style={{ color: template.colors.text }}>{data.company.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold" style={{ color: template.colors.primary }}>INVOICE</div>
              <div className="text-xs" style={{ color: template.colors.secondary }}>#{data.invoiceNumber}</div>
            </div>
          </div>
        )}
        {template.id === 'tropical-borders' && (
          <div className="relative p-4 rounded-md" style={{ border: `2px dashed ${template.colors.accent}` }}>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold" style={{ color: template.colors.primary }}>{data.company.name}</div>
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: template.colors.accent }}>INVOICE</div>
                <div className="text-xs" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
              </div>
            </div>
          </div>
        )}
        {template.id === 'qr-modern' && (
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold" style={{ color: template.colors.text }}>{data.company.name}</div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: template.colors.primary }}>INVOICE</div>
                <div className="text-xs" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
              </div>
              <div className="w-10 h-10 rounded border-2 border-dashed" style={{ borderColor: template.colors.secondary }}></div>
            </div>
          </div>
        )}
        {template.id === 'coaching-elegant' && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold tracking-wide" style={{ color: template.colors.primary }}>{data.company.name}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: template.colors.secondary }}>Coaching & Consulting</div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded bg-black/5 text-xs font-semibold" style={{ color: template.colors.primary }}>INVOICE</div>
              <div className="text-xs mt-1" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
            </div>
          </div>
        )}
        {template.id === 'leaf-luxury' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: template.colors.accent }}></div>
              <div className="text-xl font-semibold" style={{ color: template.colors.text }}>{data.company.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm" style={{ color: template.colors.primary }}>INVOICE</div>
              <div className="text-xs" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
            </div>
          </div>
        )}
        {/* default header if not matched */}
        {![
          'dark-premium','minimal-pink','orange-clean','tropical-borders','qr-modern','coaching-elegant','leaf-luxury'
        ].includes(template.id) && (
          <div className="flex items-start justify-between">
            <div>
              <h1 
                className="text-3xl font-extrabold mb-1 tracking-tight"
                style={{ color: template.colors.primary }}
              >
                {data.company.name}
              </h1>
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: template.colors.secondary }}>Official Invoice</div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full text-white text-sm font-semibold mb-2" style={{ backgroundColor: template.colors.primary }}>INVOICE</div>
              <div className="space-y-1 text-sm" style={{ color: template.colors.text }}>
                <p><strong>No:</strong> {data.invoiceNumber}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 
          className="text-lg font-semibold mb-3"
          style={{ color: template.colors.primary }}
        >
          Bill To:
        </h3>
        <div style={{ color: template.colors.text }}>
          <p className="font-semibold">{data.customer.name}</p>
          <p>{data.customer.address}</p>
          <p>{data.customer.city}, {data.customer.state} {data.customer.zip}</p>
          {data.customer.phone && <p>{data.customer.phone}</p>}
          {data.customer.email && <p>{data.customer.email}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table 
          className="w-full border-collapse"
          style={{ border: `1px solid ${template.colors.primary}` }}
        >
          <thead>
            <tr style={{ backgroundColor: template.colors.primary, color: 'white' }}>
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-right py-3 px-4 font-semibold">Qty</th>
              <th className="text-right py-3 px-4 font-semibold">Rate</th>
              <th className="text-right py-3 px-4 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr 
                key={item.id}
                style={{ 
                  backgroundColor: index % 2 === 0 ? 'transparent' : `${template.colors.primary}05`,
                  borderBottom: `1px solid ${template.colors.secondary}30`
                }}
              >
                <td className="py-3 px-4" style={{ color: template.colors.text }}>
                  {item.description}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  {item.quantity}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  ${item.rate.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  ${item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between" style={{ color: template.colors.text }}>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {data.taxRate > 0 && (
              <div className="flex justify-between" style={{ color: template.colors.text }}>
                <span>Tax ({data.taxRate}%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            {data.discount > 0 && (
              <div className="flex justify-between" style={{ color: template.colors.text }}>
                <span>Discount:</span>
                <span>-${data.discount.toFixed(2)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-xl font-bold pt-2 border-t-2"
              style={{ 
                color: template.colors.accent,
                borderColor: template.colors.primary
              }}
            >
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            {/* Payment Information */}
            {data.paidAmount !== undefined && data.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-lg font-semibold pt-2" style={{ color: '#10b981' }}>
                  <span>Paid:</span>
                  <span>-${data.paidAmount.toFixed(2)}</span>
                </div>
                <div
                  className="flex justify-between text-xl font-bold pt-2 border-t-2"
                  style={{ 
                    color: data.balance && data.balance > 0 ? '#f59e0b' : '#10b981',
                    borderColor: template.colors.primary
                  }}
                >
                  <span>Balance Due:</span>
                  <span>${(data.balance || 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer - per-template variants */}
      <div 
        className="mt-8 pt-4 border-t-2"
        style={{ borderColor: template.colors.primary }}
      >
        {template.id === 'dark-premium' && (
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Contacts</div>
              <div style={{ color: template.colors.text }}>{data.company.email}</div>
              <div style={{ color: template.colors.text }}>{data.company.phone}</div>
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Billing Address</div>
              <div style={{ color: template.colors.text }}>{data.company.address}</div>
            </div>
            <div className="text-right">
              <div className="border-t-2 pt-2 inline-block px-6" style={{ borderColor: template.colors.primary }}>
                <div className="text-xs" style={{ color: template.colors.text }}>Authorized Signature</div>
              </div>
            </div>
          </div>
        )}
        {template.id === 'minimal-pink' && (
          <div className="text-center">
            <div className="text-xs mb-2" style={{ color: template.colors.secondary }}>{data.notes || 'We appreciate your business.'}</div>
            <div className="inline-block px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${template.colors.accent}22`, color: template.colors.primary }}>Thank you</div>
          </div>
        )}
        {template.id === 'orange-clean' && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold" style={{ color: template.colors.primary }}>Payment</div>
              <div style={{ color: template.colors.text }}>Paypal: {data.company.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: template.colors.secondary }}>Terms: {data.terms || 'Due upon receipt'}</div>
            </div>
          </div>
        )}
        {template.id === 'tropical-borders' && (
          <div className="relative p-4 rounded" style={{ border: `1px dashed ${template.colors.accent}` }}>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-semibold mb-1" style={{ color: template.colors.accent }}>Notes</div>
                <div style={{ color: template.colors.text }}>{data.notes || 'Thank you!'}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: template.colors.secondary }}>Due: {new Date(data.dueDate).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}
        {template.id === 'qr-modern' && (
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: template.colors.text }}>Scan to pay</div>
            <div className="w-12 h-12 rounded border-2 border-dashed" style={{ borderColor: template.colors.secondary }}></div>
          </div>
        )}
        {template.id === 'coaching-elegant' && (
          <div className="text-center">
            <div className="text-xs mb-2" style={{ color: template.colors.secondary }}>Coaching that transforms</div>
            <div className="text-xs" style={{ color: template.colors.text }}>{data.terms || 'Payment due within 7 days'}</div>
          </div>
        )}
        {template.id === 'leaf-luxury' && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: template.colors.accent }}></div>
              <div style={{ color: template.colors.text }}>{data.company.address}</div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: template.colors.secondary }}>Thank you for your trust</div>
            </div>
          </div>
        )}
        {/* default footer if none matched */}
        {![
          'dark-premium','minimal-pink','orange-clean','tropical-borders','qr-modern','coaching-elegant','leaf-luxury'
        ].includes(template.id) && (
          <div className="text-center text-xs">
            <span className="px-2 py-1 rounded" style={{ backgroundColor: `${template.colors.primary}10`, color: template.colors.primary }}>Thank you for your business</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplateRenderer({ data, template, brandLogos, className }: TemplateRendererProps) {
  if (template.customSchema) {
    return (
      <div className={className}>
        <CustomSchemaRenderer data={data} template={template} brandLogos={brandLogos} />
      </div>
    );
  }

  const rendererMap = {
    'hoe-classic': HoeClassicRenderer,
    'hoe-classic-type-b': HoeClassicRenderer,
    'hoe-classic-type-c': HoeClassicRenderer,
    'hoe-classic-ekhlas': HoeClassicHouseOfElectronicsRenderer,
    'receipt': ReceiptRenderer,
    // Legacy renderers (kept for backward compatibility)
    'classic-header': ClassicHeaderRenderer,
    'wave-design': WaveDesignRenderer,
    'gradient-modern': GradientModernRenderer,
    'pro-corporate': ProCorporateRenderer,
    'modern-stripe': ModernStripeRenderer,
    'minimal-outline': MinimalOutlineRenderer,
    'elegant-dark': ElegantDarkRenderer,
    'classic-column': ClassicColumnRenderer,
  };

  const RendererComponent = rendererMap[template.id as keyof typeof rendererMap] || FallbackRenderer;

  return (
    <div className={className}>
      <RendererComponent data={data} template={template} brandLogos={brandLogos} />
    </div>
  );
}
