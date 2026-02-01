import { NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// GET /api/invoices/templates - Get all invoice templates
export async function GET() {
  try {
    await databaseService.initialize();
    const templates = await databaseService.getAllInvoiceTemplates();

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice templates' },
      { status: 500 }
    );
  }
}
