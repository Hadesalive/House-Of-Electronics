const { ipcMain } = require('electron');

function registerCreditHandlers(databaseService, syncService) {
  const db = databaseService.db;
  // Get all debts
  ipcMain.handle('get-all-debts', async () => {
    try {
      if (!databaseService || typeof databaseService.getAllDebts !== 'function') {
        return { success: false, error: 'Database service not available' };
      }
      const debts = await databaseService.getAllDebts();
      return { success: true, data: debts || [] };
    } catch (error) {
      console.error('get-all-debts error:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a new debt
  ipcMain.handle('add-debt', async (event, debtData) => {
    try {
      const result = await databaseService.addDebt(debtData);
      // Track sync change
      if (syncService && result && result.id) {
        syncService.trackChange('debts', result.id.toString(), 'create', result);
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('add-debt error:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a payment to a debt
  ipcMain.handle('add-debt-payment', async (event, paymentData) => {
    try {
      const result = await databaseService.addDebtPayment(paymentData);
      // Track sync change for the payment
      // addDebtPayment returns { payment, debt }, so we need result.payment.id
      if (syncService && result && result.payment && result.payment.id) {
        syncService.trackChange('debt_payments', result.payment.id.toString(), 'create', result.payment);
      }
      // Also track the debt update (paid amount and status changed)
      if (syncService && result && result.debt && result.debt.id) {
        syncService.trackChange('debts', result.debt.id.toString(), 'update', result.debt);
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('add-debt-payment error:', error);
      return { success: false, error: error.message };
    }
  });

  // Convert debt to sale
  ipcMain.handle('convert-debt-to-sale', async (event, data) => {
    try {
      const result = await databaseService.convertDebtToSale(data);
      return { success: true, data: result };
    } catch (error) {
      console.error('convert-debt-to-sale error:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete debt
  ipcMain.handle('delete-debt', async (event, id) => {
    try {
      // Get all debt_payments for this debt before deleting (for sync tracking)
      let debtPayments = [];
      try {
        if (db) {
          const stmt = db.prepare('SELECT id FROM debt_payments WHERE debt_id = ?');
          debtPayments = stmt.all(id);
        }
      } catch (err) {
        console.warn('Could not fetch debt_payments for tracking:', err.message);
      }
      
      const ok = await databaseService.deleteDebt(id);
      
      // Track sync changes
      if (syncService && ok) {
        // Track debt deletion
        syncService.trackChange('debts', id.toString(), 'delete');
        
        // Track all debt_payments deletions (cascading delete)
        if (debtPayments && debtPayments.length > 0) {
          for (const payment of debtPayments) {
            syncService.trackChange('debt_payments', payment.id.toString(), 'delete');
          }
          console.log(`Tracked ${debtPayments.length} debt_payments for deletion with debt ${id}`);
        }
      }
      return { success: ok };
    } catch (error) {
      console.error('delete-debt error:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Credit handlers registered');
}

module.exports = { registerCreditHandlers };
