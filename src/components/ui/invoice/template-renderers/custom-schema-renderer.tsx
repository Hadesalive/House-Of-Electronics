import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

type BuilderNodeType = 'container' | 'text' | 'logo' | 'company' | 'customer' | 'items' | 'totals' | 'notes' | 'terms' | 'divider' | 'spacer' | 'brandLogos';

interface BuilderStyle {
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  padding?: number;
  border?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'semibold';
  gap?: number;
  columns?: number;
  direction?: 'row' | 'column';
}

interface BuilderNode {
  id: string;
  type: BuilderNodeType;
  children?: BuilderNode[];
  style?: BuilderStyle;
  props?: Record<string, unknown>;
}

interface TemplateSchema {
  nodes: BuilderNode[];
}

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
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  discount: number;
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate & { customSchema?: TemplateSchema };
  brandLogos?: string[];
}

export function CustomSchemaRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;

  const renderNode = (node: BuilderNode): React.ReactNode => {
    const style: React.CSSProperties = {
      backgroundColor: node.style?.bgColor,
      color: node.style?.textColor,
      textAlign: node.style?.align,
      padding: node.style?.padding,
      border: node.style?.border,
      fontSize: node.style?.fontSize,
      fontWeight: node.style?.fontWeight,
      display: node.type === 'container' ? 'flex' : undefined,
      flexDirection: node.style?.direction,
      gap: node.style?.gap,
    };

    switch (node.type) {
      case 'container':
        return (
          <div key={node.id} style={style}>
            {node.children?.map(child => renderNode(child))}
          </div>
        );
      case 'text':
        return (
          <div key={node.id} style={style}>
            {(node.props?.content as string) || ''}
          </div>
        );
      case 'logo':
        return template.layout.showLogo && data.company.logo ? (
          <img key={node.id} src={data.company.logo} alt="Logo" style={{ height: 48, ...style }} />
        ) : null;
      case 'company':
        return (
          <div key={node.id} style={style}>
            <div className="font-bold" style={{ color: template.colors.primary }}>{data.company.name}</div>
            <div>{data.company.address}</div>
            <div>{data.company.city}, {data.company.state} {data.company.zip}</div>
            <div>{data.company.phone} • {data.company.email}</div>
          </div>
        );
      case 'customer':
        return (
          <div key={node.id} style={style}>
            <div className="font-bold" style={{ color: template.colors.primary }}>Bill To</div>
            <div>{data.customer.name}</div>
            <div>{data.customer.address}</div>
            <div>{data.customer.city}, {data.customer.state} {data.customer.zip}</div>
          </div>
        );
      case 'items':
        return (
          <table key={node.id} className="w-full border-collapse" style={style}>
            <thead>
              <tr style={{ backgroundColor: template.colors.primary, color: '#fff' }}>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-right py-3 px-4">Rate</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={item.id} style={{ backgroundColor: i % 2 ? '#00000005' : 'transparent' }}>
                  <td className="py-3 px-4" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>{item.description}</td>
                  <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>{item.quantity}</td>
                  <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>${item.rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'totals':
        return (
          <div key={node.id} style={{ maxWidth: 360, marginLeft: 'auto', ...style }}>
            <div className="flex justify-between py-1"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {data.taxRate > 0 && (
              <div className="flex justify-between py-1"><span>Tax ({data.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
            )}
            {data.discount > 0 && (
              <div className="flex justify-between py-1"><span>Discount</span><span>- ${data.discount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between items-center mt-2 pt-2 border-t-2" style={{ borderColor: template.colors.primary }}>
              <div className="text-lg font-bold" style={{ color: template.colors.accent }}>Total</div>
              <div className="text-2xl font-extrabold">${total.toFixed(2)}</div>
            </div>
          </div>
        );
      case 'notes':
        return data.notes ? (
          <div key={node.id} style={style}>
            <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Notes</div>
            <div className="text-sm">{data.notes}</div>
          </div>
        ) : null;
      case 'terms':
        return data.terms ? (
          <div key={node.id} style={style}>
            <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Terms</div>
            <div className="text-sm">{data.terms}</div>
          </div>
        ) : null;
      case 'divider':
        return <hr key={node.id} style={{ borderColor: template.colors.secondary, ...style }} />;
      case 'spacer':
        return <div key={node.id} style={{ height: node.props?.height as number || 16, ...style }} />;
      case 'brandLogos':
        return brandLogos.length ? (
          <div key={node.id} className="flex items-center gap-3" style={style}>
            {brandLogos.map((logo, i) => (
              <img key={i} src={logo} alt={`Brand ${i + 1}`} className="h-6 w-auto object-contain opacity-80" />
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const schema = template.customSchema || { nodes: [] };

  return (
    <div className="p-6" style={{ width: '210mm', minHeight: '297mm', backgroundColor: template.colors.background, color: template.colors.text, fontFamily: `${template.fonts.primary}, 'Helvetica Neue', Arial, sans-serif` }}>
      {schema.nodes.map(node => renderNode(node))}
    </div>
  );
}


