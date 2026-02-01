/**
 * Validation Handlers
 * 
 * IPC handlers for data validation and financial auditing
 * to ensure data consistency and identify issues.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

function registerValidationHandlers(databaseService) {
  console.log('Registering validation handlers');

  // Validate revenue calculations for double-counting
  ipcMain.handle('validate-revenue-calculations', async () => {
    try {
      const sales = await databaseService.getSales();
      const invoices = await databaseService.getInvoices();
      
      // Check for potential double-counting
      const salesWithInvoices = sales.filter(s => s.invoiceId);
      const linkedInvoices = invoices.filter(i => i.saleId);
      
      const issues = [];
      
      if (salesWithInvoices.length !== linkedInvoices.length) {
        issues.push({
          type: 'MISMATCHED_LINKS',
          severity: 'WARNING',
          description: 'Mismatch between sales with invoices and invoices with sales',
          salesWithInvoices: salesWithInvoices.length,
          linkedInvoices: linkedInvoices.length
        });
      }

      // Check for invoices that might be double-counted
      const independentInvoices = invoices.filter(i => 
        i.status === 'paid' && !i.saleId
      );
      
      const potentialDoubleCount = salesWithInvoices.filter(sale => {
        const linkedInvoice = invoices.find(i => i.saleId === sale.id);
        return linkedInvoice && linkedInvoice.status === 'paid';
      });

      if (potentialDoubleCount.length > 0) {
        issues.push({
          type: 'POTENTIAL_DOUBLE_COUNT',
          severity: 'INFO',
          description: 'Sales with linked paid invoices - ensure these are not double-counted in revenue',
          count: potentialDoubleCount.length
        });
      }

      return {
        success: true,
        data: {
          totalSales: sales.length,
          totalInvoices: invoices.length,
          salesWithInvoices: salesWithInvoices.length,
          linkedInvoices: linkedInvoices.length,
          independentInvoices: independentInvoices.length,
          issues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate stock consistency
  ipcMain.handle('validate-stock-consistency', async () => {
    try {
      const products = await databaseService.getProducts();
      const sales = await databaseService.getSales();
      const returns = await databaseService.getReturns();
      const orders = await databaseService.getOrders();
      
      const issues = [];
      
      // Check for negative stock
      const negativeStockProducts = products.filter(p => p.stock < 0);
      if (negativeStockProducts.length > 0) {
        issues.push({
          type: 'NEGATIVE_STOCK',
          severity: 'WARNING',
          description: 'Products with negative stock levels',
          count: negativeStockProducts.length,
          products: negativeStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock
          }))
        });
      }

      // Check for products with stock > 1000 (potential data entry error)
      const highStockProducts = products.filter(p => p.stock > 1000);
      if (highStockProducts.length > 0) {
        issues.push({
          type: 'HIGH_STOCK',
          severity: 'INFO',
          description: 'Products with unusually high stock levels',
          count: highStockProducts.length,
          products: highStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock
          }))
        });
      }

      // Check for products with min_stock > current stock
      const lowStockProducts = products.filter(p => 
        p.minStock && p.stock < p.minStock
      );
      if (lowStockProducts.length > 0) {
        issues.push({
          type: 'LOW_STOCK',
          severity: 'INFO',
          description: 'Products below minimum stock level',
          count: lowStockProducts.length,
          products: lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock
          }))
        });
      }

      return {
        success: true,
        data: {
          totalProducts: products.length,
          totalSales: sales.length,
          totalReturns: returns.length,
          totalOrders: orders.length,
          issues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate product costs
  ipcMain.handle('validate-product-costs', async () => {
    try {
      const products = await databaseService.getProducts();
      
      const issues = [];
      
      // Check for products without cost
      const productsWithoutCost = products.filter(p => 
        p.cost === null || p.cost === undefined || p.cost === 0
      );
      if (productsWithoutCost.length > 0) {
        issues.push({
          type: 'MISSING_COST',
          severity: 'WARNING',
          description: 'Products without cost data will affect profit calculations',
          count: productsWithoutCost.length,
          products: productsWithoutCost.map(p => ({
            id: p.id,
            name: p.name,
            cost: p.cost
          }))
        });
      }

      // Check for products with negative cost
      const negativeCostProducts = products.filter(p => p.cost < 0);
      if (negativeCostProducts.length > 0) {
        issues.push({
          type: 'NEGATIVE_COST',
          severity: 'ERROR',
          description: 'Products with negative cost are invalid',
          count: negativeCostProducts.length,
          products: negativeCostProducts.map(p => ({
            id: p.id,
            name: p.name,
            cost: p.cost
          }))
        });
      }

      // Check for products with cost > price
      const highCostProducts = products.filter(p => p.cost > p.price);
      if (highCostProducts.length > 0) {
        issues.push({
          type: 'COST_HIGHER_THAN_PRICE',
          severity: 'WARNING',
          description: 'Products where cost is higher than price (negative margin)',
          count: highCostProducts.length,
          products: highCostProducts.map(p => ({
            id: p.id,
            name: p.name,
            cost: p.cost,
            price: p.price,
            margin: p.price - p.cost
          }))
        });
      }

      return {
        success: true,
        data: {
          totalProducts: products.length,
          issues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Run comprehensive financial audit
  ipcMain.handle('run-financial-audit', async () => {
    try {
      // Simple financial audit without external dependencies
      const sales = await databaseService.getSales();
      const invoices = await databaseService.getInvoices();
      
      const issues = [];
      
      // Check for sales without proper totals
      const invalidSales = sales.filter(s => !s.total || s.total <= 0);
      if (invalidSales.length > 0) {
        issues.push({
          type: 'INVALID_SALES',
          severity: 'WARNING',
          description: 'Sales with invalid totals',
          count: invalidSales.length
        });
      }
      
      // Check for invoices without proper amounts
      const invalidInvoices = invoices.filter(i => !i.total || i.total <= 0);
      if (invalidInvoices.length > 0) {
        issues.push({
          type: 'INVALID_INVOICES',
          severity: 'WARNING',
          description: 'Invoices with invalid amounts',
          count: invalidInvoices.length
        });
      }
      
      return {
        success: true,
        data: {
          message: 'Financial audit completed.',
          issues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate specific sale for consistency
  ipcMain.handle('validate-sale-consistency', async (event, saleId) => {
    try {
      const sale = await databaseService.getSaleById(saleId);
      if (!sale) {
        return { success: false, error: 'Sale not found' };
      }

      const issues = [];
      
      // Validate sale total matches items
      if (sale.items && Array.isArray(sale.items)) {
        const calculatedSubtotal = sale.items.reduce((sum, item) => sum + item.amount, 0);
        const calculatedTotal = calculatedSubtotal + sale.tax - sale.discount;
        
        if (Math.abs(calculatedTotal - sale.total) > 0.01) {
          issues.push({
            type: 'TOTAL_MISMATCH',
            severity: 'ERROR',
            description: 'Sale total does not match calculated total from items',
            calculatedTotal,
            actualTotal: sale.total,
            difference: Math.abs(calculatedTotal - sale.total)
          });
        }
      }

      // Validate status consistency
      if (sale.status === 'completed' && sale.invoiceId) {
        const invoice = await databaseService.getInvoiceById(sale.invoiceId);
        if (invoice && invoice.status !== 'paid') {
          issues.push({
            type: 'STATUS_INCONSISTENCY',
            severity: 'WARNING',
            description: 'Completed sale has unpaid invoice',
            saleStatus: sale.status,
            invoiceStatus: invoice.status
          });
        }
      }

      return {
        success: true,
        data: {
          saleId,
          issues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get validation summary
  ipcMain.handle('get-validation-summary', async () => {
    try {
      const [revenueValidation, stockValidation, costValidation] = await Promise.all([
        ipcMain.emit('validate-revenue-calculations'),
        ipcMain.emit('validate-stock-consistency'),
        ipcMain.emit('validate-product-costs')
      ]);

      const allIssues = [
        ...(revenueValidation?.data?.issues || []),
        ...(stockValidation?.data?.issues || []),
        ...(costValidation?.data?.issues || [])
      ];

      const errorCount = allIssues.filter(i => i.severity === 'ERROR').length;
      const warningCount = allIssues.filter(i => i.severity === 'WARNING').length;
      const infoCount = allIssues.filter(i => i.severity === 'INFO').length;

      return {
        success: true,
        data: {
          totalIssues: allIssues.length,
          errors: errorCount,
          warnings: warningCount,
          info: infoCount,
          issues: allIssues
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerValidationHandlers };
