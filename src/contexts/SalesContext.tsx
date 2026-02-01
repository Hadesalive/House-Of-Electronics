'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SalesData, Customer, Product, Sale, CompanySettings, DashboardStats } from '@/types';
import { storageService } from '@/services/storage';

interface SalesContextType {
  data: SalesData | null;
  loading: boolean;
  error: string | null;
  
  // Customer operations
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer | null>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;
  
  // Product operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  
  // Sale operations
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Sale | null>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<Sale | null>;
  deleteSale: (id: string) => Promise<boolean>;
  
  // Settings operations
  updateSettings: (settings: Partial<CompanySettings>) => Promise<CompanySettings | null>;
  
  // Export/Import operations
  exportData: () => Promise<{ success: boolean; path?: string; error?: string }>;
  importData: () => Promise<{ success: boolean; data?: SalesData; error?: string }>;
  
  // Dashboard stats
  getDashboardStats: () => DashboardStats | null;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const useSales = () => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};

interface SalesProviderProps {
  children: ReactNode;
}

export const SalesProvider: React.FC<SalesProviderProps> = ({ children }) => {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribe((newData) => {
      setData(newData);
      setLoading(false);
      setError(null);
    });

    // Note: Menu event listeners are now handled in app-layout.tsx
    // This context is kept for backward compatibility but menu navigation
    // should be handled at the layout level to avoid duplicate listeners
    // However, we still handle export/import menu events here
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onMenuExportData(() => {
        handleExportData();
      });

      window.electronAPI.onMenuImportData(() => {
        handleImportData();
      });
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-export-data');
        window.electronAPI.removeAllListeners('menu-import-data');
      }
    };
  }, []);

  const handleExportData = async () => {
    try {
      const result = await storageService.exportData();
      if (result.success) {
        alert(`Data exported successfully to: ${result.path}`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export failed: ${error}`);
    }
  };

  const handleImportData = async () => {
    try {
      const result = await storageService.importData();
      if (result.success) {
        alert('Data imported successfully');
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Import failed: ${error}`);
    }
  };

  const getDashboardStats = (): DashboardStats | null => {
    if (!data) return null;

    const totalRevenue = data.sales
      .filter(sale => sale.status === 'completed')
      .reduce((sum, sale) => sum + sale.total, 0);

    const totalSales = data.sales.length;
    const totalCustomers = data.customers.length;
    const totalProducts = data.products.length;

    const recentSales = data.sales
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Calculate top products
    const productSales = new Map<string, { name: string; totalSold: number; revenue: number }>();
    
    data.sales
      .filter(sale => sale.status === 'completed')
      .forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productId) || { name: item.productName, totalSold: 0, revenue: 0 };
          existing.totalSold += item.quantity;
          existing.revenue += item.total;
          productSales.set(item.productId, existing);
        });
      });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({ productId, productName: data.name, totalSold: data.totalSold, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate sales by month
    const salesByMonth = new Map<string, { revenue: number; sales: number }>();
    
    data.sales
      .filter(sale => sale.status === 'completed')
      .forEach(sale => {
        const month = new Date(sale.createdAt).toISOString().slice(0, 7); // YYYY-MM
        const existing = salesByMonth.get(month) || { revenue: 0, sales: 0 };
        existing.revenue += sale.total;
        existing.sales += 1;
        salesByMonth.set(month, existing);
      });

    const salesByMonthArray = Array.from(salesByMonth.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    return {
      totalRevenue,
      totalSales,
      totalCustomers,
      totalProducts,
      recentSales,
      topProducts,
      salesByMonth: salesByMonthArray
    };
  };

  const contextValue: SalesContextType = {
    data,
    loading,
    error,
    addCustomer: storageService.addCustomer.bind(storageService),
    updateCustomer: storageService.updateCustomer.bind(storageService),
    deleteCustomer: storageService.deleteCustomer.bind(storageService),
    addProduct: storageService.addProduct.bind(storageService),
    updateProduct: storageService.updateProduct.bind(storageService),
    deleteProduct: storageService.deleteProduct.bind(storageService),
    addSale: storageService.addSale.bind(storageService),
    updateSale: storageService.updateSale.bind(storageService),
    deleteSale: storageService.deleteSale.bind(storageService),
    updateSettings: storageService.updateSettings.bind(storageService),
    exportData: storageService.exportData.bind(storageService),
    importData: async () => {
      const result = await storageService.importData();
      return {
        success: result.success,
        data: result.data as SalesData | undefined,
        error: result.error
      };
    },
    getDashboardStats
  };

  return (
    <SalesContext.Provider value={contextValue}>
      {children}
    </SalesContext.Provider>
  );
};
