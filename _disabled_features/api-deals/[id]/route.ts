import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database/database';
import { DealSchema, DatabaseDeal } from '@/lib/database/schema';

const db = new DatabaseService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.initialize();
    const deal = await db.getDealById(params.id);
    
    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Transform database format to frontend format
    const transformedDeal = {
      id: deal.id,
      title: deal.title,
      customerId: deal.customer_id,
      customerName: deal.customer_name,
      value: deal.value,
      probability: deal.probability,
      stage: deal.stage,
      expectedCloseDate: deal.expected_close_date,
      actualCloseDate: deal.actual_close_date,
      source: deal.source,
      priority: deal.priority,
      tags: deal.tags ? JSON.parse(deal.tags) : [],
      notes: deal.notes,
      negotiationHistory: deal.negotiation_history ? JSON.parse(deal.negotiation_history) : [],
      stakeholders: deal.stakeholders ? JSON.parse(deal.stakeholders) : [],
      competitorInfo: deal.competitor_info ? JSON.parse(deal.competitor_info) : undefined,
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
    };

    return NextResponse.json(transformedDeal);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.initialize();
    const body = await request.json();
    
    // Get existing deal
    const existingDeal = await db.getDealById(params.id);
    if (!existingDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Validate the request body
    const validatedData = DealSchema.parse({
      ...body,
      id: params.id,
      createdAt: existingDeal.created_at,
      updatedAt: new Date().toISOString(),
    });

    // Transform to database format
    const dbDeal: DatabaseDeal = {
      id: validatedData.id,
      title: validatedData.title,
      customer_id: validatedData.customerId,
      customer_name: validatedData.customerName,
      value: validatedData.value,
      probability: validatedData.probability,
      stage: validatedData.stage,
      expected_close_date: validatedData.expectedCloseDate,
      actual_close_date: validatedData.actualCloseDate,
      source: validatedData.source,
      priority: validatedData.priority,
      tags: JSON.stringify(validatedData.tags),
      notes: validatedData.notes,
      negotiation_history: JSON.stringify(validatedData.negotiationHistory),
      stakeholders: JSON.stringify(validatedData.stakeholders),
      competitor_info: validatedData.competitorInfo ? JSON.stringify(validatedData.competitorInfo) : undefined,
      created_at: validatedData.createdAt,
      updated_at: validatedData.updatedAt,
    };

    const deal = await db.updateDeal(params.id, dbDeal);
    
    if (!deal) {
      return NextResponse.json(
        { error: 'Failed to update deal' },
        { status: 500 }
      );
    }
    
    // Transform back to frontend format
    const transformedDeal = {
      id: deal.id,
      title: deal.title,
      customerId: deal.customer_id,
      customerName: deal.customer_name,
      value: deal.value,
      probability: deal.probability,
      stage: deal.stage,
      expectedCloseDate: deal.expected_close_date,
      actualCloseDate: deal.actual_close_date,
      source: deal.source,
      priority: deal.priority,
      tags: deal.tags ? JSON.parse(deal.tags) : [],
      notes: deal.notes,
      negotiationHistory: deal.negotiation_history ? JSON.parse(deal.negotiation_history) : [],
      stakeholders: deal.stakeholders ? JSON.parse(deal.stakeholders) : [],
      competitorInfo: deal.competitor_info ? JSON.parse(deal.competitor_info) : undefined,
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
    };

    return NextResponse.json(transformedDeal);
  } catch {
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.initialize();
    const deal = await db.getDealById(params.id);
    
    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    await db.deleteDeal(params.id);
    
    return NextResponse.json({ message: 'Deal deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
