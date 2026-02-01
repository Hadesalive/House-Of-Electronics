import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
    DashboardLayout,
    DashboardHeader,
    DashboardSidebar,
    MobileDrawer
} from '@/components/ui/dashboard';
import { defaultSidebarItems } from '@/components/ui/dashboard/dashboard-sidebar';
import { useDarkMode } from '@/lib/hooks/useDarkMode';
import LicenseGuard from '@/components/LicenseGuard';
import { useAuth, PERMISSIONS } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { ProfileDropdown } from '@/components/ui/core';
import { UsersIcon as UserGroupIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { IconAlertCircle, IconAlertTriangle, IconCheck } from '@tabler/icons-react';

function AppLayoutContent() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [pageTitle, setPageTitle] = useState('House Of Electronics Sales Manager');
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const { hasPermission, user, logout } = useAuth();
    const { health } = useSync();

    // Apply dark mode from settings
    useDarkMode();

    // Filter sidebar items based on user permissions
    const filteredSidebarItems = useMemo(() => {
        const items = [...defaultSidebarItems];

        // Add Users menu item for admins and managers (both have MANAGE_USERS permission)
        if (hasPermission(PERMISSIONS.MANAGE_USERS)) {
            // Find the index of Settings and insert Users before it
            const settingsIndex = items.findIndex(item => item.name === 'Settings');
            if (settingsIndex !== -1) {
                items.splice(settingsIndex, 0, { name: 'Users', icon: UserGroupIcon });
            }
        }

        // Filter out items based on permissions - hide items users can't access
        const filtered = items.filter(item => {
            // Reports - admin only
            if (item.name === 'Reports') {
                return hasPermission(PERMISSIONS.VIEW_REPORTS);
            }
            // Settings - admin and manager only
            if (item.name === 'Settings') {
                return hasPermission(PERMISSIONS.VIEW_SETTINGS);
            }
            // Sync - visible to all authenticated users
            // (no permission check needed, it's already in defaultSidebarItems)
            // Users - admin and manager only (already added above if has permission)
            if (item.name === 'Users') {
                return hasPermission(PERMISSIONS.MANAGE_USERS);
            }
            // All other items are visible to all authenticated users
            return true;
        });

        // Add Profile for everyone
        filtered.push({ name: 'Profile', icon: UserCircleIcon });
        return filtered;
    }, [hasPermission]);

    // Get current page title from route
    const getCurrentPageTitle = useCallback(() => {
        if (pathname === '/dashboard' || pathname === '/') return 'Dashboard';
        if (pathname === '/overview') return 'Overview';
        if (pathname.startsWith('/sales')) return 'Sales';
        // if (pathname.startsWith('/pipeline')) return 'Sales Pipeline'; // Commented out
        if (pathname.startsWith('/invoices')) return 'Invoices';
        if (pathname.startsWith('/orders')) return 'Orders';
        if (pathname.startsWith('/boq')) return 'BOQ';
        if (pathname.startsWith('/products')) return 'Products';
        if (pathname.startsWith('/customers')) return 'Customers';
        if (pathname.startsWith('/inventory')) return 'Inventory';
        if (pathname.startsWith('/credit')) return 'Customer Debts';
        // if (pathname.startsWith('/shipping')) return 'Shipping'; // Commented out
        if (pathname.startsWith('/returns')) return 'Returns';
        if (pathname.startsWith('/reports')) return 'Reports';
        if (pathname.startsWith('/sync')) return 'Sync';
        if (pathname.startsWith('/profile')) return 'Profile';
        if (pathname.startsWith('/settings')) {
            return 'Settings';
        }
        return 'House Of Electronics Sales Manager';
    }, [pathname]);

    // Update page title when route or search params change
    useEffect(() => {
        setPageTitle(getCurrentPageTitle());
    }, [getCurrentPageTitle]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const toSalesNew = () => navigate('/sales/new');
            const toCustomersNew = () => navigate('/customers/new');
            const toProductsNew = () => navigate('/products/new');
            const toDebtNew = () => navigate('/credit/new');
            const toActivation = () => navigate('/activation');

            window.electronAPI.onMenuNewSale(toSalesNew);
            window.electronAPI.onMenuNewCustomer(toCustomersNew);
            window.electronAPI.onMenuNewProduct(toProductsNew);
            window.electronAPI.onMenuNewDebt(toDebtNew);

            // Listen for IPC navigation to activation page (if needed)
            window.electronAPI.onNavigateToActivation(toActivation);

            return () => {
                window.electronAPI.removeAllListeners && window.electronAPI.removeAllListeners('menu-new-sale');
                window.electronAPI.removeAllListeners && window.electronAPI.removeAllListeners('menu-new-customer');
                window.electronAPI.removeAllListeners && window.electronAPI.removeAllListeners('menu-new-product');
                window.electronAPI.removeAllListeners && window.electronAPI.removeAllListeners('menu-new-debt');
                window.electronAPI.removeAllListeners && window.electronAPI.removeAllListeners('navigate-to-activation');
            };
        }
    }, [navigate]);

    const handleSidebarSelect = (name: string) => {
        // Map sidebar names to routes
        const routeMap: Record<string, string> = {
            'Overview': '/overview',
            'Dashboard': '/dashboard',
            'Sales': '/sales',
            // 'Pipeline': '/pipeline', // Commented out
            'Invoices': '/invoices',
            'Orders': '/orders',
            'BOQ': '/boq',
            'Products': '/products',
            'Customers': '/customers',
            'Inventory': '/inventory',
            'Customer Debts': '/credit',
            // 'Shipping': '/shipping', // Commented out
            'Returns': '/returns',
            'Reports': '/reports',
            'Sync': '/sync',
            'Users': '/users',
            'Profile': '/profile',
            'Settings': '/settings',
            // Simplified settings sub-menus
            'Company Info': '/settings?tab=company',
            'Tax Settings': '/settings?tab=tax',
            'Data Backup': '/settings?tab=backup',
            'Preferences': '/settings?tab=preferences',
        };

        const route = routeMap[name];
        if (route && route !== pathname) {
            navigate(route);
        }
        setIsMobileMenuOpen(false);
    };

    const handleMobileMenuToggle = () => {
        const drawer = document.getElementById('mobile-drawer') as HTMLDialogElement;
        if (drawer) {
            if (isMobileMenuOpen) {
                drawer.close();
            } else {
                drawer.showModal();
            }
            setIsMobileMenuOpen(!isMobileMenuOpen);
        }
    };

    const handleMobileSidebarSelect = (name: string) => {
        handleSidebarSelect(name);
        setIsMobileMenuOpen(false);
    };

    const getHeaderActions = () => {
        // Show sync health indicator if there are issues
        if (health && health.status !== 'healthy' && health.enabled) {
            const isCritical = health.status === 'critical';
            const Icon = isCritical ? IconAlertCircle : IconAlertTriangle;
            const color = isCritical ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';
            const bg = isCritical ? 'bg-red-500/20' : 'bg-yellow-500/20';

            return (
                <button
                    onClick={() => navigate('/sync')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${bg} ${color} hover:opacity-80 transition-opacity`}
                    title={`Sync ${health.status}: ${[...health.alerts, ...health.warnings].join(', ')}`}
                >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">
                        Sync {health.status === 'critical' ? 'Critical' : 'Warning'}
                    </span>
                </button>
            );
        }
        return null;
    };

    const headerUserActions = (
        <ProfileDropdown
            user={user}
            onLogout={() => {
                logout();
                navigate('/login');
            }}
        />
    );

    return (
        <DashboardLayout
            sidebarCollapsed={sidebarCollapsed}
            sidebar={
                <DashboardSidebar
                    active={pageTitle}
                    onSelect={handleSidebarSelect}
                    items={filteredSidebarItems}
                    collapsed={sidebarCollapsed}
                    onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            }
            header={
                <DashboardHeader
                    title={pageTitle}
                    onMenuClick={handleMobileMenuToggle}
                    actions={
                        <div className="flex items-center gap-2">
                            {getHeaderActions()}
                            {headerUserActions}
                        </div>
                    }
                />
            }
            mobileDrawer={
                <MobileDrawer id="mobile-drawer" title="Navigation">
                    <DashboardSidebar
                        active={pageTitle}
                        onSelect={handleMobileSidebarSelect}
                        items={filteredSidebarItems}
                        drawer
                    />
                </MobileDrawer>
            }
        >
            <Outlet />
        </DashboardLayout>
    );
}

export function AppLayout() {
    return (
        <LicenseGuard>
            <Suspense fallback={<div>Loading...</div>}>
                <AppLayoutContent />
            </Suspense>
        </LicenseGuard>
    );
}