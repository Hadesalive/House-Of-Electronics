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

export function ClassicHeaderRenderer({ data, template }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;

  return (
    <div 
      className="p-8"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: template.colors.background,
        color: template.colors.text,
        fontFamily: template.fonts.primary
      }}
    >
      {/* Premium Classic Header */}
      <div 
        className="w-full h-36 relative mb-10 overflow-hidden rounded"
        style={{ backgroundColor: template.colors.primary }}
      >
        {/* subtle diagonal ribbon */}
        <div 
          className="absolute -top-8 -right-16 w-72 h-72 rotate-12 opacity-20"
          style={{ background: `linear-gradient(135deg, ${template.colors.accent}, transparent)` }}
        ></div>

        {/* Company branding */}
        <div className="absolute top-4 left-5 text-white">
          <div className="text-xl font-extrabold tracking-wide">{data.company.name}</div>
          <div className="text-[10px] uppercase opacity-80 tracking-widest">Trusted • Reliable • Professional</div>
        </div>
        
        {/* Invoice Title block */}
        <div className="absolute top-4 right-5 text-white text-right">
          <div className="inline-block px-3 py-1 rounded bg-white/10 border border-white/20 text-sm font-semibold tracking-widest">INVOICE</div>
          <div className="text-xs mt-2">No: #{data.invoiceNumber}</div>
          <div className="text-xs">Date: {new Date(data.date).toLocaleDateString()}</div>
        </div>
        
        {/* Banking strip */}
        <div className="absolute bottom-0 left-0 right-0 text-white/90 text-[11px]">
          <div className="flex items-center justify-between px-5 py-2 bg-black/10 backdrop-blur-sm">
            <div className="font-semibold">Payment Info</div>
            <div className="flex gap-6">
              <div>Account No: 000 000 000 000</div>
              <div>A/C Name: {data.company.name}</div>
              <div>SWIFT: TOPNUS33</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 
          className="text-lg font-semibold mb-3"
          style={{ color: template.colors.primary }}
        >
          Invoice To: {data.customer.name}
        </h3>
        <div style={{ color: template.colors.text }}>
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
              <th className="py-3 px-4 text-left font-semibold">SL.</th>
              <th className="py-3 px-4 text-left font-semibold">Product Description</th>
              <th className="py-3 px-4 text-right font-semibold">Price</th>
              <th className="py-3 px-4 text-right font-semibold">Qty</th>
              <th className="py-3 px-4 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr 
                key={item.id}
                className="border-b"
                style={{ 
                  borderColor: template.colors.secondary,
                  backgroundColor: index % 2 === 0 ? 'transparent' : `${template.colors.primary}05`
                }}
              >
                <td className="py-3 px-4" style={{ color: template.colors.text }}>{index + 1}</td>
                <td className="py-3 px-4" style={{ color: template.colors.text }}>
                  {item.description}
                  <div className="text-xs opacity-75 mt-1">
                    Lorem ipsum is simply dummy text of the printing and typesetting industry.
                  </div>
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  ${item.rate.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  {item.quantity}
                </td>
                <td className="py-3 px-4 text-right" style={{ color: template.colors.text }}>
                  ${item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <span>Tax ({data.taxRate}%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
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
          </div>
        </div>
      </div>

      {/* Signature Footer - Classic unique */}
      <div 
        className="mt-10 pt-6 border-t-2"
        style={{ borderColor: template.colors.primary }}
      >
        <div className="grid grid-cols-3 gap-8 items-start">
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: template.colors.primary }}>Contact</div>
            <div className="text-sm" style={{ color: template.colors.text }}>{data.company.email}</div>
            <div className="text-sm" style={{ color: template.colors.text }}>{data.company.phone}</div>
            <div className="text-sm" style={{ color: template.colors.text }}>www.{data.company.name.toLowerCase().replace(/\s+/g, '')}.com</div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: template.colors.primary }}>Remittance Address</div>
            <div className="text-sm" style={{ color: template.colors.text }}>{data.company.address}</div>
            <div className="text-sm" style={{ color: template.colors.text }}>{data.company.city}, {data.company.state} {data.company.zip}</div>
          </div>
          <div className="text-right">
            <div className="h-12"></div>
            <div className="border-t-2 pt-2 inline-block px-6" style={{ borderColor: template.colors.primary }}>
              <div className="text-sm font-medium" style={{ color: template.colors.text }}>Authorized Signature</div>
            </div>
          </div>
        </div>

        {data.terms && (
          <div className="mt-6">
            <div className="text-sm font-semibold mb-2" style={{ color: template.colors.primary }}>Terms & Conditions</div>
            <p className="text-sm" style={{ color: template.colors.text }}>{data.terms}</p>
          </div>
        )}

        <div className="mt-6 text-center text-xs tracking-wide">
          <span className="px-3 py-1 rounded-full" style={{ backgroundColor: `${template.colors.primary}10`, color: template.colors.primary }}>Thank you for your prompt payment</span>
        </div>
      </div>
    </div>
  );
}
