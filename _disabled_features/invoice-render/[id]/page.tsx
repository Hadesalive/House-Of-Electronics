import { TemplateRenderer } from '@/components/ui/invoice/template-renderers';
import { allTemplates } from '@/components/ui/invoice/templates';

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
  invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'debit_note';
  currency?: string;
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
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

async function getInvoiceData(id: string): Promise<InvoiceData> {
  // Use Electron IPC to get invoice data
  if (!window.electron?.ipcRenderer) {
    throw new Error('Electron not available');
  }
  
  const result = await window.electron.ipcRenderer.invoke('get-invoice-by-id', id) as {
    success: boolean;
    data?: unknown;
    error?: string;
  };

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Invoice not found');
  }

  const invoiceData = result.data as {
    id: string;
    number: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    customerPhone: string;
    issueDate: string;
    dueDate: string;
    invoiceType: "invoice" | "proforma" | "quote" | "credit_note" | "debit_note";
    currency: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paidAmount: number;
    balance: number;
    status: "draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled";
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    notes?: string;
    terms?: string;
    bankDetails?: {
      bankName: string;
      accountName?: string;
      accountNumber: string;
      routingNumber?: string;
      swiftCode?: string;
    };
    createdAt: string;
    updatedAt: string;
  };

  return {
    invoiceNumber: invoiceData.number,
    date: invoiceData.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate,
    invoiceType: invoiceData.invoiceType || 'invoice',
    currency: invoiceData.currency || 'USD',
    paidAmount: invoiceData.paidAmount,
    balance: invoiceData.balance,
    status: invoiceData.status,
    company: {
      name: "TopNotch Electronics LTD",
      address: "Pultney Street Freetown",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      phone: "+232 74762243",
      email: "company@topnotch.com",
    },
    customer: {
      name: invoiceData.customerName || 'Customer',
      address: invoiceData.customerAddress || '',
      city: '',
      state: '',
      zip: '',
      phone: invoiceData.customerPhone || 'N/A',
      email: invoiceData.customerEmail || '',
    },
    items: invoiceData.items || [],
    notes: invoiceData.notes || 'Thank you for your business!',
    terms: invoiceData.terms || 'Payment due within 30 days.',
    taxRate: invoiceData.subtotal > 0 ? (invoiceData.tax / invoiceData.subtotal) * 100 : 0,
    discount: invoiceData.discount,
    bankDetails: invoiceData.bankDetails || {
      bankName: "TopNotch Bank",
      accountName: "TopNotch Electronics LTD",
      accountNumber: "1234567890",
      routingNumber: "987654321",
      swiftCode: "TNBKUS33"
    },
  };
}

export default async function InvoiceRenderPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template: templateId = 'pro-corporate' } = await searchParams;
  
  try {
    const data = await getInvoiceData(id);
    const template = allTemplates.find(t => t.id === templateId) || allTemplates[0];

    return (
      <div className="invoice-pdf-render">
        <TemplateRenderer 
          data={data} 
          template={template} 
          brandLogos={[]} 
        />
      </div>
    );
  } catch {
    return (
      <div className="error">
        <h1>Error loading invoice</h1>
        <p>Invoice not found or error occurred.</p>
      </div>
    );
  }
}
