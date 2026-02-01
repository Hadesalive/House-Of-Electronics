/**
 * Authentication and RBAC Types
 * House Of Electronics Sales Manager
 */

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
    id: string;
    username: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    employeeId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
}

export interface UserCreateInput {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    employeeId?: string; // Auto-generated if not provided
}

export interface UserUpdateInput {
    username?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthSession {
    user: User;
    loginTime: string;
    expiresAt: string;
}

// Permission definitions
export const PERMISSIONS = {
    // Dashboard
    VIEW_DASHBOARD: 'view_dashboard',

    // Sales
    CREATE_SALE: 'create_sale',
    VIEW_OWN_SALES: 'view_own_sales',
    VIEW_ALL_SALES: 'view_all_sales',
    EDIT_SALE: 'edit_sale',
    DELETE_SALE: 'delete_sale',

    // Invoices
    CREATE_INVOICE: 'create_invoice',
    VIEW_INVOICES: 'view_invoices',
    EDIT_INVOICE: 'edit_invoice',
    DELETE_INVOICE: 'delete_invoice',

    // Products
    VIEW_PRODUCTS: 'view_products',
    MANAGE_PRODUCTS: 'manage_products',

    // Customers
    VIEW_CUSTOMERS: 'view_customers',
    MANAGE_CUSTOMERS: 'manage_customers',

    // Reports
    VIEW_REPORTS: 'view_reports',
    EXPORT_REPORTS: 'export_reports',

    // Users
    VIEW_USERS: 'view_users',
    MANAGE_USERS: 'manage_users',

    // Settings
    VIEW_SETTINGS: 'view_settings',
    MANAGE_SETTINGS: 'manage_settings',

    // Credits
    VIEW_CREDITS: 'view_credits',
    MANAGE_CREDITS: 'manage_credits',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    admin: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.CREATE_SALE,
        PERMISSIONS.VIEW_OWN_SALES,
        PERMISSIONS.VIEW_ALL_SALES,
        PERMISSIONS.EDIT_SALE,
        PERMISSIONS.DELETE_SALE,
        PERMISSIONS.CREATE_INVOICE,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.EDIT_INVOICE,
        PERMISSIONS.DELETE_INVOICE,
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.MANAGE_PRODUCTS,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMERS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_REPORTS,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_SETTINGS,
        PERMISSIONS.MANAGE_SETTINGS,
        PERMISSIONS.VIEW_CREDITS,
        PERMISSIONS.MANAGE_CREDITS,
    ],
    manager: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.CREATE_SALE,
        PERMISSIONS.VIEW_OWN_SALES,
        PERMISSIONS.VIEW_ALL_SALES,
        PERMISSIONS.EDIT_SALE,
        PERMISSIONS.CREATE_INVOICE,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.EDIT_INVOICE,
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.MANAGE_PRODUCTS,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.MANAGE_CUSTOMERS,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_CREDITS,
        PERMISSIONS.MANAGE_CREDITS,
        PERMISSIONS.VIEW_SETTINGS,
    ],
    cashier: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.CREATE_SALE,
        PERMISSIONS.VIEW_OWN_SALES,
        PERMISSIONS.CREATE_INVOICE,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_CREDITS,
    ],
};

// Helper function to check if a role has a permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper function to get role display name
export function getRoleDisplayName(role: UserRole): string {
    const names: Record<UserRole, string> = {
        admin: 'Administrator',
        manager: 'Manager',
        cashier: 'Cashier',
    };
    return names[role] || role;
}

// Helper function to generate employee ID prefix based on role
export function getEmployeeIdPrefix(role: UserRole): string {
    const codes: Record<UserRole, string> = {
        admin: 'ADM',
        manager: 'MGR',
        cashier: 'CSH',
    };
    return `EKH-${codes[role] || 'EMP'}`;
}

