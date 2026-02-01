/**
 * Invoice PDF Generator with Automatic Pagination
 * 
 * Uses jsPDF AutoTable for automatic:
 * - Page break calculation
 * - Items per page optimization
 * - Header repetition
 * - Footer placement
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType?: string;
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
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  discount: number;
  paidAmount?: number;
  balance?: number;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const pdf = new jsPDF('p', 'mm', 'a4');

  const currency = data.currency || 'NLe';
  // Normalize currency code (handle old SLL/SLE/NLE -> NLe)
  const normalizedCurrency = currency === 'SLL' || currency === 'SLE' || currency === 'NLE' || currency === 'NLe' ? 'NLe' : currency;
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'SLE': 'NLe ',
    'SLL': 'NLe ',
    'NLE': 'NLe ',
    'NLe': 'NLe ',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$'
  };
  const currencySymbol = currencySymbols[normalizedCurrency] || normalizedCurrency;

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - (data.discount || 0);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  let yPos = 20;

  // ===== HEADER =====
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.company.name, 20, yPos);

  yPos += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.company.address, 20, yPos);
  yPos += 5;
  pdf.text(`${data.company.city}, ${data.company.state} ${data.company.zip}`, 20, yPos);
  yPos += 5;
  pdf.text(`${data.company.phone} | ${data.company.email}`, 20, yPos);

  // Invoice metadata (right side)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', 150, 20);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Invoice #: ${data.invoiceNumber}`, 150, 28);
  pdf.text(`Date: ${new Date(data.date).toLocaleDateString()}`, 150, 33);
  pdf.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, 150, 38);

  yPos = 55;

  // ===== BILL TO =====
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To:', 20, yPos);

  yPos += 6;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.customer.name, 20, yPos);
  yPos += 5;
  pdf.text(data.customer.address, 20, yPos);
  yPos += 5;
  pdf.text(`${data.customer.city}, ${data.customer.state} ${data.customer.zip}`, 20, yPos);
  if (data.customer.phone) {
    yPos += 5;
    pdf.text(data.customer.phone, 20, yPos);
  }
  if (data.customer.email) {
    yPos += 5;
    pdf.text(data.customer.email, 20, yPos);
  }

  yPos += 10;

  // ===== ITEMS TABLE with AutoTable (AUTOMATIC PAGINATION!) =====
  autoTable(pdf, {
    startY: yPos,
    head: [['Description', 'Quantity', 'Price', 'Amount']],
    body: data.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 90 },  // Description
      1: { cellWidth: 25, halign: 'center' },  // Quantity
      2: { cellWidth: 35, halign: 'right' },   // Price
      3: { cellWidth: 35, halign: 'right' }    // Amount
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    // AUTOMATIC PAGINATION! 
    // AutoTable handles:
    // - Calculating items per page
    // - Adding page breaks automatically
    // - Repeating headers on new pages
    // - Placing footer after last item
    showHead: 'everyPage',
    margin: { top: 20, bottom: 30 },

    // Add page numbers
    didDrawPage: () => {
      // Page number footer
      const pageCount = (pdf as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      const pageNumber = (pdf as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;

      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Page ${pageNumber} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  // Get Y position after table (AutoTable places it perfectly!)
  const finalY = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ===== TOTALS SECTION =====
  // AutoTable ensures this goes on a new page if needed!
  const totalsStartY = finalY + 10;
  const totalsX = 140;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  pdf.text('Subtotal:', totalsX, totalsStartY, { align: 'right' });
  pdf.text(formatCurrency(subtotal), 190, totalsStartY, { align: 'right' });

  if (data.taxRate > 0) {
    pdf.text(`Tax (${data.taxRate}%):`, totalsX, totalsStartY + 5, { align: 'right' });
    pdf.text(formatCurrency(tax), 190, totalsStartY + 5, { align: 'right' });
  }

  if (data.discount && data.discount > 0) {
    pdf.text('Discount:', totalsX, totalsStartY + 10, { align: 'right' });
    pdf.text(`-${formatCurrency(data.discount)}`, 190, totalsStartY + 10, { align: 'right' });
  }

  // Total
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const totalY = totalsStartY + (data.taxRate > 0 ? 15 : 10) + (data.discount ? 5 : 0);
  pdf.text('TOTAL:', totalsX, totalY, { align: 'right' });
  pdf.text(formatCurrency(total), 190, totalY, { align: 'right' });

  // ===== BANK DETAILS =====
  if (data.bankDetails) {
    const bankY = totalY + 15;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Payment Details:', 20, bankY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Bank: ${data.bankDetails.bankName}`, 20, bankY + 5);
    if (data.bankDetails.accountName) {
      pdf.text(`Account Name: ${data.bankDetails.accountName}`, 20, bankY + 10);
    }
    pdf.text(`Account #: ${data.bankDetails.accountNumber}`, 20, bankY + 15);
    if (data.bankDetails.routingNumber) {
      pdf.text(`Routing: ${data.bankDetails.routingNumber}`, 20, bankY + 20);
    }
  }

  // ===== NOTES & TERMS =====
  if (data.notes || data.terms) {
    const notesY = totalY + 35;

    if (data.notes) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', 20, notesY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.notes, 20, notesY + 5, { maxWidth: 170 });
    }

    if (data.terms) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms:', 20, notesY + 15);
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.terms, 20, notesY + 20, { maxWidth: 170 });
    }
  }

  return pdf;
}

