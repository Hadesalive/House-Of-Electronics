import { CompanySettings, Customer } from '@/lib/types/core';

export interface Preferences {
  onboardingCompleted: boolean;
  autoSaveDrafts: boolean;
  confirmBeforeDelete: boolean;
  showAnimations: boolean;
  lowStockAlerts: boolean;
  defaultPaymentMethod: string;
  invoiceNumberFormat: string;
  receiptFooter: string;
  autoBackup: boolean;
  backupFrequency: string;
  showProductImages: boolean;
  defaultInvoiceStatus: string;
  receiptPaperSize: string;
  showTaxBreakdown: boolean;
  requireCustomerInfo: boolean;
  autoCalculateTax: boolean;
  defaultDiscountPercent: number;
  showProfitMargin: boolean;
  inventoryTracking: boolean;
  barcodeScanning: boolean;
  darkMode: boolean;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currencyPosition: string;
  decimalPlaces: number;
  autoLogout: boolean;
  sessionTimeout: number;
  printReceipts: boolean;
  soundEffects: boolean;
}

export interface ElectronAPI {
  // Data operations
  saveData: (data: unknown) => Promise<{ success: boolean; error?: string }>;
  loadData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  exportData: () => Promise<{ success: boolean; path?: string; error?: string }>;
  importData: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  
  // Company settings operations
  getCompanySettings: () => Promise<{ success: boolean; data?: CompanySettings; error?: string }>;
  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<{ success: boolean; data?: CompanySettings; error?: string }>;
  
  // Preferences operations
  getPreferences: () => Promise<{ success: boolean; data?: Preferences; error?: string }>;
  updatePreferences: (preferences: Partial<Preferences>) => Promise<{ success: boolean; data?: Preferences; error?: string }>;
  
  // Customer operations
  getCustomers: () => Promise<{ success: boolean; data?: Customer[]; error?: string }>;
  getCustomerById: (id: string) => Promise<{ success: boolean; data?: Customer; error?: string }>;
  createCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; data?: Customer; error?: string }>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<{ success: boolean; data?: Customer; error?: string }>;
  deleteCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
  searchCustomers: (query: string) => Promise<{ success: boolean; data?: Customer[]; error?: string }>;
  getCustomerStats: () => Promise<{ success: boolean; data?: { total: number; active: number; inactive: number; withEmail: number; withPhone: number }; error?: string }>;
  addCustomerStoreCredit: (payload: { customerId: string; creditAmount: number; reason?: string }) => Promise<{ success: boolean; data?: { customer: Customer; previousCredit: number; addedCredit: number; newCredit: number }; error?: string }>;
  
  // Credit/Debt operations
  getAllDebts: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  addDebt: (debtData: { customerId: string; amount?: number; description?: string; saleId?: string; items?: Array<{ productId?: string; productName?: string; quantity: number; unitPrice: number }> }) => Promise<{ success: boolean; data?: any; error?: string }>;
  addDebtPayment: (paymentData: { debtId: string; amount: number; method?: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
  convertDebtToSale: (data: { debtId: string; saleId?: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteDebt: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Product operations
  getProducts: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getProductById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createProduct: (productData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateProduct: (id: string, productData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Sales operations
  getSales: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getSaleById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createSale: (saleData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateSale: (id: string, saleData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteSale: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Sales utility operations
  generateInvoice: (saleId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  printReceipt: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  applyCustomerCreditToSale: (payload: { saleId: string; customerId: string; creditAmount: number }) => Promise<{ success: boolean; data?: { creditApplied: number; remainingCredit: number }; error?: string }>;
  
  // Invoice operations
  getInvoices: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getInvoiceById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createInvoice: (invoiceData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateInvoice: (id: string, invoiceData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteInvoice: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Invoice template operations
  getInvoiceTemplates: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getInvoiceTemplate: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createInvoiceTemplate: (templateData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateInvoiceTemplate: (id: string, templateData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteInvoiceTemplate: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Invoice payment operations
  handleInvoiceOverpayment: (payload: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  applyCustomerCredit: (payload: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  
  // Order operations
  getOrders: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getOrderById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createOrder: (orderData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateOrder: (id: string, orderData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteOrder: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Return operations
  getReturns: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
  getReturnById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  createReturn: (returnData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateReturn: (id: string, returnData: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  deleteReturn: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Email operations
  emailInvoice: (emailData: unknown) => Promise<{ success: boolean; error?: string }>;
  cleanupTempInvoices: () => Promise<{ success: boolean; error?: string }>;
  
  // PDF operations
  generateInvoicePdfFromHtml: (htmlContent: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  downloadPdfFile: (pdfBase64: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  
  // TODO: Implement automatic logo processing feature in v2 rollout
  // Logo processing operations
  invoke: (channel: string, data?: unknown) => Promise<unknown>;
  // validateLogoFile: (filePath: string) => Promise<{ valid: boolean; error?: string }>;
  // autoProcessLogo: (filePath: string) => Promise<string>;
  // getProcessedLogoInfo: (processedPath: string) => Promise<{ path: string; size: number; created: Date; modified: Date }>;
  // getProcessedLogoBase64: (processedPath: string) => Promise<string>;
  
  // Reports password operations
  getReportsPassword: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  setReportsPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  
  // License and activation operations
  getActivationStatus: () => Promise<{
    activated: boolean;
    machineId?: string;
    machineInfo?: {
      machineId: string;
      fullHash: string;
      platform: string;
      hostname: string;
      displayInfo: {
        os: string;
        arch: string;
        cpu: string;
        cores: number;
      };
    };
    reason?: string;
    message?: string;
    license?: {
      customer: {
        name?: string;
        company?: string;
        email?: string;
      };
      activatedAt: string;
      product: {
        name: string;
        version: string;
      };
    };
  }>;
  getMachineIdentifier: () => Promise<{
    machineId: string;
    fullHash: string;
    platform: string;
    hostname: string;
    displayInfo: {
      os: string;
      arch: string;
      cpu: string;
      cores: number;
    };
  }>;
  importLicenseFile: () => Promise<{ success: boolean; error?: string }>;
  importLicenseData: (data: string) => Promise<{ success: boolean; error?: string }>;
  exportActivationRequest: () => Promise<{ success: boolean; path?: string; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>;
  retryLicenseValidation: () => Promise<{ success: boolean }>;
  getTelemetrySummary: () => Promise<{
    enabled: boolean;
    sessions: number;
    violations: number;
    suspiciousActivity: boolean;
  }>;
  setTelemetryEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
  onLicenseInvalid: (callback: (event: unknown) => void) => void;
  onLicenseValid: (callback: (event: unknown) => void) => void;
  
  // Menu events
  onMenuNewSale: (callback: (event: unknown) => void) => void;
  onMenuNewCustomer: (callback: (event: unknown) => void) => void;
  onMenuNewProduct: (callback: (event: unknown) => void) => void;
  onMenuExportData: (callback: (event: unknown) => void) => void;
  onMenuImportData: (callback: (event: unknown) => void) => void;
  onMenuNewDebt: (callback: (event: unknown) => void) => void;
  onNavigateToActivation: (callback: (event: unknown) => void) => void;
  
  // Backup operations
  createBackup: (options?: unknown) => Promise<{ success: boolean; path?: string; fileName?: string; size?: number; sizeFormatted?: string; timestamp?: string; error?: string }>;
  getBackupList: () => Promise<{ success: boolean; backups?: unknown[]; totalSize?: number; totalSizeFormatted?: string; error?: string }>;
  restoreBackup: (backupFileName: string) => Promise<{ success: boolean; restoredFrom?: string; restoredTo?: string; currentBackup?: string; error?: string }>;
  deleteBackup: (backupFileName: string) => Promise<{ success: boolean; deletedFile?: string; error?: string }>;
  exportBackup: (backupFileName: string) => Promise<{ success: boolean; exportedTo?: string; error?: string }>;
  getBackupStats: () => Promise<{ totalBackups: number; totalSize: number; totalSizeFormatted: string; backupDirectory: string; maxBackups: number; error?: string }>;
  scheduleBackups: (options?: unknown) => Promise<{ success: boolean; path?: string; fileName?: string; size?: number; sizeFormatted?: string; timestamp?: string; error?: string }>;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, data?: unknown) => Promise<unknown>;
        send: (channel: string, data?: unknown) => void;
      };
    };
  }
}

export {};
