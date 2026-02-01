/* eslint-disable @typescript-eslint/no-require-imports */
const { registerSettingsHandlers } = require('./settings-handlers');
const { registerDataHandlers } = require('./data-handlers');
const { registerCustomerHandlers } = require('./customer-handlers');
const { registerProductHandlers } = require('./product-handlers');
const { registerSalesHandlers } = require('./sales-handlers');
const { registerInvoiceHandlers } = require('./invoice-handlers');
const { registerOrderHandlers } = require('./order-handlers');
const { registerReturnHandlers } = require('./return-handlers');
const { registerCreditHandlers } = require('./credit-handlers');
const { registerBOQHandlers } = require('./boq-handlers');
const { setupEmailHandlers } = require('./email-handlers');
const { setupPdfHandlers } = require('./pdf-handlers');
const { registerValidationHandlers } = require('./validation-handlers');
const { registerBackupHandlers } = require('./backup-handlers');
const { registerUserHandlers } = require('./user-handlers');
const { registerSyncHandlers } = require('./sync-handlers');
const { registerProductKeyHandlers } = require('./product-key-handlers');
// TODO: Implement automatic logo processing feature in v2 rollout
// const { setupLogoHandlers } = require('./logo-handlers');

function registerAllHandlers(databaseService, syncService) {
  try {
    // Register all handler modules - pass syncService to handlers that need it
    registerSettingsHandlers(databaseService);
    registerDataHandlers(databaseService);
    registerCustomerHandlers(databaseService, syncService);
    registerProductHandlers(databaseService, syncService);
    registerSalesHandlers(databaseService, syncService);
    registerInvoiceHandlers(databaseService, syncService);
    registerOrderHandlers(databaseService, syncService);
    registerReturnHandlers(databaseService, syncService);
    registerCreditHandlers(databaseService, syncService);
    try {
      registerBOQHandlers(databaseService, syncService);
    } catch (boqError) {
      console.error('Error registering BOQ handlers:', boqError);
      // Don't block other handlers if BOQ handlers fail
    }
    registerValidationHandlers(databaseService); // Data validation handlers
    registerBackupHandlers(); // Backup management handlers
    setupEmailHandlers(); // Email handlers don't need database service
    setupPdfHandlers(); // PDF generation handlers
    registerUserHandlers(databaseService, syncService); // User & RBAC handlers (with sync)
    registerProductKeyHandlers(databaseService); // Product key handlers
    if (syncService) {
      registerSyncHandlers(syncService); // Sync handlers
    }
    // TODO: Implement automatic logo processing feature in v2 rollout
    // setupLogoHandlers(); // Logo processing handlers
  } catch (error) {
    console.error('Error registering IPC handlers:', error);
  }
}

module.exports = {
  registerAllHandlers
};
