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

export function WaveDesignRenderer({ data, template }: TemplateRendererProps) {
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
      {/* Decorative wave elements */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" 
           style={{ backgroundColor: template.colors.primary, transform: 'translate(16px, -16px)' }}></div>
      <div className="absolute top-6 right-10 w-20 h-20 rounded-full opacity-20" 
           style={{ backgroundColor: template.colors.secondary }}></div>
      <div className="absolute -left-16 top-24 w-40 h-40 rounded-full opacity-10" 
           style={{ backgroundColor: template.colors.accent }}></div>
      
      {/* Header Section - Wave unique */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          {/* Company branding with wave badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" 
                 style={{ background: `radial-gradient(circle at 30% 30%, ${template.colors.secondary}, ${template.colors.primary})` }}>
              <div className="w-6 h-6 bg-white rounded-full"></div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: template.colors.text }}>{data.company.name}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: template.colors.secondary }}>Creative • Modern • Friendly</div>
            </div>
          </div>
          
          {/* Invoice details */}
          <div className="text-right">
            <div className="text-2xl font-extrabold tracking-wide" style={{ color: template.colors.accent }}>INVOICE</div>
            <div className="text-xs" style={{ color: template.colors.secondary }}>No: {data.invoiceNumber}</div>
            <div className="text-xs" style={{ color: template.colors.secondary }}>Date: {new Date(data.date).toLocaleDateString()}</div>
          </div>
        </div>
        
        {/* Contact info in columns */}
        <div className="flex justify-between text-xs mb-6" style={{ color: template.colors.secondary }}>
          <div>
            <div className="font-semibold" style={{ color: template.colors.accent }}>Phone</div>
            <div>{data.company.phone}</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: template.colors.accent }}>Email</div>
            <div>{data.company.email}</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: template.colors.accent }}>Address</div>
            <div>{data.company.address}</div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 
          className="text-lg font-semibold mb-3"
          style={{ color: template.colors.primary }}
        >
          TO
        </h3>
        <div style={{ color: template.colors.text }}>
          <p className="font-semibold">{data.customer.name}</p>
          <p>{data.customer.address}</p>
          <p>{data.customer.city}, {data.customer.state} {data.customer.zip}</p>
          {data.customer.phone && <p>{data.customer.phone}</p>}
          {data.customer.email && <p>{data.customer.email}</p>}
        </div>
      </div>

      {/* Items Table with Wave Header */}
      <div className="mb-8">
        <div className="flex">
          <div 
            className="py-3 px-4 font-semibold text-white flex-1"
            style={{ backgroundColor: template.colors.accent }}
          >
            ITEM DESCRIPTION
          </div>
          <div 
            className="py-3 px-4 font-semibold text-white"
            style={{ backgroundColor: template.colors.primary }}
          >
            <div className="flex gap-8">
              <span>PRICE</span>
              <span>QTY</span>
              <span>TOTAL</span>
            </div>
          </div>
        </div>
        
        {data.items.map((item, index) => (
          <div 
            key={item.id}
            className="flex border-b py-4"
            style={{ 
              borderColor: template.colors.secondary,
              backgroundColor: index % 2 === 0 ? 'transparent' : `${template.colors.primary}05`
            }}
          >
            <div className="flex-1 px-4" style={{ color: template.colors.text }}>
              <div className="font-medium">{item.description}</div>
              <div className="text-xs opacity-75 mt-1">
                Contrary to popular belief Lorem Ipsum simply random
              </div>
            </div>
            <div className="px-4" style={{ color: template.colors.text }}>
              <div className="flex gap-8">
                <span>${item.rate.toFixed(2)}</span>
                <span>{item.quantity}</span>
                <span className="font-semibold">${item.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between" style={{ color: template.colors.text }}>
              <span>Sub Total:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: template.colors.text }}>
              <span>Tax Vat {data.taxRate}%:</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between" style={{ color: template.colors.text }}>
                <span>Discount:</span>
                <span>-${data.discount.toFixed(2)}</span>
              </div>
            )}
            <div 
              className="flex justify-between text-xl font-bold pt-2"
              style={{ 
                color: 'white',
                backgroundColor: template.colors.accent,
                padding: '12px 16px',
                marginTop: '8px'
              }}
            >
              <span>GRAND TOTAL:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Wave note card */}
      <div className="mt-10">
        <div className="rounded-xl p-6 border relative overflow-hidden" style={{ borderColor: `${template.colors.secondary}55` }}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: template.colors.accent }}></div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="font-semibold mb-2" style={{ color: template.colors.primary }}>Payment Info</div>
              <div style={{ color: template.colors.text }}>Paypal: {data.company.email}</div>
              <div style={{ color: template.colors.text }}>Cards: Visa, Master Card</div>
              <div style={{ color: template.colors.text }}>We accept cheque</div>
            </div>
            <div>
              <div className="font-semibold mb-2" style={{ color: template.colors.primary }}>Notes</div>
              <div className="text-sm" style={{ color: template.colors.text }}>{data.notes || 'Thank you for your business!'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: template.colors.secondary }}>Authorized Signature</div>
              <div className="border-t-2 pt-2 inline-block px-8" style={{ borderColor: template.colors.primary }}>
                <div className="text-sm" style={{ color: template.colors.text }}>{data.company.name}</div>
              </div>
            </div>
          </div>
          {data.terms && (
            <div className="mt-4 text-xs" style={{ color: template.colors.text }}>
              <span className="font-semibold" style={{ color: template.colors.primary }}>Terms: </span>{data.terms}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
