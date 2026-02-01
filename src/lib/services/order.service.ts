import { Order, ApiResponse } from '@/lib/types/core';

export class OrderService {
  // Get all orders
  async getAllOrders(): Promise<ApiResponse<Order[]>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.getOrders) {
        const result = await window.electronAPI.getOrders() as ApiResponse<Order[]>;
        return {
          success: result.success,
          data: result.data || [],
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available', data: [] };
    } catch (error) {
      console.error('Error getting orders:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get orders',
        data: []
      };
    }
  }

  // Get order by ID
  async getOrderById(id: string): Promise<ApiResponse<Order | null>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.getOrderById) {
        const result = await window.electronAPI.getOrderById(id) as ApiResponse<Order>;
        return {
          success: result.success,
          data: result.data || null,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available', data: null };
    } catch (error) {
      console.error('Error getting order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get order',
        data: null
      };
    }
  }

  // Create new order
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.createOrder) {
        const result = await window.electronAPI.createOrder(orderData) as ApiResponse<Order>;
        return {
          success: result.success,
          data: result.data,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error creating order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create order'
      };
    }
  }

  // Update order
  async updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Order>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.updateOrder) {
        const result = await window.electronAPI.updateOrder(id, updates) as ApiResponse<Order>;
        return {
          success: result.success,
          data: result.data,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error updating order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update order'
      };
    }
  }

  // Delete order
  async deleteOrder(id: string): Promise<ApiResponse<void>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.deleteOrder) {
        const result = await window.electronAPI.deleteOrder(id) as ApiResponse<boolean>;
        return {
          success: result.success,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete order'
      };
    }
  }

  // Get orders by status
  async getOrdersByStatus(status: Order['status']): Promise<ApiResponse<Order[]>> {
    const result = await this.getAllOrders();
    if (result.success && result.data) {
      const filtered = result.data.filter(order => order.status === status);
      return { success: true, data: filtered };
    }
    return result;
  }

  // Get orders by payment status
  async getOrdersByPaymentStatus(paymentStatus: Order['paymentStatus']): Promise<ApiResponse<Order[]>> {
    const result = await this.getAllOrders();
    if (result.success && result.data) {
      const filtered = result.data.filter(order => order.paymentStatus === paymentStatus);
      return { success: true, data: filtered };
    }
    return result;
  }

  // Get orders by supplier
  async getOrdersBySupplier(supplierName: string): Promise<ApiResponse<Order[]>> {
    const result = await this.getAllOrders();
    if (result.success && result.data) {
      const filtered = result.data.filter(
        order => order.supplierName.toLowerCase().includes(supplierName.toLowerCase())
      );
      return { success: true, data: filtered };
    }
    return result;
  }

  // Search orders
  async searchOrders(searchTerm: string): Promise<ApiResponse<Order[]>> {
    const result = await this.getAllOrders();
    if (result.success && result.data) {
      const term = searchTerm.toLowerCase();
      const filtered = result.data.filter(
        order =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.supplierName.toLowerCase().includes(term) ||
          order.notes?.toLowerCase().includes(term)
      );
      return { success: true, data: filtered };
    }
    return result;
  }
}

// Export singleton instance
export const orderService = new OrderService();

