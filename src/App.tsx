import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layouts/app-layout'
import { AuthProvider, useAuth, ProtectedRoute, PERMISSIONS } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { InstallationGuard } from '@/components/InstallationGuard'

// Import all your existing page components
import HomePage from './pages/HomePage'

import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import CustomerNewPage from './pages/CustomerNewPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductNewPage from './pages/ProductNewPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import InvoiceEditPage from './pages/InvoiceEditPage'
import InvoiceNewPage from './pages/InvoiceNewPage'
import InvoiceTemplatesPage from './pages/InvoiceTemplatesPage'
import SalesPage from './pages/SalesPage'
import SaleDetailPage from './pages/SaleDetailPage'
import SaleEditPage from './pages/SaleEditPage'
import SaleNewPage from './pages/SaleNewPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrderEditPage from './pages/OrderEditPage'
import OrderNewPage from './pages/OrderNewPage'
import ReturnsPage from './pages/ReturnsPage'
import ReturnDetailPage from './pages/ReturnDetailPage'
import ReturnEditPage from './pages/ReturnEditPage'
import ReturnNewPage from './pages/ReturnNewPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import SyncPage from './pages/SyncPage'
import InventoryPage from './pages/InventoryPage'
import TestPage from './pages/TestPage'
import InstallationWizardPage from './pages/InstallationWizardPage'
import CreditPage from './pages/CreditPage'
import CreditNewPage from './pages/CreditNewPage'
import CreditDetailPage from './pages/CreditDetailPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'
import MainDashboardPage from './pages/MainDashboardPage'
import DashboardPage from './pages/DashboardPage'
import BOQPage from './pages/BOQPage'
import BOQDetailPage from './pages/BOQDetailPage'
import BOQNewPage from './pages/BOQNewPage'

// Auth guard component
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  // Global keyboard handler to ensure inputs receive keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ensure keyboard events are not blocked when typing in inputs
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isContentEditable = (activeElement as HTMLElement).isContentEditable ||
          activeElement.getAttribute('contenteditable') === 'true';

        // If focus is in an input, ensure the event reaches it
        if (isInput || isContentEditable) {
          // Allow the event to propagate normally to the input
          // This ensures inputs can receive keyboard input
          return;
        }
      }
    };

    // Add global keyboard listener
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Ensure inputs can receive focus properly
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isContentEditable = target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true';

        if (isInput || isContentEditable) {
          // Ensure the element can receive input
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            // Force focus if needed
            if (document.activeElement !== target) {
              target.focus();
            }
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

  return (
    <InstallationGuard>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/installation" element={<InstallationWizardPage />} />

            {/* Protected routes */}
            <Route path="/" element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }>
              <Route index element={<HomePage />} />
              <Route path="overview" element={<DashboardPage />} />
              <Route path="dashboard" element={<MainDashboardPage />} />


              {/* Customers */}
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/new" element={<CustomerNewPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />

              {/* Products */}
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductNewPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />

              {/* Invoices */}
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<InvoiceNewPage />} />
              <Route path="invoices/templates" element={<InvoiceTemplatesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="invoices/:id/edit" element={<InvoiceEditPage />} />

              {/* Sales */}
              <Route path="sales" element={<SalesPage />} />
              <Route path="sales/new" element={<SaleNewPage />} />
              <Route path="sales/:id" element={<SaleDetailPage />} />
              <Route path="sales/:id/edit" element={<SaleEditPage />} />

              {/* Orders */}
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/new" element={<OrderNewPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="orders/:id/edit" element={<OrderEditPage />} />

              {/* Returns */}
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="returns/new" element={<ReturnNewPage />} />
              <Route path="returns/:id" element={<ReturnDetailPage />} />
              <Route path="returns/:id/edit" element={<ReturnEditPage />} />

              {/* Other pages */}
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="reports" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_REPORTS}>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_SETTINGS}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="sync" element={<SyncPage />} />
              <Route path="test" element={<TestPage />} />

              {/* Credit/Debts */}
              <Route path="credit" element={<CreditPage />} />
              <Route path="credit/new" element={<CreditNewPage />} />
              <Route path="credit/:id" element={<CreditDetailPage />} />

              {/* BOQ and Contracts */}
              <Route path="boq" element={<BOQPage />} />
              <Route path="boq/new" element={<BOQNewPage />} />
              <Route path="boq/:id" element={<BOQDetailPage />} />
              <Route path="boq/:id/edit" element={<BOQNewPage />} />

              {/* Users - Admin only */}
              <Route path="users" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
                  <UsersPage />
                </ProtectedRoute>
              } />

              {/* Profile */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </InstallationGuard>
  )
}

export default App
