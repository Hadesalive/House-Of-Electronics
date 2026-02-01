// Route definitions for type-safe navigation
export type RoutePath = 
  | '/'
  | '/sales'
  | '/sales/new'
  | '/sales/[id]'
  | '/orders'
  | '/orders/new'
  | '/orders/[id]'
  | '/products'
  | '/products/new'
  | '/products/[id]'
  | '/customers'
  | '/customers/new'
  | '/customers/[id]'
  | '/inventory'
  | '/shipping'
  | '/returns'
  | '/reports'
  | '/settings';

export interface RouteConfig {
  path: RoutePath;
  title: string;
  icon: string;
  requiresAuth?: boolean;
  sidebar?: boolean;
}

export const ROUTES: Record<string, RouteConfig> = {
  OVERVIEW: {
    path: '/',
    title: 'Overview',
    icon: 'Squares2X2Icon',
    sidebar: true,
  },
  SALES: {
    path: '/sales',
    title: 'Sales',
    icon: 'CurrencyDollarIcon',
    sidebar: true,
  },
  NEW_SALE: {
    path: '/sales/new',
    title: 'New Sale',
    icon: 'CurrencyDollarIcon',
  },
  SALE_DETAIL: {
    path: '/sales/[id]',
    title: 'Sale Details',
    icon: 'CurrencyDollarIcon',
  },
  ORDERS: {
    path: '/orders',
    title: 'Orders',
    icon: 'ClipboardDocumentListIcon',
    sidebar: true,
  },
  NEW_ORDER: {
    path: '/orders/new',
    title: 'New Order',
    icon: 'ClipboardDocumentListIcon',
  },
  ORDER_DETAIL: {
    path: '/orders/[id]',
    title: 'Order Details',
    icon: 'ClipboardDocumentListIcon',
  },
  PRODUCTS: {
    path: '/products',
    title: 'Products',
    icon: 'CubeIcon',
    sidebar: true,
  },
  NEW_PRODUCT: {
    path: '/products/new',
    title: 'New Product',
    icon: 'CubeIcon',
  },
  PRODUCT_DETAIL: {
    path: '/products/[id]',
    title: 'Product Details',
    icon: 'CubeIcon',
  },
  CUSTOMERS: {
    path: '/customers',
    title: 'Customers',
    icon: 'UsersIcon',
    sidebar: true,
  },
  NEW_CUSTOMER: {
    path: '/customers/new',
    title: 'New Customer',
    icon: 'UsersIcon',
  },
  CUSTOMER_DETAIL: {
    path: '/customers/[id]',
    title: 'Customer Details',
    icon: 'UsersIcon',
  },
  INVENTORY: {
    path: '/inventory',
    title: 'Inventory',
    icon: 'TagIcon',
    sidebar: true,
  },
  SHIPPING: {
    path: '/shipping',
    title: 'Shipping',
    icon: 'TruckIcon',
    sidebar: true,
  },
  RETURNS: {
    path: '/returns',
    title: 'Returns',
    icon: 'ArrowPathIcon',
    sidebar: true,
  },
  REPORTS: {
    path: '/reports',
    title: 'Reports',
    icon: 'ChartBarIcon',
    sidebar: true,
  },
  SETTINGS: {
    path: '/settings',
    title: 'Settings',
    icon: 'AdjustmentsVerticalIcon',
    sidebar: true,
  },
};