/**
 * Financial Data Audit Script
 * 
 * Audits existing data for consistency issues, double-counting, and data integrity problems.
 * Run this script to identify and fix financial data inconsistencies.
 */

const path = require('path');
const fs = require('fs');

// Try to load the database service
let databaseService;
try {
  const { createSQLiteDatabaseService } = require('../electron/services/database-service');
  databaseService = createSQLiteDatabaseService();
} catch (error) {
  console.error('❌ Could not load database service:', error.message);
  process.exit(1);
}

class FinancialDataAuditor {
  constructor(dbService) {
    this.db = dbService;
    this.issues = [];
    this.fixes = [];
  }

  async runAudit() {
    console.log('🔍 Starting financial data audit...\n');
    
    try {
      await this.auditProducts();
      await this.auditSales();
      await this.auditInvoices();
      await this.auditReturns();
      await this.auditStockConsistency();
      await this.auditRevenueConsistency();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
      process.exit(1);
    }
  }

  async auditProducts() {
    console.log('📦 Auditing products...');
    
    try {
      const products = await this.db.getProducts();
      
      // Check for products without cost
      const productsWithoutCost = products.filter(p => p.cost === null || p.cost === undefined || p.cost === 0);
      if (productsWithoutCost.length > 0) {
        this.issues.push({
          type: 'PRODUCT_COST_MISSING',
          severity: 'WARNING',
          count: productsWithoutCost.length,
          description: 'Products without cost data will affect profit calculations',
          items: productsWithoutCost.map(p => ({ id: p.id, name: p.name, cost: p.cost }))
        });
      }

      // Check for products with negative cost
      const productsWithNegativeCost = products.filter(p => p.cost < 0);
      if (productsWithNegativeCost.length > 0) {
        this.issues.push({
          type: 'PRODUCT_NEGATIVE_COST',
          severity: 'ERROR',
          count: productsWithNegativeCost.length,
          description: 'Products with negative cost are invalid',
          items: productsWithNegativeCost.map(p => ({ id: p.id, name: p.name, cost: p.cost }))
        });
      }

      // Check for products with cost > price
      const productsWithHighCost = products.filter(p => p.cost > p.price);
      if (productsWithHighCost.length > 0) {
        this.issues.push({
          type: 'PRODUCT_COST_HIGHER_THAN_PRICE',
          severity: 'WARNING',
          count: productsWithHighCost.length,
          description: 'Products where cost is higher than price (negative margin)',
          items: productsWithHighCost.map(p => ({ id: p.id, name: p.name, cost: p.cost, price: p.price }))
        });
      }

      console.log(`   ✅ Products audited: ${products.length} total`);
    } catch (error) {
      console.error('   ❌ Error auditing products:', error.message);
    }
  }

  async auditSales() {
    console.log('💰 Auditing sales...');
    
    try {
      const sales = await this.db.getSales();
      
      // Check for sales with invalid status
      const invalidStatusSales = sales.filter(s => !['pending', 'completed', 'cancelled', 'refunded'].includes(s.status));
      if (invalidStatusSales.length > 0) {
        this.issues.push({
          type: 'SALE_INVALID_STATUS',
          severity: 'ERROR',
          count: invalidStatusSales.length,
          description: 'Sales with invalid status values',
          items: invalidStatusSales.map(s => ({ id: s.id, status: s.status }))
        });
      }

      // Check for sales with negative totals
      const negativeTotalSales = sales.filter(s => s.total < 0);
      if (negativeTotalSales.length > 0) {
        this.issues.push({
          type: 'SALE_NEGATIVE_TOTAL',
          severity: 'ERROR',
          count: negativeTotalSales.length,
          description: 'Sales with negative total amounts',
          items: negativeTotalSales.map(s => ({ id: s.id, total: s.total }))
        });
      }

      // Check for sales with missing items
      const salesWithoutItems = sales.filter(s => !s.items || s.items.length === 0);
      if (salesWithoutItems.length > 0) {
        this.issues.push({
          type: 'SALE_NO_ITEMS',
          severity: 'WARNING',
          count: salesWithoutItems.length,
          description: 'Sales without any items',
          items: salesWithoutItems.map(s => ({ id: s.id, total: s.total }))
        });
      }

      // Check for backorder sales without backorder flag
      const backorderSales = sales.filter(s => {
        if (!s.items || s.items.length === 0) return false;
        // This would need to be checked against current stock levels
        return false; // Placeholder - would need stock validation
      });

      console.log(`   ✅ Sales audited: ${sales.length} total`);
    } catch (error) {
      console.error('   ❌ Error auditing sales:', error.message);
    }
  }

  async auditInvoices() {
    console.log('📄 Auditing invoices...');
    
    try {
      const invoices = await this.db.getInvoices();
      
      // Check for invoices with invalid status
      const invalidStatusInvoices = invoices.filter(i => !['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(i.status));
      if (invalidStatusInvoices.length > 0) {
        this.issues.push({
          type: 'INVOICE_INVALID_STATUS',
          severity: 'ERROR',
          count: invalidStatusInvoices.length,
          description: 'Invoices with invalid status values',
          items: invalidStatusInvoices.map(i => ({ id: i.id, status: i.status }))
        });
      }

      // Check for invoices with negative totals
      const negativeTotalInvoices = invoices.filter(i => i.total < 0);
      if (negativeTotalInvoices.length > 0) {
        this.issues.push({
          type: 'INVOICE_NEGATIVE_TOTAL',
          severity: 'ERROR',
          count: negativeTotalInvoices.length,
          description: 'Invoices with negative total amounts',
          items: negativeTotalInvoices.map(i => ({ id: i.id, total: i.total }))
        });
      }

      // Check for duplicate invoice numbers
      const invoiceNumbers = invoices.map(i => i.number);
      const duplicateNumbers = invoiceNumbers.filter((num, index) => invoiceNumbers.indexOf(num) !== index);
      if (duplicateNumbers.length > 0) {
        this.issues.push({
          type: 'INVOICE_DUPLICATE_NUMBERS',
          severity: 'ERROR',
          count: duplicateNumbers.length,
          description: 'Duplicate invoice numbers found',
          items: duplicateNumbers.map(num => ({ number: num }))
        });
      }

      console.log(`   ✅ Invoices audited: ${invoices.length} total`);
    } catch (error) {
      console.error('   ❌ Error auditing invoices:', error.message);
    }
  }

  async auditReturns() {
    console.log('🔄 Auditing returns...');
    
    try {
      const returns = await this.db.getReturns();
      
      // Check for returns with invalid status
      const invalidStatusReturns = returns.filter(r => !['pending', 'approved', 'rejected', 'completed'].includes(r.status));
      if (invalidStatusReturns.length > 0) {
        this.issues.push({
          type: 'RETURN_INVALID_STATUS',
          severity: 'ERROR',
          count: invalidStatusReturns.length,
          description: 'Returns with invalid status values',
          items: invalidStatusReturns.map(r => ({ id: r.id, status: r.status }))
        });
      }

      // Check for returns with invalid refund method
      const invalidRefundMethodReturns = returns.filter(r => !['cash', 'store_credit', 'original_payment', 'exchange'].includes(r.refundMethod));
      if (invalidRefundMethodReturns.length > 0) {
        this.issues.push({
          type: 'RETURN_INVALID_REFUND_METHOD',
          severity: 'ERROR',
          count: invalidRefundMethodReturns.length,
          description: 'Returns with invalid refund method values',
          items: invalidRefundMethodReturns.map(r => ({ id: r.id, refundMethod: r.refundMethod }))
        });
      }

      // Check for returns with negative amounts
      const negativeAmountReturns = returns.filter(r => r.refundAmount < 0);
      if (negativeAmountReturns.length > 0) {
        this.issues.push({
          type: 'RETURN_NEGATIVE_AMOUNT',
          severity: 'ERROR',
          count: negativeAmountReturns.length,
          description: 'Returns with negative refund amounts',
          items: negativeAmountReturns.map(r => ({ id: r.id, refundAmount: r.refundAmount }))
        });
      }

      console.log(`   ✅ Returns audited: ${returns.length} total`);
    } catch (error) {
      console.error('   ❌ Error auditing returns:', error.message);
    }
  }

  async auditStockConsistency() {
    console.log('📦 Auditing stock consistency...');
    
    try {
      const products = await this.db.getProducts();
      const sales = await this.db.getSales();
      const returns = await this.db.getReturns();
      const orders = await this.db.getOrders();
      
      // This is a simplified check - in reality, you'd need to track all stock movements
      const productsWithNegativeStock = products.filter(p => p.stock < 0);
      if (productsWithNegativeStock.length > 0) {
        this.issues.push({
          type: 'NEGATIVE_STOCK',
          severity: 'WARNING',
          count: productsWithNegativeStock.length,
          description: 'Products with negative stock levels (backorders)',
          items: productsWithNegativeStock.map(p => ({ id: p.id, name: p.name, stock: p.stock }))
        });
      }

      console.log(`   ✅ Stock consistency checked`);
    } catch (error) {
      console.error('   ❌ Error auditing stock consistency:', error.message);
    }
  }

  async auditRevenueConsistency() {
    console.log('💰 Auditing revenue consistency...');
    
    try {
      const sales = await this.db.getSales();
      const invoices = await this.db.getInvoices();
      
      // Check for potential double-counting
      const salesWithInvoices = sales.filter(s => s.invoiceId);
      const linkedInvoices = invoices.filter(i => i.saleId);
      
      if (salesWithInvoices.length !== linkedInvoices.length) {
        this.issues.push({
          type: 'REVENUE_DOUBLE_COUNTING_RISK',
          severity: 'WARNING',
          count: Math.abs(salesWithInvoices.length - linkedInvoices.length),
          description: 'Mismatch between sales with invoices and invoices with sales - potential double-counting risk',
          items: []
        });
      }

      console.log(`   ✅ Revenue consistency checked`);
    } catch (error) {
      console.error('   ❌ Error auditing revenue consistency:', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 AUDIT REPORT');
    console.log('================\n');
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Your financial data is consistent.');
      return;
    }

    // Group issues by severity
    const errors = this.issues.filter(i => i.severity === 'ERROR');
    const warnings = this.issues.filter(i => i.severity === 'WARNING');
    const info = this.issues.filter(i => i.severity === 'INFO');

    console.log(`📈 Summary:`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log(`   ℹ️  Info: ${info.length}`);
    console.log(`   📊 Total Issues: ${this.issues.length}\n`);

    // Report errors
    if (errors.length > 0) {
      console.log('❌ ERRORS (Must Fix):');
      errors.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.description} (${issue.count} items)`);
        if (issue.items && issue.items.length > 0) {
          issue.items.slice(0, 3).forEach(item => {
            console.log(`     - ${JSON.stringify(item)}`);
          });
          if (issue.items.length > 3) {
            console.log(`     ... and ${issue.items.length - 3} more`);
          }
        }
      });
      console.log('');
    }

    // Report warnings
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (Should Fix):');
      warnings.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.description} (${issue.count} items)`);
        if (issue.items && issue.items.length > 0) {
          issue.items.slice(0, 3).forEach(item => {
            console.log(`     - ${JSON.stringify(item)}`);
          });
          if (issue.items.length > 3) {
            console.log(`     ... and ${issue.items.length - 3} more`);
          }
        }
      });
      console.log('');
    }

    // Report info
    if (info.length > 0) {
      console.log('ℹ️  INFO:');
      info.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.description} (${issue.count} items)`);
      });
      console.log('');
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================\n');

    const errorTypes = this.issues.map(i => i.type);
    
    if (errorTypes.includes('PRODUCT_NEGATIVE_COST')) {
      console.log('1. Fix products with negative cost values');
      console.log('   Run: UPDATE products SET cost = 0 WHERE cost < 0;\n');
    }

    if (errorTypes.includes('SALE_NEGATIVE_TOTAL')) {
      console.log('2. Investigate sales with negative totals');
      console.log('   These may be refunds that should be handled as returns\n');
    }

    if (errorTypes.includes('INVOICE_DUPLICATE_NUMBERS')) {
      console.log('3. Fix duplicate invoice numbers');
      console.log('   Generate new unique numbers for duplicate invoices\n');
    }

    if (errorTypes.includes('PRODUCT_COST_MISSING')) {
      console.log('4. Set cost values for products without cost data');
      console.log('   This is required for accurate profit calculations\n');
    }

    if (errorTypes.includes('NEGATIVE_STOCK')) {
      console.log('5. Review products with negative stock');
      console.log('   These may be legitimate backorders or data inconsistencies\n');
    }

    console.log('🔧 To fix issues automatically, run:');
    console.log('   node scripts/fix-financial-data.js');
  }
}

// Run the audit
async function main() {
  const auditor = new FinancialDataAuditor(databaseService);
  await auditor.runAudit();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FinancialDataAuditor };
