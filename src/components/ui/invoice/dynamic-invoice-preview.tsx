'use client';

import React from 'react';
import { InvoiceTemplate } from './invoice-templates';
import { TemplateRenderer } from './template-renderers';

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
  invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery' | 'recurring';
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
  notes?: string;
  terms?: string;
  taxRate: number;
  taxes?: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  discount: number;
  paidAmount?: number;
  balance?: number;
  status?: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
  salesRep?: string;
  salesRepId?: string;
}

interface DynamicInvoicePreviewProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
  className?: string;
}

export function DynamicInvoicePreview({ 
  data, 
  template, 
  brandLogos = [],
  className = "" 
}: DynamicInvoicePreviewProps) {
  return (
    <TemplateRenderer 
      data={data} 
      template={template} 
      brandLogos={brandLogos} 
      className={className}
    />
  );
}
