import { BaseService } from './base.service';
import { Invoice, ApiResponse } from '../types/core';

export class InvoiceService extends BaseService {
  async getAllInvoices(): Promise<ApiResponse<Invoice[]>> {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('get-invoices') as {
          success: boolean;
          data?: Invoice[];
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch invoices');
        }
        
        return this.createSuccessResponse(result.data || []);
      }
      
      throw new Error('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getInvoiceById(id: string): Promise<ApiResponse<Invoice | null>> {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('get-invoice-by-id', id) as {
          success: boolean;
          data?: Invoice | null;
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch invoice');
        }
        
        return this.createSuccessResponse(result.data || null);
      }
      
      throw new Error('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createInvoice(invoiceData: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('create-invoice', invoiceData) as {
          success: boolean;
          data?: Invoice;
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create invoice');
        }
        
        return this.createSuccessResponse(result.data!);
      }
      
      throw new Error('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('update-invoice', { id, updates }) as {
          success: boolean;
          data?: Invoice;
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update invoice');
        }
        
        return this.createSuccessResponse(result.data!);
      }
      
      throw new Error('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteInvoice(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('delete-invoice', id) as {
          success: boolean;
          data?: boolean;
          error?: string;
        };
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete invoice');
        }
        
        return this.createSuccessResponse(result.data || false);
      }
      
      throw new Error('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }
}
