/**
 * Product Key Handlers
 * Simple product key activation for internal Electron app
 */

const { ipcMain } = require('electron');
const { getProductKeyService } = require('../services/product-key-service');

function registerProductKeyHandlers(databaseService) {
  if (!databaseService || !databaseService.db) {
    console.error('Product key handlers: databaseService not available');
    return;
  }

  const productKeyService = getProductKeyService(databaseService);

  // Check if product key is activated
  ipcMain.handle('check-product-key', async () => {
    try {
      const activated = await productKeyService.isActivated();
      return {
        success: true,
        activated
      };
    } catch (error) {
      console.error('Error checking product key:', error);
      return {
        success: false,
        activated: false,
        error: error.message
      };
    }
  });

  // Validate product key (without activating)
  ipcMain.handle('validate-product-key', async (event, productKey) => {
    try {
      const result = await productKeyService.validateOnline(productKey);
      return result;
    } catch (error) {
      console.error('Error validating product key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Activate with product key
  ipcMain.handle('activate-product-key', async (event, productKey) => {
    try {
      const result = await productKeyService.activate(productKey);
      return result;
    } catch (error) {
      console.error('Error activating product key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get activation info
  ipcMain.handle('get-activation-info', async () => {
    try {
      const info = await productKeyService.getActivationInfo();
      return {
        success: true,
        data: info
      };
    } catch (error) {
      console.error('Error getting activation info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Deactivate (for testing/reset)
  ipcMain.handle('deactivate-product-key', async () => {
    try {
      const result = await productKeyService.deactivate();
      return result;
    } catch (error) {
      console.error('Error deactivating product key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ Product key handlers registered');
}

module.exports = { registerProductKeyHandlers };
