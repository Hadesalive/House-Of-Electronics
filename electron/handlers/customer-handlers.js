/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

function registerCustomerHandlers(databaseService, syncService) {
  // Customer-related IPC handlers
  ipcMain.handle('get-customers', async () => {
    try {
      const customers = await databaseService.getCustomers();
      return { success: true, data: customers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-customer', async (event, customerData) => {
    try {
      const customer = await databaseService.createCustomer(customerData);
      // Track sync change
      if (syncService && customer && customer.id) {
        syncService.trackChange('customers', customer.id.toString(), 'create', customer);
      }
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-customer', async (event, payload) => {
    try {
      const { id, updates } = payload;
      const customer = await databaseService.updateCustomer(id, updates);
      // Track sync change
      if (syncService && customer && customer.id) {
        syncService.trackChange('customers', customer.id.toString(), 'update', customer);
      }
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-customer', async (event, customerId) => {
    try {
      await databaseService.deleteCustomer(customerId);
      // Track sync change
      if (syncService) {
        syncService.trackChange('customers', customerId.toString(), 'delete');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-customer-by-id', async (event, id) => {
    try {
      const customer = await databaseService.getCustomerById(id);
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('search-customers', async (event, query) => {
    try {
      const customers = await databaseService.searchCustomers(query);
      return { success: true, data: customers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-customer-stats', async () => {
    try {
      const stats = await databaseService.getCustomerStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Add store credit to customer
  ipcMain.handle('add-customer-store-credit', async (event, payload) => {
    try {
      const { customerId, creditAmount, reason } = payload;
      
      if (!customerId) {
        return { success: false, error: 'Customer ID is required' };
      }
      
      if (!creditAmount || creditAmount <= 0) {
        return { success: false, error: 'Credit amount must be greater than 0' };
      }
      
      // Get customer
      const customer = await databaseService.getCustomerById(customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      // Calculate new credit
      const currentCredit = customer.storeCredit || 0;
      const newCredit = currentCredit + creditAmount;
      
      // Update customer
      const updatedCustomer = await databaseService.updateCustomer(customerId, {
        storeCredit: newCredit
      });
      
      // Track sync change
      if (syncService && updatedCustomer && updatedCustomer.id) {
        syncService.trackChange('customers', updatedCustomer.id.toString(), 'update', updatedCustomer);
      }
      
      console.log(`Added store credit for customer ${customer.name}: ${currentCredit} -> ${newCredit} (added ${creditAmount})${reason ? ` - Reason: ${reason}` : ''}`);
      
      return { 
        success: true, 
        data: {
          customer: updatedCustomer,
          previousCredit: currentCredit,
          addedCredit: creditAmount,
          newCredit: newCredit
        }
      };
    } catch (error) {
      console.error('Error adding store credit:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Customer handlers registered');
}

module.exports = {
  registerCustomerHandlers
};
