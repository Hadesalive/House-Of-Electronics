import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // API routes are for web environment only
    // In Electron, IPC should be used directly in client-side code
    return NextResponse.json(
      { error: 'Invoice not found - use IPC in Electron environment' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // API routes are for web environment only
    // In Electron, IPC should be used directly in client-side code
    return NextResponse.json(
      { error: 'Update not available in web mode' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // API routes are for web environment only
    // In Electron, IPC should be used directly in client-side code
    return NextResponse.json(
      { error: 'Delete not available in web mode' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
