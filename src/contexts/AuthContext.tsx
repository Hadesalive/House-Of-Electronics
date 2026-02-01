/**
 * Authentication Context
 * Handles user authentication, session management, and RBAC
 * House Of Electronics Sales Manager
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole, Permission, ROLE_PERMISSIONS, hasPermission as checkPermission } from '../lib/types/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    hasRole: (role: UserRole | UserRole[]) => boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'hoe_auth_session';
const SESSION_EXPIRY_HOURS = 12;

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from storage
    useEffect(() => {
        const initAuth = async () => {
            try {
                const savedSession = localStorage.getItem(SESSION_KEY);
                if (savedSession) {
                    const session = JSON.parse(savedSession);

                    // Check if session is expired
                    if (new Date(session.expiresAt) > new Date()) {
                        // Verify user still exists and is active
                        if (window.electron?.ipcRenderer) {
                            const result = await window.electron.ipcRenderer.invoke('get-current-user', session.userId) as {
                                success: boolean;
                                data?: User;
                                error?: string;
                            };

                            if (result.success && result.data) {
                                setUser(result.data);
                            } else {
                                // Session invalid, clear it
                                localStorage.removeItem(SESSION_KEY);
                            }
                        }
                    } else {
                        // Session expired
                        localStorage.removeItem(SESSION_KEY);
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                localStorage.removeItem(SESSION_KEY);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!window.electron?.ipcRenderer) {
                return { success: false, error: 'Application not ready' };
            }

            const result = await window.electron.ipcRenderer.invoke('user-login', { username, password }) as {
                success: boolean;
                data?: User;
                error?: string;
            };

            if (result.success && result.data) {
                setUser(result.data);

                // Save session
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

                localStorage.setItem(SESSION_KEY, JSON.stringify({
                    userId: result.data.id,
                    expiresAt: expiresAt.toISOString()
                }));

                return { success: true };
            }

            return { success: false, error: result.error || 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
    }, []);

    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!user) return false;
        return checkPermission(user.role, permission);
    }, [user]);

    const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
        if (!user) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
    }, [user]);

    const refreshUser = useCallback(async () => {
        if (!user?.id || !window.electron?.ipcRenderer) return;

        try {
            const result = await window.electron.ipcRenderer.invoke('get-current-user', user.id) as {
                success: boolean;
                data?: User;
                error?: string;
            };

            if (result.success && result.data) {
                setUser(result.data);
            } else {
                // User no longer valid
                logout();
            }
        } catch (error) {
            console.error('Error refreshing user:', error);
        }
    }, [user?.id, logout]);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// HOC for protected routes
interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission?: Permission;
    requiredRole?: UserRole | UserRole[];
    fallback?: ReactNode;
}

export function ProtectedRoute({
    children,
    requiredPermission,
    requiredRole,
    fallback
}: ProtectedRouteProps) {
    const { isAuthenticated, hasPermission, hasRole, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return fallback || null;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
                    <p className="text-gray-600">This page requires a different role.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

// Export permission constants for easy access
export { PERMISSIONS } from '../lib/types/auth';

