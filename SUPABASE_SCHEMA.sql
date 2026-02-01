-- ============================================
-- Supabase Schema for House of Electronics
-- Complete schema matching local SQLite database
-- ============================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  avatar TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  company TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  store_credit REAL DEFAULT 0
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price > 0),
  cost REAL CHECK (cost IS NULL OR cost >= 0),
  sku TEXT,
  category TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER CHECK (min_stock >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  image TEXT,
  is_active INTEGER DEFAULT 1
);

-- Sales table (with all columns including migrations)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  invoice_id TEXT,
  invoice_number TEXT,
  user_id TEXT,
  cashier_name TEXT,
  cashier_employee_id TEXT
);

-- Invoices table (with all columns including migrations)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  sale_id TEXT,
  user_id TEXT,
  sales_rep_name TEXT,
  sales_rep_id TEXT
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  sale_id TEXT,
  customer_id TEXT,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  customer_id TEXT,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Debts table (NO updated_at column - matches SQLite schema)
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  amount REAL NOT NULL CHECK (amount > 0),
  paid REAL NOT NULL DEFAULT 0 CHECK (paid >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  description TEXT,
  items TEXT,
  sale_id TEXT
);

-- Debt Payments table (NO updated_at column - matches SQLite schema)
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount > 0),
  date TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  method TEXT
);

-- Invoice Templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- BOQs table
CREATE TABLE IF NOT EXISTS boqs (
  id TEXT PRIMARY KEY,
  boq_number TEXT NOT NULL,
  date TEXT NOT NULL,
  project_title TEXT,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  client_name TEXT,
  client_address TEXT,
  items TEXT NOT NULL,
  notes TEXT,
  manager_signature TEXT,
  total_le REAL NOT NULL DEFAULT 0,
  total_usd REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Users table for RBAC (internal Electron app - password_hash synced)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
  employee_id TEXT UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  last_login TIMESTAMP
);

-- ============================================
-- Create Indexes for Performance
-- ============================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON invoices(updated_at);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_expected_delivery_date ON orders(expected_delivery_date);

-- Returns indexes
CREATE INDEX IF NOT EXISTS idx_returns_updated_at ON returns(updated_at);
CREATE INDEX IF NOT EXISTS idx_returns_deleted_at ON returns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_refund_method ON returns(refund_method);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_priority ON deals(priority);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value);

-- Debts indexes (no updated_at index since column doesn't exist)
CREATE INDEX IF NOT EXISTS idx_debts_deleted_at ON debts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON debts(created_at);
CREATE INDEX IF NOT EXISTS idx_debts_sale_id ON debts(sale_id);

-- Debt Payments indexes (no updated_at index since column doesn't exist)
CREATE INDEX IF NOT EXISTS idx_debt_payments_deleted_at ON debt_payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(date);

-- Invoice Templates indexes
CREATE INDEX IF NOT EXISTS idx_invoice_templates_updated_at ON invoice_templates(updated_at);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_name ON invoice_templates(name);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_created_at ON invoice_templates(created_at);

-- BOQs indexes
CREATE INDEX IF NOT EXISTS idx_boqs_deleted_at ON boqs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_boqs_boq_number ON boqs(boq_number);
CREATE INDEX IF NOT EXISTS idx_boqs_date ON boqs(date);
CREATE INDEX IF NOT EXISTS idx_boqs_client_name ON boqs(client_name);
CREATE INDEX IF NOT EXISTS idx_boqs_created_at ON boqs(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_customer_status ON sales(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_created_status ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_returns_status_created ON returns(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_stage_priority ON deals(stage, priority);

-- ============================================
-- Create Triggers to Auto-Update updated_at
-- Only for tables that have updated_at column
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for tables WITH updated_at column
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at 
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at 
    BEFORE UPDATE ON returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at 
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_templates_updated_at 
    BEFORE UPDATE ON invoice_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boqs_updated_at 
    BEFORE UPDATE ON boqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: debts and debt_payments tables do NOT have updated_at columns
-- so no triggers are created for them

-- ============================================
-- Disable Row Level Security (for testing)
-- ============================================

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE boqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Schema Complete!
-- ============================================
