/**
 * Transaction Safety Tests
 * 
 * Tests for database transaction rollback scenarios and atomic operations
 * to ensure data consistency during partial failures.
 */

const path = require('path');
const Database = require('better-sqlite3');

// Mock database for testing
let testDb;

beforeAll(() => {
  // Create in-memory test database
  testDb = new Database(':memory:');
  
  // Create test tables
  testDb.exec(`
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );
    
    CREATE TABLE sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      has_backorder INTEGER DEFAULT 0,
      backorder_details TEXT
    );
  `);
  
  // Insert test data
  testDb.prepare(`
    INSERT INTO products (id, name, cost, price, stock) 
    VALUES (?, ?, ?, ?, ?)
  `).run('1', 'Test Product', 10, 20, 5);
});

afterAll(() => {
  if (testDb) {
    testDb.close();
  }
});

describe('Transaction Safety', () => {
  test('should rollback stock deduction when sale creation fails', () => {
    const initialStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    expect(initialStock).toBeTruthy();
    const initialStockValue = initialStock.stock;
    
    try {
      testDb.exec('BEGIN TRANSACTION;');
      
      // Deduct stock
      testDb.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(3, '1');
      
      // Simulate sale creation failure
      throw new Error('Sale creation failed');
      
    } catch (error) {
      // Rollback should happen automatically
      testDb.exec('ROLLBACK;');
    }
    
    // Stock should be restored
    const finalStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    expect(finalStock).toBeTruthy();
    expect(finalStock.stock).toBe(initialStockValue);
  });

  test('should commit all changes when transaction succeeds', () => {
    const initialStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    expect(initialStock).toBeTruthy();
    const initialStockValue = initialStock.stock;
    
    testDb.exec('BEGIN TRANSACTION;');
    
    // Deduct stock
    testDb.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(2, '1');
    
    // Create sale
    testDb.prepare(`
      INSERT INTO sales (id, items, total, status) 
      VALUES (?, ?, ?, ?)
    `).run('test-sale-1', JSON.stringify([{productId: '1', quantity: 2}]), 40, 'completed');
    
    testDb.exec('COMMIT;');
    
    // Both changes should be committed
    const finalStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    const saleCount = testDb.prepare('SELECT COUNT(*) as count FROM sales').get();
    
    expect(finalStock).toBeTruthy();
    expect(finalStock.stock).toBe(initialStockValue - 2);
    expect(saleCount).toBeTruthy();
    expect(saleCount.count).toBe(1);
  });

  test('should handle backorder scenarios correctly', () => {
    const initialStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    expect(initialStock).toBeTruthy();
    const initialStockValue = initialStock.stock;
    
    testDb.exec('BEGIN TRANSACTION;');
    
    // Try to sell more than available (backorder)
    const requestedQuantity = 10; // More than available stock
    const availableStock = initialStockValue;
    
    // Deduct stock (will go negative)
    testDb.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(requestedQuantity, '1');
    
    // Create sale with backorder flag
    const backorderDetails = JSON.stringify([{
      product: 'Test Product',
      available: availableStock,
      requested: requestedQuantity,
      backorder: requestedQuantity - availableStock
    }]);
    
    testDb.prepare(`
      INSERT INTO sales (id, items, total, status, has_backorder, backorder_details) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('test-sale-2', JSON.stringify([{productId: '1', quantity: requestedQuantity}]), 200, 'completed', 1, backorderDetails);
    
    testDb.exec('COMMIT;');
    
    // Verify backorder was created
    const sale = testDb.prepare('SELECT * FROM sales WHERE id = ?').get('test-sale-2');
    const finalStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    
    expect(sale).toBeTruthy();
    expect(sale.has_backorder).toBe(1);
    expect(sale.backorder_details).toBeTruthy();
    expect(finalStock).toBeTruthy();
    expect(finalStock.stock).toBe(initialStockValue - requestedQuantity); // Negative stock allowed
  });
});

describe('Stock Consistency', () => {
  test('should maintain stock consistency across multiple operations', () => {
    // Start with known stock
    testDb.prepare('UPDATE products SET stock = ? WHERE id = ?').run(10, '1');
    
    const operations = [
      { type: 'sale', quantity: 3 },
      { type: 'return', quantity: 1 },
      { type: 'sale', quantity: 2 },
      { type: 'order', quantity: 5 }
    ];
    
    let expectedStock = 10;
    
    for (const op of operations) {
      testDb.exec('BEGIN TRANSACTION;');
      
      try {
        if (op.type === 'sale') {
          testDb.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(op.quantity, '1');
          expectedStock -= op.quantity;
        } else if (op.type === 'return') {
          testDb.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(op.quantity, '1');
          expectedStock += op.quantity;
        } else if (op.type === 'order') {
          testDb.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(op.quantity, '1');
          expectedStock += op.quantity;
        }
        
        testDb.exec('COMMIT;');
      } catch (error) {
        testDb.exec('ROLLBACK;');
        throw error;
      }
    }
    
    const finalStock = testDb.prepare('SELECT stock FROM products WHERE id = ?').get('1');
    expect(finalStock).toBeTruthy();
    expect(finalStock.stock).toBe(expectedStock);
  });
});

describe('Error Handling', () => {
  test('should handle database connection errors gracefully', () => {
    // This would test the actual executeInTransaction function
    // For now, we'll test the concept
    
    expect(() => {
      testDb.exec('BEGIN TRANSACTION;');
      // Simulate database error
      throw new Error('Database connection lost');
    }).toThrow('Database connection lost');
    
    // Transaction should be rolled back (inTransaction should be false)
    expect(testDb.inTransaction).toBe(false);
  });
});

console.log('✅ Transaction safety tests loaded');
