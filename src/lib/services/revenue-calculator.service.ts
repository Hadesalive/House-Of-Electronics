/**
 * Revenue Calculator Service
 * 
 * Centralized service for calculating revenue, profit, and financial metrics
 * to ensure consistency across all components and prevent double-counting.
 */

import { Sale, Invoice, Return, Product } from '@/lib/types/core';

export interface RevenueCalculationResult {
  grossRevenue: number;
  pendingRevenue: number;
  realizedRevenue: number;
  returnImpact: number;
  netRevenue: number;
  totalCost: number;
  profitMargin: number;
  profitMarginPercent: number;
}

export interface RevenueBreakdown {
  salesRevenue: number;
  independentInvoiceRevenue: number;
  revenueReducingReturns: number;
  nonRevenueReducingReturns: number;
}

export class RevenueCalculatorService {
  /**
   * Calculate gross revenue from sales and independent invoices
   * Prevents double-counting by excluding invoices linked to sales
   */
  static calculateGrossRevenue(sales: Sale[], invoices: Invoice[]): number {
    // Calculate sales revenue (completed and pending sales)
    const salesRevenue = sales
      .filter(sale => sale.status === 'completed' || sale.status === 'pending')
      .reduce((sum, sale) => sum + sale.total, 0);

    // Calculate independent invoice revenue (paid invoices not linked to sales)
    // Only count the paid amount, not the total invoice amount
    const independentInvoiceRevenue = invoices
      .filter(invoice => 
        invoice.status === 'paid' && 
        !invoice.saleId // Prevent double-counting
      )
      .reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0);

    return salesRevenue + independentInvoiceRevenue;
  }

  /**
   * Calculate pending revenue (potential future revenue)
   * Includes pending sales and sent invoices
   */
  static calculatePendingRevenue(sales: Sale[], invoices: Invoice[]): number {
    // Pending sales
    const pendingSalesRevenue = sales
      .filter(sale => sale.status === 'pending')
      .reduce((sum, sale) => sum + sale.total, 0);

    // Sent invoices (not yet paid)
    const pendingInvoiceRevenue = invoices
      .filter(invoice => 
        invoice.status === 'sent' && 
        !invoice.saleId // Independent invoices only
      )
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return pendingSalesRevenue + pendingInvoiceRevenue;
  }

  /**
   * Calculate realized revenue (actual received revenue)
   * Includes completed sales and paid independent invoices
   */
  static calculateRealizedRevenue(sales: Sale[], invoices: Invoice[]): number {
    // Completed sales
    const completedSalesRevenue = sales
      .filter(sale => sale.status === 'completed')
      .reduce((sum, sale) => sum + sale.total, 0);

    // Paid independent invoices
    const paidInvoiceRevenue = invoices
      .filter(invoice => 
        invoice.status === 'paid' && 
        !invoice.saleId // Independent invoices only
      )
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return completedSalesRevenue + paidInvoiceRevenue;
  }

  /**
   * Calculate return impact on revenue
   * Only certain refund methods reduce revenue
   */
  static calculateReturnImpact(returns: Return[]): number {
    return returns
      .filter(ret => 
        ['completed', 'approved'].includes(ret.status) &&
        ['cash', 'original_payment'].includes(ret.refundMethod)
      )
      .reduce((sum, ret) => sum + ret.refundAmount, 0);
  }

  /**
   * Calculate net revenue after returns
   */
  static calculateNetRevenue(grossRevenue: number, returnImpact: number): number {
    return grossRevenue - returnImpact;
  }

  /**
   * Calculate total cost for profit calculations
   * Requires products with cost data
   */
  static calculateTotalCost(sales: Sale[], products: Product[]): number {
    return sales
      .filter(sale => sale.status === 'completed' || sale.status === 'pending')
      .reduce((totalCost, sale) => {
        return totalCost + sale.items.reduce((itemCost, item) => {
          const product = products.find(p => p.id === item.productId);
          if (!product || product.cost === null || product.cost === undefined) {
            console.warn(`Product ${item.productName} has no cost data - excluding from cost calculation`);
            return itemCost;
          }
          return itemCost + (product.cost * item.quantity);
        }, 0);
      }, 0);
  }

  /**
   * Calculate profit margin and percentage
   */
  static calculateProfitMargin(sales: Sale[], products: Product[]): { margin: number; percent: number } {
    const totalRevenue = this.calculateGrossRevenue(sales, []);
    const totalCost = this.calculateTotalCost(sales, products);
    const margin = totalRevenue - totalCost;
    const percent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
    
    return { margin, percent };
  }

  /**
   * Get detailed revenue breakdown for analysis
   */
  static getRevenueBreakdown(sales: Sale[], invoices: Invoice[], returns: Return[]): RevenueBreakdown {
    // Sales revenue
    const salesRevenue = sales
      .filter(sale => sale.status === 'completed' || sale.status === 'pending')
      .reduce((sum, sale) => sum + sale.total, 0);

    // Independent invoice revenue
    const independentInvoiceRevenue = invoices
      .filter(invoice => 
        invoice.status === 'paid' && 
        !invoice.saleId
      )
      .reduce((sum, invoice) => sum + invoice.total, 0);

    // Revenue-reducing returns
    const revenueReducingReturns = returns
      .filter(ret => 
        ['completed', 'approved'].includes(ret.status) &&
        ['cash', 'original_payment'].includes(ret.refundMethod)
      )
      .reduce((sum, ret) => sum + ret.refundAmount, 0);

    // Non-revenue-reducing returns (store credit, exchange)
    const nonRevenueReducingReturns = returns
      .filter(ret => 
        ['completed', 'approved'].includes(ret.status) &&
        ['store_credit', 'exchange'].includes(ret.refundMethod)
      )
      .reduce((sum, ret) => sum + ret.refundAmount, 0);

    return {
      salesRevenue,
      independentInvoiceRevenue,
      revenueReducingReturns,
      nonRevenueReducingReturns
    };
  }

  /**
   * Comprehensive revenue calculation with all metrics
   */
  static calculateComprehensiveRevenue(
    sales: Sale[], 
    invoices: Invoice[], 
    returns: Return[], 
    products: Product[]
  ): RevenueCalculationResult {
    const grossRevenue = this.calculateGrossRevenue(sales, invoices);
    const pendingRevenue = this.calculatePendingRevenue(sales, invoices);
    const realizedRevenue = this.calculateRealizedRevenue(sales, invoices);
    const returnImpact = this.calculateReturnImpact(returns);
    const netRevenue = this.calculateNetRevenue(grossRevenue, returnImpact);
    const totalCost = this.calculateTotalCost(sales, products);
    const { margin: profitMargin, percent: profitMarginPercent } = this.calculateProfitMargin(sales, products);

    return {
      grossRevenue,
      pendingRevenue,
      realizedRevenue,
      returnImpact,
      netRevenue,
      totalCost,
      profitMargin,
      profitMarginPercent
    };
  }

  /**
   * Filter data by date range for period-specific calculations
   */
  static filterByDateRange<T extends { createdAt: string }>(
    data: T[], 
    startDate?: Date, 
    endDate?: Date
  ): T[] {
    if (!startDate && !endDate) return data;

    return data.filter(item => {
      const itemDate = new Date(item.createdAt);
      
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      
      return true;
    });
  }

  /**
   * Calculate monthly revenue trends
   */
  static calculateMonthlyTrends(
    sales: Sale[], 
    invoices: Invoice[], 
    returns: Return[],
    months: number = 12
  ): Array<{ month: string; revenue: number; profit: number }> {
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthSales = this.filterByDateRange(sales, date, nextMonth);
      const monthInvoices = this.filterByDateRange(invoices, date, nextMonth);
      const monthReturns = this.filterByDateRange(returns, date, nextMonth);
      
      const revenue = this.calculateGrossRevenue(monthSales, monthInvoices);
      const returnImpact = this.calculateReturnImpact(monthReturns);
      const netRevenue = revenue - returnImpact;
      
      trends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: netRevenue,
        profit: netRevenue // Simplified - would need cost data for actual profit
      });
    }
    
    return trends;
  }
}

export default RevenueCalculatorService;
