/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const { executeInTransaction, logTransaction } = require('../services/transaction-service');

function registerOrderHandlers(databaseService, syncService) {
  // Get all orders
  ipcMain.handle('get-orders', async () => {
    try {
      // Safety check: ensure databaseService is available and has getOrders method
      if (!databaseService) {
        return { success: false, error: 'Database service not available' };
      }
      
      if (typeof databaseService.getOrders !== 'function') {
        return { success: false, error: 'getOrders method not available on database service' };
      }
      
      const orders = await databaseService.getOrders();
      return { success: true, data: orders || [] };
    } catch (error) {
      console.error('get-orders error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get order by ID
  ipcMain.handle('get-order-by-id', async (event, orderId) => {
    try {
      const order = await databaseService.getOrderById(orderId);
      return { success: true, data: order };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create order
  ipcMain.handle('create-order', async (event, orderData) => {
    try {
      logTransaction('create-order', { 
        itemCount: orderData.items?.length || 0,
        status: orderData.status,
        supplierName: orderData.supplierName
      });
      
      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Create the order
        const order = await databaseService.createOrder(orderData);
        
        // Step 2: If order is delivered, add stock to products
        if (orderData.status === 'delivered' && orderData.items && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            const product = await databaseService.getProductById(item.productId);
            if (!product) {
              throw new Error(`Product not found: ${item.productId}`);
            }
            
            const currentStock = product.stock || 0;
            const quantityReceived = item.quantity || 0;
            const newStock = currentStock + quantityReceived;
            
            console.log(`Adding stock for ${product.name}: ${currentStock} -> ${newStock} (received ${quantityReceived})`);
            
            await databaseService.updateProduct(item.productId, {
              stock: newStock
            });
          }
        }
        
        return order;
      });
      
      // Track sync change
      if (syncService && result && result.id) {
        syncService.trackChange('orders', result.id.toString(), 'create', result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error('create-order transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Update order
  ipcMain.handle('update-order', async (event, payload) => {
    try {
      const { id, updates } = payload;
      logTransaction('update-order', { 
        orderId: id,
        statusChange: updates.status,
        hasItemsUpdate: !!(updates.items && Array.isArray(updates.items))
      });
      
      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Get original order
        const originalOrder = await databaseService.getOrderById(id);
        if (!originalOrder) {
          throw new Error('Order not found');
        }
        
        // Step 2: Handle stock changes based on status changes
        const itemsToProcess = updates.items || originalOrder.items;
        
        // If status changed to delivered, add stock
        if (updates.status === 'delivered' && originalOrder.status !== 'delivered') {
          if (itemsToProcess && Array.isArray(itemsToProcess)) {
            for (const item of itemsToProcess) {
              const product = await databaseService.getProductById(item.productId);
              if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
              }
              
              const currentStock = product.stock || 0;
              const quantityReceived = item.quantity || 0;
              const newStock = currentStock + quantityReceived;
              
              console.log(`Adding stock for ${product.name}: ${currentStock} -> ${newStock} (received ${quantityReceived})`);
              
              await databaseService.updateProduct(item.productId, {
                stock: newStock
              });
            }
          }
        }
        
        // If status changed from delivered to something else, remove stock
        if (originalOrder.status === 'delivered' && updates.status && updates.status !== 'delivered') {
          if (originalOrder.items && Array.isArray(originalOrder.items)) {
            for (const item of originalOrder.items) {
              const product = await databaseService.getProductById(item.productId);
              if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
              }
              
              const currentStock = product.stock || 0;
              const quantityToRemove = item.quantity || 0;
              const newStock = Math.max(0, currentStock - quantityToRemove);
              
              console.log(`Removing stock for ${product.name}: ${currentStock} -> ${newStock} (removed ${quantityToRemove})`);
              
              await databaseService.updateProduct(item.productId, {
                stock: newStock
              });
            }
          }
        }
        
        // Step 3: Update the order
        const order = await databaseService.updateOrder(id, updates);
        
        return order;
      });
      
      // Track sync change
      if (syncService && result && result.id) {
        syncService.trackChange('orders', result.id.toString(), 'update', result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error('update-order transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete order
  ipcMain.handle('delete-order', async (event, orderId) => {
    try {
      console.log('Deleting order:', orderId);
      
      // Get order to check if we need to remove stock
      const order = await databaseService.getOrderById(orderId);
      
      // If order was delivered, remove the stock that was added
      if (order && order.status === 'delivered' && order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          try {
            const product = await databaseService.getProductById(item.productId);
            if (product) {
              const currentStock = product.stock || 0;
              const quantityToRemove = item.quantity || 0;
              const newStock = Math.max(0, currentStock - quantityToRemove);
              
              console.log(`Removing stock for ${product.name}: ${currentStock} -> ${newStock} (removed ${quantityToRemove})`);
              
              await databaseService.updateProduct(item.productId, {
                stock: newStock
              });
            }
          } catch (stockError) {
            console.error(`Error removing stock for product ${item.productId}:`, stockError);
          }
        }
      }
      
      await databaseService.deleteOrder(orderId);
      
      // Track sync change
      if (syncService) {
        syncService.trackChange('orders', orderId.toString(), 'delete');
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Order handlers registered');
}

module.exports = {
  registerOrderHandlers
};

