import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// PUT /api/invoices/[id]/payment - Update payment amount
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await databaseService.initialize();
    const { id } = await params;
    const body = await request.json();

    const { paidAmount } = body;

    if (typeof paidAmount !== 'number' || paidAmount < 0) {
      return NextResponse.json(
        { error: 'Invalid paid amount' },
        { status: 400 }
      );
    }

    // Get current invoice to validate payment amount
    const currentInvoice = await databaseService.getInvoiceById(id);
    if (!currentInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update paid amount and automatically update status
    let newStatus = currentInvoice.status;
    if (paidAmount >= currentInvoice.total) {
      newStatus = 'paid';
    } else if (paidAmount > 0) {
      newStatus = 'sent'; // Partially paid
    }

    const updateData = {
      paidAmount,
      status: newStatus,
    };

    const updatedInvoice = await databaseService.updateInvoice(id, updateData);

    if (!updatedInvoice) {
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: `Payment of ${paidAmount} recorded successfully`
    });
  } catch (error) {
    console.error('Failed to update payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
