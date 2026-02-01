import { SimpleReceiptData } from './SimpleReceipt';
import { Sale } from '../../../lib/types/core';

// Minimal Invoice interface for receipt formatting (customize as needed)
type Invoice = {
  number: string;
  issueDate: string;
  createdAt?: string;
  customer?: { name: string; email?: string; phone?: string; };
  items?: Array<{ description?: string; quantity: number; rate: number; amount: number; }>;
  paymentMethod?: string;
  tax: number;
  subtotal: number;
  discount: number;
  total: number;
};

export function makeSaleReceiptData(
  sale: Sale,
  opts: {
    company: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
      email?: string;
    },
    preferences: { receiptFooter?: string }
  }
): SimpleReceiptData {
  return {
    receiptNumber: sale.id?.substring(0, 8).toUpperCase() || '',
    date: new Date(sale.createdAt).toISOString().split('T')[0],
    time: new Date(sale.createdAt).toLocaleTimeString(),
    company: opts.company,
    customer: {
      name: sale.customerName || 'Walk-in Customer',
      email: '',
      phone: '',
    },
    items: sale.items?.map((item: any) => ({
      description: item.productName,
      quantity: item.quantity,
      rate: item.unitPrice,
      amount: item.total,
    })) || [],
    paymentMethod: (sale.paymentMethod || '').toString().replace('_', ' ').toUpperCase(),
    taxRate: Math.round(((sale.tax / (sale.subtotal || 1)) * 100) || 0),
    discount: sale.discount || 0,
    subtotal: sale.subtotal,
    total: sale.total,
    footerMessage: opts.preferences?.receiptFooter || 'Thank you for your business!'
  };
}

export function makeInvoiceReceiptData(
  invoice: Invoice,
  opts: {
    company: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
      email?: string;
    },
    preferences: { receiptFooter?: string }
  }
): SimpleReceiptData {
  return {
    receiptNumber: invoice.number || '',
    date: invoice.issueDate,
    time: invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
    company: opts.company,
    customer: {
      name: invoice.customer?.name || 'Walk-in Customer',
      email: invoice.customer?.email || '',
      phone: invoice.customer?.phone || '',
    },
    items: invoice.items?.map((item: any) => ({
      description: item.description ?? '',
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })) || [],
    paymentMethod: (invoice.paymentMethod || '').toString().replace('_', ' ').toUpperCase(),
    taxRate: Math.round((invoice.tax / (invoice.subtotal || 1)) * 100) || 0,
    discount: invoice.discount || 0,
    subtotal: invoice.subtotal,
    total: invoice.total,
    footerMessage: opts.preferences?.receiptFooter || 'Thank you for your business!'
  };
}
