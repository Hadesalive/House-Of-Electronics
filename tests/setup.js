// Test setup file
// This file runs before each test file

// Mock console methods to reduce noise during tests
const originalConsole = console;

beforeAll(() => {
  // Suppress console.log during tests unless explicitly needed
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: originalConsole.warn,
    error: originalConsole.error
  };
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock data
  createMockSale: (overrides = {}) => ({
    id: 'test-sale-1',
    status: 'completed',
    total: 100,
    items: [
      { productId: '1', quantity: 1, rate: 100, amount: 100 }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  createMockProduct: (overrides = {}) => ({
    id: '1',
    name: 'Test Product',
    cost: 50,
    price: 100,
    stock: 10,
    ...overrides
  }),

  createMockInvoice: (overrides = {}) => ({
    id: 'test-invoice-1',
    status: 'paid',
    total: 100,
    saleId: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  createMockReturn: (overrides = {}) => ({
    id: 'test-return-1',
    status: 'completed',
    refundMethod: 'cash',
    refundAmount: 50,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  })
};
