import { BaseService } from './base.service';
import { Sale, SaleItem, Product, ApiResponse, PaginatedResponse } from '../types/core';

export class SalesService extends BaseService {
  constructor() {
    super();
  }

  async getAllSales(): Promise<ApiResponse<Sale[]>> {
    try {
      console.log('🔧 salesService.getAllSales called');
      // Use Electron IPC to get sales
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('🔧 window.electronAPI available, calling getSales');
        const result = await window.electronAPI.getSales() as {
          success: boolean;
          data?: Sale[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale[]>(result.error || 'Failed to fetch sales');
        }

        return this.createSuccessResponse(result.data || []);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale[]>(error);
    }
  }

  async getSaleById(id: string): Promise<ApiResponse<Sale | null>> {
    try {
      // Use Electron IPC to get sale by ID
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getSaleById(id) as {
          success: boolean;
          data?: Sale | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale | null>(result.error || 'Failed to fetch sale');
        }

        return this.createSuccessResponse(result.data || null);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale | null>(error);
    }
  }

  async createSale(saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Sale>> {
    try {
      const errors = this.validateRequired(saleData, ['items', 'total']);
      if (errors.length > 0) {
        return this.createErrorResponse<Sale>(errors.join(', '));
      }

      if (saleData.items.length === 0) {
        return this.createErrorResponse<Sale>('Sale must have at least one item');
      }

      // Validate stock availability
      const stockValidation = await this.validateStockAvailability(saleData.items);
      if (!stockValidation.success) {
        return this.createErrorResponse<Sale>(stockValidation.error!);
      }

      // Use Electron IPC to create sale
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createSale(saleData) as {
          success: boolean;
          data?: Sale;
          error?: string;
        };

        if (!result.success || !result.data) {
          return this.createErrorResponse<Sale>(result.error || 'Failed to create sale');
        }

        return this.createSuccessResponse(result.data);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale>(error);
    }
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<ApiResponse<Sale>> {
    try {
      // Use Electron IPC to update sale
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateSale(id, updates) as {
          success: boolean;
          data?: Sale;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale>(result.error || 'Failed to update sale');
        }

        return this.createSuccessResponse(result.data!);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale>(error);
    }
  }

  async deleteSale(id: string): Promise<ApiResponse<boolean>> {
    try {
      // Use Electron IPC to delete sale
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteSale(id) as {
          success: boolean;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to delete sale');
        }

        return this.createSuccessResponse(true);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }

  async getSalesByStatus(status: Sale['status']): Promise<ApiResponse<Sale[]>> {
    try {
      // Use Electron IPC to get all sales and filter by status
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getSales() as {
          success: boolean;
          data?: Sale[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale[]>(result.error || 'Failed to fetch sales');
        }

        const sales = result.data || [];
        const filtered = sales.filter((sale: Sale) => sale.status === status);
        return this.createSuccessResponse(filtered);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale[]>(error);
    }
  }

  async getRecentSales(limit: number = 10): Promise<ApiResponse<Sale[]>> {
    try {
      // Use Electron IPC to get all sales and sort by date
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getSales() as {
          success: boolean;
          data?: Sale[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale[]>(result.error || 'Failed to fetch sales');
        }

        const sales = result.data || [];
        const recent = sales
          .sort((a: Sale, b: Sale) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
        
        return this.createSuccessResponse(recent);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale[]>(error);
    }
  }

  async getSalesPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    try {
      // Use Electron IPC to get all sales and paginate
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getSales() as {
          success: boolean;
          data?: Sale[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<PaginatedResponse<Sale>>(result.error || 'Failed to fetch sales');
        }

        const sales = result.data || [];
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSales = sales.slice(startIndex, endIndex);

        return this.createSuccessResponse({
          items: paginatedSales,
          total: sales.length,
          page,
          limit,
          hasNext: endIndex < sales.length,
          hasPrev: page > 1,
        });
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<PaginatedResponse<Sale>>('Electron IPC not available');
    } catch (error) {
      return this.handleError<PaginatedResponse<Sale>>(error);
    }
  }

  async searchSales(query: string): Promise<ApiResponse<Sale[]>> {
    try {
      // Use Electron IPC to get all sales and filter
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getSales() as {
          success: boolean;
          data?: Sale[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Sale[]>(result.error || 'Failed to fetch sales');
        }

        const sales = result.data || [];
        const filtered = sales.filter((sale: Sale) =>
          sale.id.toLowerCase().includes(query.toLowerCase()) ||
          sale.customerName?.toLowerCase().includes(query.toLowerCase()) ||
          sale.paymentMethod.toLowerCase().includes(query.toLowerCase())
        );

        return this.createSuccessResponse(filtered);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Sale[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Sale[]>(error);
    }
  }

  private async validateStockAvailability(items: SaleItem[]): Promise<ApiResponse<boolean>> {
    try {
      // Use Electron IPC to get all products and validate stock
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProducts() as {
          success: boolean;
          data?: Product[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to fetch products');
        }

        const products = result.data || [];

        for (const item of items) {
          const product = products.find((p: Product) => p.id === item.productId);
          if (!product) {
            return this.createErrorResponse<boolean>(`Product ${item.productName} not found`);
          }
          if (product.stock < item.quantity) {
            return this.createErrorResponse<boolean>(`Insufficient stock for ${item.productName}. Available: ${product.stock}`);
          }
        }

        return this.createSuccessResponse(true);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }
}