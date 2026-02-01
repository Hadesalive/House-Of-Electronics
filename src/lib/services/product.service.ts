import { BaseService } from './base.service';
import { Product, ApiResponse, PaginatedResponse } from '../types/core';

export class ProductService extends BaseService {
  constructor() {
    super();
  }

  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      // Use Electron IPC to get products
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProducts() as {
          success: boolean;
          data?: Product[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product[]>(result.error || 'Failed to fetch products');
        }

        return this.createSuccessResponse(result.data || []);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product[]>(error);
    }
  }

  async getProductById(id: string): Promise<ApiResponse<Product | null>> {
    try {
      // Use Electron IPC to get product by ID
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProductById(id) as {
          success: boolean;
          data?: Product | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product | null>(result.error || 'Failed to fetch product');
        }

        return this.createSuccessResponse(result.data || null);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product | null>(error);
    }
  }

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    try {
      const errors = this.validateRequired(productData, ['name', 'price']);
      if (errors.length > 0) {
        return this.createErrorResponse<Product>(errors.join(', '));
      }

      if (productData.price <= 0) {
        return this.createErrorResponse<Product>('Price must be greater than 0');
      }

      // Use Electron IPC to create product
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createProduct(productData) as {
          success: boolean;
          data?: Product;
          error?: string;
        };

        if (!result.success || !result.data) {
          return this.createErrorResponse<Product>(result.error || 'Failed to create product');
        }

        return this.createSuccessResponse(result.data);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product>(error);
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      // Use Electron IPC to update product
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateProduct(id, updates) as {
          success: boolean;
          data?: Product;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product>(result.error || 'Failed to update product');
        }

        return this.createSuccessResponse(result.data!);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product>(error);
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<boolean>> {
    try {
      // Use Electron IPC to delete product
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteProduct(id) as {
          success: boolean;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to delete product');
        }

        return this.createSuccessResponse(true);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }

  async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    try {
      // Use Electron IPC to get all products and filter for low stock
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProducts() as {
          success: boolean;
          data?: Product[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product[]>(result.error || 'Failed to fetch products');
        }

        const products = result.data || [];
        const lowStock = products.filter((product: Product) => 
          product.minStock && product.stock <= product.minStock
        );
        
        return this.createSuccessResponse(lowStock);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product[]>(error);
    }
  }

  async updateStock(productId: string, newStock: number): Promise<ApiResponse<Product>> {
    try {
      if (newStock < 0) {
        return this.createErrorResponse<Product>('Stock cannot be negative');
      }

      // Use Electron IPC to update product stock
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateProduct(productId, { stock: newStock }) as {
          success: boolean;
          data?: Product;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product>(result.error || 'Failed to update stock');
        }

        return this.createSuccessResponse(result.data!);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product>(error);
    }
  }

  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    try {
      // Use Electron IPC to get all products and filter
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProducts() as {
          success: boolean;
          data?: Product[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<Product[]>(result.error || 'Failed to fetch products');
        }

        const products = result.data || [];
        const filtered = products.filter((product: Product) =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.sku?.toLowerCase().includes(query.toLowerCase()) ||
          product.category?.toLowerCase().includes(query.toLowerCase())
        );

        return this.createSuccessResponse(filtered);
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<Product[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<Product[]>(error);
    }
  }

  async getProductsPaginated(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Product>>> {
    try {
      // Use Electron IPC to get all products and paginate
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProducts() as {
          success: boolean;
          data?: Product[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<PaginatedResponse<Product>>(result.error || 'Failed to fetch products');
        }

        const products = result.data || [];
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = products.slice(startIndex, endIndex);

        return this.createSuccessResponse({
          items: paginatedProducts,
          total: products.length,
          page,
          limit,
          hasNext: endIndex < products.length,
          hasPrev: page > 1,
        });
      }

      // No fallback - Electron IPC is required
      return this.createErrorResponse<PaginatedResponse<Product>>('Electron IPC not available');
    } catch (error) {
      return this.handleError<PaginatedResponse<Product>>(error);
    }
  }
}