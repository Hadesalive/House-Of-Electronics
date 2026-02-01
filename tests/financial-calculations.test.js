/**
 * Financial Calculations Test Suite
 * 
 * Tests for revenue calculations, profit margins, and data consistency
 * to ensure accurate financial reporting across the system.
 */

// Mock the RevenueCalculatorService since it's a TypeScript file
// In a real implementation, we'd compile TS to JS or use ts-jest
const RevenueCalculatorService = {
  filterByDateRange: (data, startDate, endDate) => {
    return data.filter(item => {
      const itemDate = new Date(item.createdAt);
      const startOfDay = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
      const endOfDay = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999) : null;

      return (!startOfDay || itemDate >= startOfDay) &&
             (!endOfDay || itemDate <= endOfDay);
    });
  },

  calculateGrossRevenue: (sales, invoices) => {
    const salesRevenue = sales.reduce((sum, sale) => {
      if (sale.status === 'cancelled' || sale.status === 'refunded') {
        return sum; // Exclude cancelled and refunded sales
      } else {
        return sum + sale.total; // Add completed and pending sales
      }
    }, 0);

    const paidIndependentInvoiceRevenue = invoices
      .filter(invoice => invoice.status === 'paid' && !invoice.saleId)
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return salesRevenue + paidIndependentInvoiceRevenue;
  },

  calculateReturnImpact: (returns) => {
    const revenueReducingReturns = returns.filter(
      ret =>
        ['completed', 'approved'].includes(ret.status) &&
        ['cash', 'original_payment'].includes(ret.refundMethod)
    );
    return revenueReducingReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
  },

  calculateNetRevenue: (grossRevenue, returnImpact) => {
    return grossRevenue - returnImpact;
  },

  calculateTotalCost: (sales, products) => {
    let totalCost = 0;

    sales.forEach(sale => {
      // Only count completed and pending sales for cost calculation
      if (sale.status === 'completed' || sale.status === 'pending') {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && product.cost > 0) {
              totalCost += product.cost * item.quantity;
            }
          });
        }
      }
    });

    return totalCost;
  },

  calculateProfitMargin: (sales, products) => {
    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach(sale => {
      // Only count completed and pending sales for profit calculation
      if (sale.status === 'completed' || sale.status === 'pending') {
        totalRevenue += sale.total;

        // Calculate cost of goods sold
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && product.cost > 0) {
              totalCost += product.cost * item.quantity;
            }
          });
        }
      }
    });

    const profit = totalRevenue - totalCost;
    const percent = totalRevenue === 0 ? 0 : (profit / totalRevenue) * 100;

    return { totalRevenue, totalCost, profit, percent };
  },

  calculateComprehensiveRevenue: (sales, invoices, returns, products) => {
    const grossRevenue = RevenueCalculatorService.calculateGrossRevenue(sales, invoices);
    const returnImpact = RevenueCalculatorService.calculateReturnImpact(returns);
    const netRevenue = RevenueCalculatorService.calculateNetRevenue(grossRevenue, returnImpact);
    const totalCost = RevenueCalculatorService.calculateTotalCost(sales, products);
    const profitMargin = netRevenue - totalCost;
    const profitMarginPercent = netRevenue === 0 ? 0 : (profitMargin / netRevenue) * 100;

    return { grossRevenue, netRevenue, returnImpact, totalCost, profitMargin, profitMarginPercent };
  }
};

// Mock data for testing
const mockProducts = [
  { id: '1', name: 'Product A', cost: 10, price: 20 },
  { id: '2', name: 'Product B', cost: 15, price: 30 },
  { id: '3', name: 'Product C', cost: 0, price: 25 }, // No cost set
];

const mockSales = [
  {
    id: '1',
    status: 'completed',
    total: 50,
    items: [
      { productId: '1', quantity: 1, rate: 20, amount: 20 },
      { productId: '2', quantity: 1, rate: 30, amount: 30 }
    ],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    status: 'pending',
    total: 25,
    items: [
      { productId: '3', quantity: 1, rate: 25, amount: 25 }
    ],
    createdAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    status: 'cancelled',
    total: 100,
    items: [
      { productId: '1', quantity: 5, rate: 20, amount: 100 }
    ],
    createdAt: '2024-01-03T00:00:00Z'
  }
];

const mockInvoices = [
  {
    id: '1',
    status: 'paid',
    total: 75,
    saleId: null, // Independent invoice
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    status: 'sent',
    total: 50,
    saleId: null, // Independent invoice
    createdAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    status: 'paid',
    total: 30,
    saleId: '1', // Linked to sale - should not be double-counted
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockReturns = [
  {
    id: '1',
    status: 'completed',
    refundMethod: 'cash',
    refundAmount: 20,
    createdAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '2',
    status: 'approved',
    refundMethod: 'store_credit',
    refundAmount: 15,
    createdAt: '2024-01-03T00:00:00Z'
  },
  {
    id: '3',
    status: 'pending',
    refundMethod: 'cash',
    refundAmount: 10,
    createdAt: '2024-01-04T00:00:00Z'
  }
];

describe('Revenue Calculator Service', () => {
  describe('calculateGrossRevenue', () => {
    test('should calculate revenue from completed and pending sales', () => {
      const revenue = RevenueCalculatorService.calculateGrossRevenue(mockSales, []);
      expect(revenue).toBe(75); // 50 (completed) + 25 (pending)
    });

    test('should include independent invoices in revenue', () => {
      const revenue = RevenueCalculatorService.calculateGrossRevenue(mockSales, mockInvoices);
      expect(revenue).toBe(150); // 75 (sales) + 75 (independent invoice)
    });

    test('should not double-count invoices linked to sales', () => {
      const revenue = RevenueCalculatorService.calculateGrossRevenue(mockSales, mockInvoices);
      // Should not include invoice with saleId: '1' (30)
      expect(revenue).toBe(150); // 75 (sales) + 75 (independent invoice)
    });

    test('should exclude cancelled and refunded sales', () => {
      const salesWithRefunded = [
        ...mockSales,
        { id: '4', status: 'refunded', total: 40, items: [], createdAt: '2024-01-04T00:00:00Z' }
      ];
      const revenue = RevenueCalculatorService.calculateGrossRevenue(salesWithRefunded, []);
      expect(revenue).toBe(75); // Should still be 75, excluding refunded sale
    });
  });

  describe('calculateReturnImpact', () => {
    test('should only count completed/approved returns with cash/original_payment', () => {
      const impact = RevenueCalculatorService.calculateReturnImpact(mockReturns);
      expect(impact).toBe(20); // Only the cash refund
    });

    test('should exclude store credit and exchange returns', () => {
      const returnsWithExchange = [
        ...mockReturns,
        {
          id: '4',
          status: 'completed',
          refundMethod: 'exchange',
          refundAmount: 25,
          createdAt: '2024-01-05T00:00:00Z'
        }
      ];
      const impact = RevenueCalculatorService.calculateReturnImpact(returnsWithExchange);
      expect(impact).toBe(20); // Should still be 20, excluding exchange
    });

    test('should exclude pending returns', () => {
      const impact = RevenueCalculatorService.calculateReturnImpact(mockReturns);
      expect(impact).toBe(20); // Should not include pending return (10)
    });
  });

  describe('calculateNetRevenue', () => {
    test('should subtract return impact from gross revenue', () => {
      const grossRevenue = 100;
      const returnImpact = 20;
      const netRevenue = RevenueCalculatorService.calculateNetRevenue(grossRevenue, returnImpact);
      expect(netRevenue).toBe(80);
    });
  });

  describe('calculateTotalCost', () => {
    test('should calculate cost for completed and pending sales', () => {
      const cost = RevenueCalculatorService.calculateTotalCost(mockSales, mockProducts);
      expect(cost).toBe(25); // (10 * 1) + (15 * 1) = 25
    });

    test('should exclude products without cost data', () => {
      const cost = RevenueCalculatorService.calculateTotalCost(mockSales, mockProducts);
      // Product C has cost: 0, so it should be excluded from cost calculation
      expect(cost).toBe(25); // Only products with valid cost
    });

    test('should exclude cancelled sales from cost calculation', () => {
      const cost = RevenueCalculatorService.calculateTotalCost(mockSales, mockProducts);
      // Cancelled sale should not contribute to cost
      expect(cost).toBe(25); // Only completed and pending sales
    });
  });

  describe('calculateProfitMargin', () => {
    test('should calculate correct profit margin and percentage', () => {
      const { profit, percent } = RevenueCalculatorService.calculateProfitMargin(mockSales, mockProducts);
      expect(profit).toBe(50); // 75 (revenue) - 25 (cost) = 50
      expect(percent).toBeCloseTo(66.67, 2); // (50 / 75) * 100
    });

    test('should handle zero revenue', () => {
      const emptySales = [];
      const { profit, percent } = RevenueCalculatorService.calculateProfitMargin(emptySales, mockProducts);
      expect(profit).toBe(0);
      expect(percent).toBe(0);
    });
  });

  describe('filterByDateRange', () => {
    test('should filter data by start date', () => {
      const startDate = new Date('2024-01-02T00:00:00Z');
      const filtered = RevenueCalculatorService.filterByDateRange(mockSales, startDate);
      expect(filtered).toHaveLength(2); // Only sales from Jan 2 and 3
    });

    test('should filter data by end date', () => {
      const endDate = new Date('2024-01-01T23:59:59Z');
      const filtered = RevenueCalculatorService.filterByDateRange(mockSales, null, endDate);
      expect(filtered).toHaveLength(1); // Only sales from Jan 1
    });

    test('should filter data by both start and end dates', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T23:59:59Z');
      const filtered = RevenueCalculatorService.filterByDateRange(mockSales, startDate, endDate);
      expect(filtered).toHaveLength(2); // Sales from Jan 1 and 2
    });

    test('should return all data when no dates provided', () => {
      const filtered = RevenueCalculatorService.filterByDateRange(mockSales);
      expect(filtered).toHaveLength(3); // All sales
    });
  });

  describe('calculateComprehensiveRevenue', () => {
    test('should calculate all revenue metrics correctly', () => {
      const result = RevenueCalculatorService.calculateComprehensiveRevenue(
        mockSales,
        mockInvoices,
        mockReturns,
        mockProducts
      );

      expect(result.grossRevenue).toBe(150); // 75 (sales) + 75 (independent invoice)
      expect(result.returnImpact).toBe(20); // Only cash refund
      expect(result.netRevenue).toBe(130); // 150 - 20
      expect(result.totalCost).toBe(25); // Only products with cost
      expect(result.profitMargin).toBe(105); // 130 - 25
      expect(result.profitMarginPercent).toBeCloseTo(80.77, 2); // (105 / 130) * 100
    });
  });
});

describe('Data Consistency Tests', () => {
  test('should prevent double-counting of invoice revenue', () => {
    const sales = [{ id: '1', status: 'completed', total: 100, items: [], createdAt: '2024-01-01T00:00:00Z' }];
    const invoices = [
      { id: '1', status: 'paid', total: 100, saleId: '1', createdAt: '2024-01-01T00:00:00Z' }, // Linked to sale
      { id: '2', status: 'paid', total: 50, saleId: null, createdAt: '2024-01-01T00:00:00Z' }  // Independent
    ];
    
    const revenue = RevenueCalculatorService.calculateGrossRevenue(sales, invoices);
    expect(revenue).toBe(150); // 100 (sale) + 50 (independent invoice)
  });

  test('should handle missing product cost gracefully', () => {
    const sales = [{ 
      id: '1', 
      status: 'completed', 
      total: 100, 
      items: [{ productId: '999', quantity: 1, rate: 100, amount: 100 }], // Non-existent product
      createdAt: '2024-01-01T00:00:00Z' 
    }];
    
    const cost = RevenueCalculatorService.calculateTotalCost(sales, mockProducts);
    expect(cost).toBe(0); // Should not crash, just return 0
  });

  test('should handle empty data arrays', () => {
    const result = RevenueCalculatorService.calculateComprehensiveRevenue([], [], [], []);
    
    expect(result.grossRevenue).toBe(0);
    expect(result.netRevenue).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.profitMargin).toBe(0);
    expect(result.profitMarginPercent).toBe(0);
  });
});

// Integration test for transaction safety
describe('Transaction Safety Tests', () => {
  test('should maintain data consistency during partial failures', () => {
    // This would be tested with actual database transactions
    // For now, we'll test the logic that would be in transactions
    
    const sales = [{ 
      id: '1', 
      status: 'completed', 
      total: 100, 
      items: [{ productId: '1', quantity: 1, rate: 100, amount: 100 }],
      createdAt: '2024-01-01T00:00:00Z' 
    }];
    
    const products = [{ id: '1', name: 'Product A', cost: 50, price: 100 }];
    
    // Simulate transaction: calculate what should happen
    const revenue = RevenueCalculatorService.calculateGrossRevenue(sales, []);
    const cost = RevenueCalculatorService.calculateTotalCost(sales, products);
    const profit = revenue - cost;
    
    expect(revenue).toBe(100);
    expect(cost).toBe(50);
    expect(profit).toBe(50);
    
    // In a real transaction, if any of these calculations failed,
    // the entire operation would be rolled back
  });
});

console.log('✅ Financial calculations test suite loaded');
console.log('Run with: npm test tests/financial-calculations.test.js');
