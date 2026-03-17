/**
 * Shared SQLite Database Schema
 * Exact copy from development database (house-of-electronics-sales.db)
 * DO NOT MODIFY - This ensures 100% compatibility
 */

function createTables(db) {
  console.log('Creating database tables from development schema...');

  // Customers table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatar TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT,
      company TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      store_credit REAL DEFAULT 0
    )
  `);

  // Products table - Cost is optional (nullable)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK (price > 0),
      cost REAL CHECK (cost IS NULL OR cost >= 0),
      sku TEXT,
      brand TEXT,
      category TEXT,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      min_stock INTEGER CHECK (min_stock >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      image TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Sales table - Updated with backorder support
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      tax REAL NOT NULL CHECK (tax >= 0),
      taxes TEXT,
      discount REAL NOT NULL CHECK (discount >= 0),
      total REAL NOT NULL CHECK (total >= 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit', 'other')),
      notes TEXT,
      has_backorder INTEGER DEFAULT 0,
      backorder_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      invoice_id TEXT,
      invoice_number TEXT
    )
  `);

  // Company Settings table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_rate REAL NOT NULL DEFAULT 0.15 CHECK (tax_rate >= 0 AND tax_rate <= 1),
      currency TEXT NOT NULL DEFAULT 'USD',
      onboarding_completed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT single_row CHECK (id = 1)
    )
  `);

  // Invoice Templates table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_templates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      preview TEXT,
      colors_primary TEXT NOT NULL,
      colors_secondary TEXT NOT NULL,
      colors_accent TEXT NOT NULL,
      colors_background TEXT NOT NULL,
      colors_text TEXT NOT NULL,
      fonts_primary TEXT NOT NULL,
      fonts_secondary TEXT NOT NULL,
      fonts_size TEXT DEFAULT 'medium',
      layout_header_style TEXT DEFAULT 'classic',
      layout_show_logo INTEGER NOT NULL DEFAULT 1,
      layout_show_border INTEGER NOT NULL DEFAULT 1,
      layout_item_table_style TEXT DEFAULT 'simple',
      layout_footer_style TEXT DEFAULT 'minimal',
      custom_schema TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Invoices table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_address TEXT,
      customer_phone TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      tax REAL NOT NULL CHECK (tax >= 0),
      taxes TEXT,
      discount REAL NOT NULL CHECK (discount >= 0),
      total REAL NOT NULL CHECK (total >= 0),
      paid_amount REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
      status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
      invoice_type TEXT NOT NULL CHECK (invoice_type IN ('invoice', 'proforma', 'quote', 'credit_note', 'delivery')),
      currency TEXT NOT NULL,
      due_date TEXT,
      notes TEXT,
      terms TEXT,
      bank_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sale_id TEXT
    )
  `);

  // Deals table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      value REAL NOT NULL CHECK (value > 0),
      probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
      stage TEXT NOT NULL CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
      expected_close_date TEXT,
      actual_close_date TEXT,
      source TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      tags TEXT DEFAULT '[]',
      notes TEXT,
      negotiation_history TEXT DEFAULT '[]',
      stakeholders TEXT DEFAULT '[]',
      competitor_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      order_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT,
      supplier_name TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      tax REAL NOT NULL CHECK (tax >= 0),
      taxes TEXT,
      discount REAL NOT NULL CHECK (discount >= 0),
      total REAL NOT NULL CHECK (total >= 0),
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
      payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
      payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit', 'other')),
      expected_delivery_date TEXT,
      actual_delivery_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Returns table - EXACT from dev
  db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      return_number TEXT NOT NULL UNIQUE,
      sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      tax REAL NOT NULL CHECK (tax >= 0),
      total REAL NOT NULL CHECK (total >= 0),
      refund_amount REAL NOT NULL CHECK (refund_amount >= 0),
      refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'store_credit', 'original_payment', 'exchange')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
      processed_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Debts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      paid REAL NOT NULL DEFAULT 0 CHECK (paid >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
      description TEXT,
      items TEXT,
      sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL
    )
  `);

  // Debt Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      debt_id TEXT REFERENCES debts(id) ON DELETE CASCADE,
      amount REAL NOT NULL CHECK (amount > 0),
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      method TEXT
    )
  `);

  // Create triggers - EXACT from dev
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_customers_timestamp 
    AFTER UPDATE ON customers 
    BEGIN 
      UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
    AFTER UPDATE ON products 
    BEGIN 
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_sales_timestamp
    AFTER UPDATE ON sales
    BEGIN
      UPDATE sales SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_invoice_templates_timestamp
    AFTER UPDATE ON invoice_templates
    BEGIN
      UPDATE invoice_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp
    AFTER UPDATE ON invoices
    BEGIN
      UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_deals_timestamp
    AFTER UPDATE ON deals
    BEGIN
      UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_orders_timestamp
    AFTER UPDATE ON orders
    BEGIN
      UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_returns_timestamp
    AFTER UPDATE ON returns
    BEGIN
      UPDATE returns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Users table for RBAC
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
      employee_id TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // License activation tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS license_activations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_fingerprint TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      customer_name TEXT,
      customer_email TEXT,
      customer_company TEXT,
      license_data TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // License validation history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS license_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      valid INTEGER NOT NULL,
      reason TEXT,
      machine_fingerprint TEXT
    )
  `);

  // Hardware snapshots table (for detecting hardware changes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hardware_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      machine_fingerprint TEXT NOT NULL,
      hardware_data TEXT NOT NULL,
      cpu_info TEXT,
      mac_address TEXT,
      platform TEXT,
      hostname TEXT
    )
  `);

  // BOQ (Bill of Quantities) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boqs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      boq_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      project_title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_address TEXT NOT NULL,
      company_phone TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_address TEXT NOT NULL,
      items TEXT NOT NULL,
      notes TEXT,
      manager_signature TEXT,
      total_le REAL NOT NULL CHECK (total_le >= 0),
      total_usd REAL NOT NULL CHECK (total_usd >= 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Simple product key table (for internal system)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_key (
      id INTEGER PRIMARY KEY DEFAULT 1,
      product_key_hash TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      machine_id TEXT,
      machine_name TEXT,
      CONSTRAINT single_row CHECK (id = 1)
    )
  `);

  // Create indexes for performance
  createIndexes(db);

  console.log('✅ Database tables, triggers, and indexes created successfully');
}

function migrateDatabase(db) {
  console.log('Running database migrations...');
  
  // Add onboarding_completed column if it doesn't exist
  try {
    db.exec(`ALTER TABLE company_settings ADD COLUMN onboarding_completed INTEGER DEFAULT 0`);
    console.log('✅ Added onboarding_completed column');
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }

  // Add machine binding columns to product_key if missing
  try {
    db.exec(`ALTER TABLE product_key ADD COLUMN machine_id TEXT`);
    db.exec(`ALTER TABLE product_key ADD COLUMN machine_name TEXT`);
    console.log('✅ Added machine_id and machine_name to product_key');
  } catch (error) {
    // ignore if columns exist
  }
  
  // Add preferences column if it doesn't exist
  try {
    db.exec(`ALTER TABLE company_settings ADD COLUMN preferences TEXT`);
    console.log('✅ Added preferences column');
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes('duplicate column name')) {
      console.log('Migration note:', error.message);
    }
  }
  
  // Migrate product cost column to be nullable (optional)
  // Check if cost column has NOT NULL constraint and remove it if needed
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const costColumn = tableInfo.find(col => col.name === 'cost');
    
    if (costColumn && costColumn.notnull === 1) {
      // Cost column is currently NOT NULL, need to make it nullable
      console.log('Migrating products table to make cost nullable...');
      
      // Create new table with nullable cost
      db.exec(`
        CREATE TABLE products_new (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL CHECK (price > 0),
          cost REAL CHECK (cost IS NULL OR cost >= 0),
          sku TEXT,
          category TEXT,
          stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          min_stock INTEGER CHECK (min_stock >= 0),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          image TEXT,
          is_active INTEGER DEFAULT 1
        )
      `);
      
      // Copy data from old table to new table
      db.exec(`INSERT INTO products_new SELECT * FROM products`);
      
      // Drop old table and rename new table
      db.exec(`DROP TABLE products`);
      db.exec(`ALTER TABLE products_new RENAME TO products`);
      
      // Recreate indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)');
      
      console.log('✅ Migrated products table to make cost nullable');
    } else {
      console.log('✅ Products table cost column is already nullable');
    }
  } catch (error) {
    // If migration fails, it might be because the table doesn't exist yet or already has correct structure
    if (!error.message.includes('no such table') && !error.message.includes('duplicate column name')) {
      console.log('Cost migration note:', error.message);
    }
  }
  
  // Add brand column to products
  try {
    db.exec(`ALTER TABLE products ADD COLUMN brand TEXT`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`);
    console.log('✅ Added brand column to products');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Brand migration note:', error.message);
    }
  }

  // Add backorder support to sales table
  try {
    db.exec(`ALTER TABLE sales ADD COLUMN has_backorder INTEGER DEFAULT 0`);
    console.log('✅ Added has_backorder column to sales table');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Backorder column migration note:', error.message);
    }
  }
  
  try {
    db.exec(`ALTER TABLE sales ADD COLUMN backorder_details TEXT`);
    console.log('✅ Added backorder_details column to sales table');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.log('Backorder details column migration note:', error.message);
    }
  }
  
  // Add new invoice template columns if they don't exist
  const templateColumns = [
    { name: 'description', type: 'TEXT', default: null },
    { name: 'preview', type: 'TEXT', default: null },
    { name: 'fonts_size', type: 'TEXT', default: "'medium'" },
    { name: 'layout_header_style', type: 'TEXT', default: "'classic'" },
    { name: 'layout_item_table_style', type: 'TEXT', default: "'simple'" },
    { name: 'layout_footer_style', type: 'TEXT', default: "'minimal'" },
    { name: 'custom_schema', type: 'TEXT', default: null },
    { name: 'is_default', type: 'INTEGER', default: '0' }
  ];
  
  templateColumns.forEach(column => {
    try {
      const alterQuery = `ALTER TABLE invoice_templates ADD COLUMN ${column.name} ${column.type}${column.default ? ` DEFAULT ${column.default}` : ''}`;
      db.exec(alterQuery);
      console.log(`✅ Added ${column.name} column to invoice_templates`);
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        console.log(`Migration note for ${column.name}:`, error.message);
      }
    }
  });

  // === Debts / Debt Payments basic migrations ===
  try {
    const info = db.prepare("PRAGMA table_info(debts)").all();
    const hasItems = info.some(c => c.name === 'items');
    if (!hasItems) {
      db.exec('ALTER TABLE debts ADD COLUMN items TEXT');
      console.log('✅ Added items column to debts table');
    }
  } catch (error) {
    if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
      console.log('Debt table migration note:', error.message);
    }
  }

  // Add reports_password column to company_settings if it doesn't exist
  try {
    db.exec(`ALTER TABLE company_settings ADD COLUMN reports_password TEXT`);
    console.log('✅ Added reports_password column to company_settings');
  } catch (error) {
    // Column already exists, ignore error
    if (!error.message.includes('duplicate column name')) {
      console.log('Reports password migration note:', error.message);
    }
  }

  // Add user_id columns to sales table for RBAC
  const salesUserColumns = [
    { name: 'user_id', type: 'TEXT' },
    { name: 'cashier_name', type: 'TEXT' },
    { name: 'cashier_employee_id', type: 'TEXT' }
  ];
  
  salesUserColumns.forEach(column => {
    try {
      db.exec(`ALTER TABLE sales ADD COLUMN ${column.name} ${column.type}`);
      console.log(`✅ Added ${column.name} column to sales table`);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.log(`Migration note for sales.${column.name}:`, error.message);
      }
    }
  });

  // Add user_id columns to invoices table for RBAC
  const invoiceUserColumns = [
    { name: 'user_id', type: 'TEXT' },
    { name: 'sales_rep_name', type: 'TEXT' },
    { name: 'sales_rep_id', type: 'TEXT' }
  ];
  
  invoiceUserColumns.forEach(column => {
    try {
      db.exec(`ALTER TABLE invoices ADD COLUMN ${column.name} ${column.type}`);
      console.log(`✅ Added ${column.name} column to invoices table`);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.log(`Migration note for invoices.${column.name}:`, error.message);
      }
    }
  });

  // Create indexes for user_id columns (must be after columns are added)
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id)`);
    console.log('✅ Created user_id indexes for sales and invoices');
  } catch (error) {
    console.log('User indexes migration note:', error.message);
  }

  // Create default admin user if no users exist
  try {
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingUsers.count === 0) {
      // Default password is 'admin123' - hashed with simple hash for demo (should use bcrypt in production)
      const crypto = require('crypto');
      const defaultPassword = crypto.createHash('sha256').update('admin123').digest('hex');
      
      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, employee_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'admin-default',
        'admin',
        defaultPassword,
        'Administrator',
        'admin@hoe-sl.com',
        'admin',
        'ADM-001',
        1
      );
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.log('Default admin user migration note:', error.message);
  }

  // Migrate sales payment_method to include 'credit'
  try {
    console.log('Migrating sales payment_method constraint to include credit...');
    
    // Check if constraint needs updating by trying to insert a test value
    // We'll recreate the table with the updated constraint
    const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
    const hasPaymentMethod = tableInfo.some(col => col.name === 'payment_method');
    
    if (hasPaymentMethod) {
      // Create new table with updated constraint
      db.exec(`
        CREATE TABLE sales_new (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
          customer_name TEXT,
          items TEXT NOT NULL,
          subtotal REAL NOT NULL CHECK (subtotal >= 0),
          tax REAL NOT NULL CHECK (tax >= 0),
          taxes TEXT,
          discount REAL NOT NULL CHECK (discount >= 0),
          total REAL NOT NULL CHECK (total >= 0),
          status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
          payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit', 'other')),
          notes TEXT,
          has_backorder INTEGER DEFAULT 0,
          backorder_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          invoice_id TEXT,
          invoice_number TEXT,
          user_id TEXT,
          cashier_name TEXT,
          cashier_employee_id TEXT
        )
      `);
      
      // Copy data from old table to new table
      db.exec(`INSERT INTO sales_new SELECT * FROM sales`);
      
      // Drop old table and rename new table
      db.exec(`DROP TABLE sales`);
      db.exec(`ALTER TABLE sales_new RENAME TO sales`);
      
      // Recreate indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer_status ON sales(customer_id, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created_status ON sales(created_at, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)`);
      
      // Recreate trigger
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_sales_timestamp
        AFTER UPDATE ON sales
        BEGIN
          UPDATE sales SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);
      
      console.log('✅ Migrated sales table to include credit in payment_method constraint');
    }
  } catch (error) {
    // If migration fails, it might be because the table doesn't exist yet or already has correct structure
    if (!error.message.includes('no such table') && !error.message.includes('already exists')) {
      console.log('Payment method migration note:', error.message);
    }
  }
}

function createIndexes(db) {
  console.log('Creating database indexes...');

  // Customer indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active)`);

  // Product indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)`);

  // Sales indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total)`);

  // Invoice indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id)`);

  // BOQ indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_boqs_boq_number ON boqs(boq_number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_boqs_date ON boqs(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_boqs_client_name ON boqs(client_name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_boqs_created_at ON boqs(created_at)`);

  // Order indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_expected_delivery_date ON orders(expected_delivery_date)`);

  // Return indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_refund_method ON returns(refund_method)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at)`);

  // Deal indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_priority ON deals(priority)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value)`);

  // Invoice template indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoice_templates_name ON invoice_templates(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoice_templates_created_at ON invoice_templates(created_at)`);

  // License table indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_license_activations_machine ON license_activations(machine_fingerprint)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_license_activations_active ON license_activations(is_active)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_license_validations_machine ON license_validations(machine_fingerprint)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_license_validations_timestamp ON license_validations(validated_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_hardware_snapshots_machine ON hardware_snapshots(machine_fingerprint)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_hardware_snapshots_timestamp ON hardware_snapshots(snapshot_at)`);

  // Composite indexes for common query patterns
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_customer_status ON sales(customer_id, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created_status ON sales(created_at, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_returns_status_created ON returns(status, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_stage_priority ON deals(stage, priority)`);

  // User indexes (only for users table - sales/invoices indexes created after migration)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)`);

  console.log('✅ Database indexes created successfully');
}

function initializeDefaultData(db) {
  // Insert default company settings if none exist
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM company_settings').get();
  if (existingSettings.count === 0) {
    db.prepare(`
      INSERT INTO company_settings (company_name, address, phone, email, tax_rate, currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('House of Electronics', '', '', '', 0.15, 'USD');
    console.log('✅ Default company settings created');
  }
  
  // Insert default invoice templates if none exist
  const existingTemplates = db.prepare('SELECT COUNT(*) as count FROM invoice_templates').get();
  if (existingTemplates.count === 0) {
    const defaultTemplates = [
      {
        id: 'pro-corporate',
        name: 'Pro Corporate',
        description: 'Clean corporate with balanced header and easy-to-scan table',
        preview: 'pro-corporate-preview',
        colors_primary: '#1f2937',
        colors_secondary: '#6b7280',
        colors_accent: '#3b82f6',
        colors_background: '#ffffff',
        colors_text: '#111827',
        fonts_primary: 'Inter',
        fonts_secondary: 'Inter',
        fonts_size: 'medium',
        layout_header_style: 'classic',
        layout_show_logo: 1,
        layout_show_border: 1,
        layout_item_table_style: 'detailed',
        layout_footer_style: 'detailed',
        is_default: 1
      },
      {
        id: 'modern-stripe',
        name: 'Modern Stripe',
        description: 'Bold accent stripe with modern typography',
        preview: 'modern-stripe-preview',
        colors_primary: '#0f172a',
        colors_secondary: '#475569',
        colors_accent: '#8b5cf6',
        colors_background: '#ffffff',
        colors_text: '#0f172a',
        fonts_primary: 'Inter',
        fonts_secondary: 'Inter',
        fonts_size: 'medium',
        layout_header_style: 'modern',
        layout_show_logo: 1,
        layout_show_border: 1,
        layout_item_table_style: 'modern',
        layout_footer_style: 'minimal',
        is_default: 0
      },
      {
        id: 'minimal-outline',
        name: 'Minimal Outline',
        description: 'Clean minimal design with subtle borders',
        preview: 'minimal-outline-preview',
        colors_primary: '#111827',
        colors_secondary: '#6b7280',
        colors_accent: '#10b981',
        colors_background: '#ffffff',
        colors_text: '#111827',
        fonts_primary: 'Inter',
        fonts_secondary: 'Inter',
        fonts_size: 'medium',
        layout_header_style: 'minimal',
        layout_show_logo: 1,
        layout_show_border: 1,
        layout_item_table_style: 'simple',
        layout_footer_style: 'minimal',
        is_default: 0
      },
      {
        id: 'elegant-dark',
        name: 'Elegant Dark',
        description: 'Sophisticated dark theme with gold accents',
        preview: 'elegant-dark-preview',
        colors_primary: '#1e293b',
        colors_secondary: '#64748b',
        colors_accent: '#f59e0b',
        colors_background: '#0f172a',
        colors_text: '#f1f5f9',
        fonts_primary: 'Inter',
        fonts_secondary: 'Inter',
        fonts_size: 'medium',
        layout_header_style: 'premium',
        layout_show_logo: 1,
        layout_show_border: 1,
        layout_item_table_style: 'detailed',
        layout_footer_style: 'detailed',
        is_default: 0
      },
      {
        id: 'classic-column',
        name: 'Classic Column',
        description: 'Traditional two-column layout',
        preview: 'classic-column-preview',
        colors_primary: '#374151',
        colors_secondary: '#9ca3af',
        colors_accent: '#ef4444',
        colors_background: '#ffffff',
        colors_text: '#1f2937',
        fonts_primary: 'Inter',
        fonts_secondary: 'Inter',
        fonts_size: 'medium',
        layout_header_style: 'classic',
        layout_show_logo: 1,
        layout_show_border: 1,
        layout_item_table_style: 'simple',
        layout_footer_style: 'minimal',
        is_default: 0
      }
    ];
    
    const stmt = db.prepare(`
      INSERT INTO invoice_templates (
        id, name, description, preview,
        colors_primary, colors_secondary, colors_accent, colors_background, colors_text,
        fonts_primary, fonts_secondary, fonts_size,
        layout_header_style, layout_show_logo, layout_show_border, layout_item_table_style, layout_footer_style,
        is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    for (const template of defaultTemplates) {
      stmt.run(
        template.id, template.name, template.description, template.preview,
        template.colors_primary, template.colors_secondary, template.colors_accent, template.colors_background, template.colors_text,
        template.fonts_primary, template.fonts_secondary, template.fonts_size,
        template.layout_header_style, template.layout_show_logo, template.layout_show_border, template.layout_item_table_style, template.layout_footer_style,
        template.is_default, now, now
      );
    }
    
    console.log('✅ Default invoice templates created');
  }
  
  // Migrate invoice types to remove debit_note and add delivery
  try {
    console.log('Migrating invoice types...');
    
    // Check if we need to migrate by looking for any invoices with debit_note type
    const debitNoteInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE invoice_type = ?').get('debit_note');
    
    if (debitNoteInvoices.count > 0) {
      console.log('Found debit_note invoices, migrating to delivery...');
      // Update any debit_note invoices to delivery
      db.prepare('UPDATE invoices SET invoice_type = ? WHERE invoice_type = ?').run('delivery', 'debit_note');
      console.log('✅ Migrated debit_note invoices to delivery');
    }
    
    // Update the CHECK constraint by recreating the table
    console.log('Updating invoice_type constraint...');
    
    // Create a new table with the updated constraint
    db.exec(`
      CREATE TABLE invoices_new (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        number TEXT NOT NULL UNIQUE,
        customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
        customer_name TEXT,
        customer_email TEXT,
        customer_address TEXT,
        customer_phone TEXT,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL CHECK (subtotal >= 0),
        tax REAL NOT NULL CHECK (tax >= 0),
        discount REAL NOT NULL CHECK (discount >= 0),
        total REAL NOT NULL CHECK (total >= 0),
        paid_amount REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
        status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
        invoice_type TEXT NOT NULL CHECK (invoice_type IN ('invoice', 'proforma', 'quote', 'credit_note', 'delivery')),
        currency TEXT NOT NULL,
        due_date TEXT,
        notes TEXT,
        terms TEXT,
        bank_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sale_id TEXT
      )
    `);
    
    // Copy data from old table to new table
    db.exec('INSERT INTO invoices_new SELECT * FROM invoices');
    
    // Drop old table and rename new table
    db.exec('DROP TABLE invoices');
    db.exec('ALTER TABLE invoices_new RENAME TO invoices');
    
    // Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id)');
    
    console.log('✅ Invoice type migration completed successfully');
  } catch (error) {
    // If migration fails, it might be because the table already has the correct structure
    if (!error.message.includes('no such table') && !error.message.includes('already exists')) {
      console.log('Invoice type migration note:', error.message);
    }
  }
}

// Add taxes column migration
async function migrateTaxesColumn(db) {
  try {
    console.log('Adding taxes column to invoices table...');
    
    // Check if taxes column already exists
    const tableInfo = db.prepare("PRAGMA table_info(invoices)").all();
    const hasTaxesColumn = tableInfo.some(column => column.name === 'taxes');
    
    if (!hasTaxesColumn) {
      db.exec('ALTER TABLE invoices ADD COLUMN taxes TEXT');
      console.log('✅ Taxes column added successfully');
    } else {
      console.log('✅ Taxes column already exists');
    }
  } catch (error) {
    console.log('Taxes column migration note:', error.message);
  }
}

module.exports = {
  createTables,
  createIndexes,
  migrateDatabase,
  migrateTaxesColumn,
  initializeDefaultData
};
