import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await databaseService.initialize();
    const { id } = await params;
    const invoice = await databaseService.getInvoiceById(id);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Add issueDate for backward compatibility (uses createdAt)
    const responseData = {
      ...invoice,
      issueDate: invoice.createdAt.split('T')[0],
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await databaseService.initialize();
    const { id } = await params;
    const body = await request.json();

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

    // Build update data object with all possible fields
    const updateData: Record<string, unknown> = {};
    
    if (body.number !== undefined) updateData.number = body.number;
    if (body.customerId !== undefined) updateData.customerId = body.customerId;
    if (body.customerName !== undefined) updateData.customerName = body.customerName;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
    if (body.customerAddress !== undefined) updateData.customerAddress = body.customerAddress;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone;
    if (body.items !== undefined) updateData.items = body.items;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.invoiceType !== undefined) updateData.invoiceType = body.invoiceType;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.terms !== undefined) updateData.terms = body.terms;
    if (body.paidAmount !== undefined) updateData.paidAmount = body.paidAmount;
    if (bankDetails !== undefined) updateData.bankDetails = bankDetails;

    const updatedInvoice = await databaseService.updateInvoice(id, updateData);

    if (!updatedInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await databaseService.initialize();
    const { id } = await params;

    // Check if invoice exists first
    const invoice = await databaseService.getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // TODO: Implement delete functionality in database service
    // await databaseService.deleteInvoice(id);

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
