import { BaseService } from './base.service';
import { Customer, ApiResponse, PaginatedResponse } from '../types/core';

export class CustomerService extends BaseService {
  constructor() {
    super();
  }

  async getAllCustomers(): Promise<ApiResponse<Customer[]>> {
    try {
      // Use Electron IPC to get customers
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getCustomers() as {
          success: boolean;
          data?: Customer[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Customer[]>(result.error || 'Failed to fetch customers');
        }

        return this.createSuccessResponse(result.data || []);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer[]>(error);
    }
  }

  async getCustomerById(id: string): Promise<ApiResponse<Customer | null>> {
    try {
      // Use Electron IPC to get customer by ID
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getCustomerById(id) as {
          success: boolean;
          data?: Customer | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Customer | null>(result.error || 'Failed to fetch customer');
        }

        return this.createSuccessResponse(result.data || null);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer | null>(error);
    }
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    try {
      // Validate required fields
      const errors = this.validateRequired(customerData, ['name']);
      if (errors.length > 0) {
        return this.createErrorResponse<Customer>(errors.join(', '));
      }

      // Use Electron IPC to create customer
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createCustomer(customerData) as {
          success: boolean;
          data?: Customer;
          error?: string;
        };

        if (!result.success || !result.data) {
          return this.createErrorResponse<Customer>(result.error || 'Failed to create customer');
        }

        return this.createSuccessResponse(result.data);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer>(error);
    }
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<ApiResponse<Customer>> {
    try {
      // Use Electron IPC to update customer
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateCustomer(id, updates) as {
          success: boolean;
          data?: Customer;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Customer>(result.error || 'Failed to update customer');
        }

        return this.createSuccessResponse(result.data!);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer>(error);
    }
  }

  async deleteCustomer(id: string): Promise<ApiResponse<boolean>> {
    try {
      // Use Electron IPC to delete customer
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteCustomer(id) as {
          success: boolean;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to delete customer');
        }

        return this.createSuccessResponse(true);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }

  async searchCustomers(query: string): Promise<ApiResponse<Customer[]>> {
    try {
      // Use Electron IPC to search customers
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.searchCustomers(query) as {
          success: boolean;
          data?: Customer[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Customer[]>(result.error || 'Failed to search customers');
        }

        return this.createSuccessResponse(result.data || []);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer[]>(error);
    }
  }

  async getCustomersPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    try {
      // Use Electron IPC to get all customers and paginate
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getCustomers() as {
          success: boolean;
          data?: Customer[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<PaginatedResponse<Customer>>(result.error || 'Failed to fetch customers');
        }

        const customers = result.data || [];
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCustomers = customers.slice(startIndex, endIndex);

        return this.createSuccessResponse({
          items: paginatedCustomers,
          total: customers.length,
          page,
          limit,
          hasNext: endIndex < customers.length,
          hasPrev: page > 1,
        });
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<PaginatedResponse<Customer>>('Electron IPC not available');
    } catch (error) {
      return this.handleError<PaginatedResponse<Customer>>(error);
    }
  }

  async exportCustomers(): Promise<ApiResponse<{ path: string; count: number }>> {
    try {
      // Use Electron IPC for file export
      if (typeof window !== 'undefined' && window.electronAPI) {
        const response = await window.electronAPI.exportData() as {
          success: boolean;
          path?: string;
          error?: string;
        };
        
        if (response.success && response.path) {
          // Get customer count for reporting
          const customersResult = await window.electronAPI.getCustomers() as {
            success: boolean;
            data?: Customer[];
          };
          const customerCount = customersResult.data?.length || 0;
          
          return this.createSuccessResponse({
            path: response.path,
            count: customerCount
          });
        }
      }
      
      return this.createErrorResponse('Export functionality not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async importCustomers(): Promise<ApiResponse<{ importedCount: number; totalCount: number }>> {
    try {
      // Use Electron IPC for file import
      if (typeof window !== 'undefined' && window.electronAPI) {
        const response = await window.electronAPI.importData() as {
          success: boolean;
          data?: { customers?: Customer[] };
          error?: string;
        };
        
        if (response.success) {
          const importedCount = response.data?.customers?.length || 0;
          
          // Get current customer count
          const customersResult = await window.electronAPI.getCustomers() as {
            success: boolean;
            data?: Customer[];
          };
          const totalCount = customersResult.data?.length || 0;
          
          return this.createSuccessResponse({
            importedCount,
            totalCount
          });
        }
      }
      
      return this.createErrorResponse('Import functionality not available');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getActiveCustomers(): Promise<ApiResponse<Customer[]>> {
    try {
      // Use Electron IPC to get all customers and filter for active ones
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getCustomers() as {
          success: boolean;
          data?: Customer[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Customer[]>(result.error || 'Failed to fetch customers');
        }

        const customers = result.data || [];
        const activeCustomers = customers.filter((customer: Customer) => 
          customer.isActive !== false // Default to active if not specified
        );
        
        return this.createSuccessResponse(activeCustomers);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Customer[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Customer[]>(error);
    }
  }

  async getCustomerStats(): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    withEmail: number;
    withPhone: number;
  }>> {
    try {
      // Use Electron IPC to get customer stats
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getCustomerStats() as {
          success: boolean;
          data?: {
            total: number;
            active: number;
            inactive: number;
            withEmail: number;
            withPhone: number;
          };
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse(result.error || 'Failed to fetch customer stats');
        }

        return this.createSuccessResponse(result.data || {
          total: 0,
          active: 0,
          inactive: 0,
          withEmail: 0,
          withPhone: 0
        });
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse('Electron IPC not available');
    } catch (error) {
      return this.handleError(error);
    }
  }
}