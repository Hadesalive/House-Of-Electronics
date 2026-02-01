import { BaseService } from './base.service';
import { ApiResponse } from '../types/core';

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  method?: string;
}

export interface DebtRecord {
  id: string;
  customer_id?: string;
  amount: number;
  paid: number;
  created_at: string;
  status: 'active' | 'paid';
  description?: string;
  sale_id?: string;
  payments?: DebtPayment[];
}

export class CreditService extends BaseService {
  async getAllDebts(): Promise<ApiResponse<DebtRecord[]>> {
    try {
      const result = await window.electronAPI.getAllDebts();
      return result as ApiResponse<DebtRecord[]>;
    } catch (error) {
      return this.handleError<DebtRecord[]>(error);
    }
  }

  async addDebt(payload: { customerId: string; amount?: number; description?: string; saleId?: string; items?: Array<{ productId?: string; productName?: string; quantity: number; unitPrice: number }> }): Promise<ApiResponse<DebtRecord>> {
    try {
      const result = await window.electronAPI.addDebt(payload);
      return result as ApiResponse<DebtRecord>;
    } catch (error) {
      return this.handleError<DebtRecord>(error);
    }
  }

  async addDebtPayment(payload: { debtId: string; amount: number; method?: string }): Promise<ApiResponse<{ payment: DebtPayment; debt: DebtRecord }>> {
    try {
      const result = await window.electronAPI.addDebtPayment(payload);
      return result as ApiResponse<{ payment: DebtPayment; debt: DebtRecord }>;
    } catch (error) {
      return this.handleError<{ payment: DebtPayment; debt: DebtRecord }>(error);
    }
  }

  async convertDebtToSale(payload: { debtId: string; saleId?: string }): Promise<ApiResponse<DebtRecord>> {
    try {
      const result = await window.electronAPI.convertDebtToSale(payload);
      return result as ApiResponse<DebtRecord>;
    } catch (error) {
      return this.handleError<DebtRecord>(error);
    }
  }

  async deleteDebt(id: string): Promise<ApiResponse<boolean>> {
    try {
      const result = await window.electronAPI.deleteDebt(id) as { success: boolean; error?: string };
      if (!result.success) return this.createErrorResponse<boolean>(result.error || 'Failed to delete debt');
      return this.createSuccessResponse(true);
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }
}

export const creditService = new CreditService();
