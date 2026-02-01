import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// GET /api/invoices - List all invoices
export async function GET() {
  try {
    await databaseService.initialize();
    const invoices = await databaseService.getAllInvoices();

    // Transform to match expected format
    const transformedInvoices = invoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      type: inv.invoiceType,
      status: inv.status,
      customerId: inv.customerId || null,
      customerName: inv.customerName || '',
      customerEmail: inv.customerEmail || '',
      issueDate: inv.createdAt.split('T')[0],
      dueDate: inv.dueDate || '',
      paidDate: inv.paidAmount >= inv.total ? inv.updatedAt.split('T')[0] : null,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      paidAmount: inv.paidAmount,
      balance: inv.balance,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));

    return NextResponse.json(transformedInvoices);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    await databaseService.initialize();
    const body = await request.json();

    // Generate invoice number if not provided
    const invoiceNumber = body.number || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Prepare bank details - only include if we have the required fields
    const bankDetails = body.bankDetails?.bankName && body.bankDetails?.accountNumber
      ? {
          bankName: body.bankDetails.bankName,
          accountName: body.bankDetails.accountName || '',
          accountNumber: body.bankDetails.accountNumber,
          routingNumber: body.bankDetails.routingNumber || '',
          swiftCode: body.bankDetails.swiftCode || '',
        }
      : undefined;

    const invoice = await databaseService.createInvoice({
        number: invoiceNumber,
        customerId: body.customerId || undefined,
        customerName: body.customerName || '',
        customerEmail: body.customerEmail || '',
        customerAddress: body.customerAddress || '',
        customerPhone: body.customerPhone || '',
        items: (body.items || []).map((item: {
            id?: string;
            description?: string;
            itemDescription?: string;
            quantity?: number;
            rate?: number;
            amount?: number;
        }) => ({
            id: item.id || '',
            description: item.description || '',
            itemDescription: item.itemDescription || '',
            quantity: item.quantity || 1,
            rate: item.rate || 0,
            amount: item.amount || 0,
      })),
      subtotal: body.subtotal || 0,
      tax: body.tax || 0,
      discount: body.discount || 0,
      total: body.total || 0,
      paidAmount: body.paidAmount || 0,
      balance: (body.total || 0) - (body.paidAmount || 0),
      status: body.status || 'draft',
      invoiceType: body.invoiceType || 'invoice',
      currency: body.currency || 'USD',
      dueDate: body.dueDate || '',
      notes: body.notes || '',
      terms: body.terms || '',
      bankDetails,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
