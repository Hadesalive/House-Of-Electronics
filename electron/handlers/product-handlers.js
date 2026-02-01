/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

function registerProductHandlers(databaseService, syncService) {
  // Product-related IPC handlers
  ipcMain.handle('get-products', async () => {
    try {
      // Safety check: ensure databaseService is available and has getProducts method
      if (!databaseService) {
        return { success: false, error: 'Database service not available' };
      }
      
      if (typeof databaseService.getProducts !== 'function') {
        return { success: false, error: 'getProducts method not available on database service' };
      }
      
      const products = await databaseService.getProducts();
      return { success: true, data: products || [] };
    } catch (error) {
      console.error('get-products error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-product', async (event, productData) => {
    try {
      // Validate cost field only if provided (cost is optional)
      if (productData.cost !== null && productData.cost !== undefined) {
        if (typeof productData.cost !== 'number' || productData.cost < 0) {
          return {
            success: false,
            error: 'Product cost must be a number greater than or equal to 0.'
          };
        }
      }
      
      const product = await databaseService.createProduct(productData);
      // Track sync change
      if (syncService && product && product.id) {
        syncService.trackChange('products', product.id.toString(), 'create', product);
      }
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-product', async (event, id, updates) => {
    try {
      // Validate cost field only if provided (cost is optional, can be undefined/null to clear it)
      if (updates.cost !== undefined && updates.cost !== null) {
        if (typeof updates.cost !== 'number' || updates.cost < 0) {
          return {
            success: false,
            error: 'Product cost must be a number greater than or equal to 0.'
          };
        }
      }
      
      const product = await databaseService.updateProduct(id, updates);
      // Track sync change
      if (syncService && product && product.id) {
        syncService.trackChange('products', product.id.toString(), 'update', product);
      }
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-product', async (event, productId) => {
    try {
      await databaseService.deleteProduct(productId);
      // Track sync change
      if (syncService) {
        syncService.trackChange('products', productId.toString(), 'delete');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-product-by-id', async (event, productId) => {
    try {
      const product = await databaseService.getProductById(productId);
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Product handlers registered');
}

module.exports = {
  registerProductHandlers
};
