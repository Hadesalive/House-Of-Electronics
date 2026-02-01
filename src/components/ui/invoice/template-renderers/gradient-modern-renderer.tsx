import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

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
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
}

export function GradientModernRenderer({ data, template }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;

  return (
    <div 
      className="p-8 relative overflow-hidden"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: template.colors.background,
        color: template.colors.text,
        fontFamily: template.fonts.primary
      }}
    >
      {/* Vertical gradient spine */}
      <div 
        className="absolute top-0 right-0 w-28 h-full"
        style={{ 
          background: `linear-gradient(180deg, ${template.colors.primary}, ${template.colors.secondary})`
        }}
      ></div>
      
      {/* Header Section - Modern unique */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          {/* Company branding with geometric badge */}
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ 
                background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
              }}
            >
              <div className="w-6 h-6 bg-white rounded"></div>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight" style={{ color: template.colors.text }}>{data.company.name}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: template.colors.secondary }}>Innovate • Deliver • Excel</div>
            </div>
          </div>
          
          {/* QR Code styled */}
          <div 
            className="w-10 h-10 rounded border-2 border-dashed flex items-center justify-center bg-white/40 backdrop-blur-sm"
            style={{ borderColor: template.colors.secondary }}
          >
            <div className="text-[10px] font-medium" style={{ color: template.colors.secondary }}>QR</div>
          </div>
        </div>
        
        {/* Contact info with bullets */}
        <div className="flex gap-6 text-xs mb-6" style={{ color: template.colors.secondary }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: template.colors.secondary }}></div>
            <span>{data.company.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: template.colors.secondary }}></div>
            <span>{data.company.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: template.colors.secondary }}></div>
            <span>www.{data.company.name.toLowerCase().replace(/\s+/g, '')}.com</span>
          </div>
        </div>
      </div>

      {/* Invoice title and details */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="text-lg" style={{ color: template.colors.text }}>
            {new Date(data.date).toLocaleDateString()}
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white" style={{ backgroundColor: template.colors.primary, padding: '8px 16px', borderRadius: '4px' }}>
              INVOICE
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-sm underline mb-2" style={{ color: template.colors.primary }}>
            INVOICE NO # {data.invoiceNumber}
          </div>
          <div className="text-sm mb-1" style={{ color: template.colors.text }}>TO</div>
          <div className="text-sm font-semibold" style={{ color: template.colors.primary }}>{data.customer.name.toUpperCase()}</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <div className="grid grid-cols-4 gap-4 text-sm font-semibold mb-4" style={{ color: template.colors.primary }}>
          <div className="border-b-2 pb-2" style={{ borderColor: template.colors.secondary }}>ITEM DESCRIPTIONS</div>
          <div className="border-b-2 pb-2 text-right" style={{ borderColor: template.colors.secondary }}>RATE</div>
          <div className="border-b-2 pb-2 text-center" style={{ borderColor: template.colors.secondary }}>QTY</div>
          <div className="border-b-2 pb-2 text-right" style={{ borderColor: template.colors.secondary }}>PRICE</div>
        </div>
        
        {data.items.map((item, index) => (
          <div 
            key={item.id}
            className="grid grid-cols-4 gap-4 py-3 text-sm border-b"
            style={{ 
              borderColor: template.colors.secondary,
              backgroundColor: index % 2 === 0 ? 'transparent' : `${template.colors.primary}05`
            }}
          >
            <div style={{ color: template.colors.text }}>
              <div className="font-semibold">{item.description.toUpperCase()}</div>
              <div className="text-xs opacity-75 mt-1">
                Lorem ipsum dolor sit amet, consect etueradipiscing elit.
              </div>
            </div>
            <div className="text-right" style={{ color: template.colors.text }}>
              ${item.rate.toFixed(2)}
            </div>
            <div className="text-center" style={{ color: template.colors.text }}>
              {item.quantity.toString().padStart(2, '0')}
            </div>
            <div className="text-right font-semibold" style={{ color: template.colors.text }}>
              ${item.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between text-sm" style={{ color: template.colors.text }}>
              <span>Sub-Total:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: template.colors.text }}>
              <span>Tax: Vat ({data.taxRate}%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: template.colors.text }}>
                <span>Discount ({Math.round((data.discount / subtotal) * 100)}%):</span>
                <span>-${data.discount.toFixed(2)}</span>
              </div>
            )}
            <div 
              className="flex justify-between text-lg font-bold pt-2 border-t"
              style={{ 
                color: template.colors.text,
                borderColor: template.colors.secondary
              }}
            >
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Modern summary band */}
      <div className="mt-8 pt-6">
        <div className="rounded-lg p-4" style={{ background: `${template.colors.primary}10`, border: `1px solid ${template.colors.secondary}33` }}>
          <div className="grid grid-cols-3 gap-6 text-xs">
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Contact</div>
              <div style={{ color: template.colors.text }}>{data.company.email}</div>
              <div style={{ color: template.colors.text }}>{data.company.phone}</div>
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Payment</div>
              <div style={{ color: template.colors.text }}>Paypal: {data.company.email}</div>
              <div style={{ color: template.colors.text }}>Cards: Visa, MasterCard</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: template.colors.secondary }}>Authorized By</div>
              <div className="border-t pt-2 inline-block" style={{ borderColor: template.colors.secondary }}>
                <div className="text-sm" style={{ color: template.colors.text }}>{data.company.name}</div>
              </div>
            </div>
          </div>
          {data.terms && (
            <div className="mt-4 text-xs" style={{ color: template.colors.text }}>
              <span className="font-semibold" style={{ color: template.colors.primary }}>Terms: </span>{data.terms}
            </div>
          )}
          <div className="mt-4 text-center text-xs font-medium" style={{ color: template.colors.accent }}>
            Thank you for choosing us — we appreciate your business.
          </div>
        </div>
      </div>
    </div>
  );
}
