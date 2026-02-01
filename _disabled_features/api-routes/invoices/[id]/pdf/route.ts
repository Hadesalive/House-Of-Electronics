import { NextRequest, NextResponse } from 'next/server';
import { PuppeteerPDFGenerator } from '@/lib/services/puppeteer-pdf-generator';

// Invoice data interface for type safety
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate: string;
  invoiceType?: string;
  currency?: string;
  status?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount?: number;
  balance?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const browser = await PuppeteerPDFGenerator.getBrowser();

  try {
    const { id: invoiceId } = await params;
    // Template is handled by the Server Component

    // Fetch invoice data from your database
    const invoiceResponse = await fetch(`${request.nextUrl.origin}/api/invoices/${invoiceId}`);

    if (!invoiceResponse.ok) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoiceData = await invoiceResponse.json();

    // Convert your invoice data to the format expected by the PDF generator
    const pdfData: InvoiceData = {
      number: invoiceData.number,
      issueDate: invoiceData.issueDate,
      dueDate: invoiceData.dueDate,
      invoiceType: invoiceData.invoiceType || 'invoice',
      currency: invoiceData.currency || 'USD',
      status: invoiceData.status,
      subtotal: invoiceData.subtotal || 0,
      tax: invoiceData.tax || 0,
      discount: invoiceData.discount || 0,
      total: invoiceData.total || 0,
      paidAmount: invoiceData.paidAmount,
      balance: invoiceData.balance,
      customerName: invoiceData.customerName || 'Customer',
      customerEmail: invoiceData.customerEmail,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      items: invoiceData.items || [],
      notes: invoiceData.notes,
      terms: invoiceData.terms,
      bankDetails: invoiceData.bankDetails,
    };

    // Get the rendered HTML from the Server Component page
    const renderResponse = await fetch(`${request.nextUrl.origin}/invoice-render/${invoiceId}`, {
      headers: {
        'Accept': 'text/html',
      }
    });
    
    if (!renderResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to render invoice HTML' },
        { status: 500 }
      );
    }

    const htmlContent = await renderResponse.text();

    // Generate PDF from the rendered HTML
    const pdfBuffer = await PuppeteerPDFGenerator.generateInvoicePDFFromHTML(htmlContent);

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${pdfData.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    // Clean up browser instance
    if (browser) {
      await PuppeteerPDFGenerator.returnBrowser(browser);
    }
  }
}
