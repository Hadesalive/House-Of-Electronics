/**
 * Schema Migration Tests
 * 
 * Tests for database schema changes, migrations, and data integrity
 * to ensure existing data is preserved during updates.
 */

const path = require('path');
const Database = require('better-sqlite3');

// Mock database for testing
let testDb;

beforeAll(() => {
  // Create in-memory test database
  testDb = new Database(':memory:');
});

afterAll(() => {
  if (testDb) {
    testDb.close();
  }
});

describe('Schema Migrations', () => {
  test('should migrate products table to require cost field', () => {
    // Create old schema (without NOT NULL constraint on cost)
    testDb.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cost REAL,  -- Nullable cost
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Insert test data with some NULL costs
    testDb.prepare(`
      INSERT INTO products (id, name, cost, price, stock) 
      VALUES (?, ?, ?, ?, ?)
    `).run('1', 'Product A', 10, 20, 5);
    
    testDb.prepare(`
      INSERT INTO products (id, name, cost, price, stock) 
      VALUES (?, ?, ?, ?, ?)
    `).run('2', 'Product B', null, 30, 3); // NULL cost
    
    testDb.prepare(`
      INSERT INTO products (id, name, cost, price, stock) 
      VALUES (?, ?, ?, ?, ?)
    `).run('3', 'Product C', null, 25, 2); // NULL cost
    
    // Run migration: Update NULL costs to 0
    testDb.exec(`UPDATE products SET cost = 0 WHERE cost IS NULL`);
    
    // Verify migration
    const productsWithNullCost = testDb.prepare('SELECT COUNT(*) as count FROM products WHERE cost IS NULL').get().count;
    expect(productsWithNullCost).toBe(0);
    
    const productsWithZeroCost = testDb.prepare('SELECT COUNT(*) as count FROM products WHERE cost = 0').get().count;
    expect(productsWithZeroCost).toBe(2);
  });

  test('should add backorder columns to sales table', () => {
    // Create old sales table (without backorder columns)
    testDb.exec(`
      CREATE TABLE sales_old (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL
      )
    `);
    
    // Insert test data
    testDb.prepare(`
      INSERT INTO sales_old (id, customer_id, items, total, status) 
      VALUES (?, ?, ?, ?, ?)
    `).run('1', 'customer-1', JSON.stringify([{productId: '1', quantity: 2}]), 40, 'completed');
    
    // Create new sales table with backorder columns
    testDb.exec(`
      CREATE TABLE sales_new (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        has_backorder INTEGER DEFAULT 0,
        backorder_details TEXT
      )
    `);
    
    // Migrate data
    testDb.exec(`
      INSERT INTO sales_new (id, customer_id, items, total, status, has_backorder, backorder_details)
      SELECT id, customer_id, items, total, status, 0, NULL FROM sales_old
    `);
    
    // Verify migration
    const salesCount = testDb.prepare('SELECT COUNT(*) as count FROM sales_new').get().count;
    expect(salesCount).toBe(1);
    
    const sale = testDb.prepare('SELECT * FROM sales_new WHERE id = ?').get('1');
    expect(sale.has_backorder).toBe(0);
    expect(sale.backorder_details).toBeNull();
  });

  test('should handle cost validation constraints', () => {
    // Create products table with NOT NULL constraint
    testDb.exec(`
      CREATE TABLE products_constrained (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cost REAL NOT NULL DEFAULT 0 CHECK (cost >= 0),
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Should allow valid cost
    expect(() => {
      testDb.prepare(`
        INSERT INTO products_constrained (id, name, cost, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `).run('1', 'Valid Product', 10, 20, 5);
    }).not.toThrow();
    
    // Should reject negative cost
    expect(() => {
      testDb.prepare(`
        INSERT INTO products_constrained (id, name, cost, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `).run('2', 'Invalid Product', -5, 20, 5);
    }).toThrow();
    
    // Should reject NULL cost
    expect(() => {
      testDb.prepare(`
        INSERT INTO products_constrained (id, name, cost, price, stock) 
        VALUES (?, ?, ?, ?, ?)
      `).run('3', 'Null Cost Product', null, 20, 5);
    }).toThrow();
  });
});

describe('Data Integrity', () => {
  test('should maintain referential integrity during migrations', () => {
    // Create related tables
    testDb.exec(`
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
    
    testDb.exec(`
      CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id),
        total REAL NOT NULL
      )
    `);
    
    // Insert test data
    testDb.prepare('INSERT INTO customers (id, name) VALUES (?, ?)').run('1', 'Customer A');
    testDb.prepare('INSERT INTO sales (id, customer_id, total) VALUES (?, ?, ?)').run('1', '1', 100);
    
    // Verify foreign key constraint
    const sale = testDb.prepare('SELECT * FROM sales WHERE id = ?').get('1');
    expect(sale.customer_id).toBe('1');
    
    // Should not allow orphaned sales
    expect(() => {
      testDb.prepare('INSERT INTO sales (id, customer_id, total) VALUES (?, ?, ?)').run('2', '999', 200);
    }).toThrow();
  });

  test('should preserve data during schema changes', () => {
    // Create initial table
    testDb.exec(`
      CREATE TABLE products_v1 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);
    
    // Insert data
    testDb.prepare('INSERT INTO products_v1 (id, name, price) VALUES (?, ?, ?)').run('1', 'Product A', 20);
    testDb.prepare('INSERT INTO products_v1 (id, name, price) VALUES (?, ?, ?)').run('2', 'Product B', 30);
    
    // Simulate schema migration (add cost column)
    testDb.exec(`
      CREATE TABLE products_v2 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0
      )
    `);
    
    // Migrate data
    testDb.exec(`
      INSERT INTO products_v2 (id, name, price, cost)
      SELECT id, name, price, 0 FROM products_v1
    `);
    
    // Verify data preservation
    const products = testDb.prepare('SELECT * FROM products_v2 ORDER BY id').all();
    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Product A');
    expect(products[0].price).toBe(20);
    expect(products[0].cost).toBe(0);
    expect(products[1].name).toBe('Product B');
    expect(products[1].price).toBe(30);
    expect(products[1].cost).toBe(0);
  });
});

describe('Migration Rollback', () => {
  test('should be able to rollback failed migrations', () => {
    // Create initial state
    testDb.exec(`
      CREATE TABLE products_backup (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);
    
    testDb.prepare('INSERT INTO products_backup (id, name, price) VALUES (?, ?, ?)').run('1', 'Product A', 20);
    
    // Start migration
    testDb.exec('BEGIN TRANSACTION;');
    
    try {
      // Simulate migration step that fails
      testDb.exec(`
        CREATE TABLE products_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          cost REAL NOT NULL DEFAULT 0
        )
      `);
      
      // This step would fail in real scenario
      throw new Error('Migration failed');
      
    } catch (error) {
      // Rollback migration
      testDb.exec('ROLLBACK;');
    }
    
    // Original data should be intact
    const products = testDb.prepare('SELECT * FROM products_backup').all();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Product A');
    
    // New table should not exist
    expect(() => {
      testDb.prepare('SELECT * FROM products_new').all();
    }).toThrow();
  });
});

console.log('✅ Schema migration tests loaded');
