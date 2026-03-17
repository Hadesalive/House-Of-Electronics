// Core types with better type safety and validation
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  isActive?: boolean;
  storeCredit?: number; // Customer store credit balance
  avatar?: string; // Base64 encoded image or URL
}

export interface Product extends BaseEntity {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  brand?: string;
  category?: string;
  stock: number;
  minStock?: number;
  image?: string; // Base64 encoded image or URL
  isActive?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  // Product creation fields
  stock?: number; // Stock level for auto-created products
  cost?: number; // Buying cost for profit calculations
  sku?: string; // Product SKU
  category?: string; // Product category
  minStock?: number; // Minimum stock level
  isActive?: boolean; // Product active status
}

export interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string; // Additional item-specific description
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean; // Whether this item is subject to tax calculation
  // Product creation fields
  stock?: number; // Stock level for auto-created products
  cost?: number; // Buying cost for profit calculations
  sku?: string; // Product SKU
  category?: string; // Product category
  minStock?: number; // Minimum stock level
  isActive?: boolean; // Product active status
  isCustomItem?: boolean; // True if this is a custom item (not from product catalog)
}

export interface Sale extends BaseEntity {
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
  notes?: string;
  invoiceId?: string; // Reference to created invoice
  invoiceNumber?: string; // Invoice number for quick reference
  // RBAC / Cashier tracking
  userId?: string;
  cashierName?: string;
  cashierEmployeeId?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order extends BaseEntity {
  supplierId?: string;
  supplierName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderNumber: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
  notes?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
  condition: 'unopened' | 'opened' | 'defective' | 'damaged';
}

export interface Return extends BaseEntity {
  saleId?: string;
  customerId?: string;
  customerName?: string;
  items: ReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  refundAmount: number;
  refundMethod: 'cash' | 'store_credit' | 'original_payment' | 'exchange';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  returnNumber: string;
  notes?: string;
  processedBy?: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  logo?: string; // Path to the processed logo file
}

export interface SalesData {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  settings: CompanySettings;
}

// Dashboard and analytics types
export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  recentSales: Sale[];
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Invoice extends BaseEntity {
  number: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerPhone?: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery' | 'recurring';
  currency?: string;
  subtotal: number;
  tax: number;
  taxes?: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  bankDetails?: {
    bankName: string;
    accountName?: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
  };
  saleId?: string;
  userId?: string;
  salesRep?: string;
  salesRepId?: string;
}