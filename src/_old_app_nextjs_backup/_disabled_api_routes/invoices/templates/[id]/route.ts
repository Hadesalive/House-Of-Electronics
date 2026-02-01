import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// PUT /api/invoices/templates/[id] - Update invoice template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await databaseService.initialize();
    const { id } = await params;
    const body = await request.json();

    const updatedTemplate = await databaseService.updateInvoiceTemplate(id, body);

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Failed to update invoice template:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice template' },
      { status: 500 }
    );
  }
}
