import { NextResponse } from 'next/server';

// Define proper types for IPC responses
interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function GET() {
  try {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
      // Use Electron IPC for templates
      const result = await window.electron.ipcRenderer.invoke('get-invoice-templates') as IpcResponse;
      if (result.success) {
        return NextResponse.json(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch templates');
      }
    }

    // Fallback for web environment - return default templates
    const defaultTemplates = [
      {
        id: 'pro-corporate',
        name: 'Pro Corporate',
        description: 'Professional corporate invoice template',
        isDefault: true
      },
      {
        id: 'classic-column',
        name: 'Classic Column',
        description: 'Classic column-based invoice template',
        isDefault: true
      },
      {
        id: 'modern-stripe',
        name: 'Modern Stripe',
        description: 'Modern stripe-style invoice template',
        isDefault: true
      },
      {
        id: 'elegant-dark',
        name: 'Elegant Dark',
        description: 'Elegant dark theme invoice template',
        isDefault: true
      },
      {
        id: 'minimal-outline',
        name: 'Minimal Outline',
        description: 'Clean minimal outline template',
        isDefault: true
      }
    ];

    return NextResponse.json(defaultTemplates);
  } catch (error) {
    console.error('Error fetching invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
