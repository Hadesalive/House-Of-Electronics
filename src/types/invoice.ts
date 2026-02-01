export interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string; // Additional item-specific description
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  taxRate?: number;
  total: number;
}

export interface InvoiceClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId?: string;
}

export interface InvoiceCompany {
  id: string;
  name: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId: string;
  phone: string;
  email: string;
  website?: string;
}

export interface InvoicePayment {
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'check' | 'paypal' | 'other';
  accountDetails?: string;
  dueDate: Date;
  terms: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  type: InvoiceType;
  layout: 'modern' | 'classic' | 'minimal' | 'corporate';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo?: string;
  showLogo: boolean;
  showCompanyDetails: boolean;
  showClientDetails: boolean;
  showPaymentTerms: boolean;
  showNotes: boolean;
  customFields: InvoiceCustomField[];
}

export interface InvoiceCustomField {
  id: string;
  label: string;
  value: string;
  position: 'header' | 'footer' | 'sidebar';
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'proforma' | 'credit_note' | 'delivery' | 'recurring' | 'quote';

// Invoice type configurations
export const INVOICE_TYPE_CONFIG = {
  standard: {
    name: 'Standard Invoice',
    description: 'Regular invoice for goods/services provided',
    prefix: 'INV',
    requiresPayment: true,
    allowsStockDeduction: true,
    defaultTerms: 'Payment due within 30 days of invoice date.',
    color: '#3b82f6'
  },
  proforma: {
    name: 'Proforma Invoice',
    description: 'Preliminary invoice before goods are shipped',
    prefix: 'PRO',
    requiresPayment: false,
    allowsStockDeduction: false,
    defaultTerms: 'This is a proforma invoice. Payment will be required before shipment.',
    color: '#8b5cf6'
  },
  quote: {
    name: 'Quote',
    description: 'Price estimate for potential work',
    prefix: 'QUO',
    requiresPayment: false,
    allowsStockDeduction: false,
    defaultTerms: 'This quote is valid for 30 days from the date of issue.',
    color: '#10b981'
  },
  credit_note: {
    name: 'Credit Note',
    description: 'Document to reduce amount owed by customer',
    prefix: 'CR',
    requiresPayment: false,
    allowsStockDeduction: false,
    defaultTerms: 'This credit note can be applied to future invoices.',
    color: '#f59e0b'
  },
  delivery: {
    name: 'Delivery Note',
    description: 'Document confirming goods delivered',
    prefix: 'DEL',
    requiresPayment: false,
    allowsStockDeduction: true,
    defaultTerms: 'Please sign and return one copy as confirmation of delivery.',
    color: '#ef4444'
  },
  recurring: {
    name: 'Recurring Invoice',
    description: 'Automatically generated recurring invoice',
    prefix: 'REC',
    requiresPayment: true,
    allowsStockDeduction: true,
    defaultTerms: 'This is a recurring invoice. Payment due within 7 days.',
    color: '#6366f1'
  }
} as const;

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  template: InvoiceTemplate;
  
  // Dates
  issueDate: Date;
  dueDate: Date;
  sentDate?: Date;
  paidDate?: Date;
  
  // Parties
  company: InvoiceCompany;
  client: InvoiceClient;
  
  // Content
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  
  // Financial
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paidAmount: number;
  balance: number;
  
  // Payment
  payment: InvoicePayment;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Recurring (if applicable)
  recurring?: {
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    endDate?: Date;
    nextDueDate: Date;
  };

  // Sales integration
  saleId?: string; // Reference to original sale
  saleNumber?: string; // Sale number for quick reference
}
