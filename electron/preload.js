/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Data operations
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),
  
  // Company settings operations
  getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
  updateCompanySettings: (settings) => ipcRenderer.invoke('update-company-settings', settings),
  
  // Preferences operations
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  updatePreferences: (preferences) => ipcRenderer.invoke('update-preferences', preferences),
  
  // Customer operations
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getCustomerById: (id) => ipcRenderer.invoke('get-customer-by-id', id),
  createCustomer: (customerData) => ipcRenderer.invoke('create-customer', customerData),
  updateCustomer: (id, customerData) => ipcRenderer.invoke('update-customer', { id, updates: customerData }),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  searchCustomers: (query) => ipcRenderer.invoke('search-customers', query),
  getCustomerStats: () => ipcRenderer.invoke('get-customer-stats'),
  addCustomerStoreCredit: (payload) => ipcRenderer.invoke('add-customer-store-credit', payload),
  
  // Credit/Debt operations
  getAllDebts: () => ipcRenderer.invoke('get-all-debts'),
  addDebt: (debtData) => ipcRenderer.invoke('add-debt', debtData),
  addDebtPayment: (paymentData) => ipcRenderer.invoke('add-debt-payment', paymentData),
  convertDebtToSale: (data) => ipcRenderer.invoke('convert-debt-to-sale', data),
  deleteDebt: (id) => ipcRenderer.invoke('delete-debt', id),
  
  // Product operations
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProductById: (id) => ipcRenderer.invoke('get-product-by-id', id),
  createProduct: (productData) => ipcRenderer.invoke('create-product', productData),
  updateProduct: (id, productData) => ipcRenderer.invoke('update-product', id, productData),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  
  // Sales operations
  getSales: () => {
    console.log('🔧 preload: getSales called');
    console.log('🔧 preload: About to invoke get-sales IPC');
    const result = ipcRenderer.invoke('get-sales');
    console.log('🔧 preload: IPC invoke returned:', typeof result);
    return result;
  },
  
  // TEST: Simple IPC test
  testSalesIpc: () => {
    console.log('🔧 preload: testSalesIpc called');
    return ipcRenderer.invoke('test-sales-ipc');
  },
  getSaleById: (id) => ipcRenderer.invoke('get-sale-by-id', id),
  createSale: (saleData) => ipcRenderer.invoke('create-sale', saleData),
  updateSale: (id, updates) => ipcRenderer.invoke('update-sale', { id, updates }),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),
  
  // Sales utility operations
  generateInvoice: (saleId) => ipcRenderer.invoke('generate-invoice', saleId),
  printReceipt: (saleId) => ipcRenderer.invoke('print-receipt', saleId),
  applyCustomerCreditToSale: (payload) => ipcRenderer.invoke('apply-customer-credit-to-sale', payload),
  
  // Invoice operations
  getInvoices: () => ipcRenderer.invoke('get-invoices'),
  getInvoiceById: (id) => ipcRenderer.invoke('get-invoice-by-id', id),
  createInvoice: (invoiceData) => ipcRenderer.invoke('create-invoice', invoiceData),
  updateInvoice: (id, invoiceData) => ipcRenderer.invoke('update-invoice', { id, body: invoiceData }),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),
  
  // Invoice template operations
  getInvoiceTemplates: () => ipcRenderer.invoke('get-invoice-templates'),
  getInvoiceTemplate: (id) => ipcRenderer.invoke('get-invoice-template', id),
  createInvoiceTemplate: (templateData) => ipcRenderer.invoke('create-invoice-template', templateData),
  updateInvoiceTemplate: (id, templateData) => ipcRenderer.invoke('update-invoice-template', id, templateData),
  deleteInvoiceTemplate: (id) => ipcRenderer.invoke('delete-invoice-template', id),
  
  // Invoice payment operations
  handleInvoiceOverpayment: (payload) => ipcRenderer.invoke('handle-invoice-overpayment', payload),
  applyCustomerCredit: (payload) => ipcRenderer.invoke('apply-customer-credit', payload),
  
  // Order operations
  getOrders: () => ipcRenderer.invoke('get-orders'),
  getOrderById: (id) => ipcRenderer.invoke('get-order-by-id', id),
  createOrder: (orderData) => ipcRenderer.invoke('create-order', orderData),
  updateOrder: (id, updates) => ipcRenderer.invoke('update-order', { id, updates }),
  deleteOrder: (id) => ipcRenderer.invoke('delete-order', id),
  
  // Return operations
  getReturns: () => ipcRenderer.invoke('get-returns'),
  getReturnById: (id) => ipcRenderer.invoke('get-return-by-id', id),
  createReturn: (returnData) => ipcRenderer.invoke('create-return', returnData),
  updateReturn: (id, updates) => ipcRenderer.invoke('update-return', { id, updates }),
  deleteReturn: (id) => ipcRenderer.invoke('delete-return', id),
  
  // Email operations
  emailInvoice: (emailData) => ipcRenderer.invoke('email-invoice', emailData),
  cleanupTempInvoices: () => ipcRenderer.invoke('cleanup-temp-invoices'),
  
  // PDF operations
  generateInvoicePdfFromHtml: (htmlContent) => ipcRenderer.invoke('generate-invoice-pdf-from-html', htmlContent),
  downloadPdfFile: (pdfBase64, filename) => ipcRenderer.invoke('download-pdf-file', { pdfBase64, filename }),
  
  // Logo processing operations
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  // TODO: Implement automatic logo processing feature in v2 rollout
  // validateLogoFile: (filePath) => ipcRenderer.invoke('validate-logo-file', filePath),
  // autoProcessLogo: (filePath) => ipcRenderer.invoke('auto-process-logo', filePath),
  // getProcessedLogoInfo: (processedPath) => ipcRenderer.invoke('get-processed-logo-info', processedPath),
  // getProcessedLogoBase64: (processedPath) => ipcRenderer.invoke('get-processed-logo-base64', processedPath),
  
  // Reports password operations
  getReportsPassword: () => ipcRenderer.invoke('get-reports-password'),
  setReportsPassword: (password) => ipcRenderer.invoke('set-reports-password', password),
  
  // License and activation operations
  getActivationStatus: () => ipcRenderer.invoke('get-activation-status'),
  getMachineIdentifier: () => ipcRenderer.invoke('get-machine-identifier'),
  importLicenseFile: () => ipcRenderer.invoke('import-license-file'),
  importLicenseData: (data) => ipcRenderer.invoke('import-license-data', data),
  exportActivationRequest: () => ipcRenderer.invoke('export-activation-request'),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
  retryLicenseValidation: () => ipcRenderer.invoke('retry-license-validation'),
  getTelemetrySummary: () => ipcRenderer.invoke('get-telemetry-summary'),
  setTelemetryEnabled: (enabled) => ipcRenderer.invoke('set-telemetry-enabled', enabled),
  onLicenseInvalid: (callback) => ipcRenderer.on('license-invalid', callback),
  onLicenseValid: (callback) => ipcRenderer.on('license-valid', callback),
  
  // Menu events
  onMenuNewSale: (callback) => ipcRenderer.on('menu-new-sale', callback),
  onMenuNewCustomer: (callback) => ipcRenderer.on('menu-new-customer', callback),
  onMenuNewProduct: (callback) => ipcRenderer.on('menu-new-product', callback),
  onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
  onMenuImportData: (callback) => ipcRenderer.on('menu-import-data', callback),
  onMenuNewDebt: (callback) => ipcRenderer.on('menu-new-debt', callback),
  onNavigateToActivation: (callback) => ipcRenderer.on('navigate-to-activation', callback),
  
  // Backup operations
  createBackup: (options) => ipcRenderer.invoke('create-backup', options),
  getBackupList: () => ipcRenderer.invoke('get-backup-list'),
  restoreBackup: (backupFileName) => ipcRenderer.invoke('restore-backup', backupFileName),
  deleteBackup: (backupFileName) => ipcRenderer.invoke('delete-backup', backupFileName),
  exportBackup: (backupFileName) => ipcRenderer.invoke('export-backup', backupFileName),
  getBackupStats: () => ipcRenderer.invoke('get-backup-stats'),
  scheduleBackups: (options) => ipcRenderer.invoke('schedule-backups', options),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Also expose a general electron object for direct IPC calls (e.g., email-invoice)
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    send: (channel, data) => ipcRenderer.send(channel, data)
  }
});
