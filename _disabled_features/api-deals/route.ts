import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database/database';
import { DealSchema, DatabaseDeal } from '@/lib/database/schema';
import { v4 as uuidv4 } from 'uuid';

const db = new DatabaseService();

export async function GET() {
  try {
    await db.initialize();
    const deals = await db.getAllDeals();
    
    // Transform database format to frontend format
    const transformedDeals = deals.map((deal: DatabaseDeal) => ({
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
    }));

    return NextResponse.json(transformedDeals);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.initialize();
    const body = await request.json();
    
    // Validate the request body
    const validatedData = DealSchema.parse({
      ...body,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
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

    const deal = await db.createDeal(dbDeal);
    
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

    return NextResponse.json(transformedDeal, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
