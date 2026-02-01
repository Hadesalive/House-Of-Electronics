import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  KPICard,
  ChartCard,
  ListCard,
  DateRangePicker,
  type DateRange
} from '@/components/ui/dashboard';
import { Button } from '@/components/ui/core';
import { Select } from '@/components/ui/forms/select';
import { PasswordProtection } from '@/components/ui/auth/PasswordProtection';
import { PasswordManager } from '@/components/ui/auth/PasswordManager';
import { salesService, customerService, productService, returnService } from '@/lib/services';
import { Sale, Customer, Product, Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { generateReportPDF } from '@/lib/services/reports-pdf-generator';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface ReportData {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  salesGrowth: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    orderCount: number;
    totalReturns?: number;
    hasReturns?: boolean;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  salesByStatus?: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  salesByPaymentMethod?: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  customerSegments?: Array<{
    segment: string;
    count: number;
    totalSpent: number;
    avgOrderValue: number;
  }>;
  productPerformance?: Array<{
    productId: string;
    productName: string;
    category: string;
    stock: number;
    totalSold: number;
    revenue: number;
    profitMargin: number;
  }>;
  categoryBreakdown?: Array<{
    category: string;
    revenue: number;
    count: number;
    avgPrice: number;
  }>;
  profitAnalysis?: {
    grossRevenue: number;
    totalCosts: number;
    netProfit: number;
    profitMargin: number;
  };
  inventoryStatus?: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
}

export default function ReportsPage() {
  const { formatCurrency, formatDate } = useSettings();
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });
  const [reportType, setReportType] = useState('sales');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordManager, setShowPasswordManager] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  const reportTypes = [
    { value: 'sales', label: 'Sales Report' },
    { value: 'customers', label: 'Customer Report' },
    { value: 'products', label: 'Product Report' },
    { value: 'financial', label: 'Financial Report' },
    { value: 'inventory', label: 'Inventory Report' }
  ];

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleManagePassword = () => {
    setShowPasswordManager(true);
  };

  const handlePasswordSet = (password: string) => {
    setShowPasswordManager(false);
    setIsFirstTimeSetup(false);
    setIsAuthenticated(true);
  };

  const handlePasswordManagerCancel = () => {
    setShowPasswordManager(false);
    setIsFirstTimeSetup(false);
  };

  React.useEffect(() => {
    const checkPassword = async () => {
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const result = await window.electronAPI.getReportsPassword();
          if (!result.success || !result.data) {
            setIsFirstTimeSetup(true);
            setShowPasswordManager(true);
          }
        } else {
          const storedPassword = localStorage.getItem('reports_password');
          if (!storedPassword) {
            setIsFirstTimeSetup(true);
            setShowPasswordManager(true);
          }
        }
      } catch (error) {
        console.error('Error checking password:', error);
        setIsFirstTimeSetup(true);
        setShowPasswordManager(true);
      }
    };
    checkPassword();
  }, []);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesResponse, customersResponse, productsResponse, returnsResponse] = await Promise.all([
        salesService.getAllSales(),
        customerService.getAllCustomers(),
        productService.getAllProducts(),
        returnService.getAllReturns()
      ]);

      if (salesResponse.success && customersResponse.success && productsResponse.success && returnsResponse.success) {
        const sales = salesResponse.data || [];
        const customers = customersResponse.data || [];
        const products = productsResponse.data || [];
        const allReturns = returnsResponse.data || [];

        const filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return dateRange.start && dateRange.end && saleDate >= dateRange.start && saleDate <= dateRange.end;
        });

        // Filter returns by date range and only count approved/completed returns
        const filteredReturns = allReturns.filter(ret => {
          const returnDate = new Date(ret.createdAt);
          const isInDateRange = dateRange.start && dateRange.end && returnDate >= dateRange.start && returnDate <= dateRange.end;
          const isApproved = ret.status === 'approved' || ret.status === 'completed';
          return isInDateRange && isApproved;
        });

        // Calculate total revenue (sales minus returns)
        const totalSalesRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalReturnsAmount = filteredReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
        const totalRevenue = totalSalesRevenue - totalReturnsAmount;
        
        const totalSales = filteredSales.length;
        const totalCustomers = customers.length;
        const totalProducts = products.length;

        // Calculate growth (including returns in previous period)
        const previousPeriodSales = sales.filter(sale => {
          if (!dateRange.start || !dateRange.end) return false;
          const saleDate = new Date(sale.createdAt);
          const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          const prevStart = new Date(dateRange.start.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
          const prevEnd = new Date(dateRange.start.getTime() - (24 * 60 * 60 * 1000));
          return saleDate >= prevStart && saleDate <= prevEnd;
        });

        const previousPeriodReturns = allReturns.filter(ret => {
          if (!dateRange.start || !dateRange.end) return false;
          const returnDate = new Date(ret.createdAt);
          const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          const prevStart = new Date(dateRange.start.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
          const prevEnd = new Date(dateRange.start.getTime() - (24 * 60 * 60 * 1000));
          const isApproved = ret.status === 'approved' || ret.status === 'completed';
          return returnDate >= prevStart && returnDate <= prevEnd && isApproved;
        });

        const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.total, 0) - 
                               previousPeriodReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        const salesGrowth = previousPeriodSales.length > 0 ? ((totalSales - previousPeriodSales.length) / previousPeriodSales.length) * 100 : 0;

        // Top products - group by product name if productId is missing, subtract returns
        const productSales = new Map<string, { name: string; totalSold: number; revenue: number }>();
        
        // Add sales
        filteredSales.forEach(sale => {
          sale.items.forEach(item => {
            const key = item.productId || item.productName;
            const existing = productSales.get(key) || { name: item.productName, totalSold: 0, revenue: 0 };
            existing.totalSold += item.quantity;
            existing.revenue += item.total;
            productSales.set(key, existing);
          });
        });

        // Subtract returns
        filteredReturns.forEach(ret => {
          ret.items.forEach(returnItem => {
            const key = returnItem.productId || returnItem.productName;
            const existing = productSales.get(key);
            if (existing) {
              existing.totalSold -= returnItem.quantity;
              // Subtract total amount from return item
              existing.revenue -= returnItem.total;
              // Ensure values don't go negative
              existing.totalSold = Math.max(0, existing.totalSold);
              existing.revenue = Math.max(0, existing.revenue);
            }
          });
        });

        const topProducts = Array.from(productSales.entries())
          .map(([productId, data]) => ({ productId, productName: data.name, totalSold: data.totalSold, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Top customers - track sales and returns separately
        const customerSales = new Map<string, { name: string; totalSpent: number; orderCount: number; totalReturns: number }>();
        
        // Add sales
        filteredSales.forEach(sale => {
          if (sale.customerId && sale.customerName) {
            const existing = customerSales.get(sale.customerId) || { name: sale.customerName, totalSpent: 0, orderCount: 0, totalReturns: 0 };
            existing.totalSpent += sale.total;
            existing.orderCount += 1;
            customerSales.set(sale.customerId, existing);
          }
        });

        // Track returns separately
        filteredReturns.forEach(ret => {
          if (ret.customerId && ret.customerName) {
            const existing = customerSales.get(ret.customerId) || { name: ret.customerName, totalSpent: 0, orderCount: 0, totalReturns: 0 };
            existing.totalReturns += ret.refundAmount;
            customerSales.set(ret.customerId, existing);
          }
        });

        const topCustomers = Array.from(customerSales.entries())
          .map(([customerId, data]) => {
            const netSpent = data.totalSpent - data.totalReturns;
            return {
              customerId,
              customerName: data.name,
              totalSpent: netSpent > 0 ? netSpent : 0,
              orderCount: data.orderCount,
              totalReturns: data.totalReturns,
              hasReturns: data.totalReturns > 0
            };
          })
          .filter(c => c.totalSpent > 0 || c.hasReturns) // Include customers with sales OR returns
          .sort((a, b) => {
            // Sort by net spent, but prioritize customers with returns if net is 0
            if (a.totalSpent === 0 && a.hasReturns && b.totalSpent === 0 && !b.hasReturns) return -1;
            if (b.totalSpent === 0 && b.hasReturns && a.totalSpent === 0 && !a.hasReturns) return 1;
            // If both have returns and 0 net, sort by return amount (largest first)
            if (a.totalSpent === 0 && a.hasReturns && b.totalSpent === 0 && b.hasReturns) {
              return (b.totalReturns || 0) - (a.totalReturns || 0);
            }
            return b.totalSpent - a.totalSpent;
          })
          .slice(0, 10);

        // Sales by month - subtract returns from monthly revenue
        const salesByMonth = new Map<string, { revenue: number; sales: number }>();
        
        // Add sales
        filteredSales.forEach(sale => {
          const month = new Date(sale.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const existing = salesByMonth.get(month) || { revenue: 0, sales: 0 };
          existing.revenue += sale.total;
          existing.sales += 1;
          salesByMonth.set(month, existing);
        });

        // Subtract returns
        filteredReturns.forEach(ret => {
          const month = new Date(ret.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const existing = salesByMonth.get(month);
          if (existing) {
            existing.revenue -= ret.refundAmount;
            existing.revenue = Math.max(0, existing.revenue);
          }
        });

        const salesByMonthArray = Array.from(salesByMonth.entries())
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        // Generate report-specific data (pass returns for accurate calculations)
        const reportSpecificData = generateReportSpecificData(filteredSales, sales, customers, products, reportType, filteredReturns, allReturns);

        setReportData({
          totalRevenue,
          totalSales,
          totalCustomers,
          totalProducts,
          revenueGrowth,
          salesGrowth,
          topProducts,
          topCustomers,
          salesByMonth: salesByMonthArray,
          ...reportSpecificData
        });
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, reportType]); // Memoize with only necessary dependencies

  useEffect(() => {
    if (isAuthenticated) {
      loadReportData();
    }
  }, [isAuthenticated, loadReportData]); // Now safe to include loadReportData

  const generateReportSpecificData = (
    filteredSales: Sale[], 
    allSales: Sale[], 
    customers: Customer[], 
    products: Product[], 
    reportType: string,
    filteredReturns: Return[] = [],
    allReturns: Return[] = []
  ) => {
    const data: any = {};

    switch (reportType) {
      case 'sales':
        const salesByStatus = new Map<string, { count: number; revenue: number }>();
        filteredSales.forEach(sale => {
          const existing = salesByStatus.get(sale.status) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += sale.total;
          salesByStatus.set(sale.status, existing);
        });
        // Subtract returns from revenue (returns affect net revenue)
        filteredReturns.forEach(ret => {
          // Find the sale to get its status and payment method
          const relatedSale = filteredSales.find(s => s.id === ret.saleId);
          if (relatedSale) {
            const existing = salesByStatus.get(relatedSale.status);
            if (existing) {
              existing.revenue -= ret.refundAmount;
              existing.revenue = Math.max(0, existing.revenue);
            }
          }
        });
        data.salesByStatus = Array.from(salesByStatus.entries()).map(([status, data]) => ({ status, ...data }));

        const salesByPaymentMethod = new Map<string, { count: number; revenue: number }>();
        filteredSales.forEach(sale => {
          const existing = salesByPaymentMethod.get(sale.paymentMethod) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += sale.total;
          salesByPaymentMethod.set(sale.paymentMethod, existing);
        });
        // Subtract returns from payment method revenue
        filteredReturns.forEach(ret => {
          const relatedSale = filteredSales.find(s => s.id === ret.saleId);
          if (relatedSale) {
            const existing = salesByPaymentMethod.get(relatedSale.paymentMethod);
            if (existing) {
              existing.revenue -= ret.refundAmount;
              existing.revenue = Math.max(0, existing.revenue);
            }
          }
        });
        data.salesByPaymentMethod = Array.from(salesByPaymentMethod.entries()).map(([method, data]) => ({ method, ...data }));
        break;

      case 'customers':
        const customerSegments = new Map<string, { count: number; totalSpent: number; avgOrderValue: number }>();
        const customerSales = new Map<string, { totalSpent: number; orderCount: number; totalReturns: number }>();
        
        // Add sales
        filteredSales.forEach(sale => {
          if (sale.customerId) {
            const existing = customerSales.get(sale.customerId) || { totalSpent: 0, orderCount: 0, totalReturns: 0 };
            existing.totalSpent += sale.total;
            existing.orderCount += 1;
            customerSales.set(sale.customerId, existing);
          }
        });

        // Track returns separately
        filteredReturns.forEach(ret => {
          if (ret.customerId) {
            const existing = customerSales.get(ret.customerId) || { totalSpent: 0, orderCount: 0, totalReturns: 0 };
            existing.totalReturns += ret.refundAmount;
            customerSales.set(ret.customerId, existing);
          }
        });

        customerSales.forEach((data, customerId) => {
          const netSpent = data.totalSpent - data.totalReturns;
          // Only categorize customers with positive net spending
          if (netSpent > 0) {
            let segment = 'Low Value';
            if (netSpent > 1000) segment = 'High Value';
            else if (netSpent > 500) segment = 'Medium Value';
            
            const existing = customerSegments.get(segment) || { count: 0, totalSpent: 0, avgOrderValue: 0 };
            existing.count += 1;
            existing.totalSpent += netSpent;
            existing.avgOrderValue = existing.totalSpent / existing.count;
            customerSegments.set(segment, existing);
          }
        });
        data.customerSegments = Array.from(customerSegments.entries()).map(([segment, data]) => ({ segment, ...data }));
        break;

      case 'products':
        const productPerformance = new Map<string, { 
          productName: string; 
          category: string; 
          stock: number; 
          totalSold: number; 
          revenue: number; 
          profitMargin: number 
        }>();
        
        products.forEach(product => {
          // Calculate sales
          const sales = filteredSales.filter(sale => 
            sale.items.some(item => item.productId === product.id)
          );
          let totalSold = sales.reduce((sum, sale) => 
            sum + sale.items.filter(item => item.productId === product.id)
              .reduce((itemSum, item) => itemSum + item.quantity, 0), 0
          );
          let revenue = sales.reduce((sum, sale) => 
            sum + sale.items.filter(item => item.productId === product.id)
              .reduce((itemSum, item) => itemSum + item.total, 0), 0
          );

          // Subtract returns
          const productReturns = filteredReturns.filter(ret =>
            ret.items.some(item => item.productId === product.id)
          );
          productReturns.forEach(ret => {
            ret.items.forEach(returnItem => {
              if (returnItem.productId === product.id) {
                totalSold -= returnItem.quantity;
                revenue -= returnItem.total;
              }
            });
          });

          // Ensure values don't go negative
          totalSold = Math.max(0, totalSold);
          revenue = Math.max(0, revenue);
          
          productPerformance.set(product.id, {
            productName: product.name,
            category: product.category || 'Uncategorized',
            stock: product.stock || 0,
            totalSold,
            revenue,
            profitMargin: product.cost && product.price ? ((product.price - product.cost) / product.price) * 100 : 0
          });
        });
        data.productPerformance = Array.from(productPerformance.values()).sort((a, b) => b.revenue - a.revenue);

        const categoryBreakdown = new Map<string, { revenue: number; count: number; avgPrice: number }>();
        productPerformance.forEach(product => {
          const existing = categoryBreakdown.get(product.category) || { revenue: 0, count: 0, avgPrice: 0 };
          existing.revenue += product.revenue;
          existing.count += 1;
          categoryBreakdown.set(product.category, existing);
        });
        data.categoryBreakdown = Array.from(categoryBreakdown.entries()).map(([category, data]) => ({
          category,
          ...data,
          avgPrice: data.revenue / data.count
        }));
        break;

      case 'financial':
        // Calculate gross revenue (sales) and net revenue (sales minus returns)
        const grossRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalReturnsAmount = filteredReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
        const netRevenue = grossRevenue - totalReturnsAmount;
        
        // Calculate costs - account for returned items (reduce cost of goods sold)
        const totalCosts = products.reduce((sum, product) => {
          // Calculate quantity sold
          const sales = filteredSales.filter(sale => 
            sale.items.some(item => item.productId === product.id)
          );
          let qtySold = sales.reduce((s, sale) => 
            s + sale.items.filter(item => item.productId === product.id)
              .reduce((itemSum, item) => itemSum + item.quantity, 0), 0
          );
          
          // Subtract returned quantities
          const productReturns = filteredReturns.filter(ret =>
            ret.items.some(item => item.productId === product.id)
          );
          productReturns.forEach(ret => {
            ret.items.forEach(returnItem => {
              if (returnItem.productId === product.id) {
                qtySold -= returnItem.quantity;
              }
            });
          });
          
          qtySold = Math.max(0, qtySold); // Ensure non-negative
          return sum + ((product.cost || 0) * qtySold);
        }, 0);
        
        const netProfit = netRevenue - totalCosts;
        const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
        
        data.profitAnalysis = { 
          grossRevenue: netRevenue, // Use net revenue as gross revenue for reports
          totalCosts, 
          netProfit, 
          profitMargin 
        };
        break;

      case 'inventory':
        const lowStock = products.filter(p => p.minStock && p.stock <= p.minStock && p.stock > 0).length;
        const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
        const totalValue = products.reduce((sum, p) => sum + ((p.cost || 0) * (p.stock || 0)), 0);
        
        data.inventoryStatus = {
          totalItems: products.length,
          lowStock,
          outOfStock,
          totalValue
        };
        break;
    }

    return data;
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(Number(value));
          }
        }
      }
    }
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(Number(value));
          }
        }
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  const exportReport = async () => {
    if (!reportData) {
      return;
    }

    try {
      setLoading(true);
      
      // Get company settings
      const settingsResponse = await window.electronAPI.getCompanySettings();
      const companySettings = settingsResponse.success ? settingsResponse.data : null;
      
      if (!companySettings) {
        alert('Failed to load company settings');
        setLoading(false);
        return;
      }

      // Prepare report configuration
      const reportTitles = {
        sales: 'Sales Report',
        customers: 'Customer Analytics Report',
        products: 'Product Performance Report',
        financial: 'Financial Analysis Report',
        inventory: 'Inventory Status Report'
      };

      const config = {
        reportType: reportType as 'sales' | 'customers' | 'products' | 'financial' | 'inventory',
        reportTitle: reportTitles[reportType as keyof typeof reportTitles],
        dateRange: {
          start: dateRange.start || new Date(),
          end: dateRange.end || new Date()
        },
        data: reportData,
        company: {
          name: companySettings.companyName,
          address: companySettings.address,
          phone: companySettings.phone,
          email: companySettings.email,
          logo: companySettings.logo
        },
        formatCurrency,
        formatNumber
      };

      // Generate PDF
      const pdfGenerator = await generateReportPDF(config);
      
      // Download with descriptive filename
      const startDate = dateRange.start?.toISOString().split('T')[0] || 'unknown';
      const endDate = dateRange.end?.toISOString().split('T')[0] || 'unknown';
      const filename = `${reportType}-report-${startDate}-to-${endDate}.pdf`;
      
      pdfGenerator.download(filename);
      
      setLoading(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
      setLoading(false);
    }
  };

  // Render content based on report type
  const renderContent = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'sales':
        return (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Revenue"
                value={formatCurrency(reportData.totalRevenue)}
                trend={{ value: Math.abs(reportData.revenueGrowth), isPositive: reportData.revenueGrowth >= 0 }}
                icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                accentColor="#10b981"
              />
              <KPICard
                title="Total Sales"
                value={formatNumber(reportData.totalSales)}
                trend={{ value: Math.abs(reportData.salesGrowth), isPositive: reportData.salesGrowth >= 0 }}
                icon={<ShoppingCartIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                accentColor="#3b82f6"
              />
              <KPICard
                title="Avg Order Value"
                value={formatCurrency(reportData.totalSales > 0 ? reportData.totalRevenue / reportData.totalSales : 0)}
                icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                accentColor="#f59e0b"
              />
              <KPICard
                title="Completed Sales"
                value={formatNumber(reportData.salesByStatus?.find(s => s.status === 'completed')?.count || 0)}
                icon={<ShoppingCartIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
                accentColor="#22c55e"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Revenue Trend">
                <div className="h-64">
                  <Line data={{
                    labels: reportData.salesByMonth.map(s => s.month),
                    datasets: [{
                      label: 'Revenue',
                      data: reportData.salesByMonth.map(s => s.revenue),
                      borderColor: 'rgb(249, 115, 22)',
                      backgroundColor: 'rgba(249, 115, 22, 0.1)',
                      tension: 0.4,
                      fill: true
                    }]
                  }} options={chartOptions} />
                </div>
              </ChartCard>

              <ChartCard title="Sales by Status">
                <div className="h-64">
                  <Doughnut data={{
                    labels: reportData.salesByStatus?.map(s => s.status) || [],
                    datasets: [{
                      data: reportData.salesByStatus?.map(s => s.count) || [],
                      backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
                      borderWidth: 1
                    }]
                  }} options={doughnutOptions} />
                </div>
              </ChartCard>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ListCard
                title="Top Products"
                items={reportData.topProducts.map((p, idx) => ({
                  id: p.productId || `product-${idx}`,
                  label: `${p.productName} (${formatNumber(p.totalSold)} sold)`,
                  value: formatCurrency(p.revenue)
                }))}
                itemsPerPage={5}
              />
              <ListCard
                title="Top Customers"
                items={reportData.topCustomers.map((c, idx) => ({
                  id: c.customerId || `customer-${idx}`,
                  label: `${c.customerName} (${c.orderCount} orders)`,
                  value: c.totalSpent === 0 && c.hasReturns 
                    ? `Returned ${formatCurrency(c.totalReturns || 0)}`
                    : formatCurrency(c.totalSpent)
                }))}
                itemsPerPage={5}
              />
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Customers" value={formatNumber(reportData.totalCustomers)} icon={<UserGroupIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#8b5cf6" />
              <KPICard title="High Value" value={formatNumber(reportData.customerSegments?.find(s => s.segment === 'High Value')?.count || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#10b981" />
              <KPICard title="Medium Value" value={formatNumber(reportData.customerSegments?.find(s => s.segment === 'Medium Value')?.count || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#f59e0b" />
              <KPICard title="Low Value" value={formatNumber(reportData.customerSegments?.find(s => s.segment === 'Low Value')?.count || 0)} icon={<UserGroupIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#6b7280" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Customer Segments">
                <div className="h-64">
                  <Doughnut data={{
                    labels: reportData.customerSegments?.map(s => s.segment) || [],
                    datasets: [{
                      data: reportData.customerSegments?.map(s => s.count) || [],
                      backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                      borderWidth: 1
                    }]
                  }} options={doughnutOptions} />
                </div>
              </ChartCard>
              <ListCard
                title="Top Customers"
                items={reportData.topCustomers.map((c, idx) => ({
                  id: c.customerId || `customer-details-${idx}`,
                  label: `${c.customerName} (${c.orderCount} orders)`,
                  value: c.totalSpent === 0 && c.hasReturns 
                    ? `Returned ${formatCurrency(c.totalReturns || 0)}`
                    : formatCurrency(c.totalSpent)
                }))}
                itemsPerPage={10}
              />
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Products" value={formatNumber(reportData.totalProducts)} icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#06b6d4" />
              <KPICard title="Categories" value={formatNumber(reportData.categoryBreakdown?.length || 0)} icon={<ChartBarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#6366f1" />
              <KPICard title="Top Product Revenue" value={formatCurrency(reportData.productPerformance?.[0]?.revenue || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#10b981" />
              <KPICard title="Avg Profit Margin" value={`${reportData.productPerformance?.length ? (reportData.productPerformance.reduce((sum, p) => sum + p.profitMargin, 0) / reportData.productPerformance.length).toFixed(1) : 0}%`} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#f59e0b" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Top Products by Revenue">
                <div className="h-64">
                  <Bar data={{
                    labels: reportData.topProducts.slice(0, 5).map(p => p.productName),
                    datasets: [{
                      label: 'Revenue',
                      data: reportData.topProducts.slice(0, 5).map(p => p.revenue),
                      backgroundColor: 'rgba(249, 115, 22, 0.8)',
                      borderColor: 'rgb(249, 115, 22)',
                      borderWidth: 1
                    }]
                  }} options={barChartOptions} />
                </div>
              </ChartCard>
              <ChartCard title="Category Distribution">
                <div className="h-64">
                  <Doughnut data={{
                    labels: reportData.categoryBreakdown?.map(c => c.category) || [],
                    datasets: [{
                      data: reportData.categoryBreakdown?.map(c => c.revenue) || [],
                      backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
                      borderWidth: 1
                    }]
                  }} options={doughnutOptions} />
                </div>
              </ChartCard>
            </div>

            <ListCard
              title="Product Performance"
              items={(reportData.productPerformance || []).slice(0, 10).map((p, idx) => ({
                id: p.productId || `product-perf-${idx}`,
                label: `${p.productName} • ${p.category} • ${formatNumber(p.totalSold)} sold • Stock: ${p.stock}`,
                value: formatCurrency(p.revenue)
              }))}
              itemsPerPage={10}
            />
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Gross Revenue" value={formatCurrency(reportData.profitAnalysis?.grossRevenue || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#10b981" />
              <KPICard title="Net Profit" value={formatCurrency(reportData.profitAnalysis?.netProfit || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#22c55e" />
              <KPICard title="Profit Margin" value={`${(reportData.profitAnalysis?.profitMargin || 0).toFixed(1)}%`} icon={<ChartBarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#3b82f6" />
              <KPICard title="Total Costs" value={formatCurrency(reportData.profitAnalysis?.totalCosts || 0)} icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#ef4444" />
            </div>

            <ChartCard title="Revenue vs Costs">
              <div className="h-64">
                <Bar data={{
                  labels: ['Revenue', 'Costs', 'Profit'],
                  datasets: [{
                    label: 'Amount',
                    data: [
                      reportData.profitAnalysis?.grossRevenue || 0,
                      reportData.profitAnalysis?.totalCosts || 0,
                      reportData.profitAnalysis?.netProfit || 0
                    ],
                    backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)'],
                    borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)', 'rgb(59, 130, 246)'],
                    borderWidth: 1
                  }]
                }} options={barChartOptions} />
              </div>
            </ChartCard>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Items" value={formatNumber(reportData.inventoryStatus?.totalItems || 0)} icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#06b6d4" />
              <KPICard title="Low Stock" value={formatNumber(reportData.inventoryStatus?.lowStock || 0)} icon={<CubeIcon className="h-6 w-6" style={{ color: 'rgb(251, 146, 60)' }} />} accentColor="#f59e0b" />
              <KPICard title="Out of Stock" value={formatNumber(reportData.inventoryStatus?.outOfStock || 0)} icon={<CubeIcon className="h-6 w-6" style={{ color: 'rgb(239, 68, 68)' }} />} accentColor="#ef4444" />
              <KPICard title="Total Value" value={formatCurrency(reportData.inventoryStatus?.totalValue || 0)} icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />} accentColor="#10b981" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showPasswordManager) {
    return (
      <PasswordManager
        onPasswordSet={handlePasswordSet}
        onCancel={handlePasswordManagerCancel}
        isFirstTime={isFirstTimeSetup}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <PasswordProtection
        onSuccess={handlePasswordSuccess}
        onManagePassword={handleManagePassword}
        title="Financial Reports"
        description="Enter the password to access revenue, profit, and financial analytics."
      />
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
            <span className="inline-block h-2 w-8 rounded" style={{ background: 'var(--accent)' }} />
            Reports & Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            View comprehensive insights about your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportReport} variant="outline" size="sm" className="flex items-center gap-2">
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleManagePassword} variant="outline" size="sm" className="flex items-center gap-2">
            <Cog6ToothIcon className="h-4 w-4" />
            Password
          </Button>
        </div>
      </div>

      {/* Report Type Selector & Date Range */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Report Type:</span>
          </div>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reportTypes}
            className="min-w-[200px]"
          />
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Report Content */}
      {renderContent()}
    </div>
  );
}
