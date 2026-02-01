import React, { useState, useEffect } from 'react';
import { 
  KPICard,
  ChartCard,
  ListCard,
  PaginatedTableCard,
  DateRangePicker,
  type DateRange,
  QuickStats,
  createQuickStats,
  CollapsibleSection,
  QuickActionsPanel,
  useQuickActions
} from "@/components/ui/dashboard";
// Tabler Icons - Clean and unique design
import {
  IconShoppingCart,
  IconUsers,
  IconFileText,
} from '@tabler/icons-react';
import { salesService, customerService, productService, returnService } from '@/lib/services';
import { Sale, Customer, Product, Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { Line, Bar } from "react-chartjs-2";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
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
} from "chart.js";
import type { ChartOptions } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export default function DashboardPage() {
  // Get settings for currency formatting
  const { formatCurrency } = useSettings();
  
  // Get quick actions with proper navigation
  const quickActions = useQuickActions();
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
    salesWithInvoices: 0,
    totalInvoices: 0,
    invoiceRevenue: 0,
    paidInvoiceRevenue: 0,
    pendingInvoiceRevenue: 0,
    totalReturns: 0,
    returnAmount: 0,
    netRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  
  // Real data states
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [invoicesData, setInvoicesData] = useState<Array<Record<string, unknown>>>([]);
  const [returnsData, setReturnsData] = useState<Return[]>([]);
  const [weeklySalesData, setWeeklySalesData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [topCustomersData, setTopCustomersData] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [categorySalesData, setCategorySalesData] = useState<Record<string, number>>({});
  const [recentSalesData, setRecentSalesData] = useState<Array<{
    id: string;
    customer: string;
    total: string;
    status: React.ReactElement;
    date: string;
  }>>([]);
  
  // Quick stats data
  const [quickStatsData, setQuickStatsData] = useState({
    todaySales: 0,
    pendingInvoices: 0,
    lowStockProducts: 0,
    recentCustomers: 0
  });
  
  // Get accent color from CSS variables
  const accent = (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--accent') : '') || '#ff6b00';

  useEffect(() => {
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]); // Reload data when date range changes

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use IPC if available, otherwise fall back to services
      let invoicesRes: Array<Record<string, unknown>> = [];
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('get-invoices') as {
          success: boolean;
          data?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (result.success && result.data) {
          invoicesRes = result.data;
        }
      }
      
      const [salesRes, customersRes, productsRes, returnsRes] = await Promise.all([
        salesService.getAllSales(),
        customerService.getAllCustomers(),
        productService.getAllProducts(),
        returnService.getAllReturns(),
      ]);

      let salesData: Sale[] = [];
      let customersData: Customer[] = [];
      let productsData: Product[] = [];
      let returnsData: Return[] = [];

      // Process Sales Data
      if (salesRes.success && salesRes.data) {
        salesData = salesRes.data;
        setSalesData(salesData);
        
        // Filter sales data by date range
        const filteredSalesData = salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || saleDate >= startOfDay) && 
                 (!endOfDay || saleDate <= endOfDay);
        });
        
        // Calculate sales revenue (will be updated with invoice revenue later)
        const salesRevenue = filteredSalesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        const salesWithInvoices = filteredSalesData.filter((sale: Sale) => sale.invoiceId).length;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: salesRevenue, // Will be updated with invoice revenue
          totalSales: filteredSalesData.length,
          salesWithInvoices,
        }));
        
        // Calculate order status distribution (not displayed but calculated for completeness)
        // calculateOrderStatus(filteredSalesData);
        
        // Calculate recent sales based on filtered data
        calculateRecentSales(filteredSalesData);
      }

      // Process Customers Data
      if (customersRes.success && customersRes.data) {
        customersData = customersRes.data;
        
        // Filter customers by date range
        const filteredCustomersData = customersData.filter(customer => {
          const customerDate = new Date(customer.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || customerDate >= startOfDay) && 
                 (!endOfDay || customerDate <= endOfDay);
        });
        
        setStats(prev => ({
          ...prev,
          totalCustomers: filteredCustomersData.length,
        }));
      }

      // Process Returns Data
      if (returnsRes.success && returnsRes.data) {
        returnsData = returnsRes.data;
        setReturnsData(returnsData);
      }

      // Process Products Data
      if (productsRes.success && productsRes.data) {
        productsData = productsRes.data;
        setProductsData(productsData);
        
        setStats(prev => ({
          ...prev,
          totalProducts: productsData.length,
        }));
      }

      // Calculate top customers (requires both sales and customers)
      if (salesData.length > 0 && customersData.length > 0) {
        // Use filtered sales data for top customers calculation
        const filteredSalesData = salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || saleDate >= startOfDay) && 
                 (!endOfDay || saleDate <= endOfDay);
        });
        calculateTopCustomers(filteredSalesData, customersData);
      }

      // Calculate sales by category (requires both sales and products)
      if (salesData.length > 0 && productsData.length > 0) {
        // Use filtered sales data for category sales calculation
        const filteredSalesData = salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || saleDate >= startOfDay) && 
                 (!endOfDay || saleDate <= endOfDay);
        });
        calculateCategorySales(filteredSalesData, productsData);
      }

      // Calculate invoice revenue and combine with sales for total revenue
      if (Array.isArray(invoicesRes) && invoicesRes.length > 0) {
        const invoices = invoicesRes;
        setInvoicesData(invoices);
        
        // Filter invoices by date range
        const filteredInvoices = invoices.filter((invoice: Record<string, unknown>) => {
          const invoiceDate = new Date(invoice.createdAt as string);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || invoiceDate >= startOfDay) && 
                 (!endOfDay || invoiceDate <= endOfDay);
        });
        
        // Separate invoices into those linked to sales and independent invoices
        const independentInvoices = filteredInvoices.filter((invoice: Record<string, unknown>) => !invoice.saleId);
        
        // Calculate revenue stats
        const invoiceRevenue = filteredInvoices.reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        
        // For invoice stats, only count INDEPENDENT invoices to avoid double-counting with sales
        const paidInvoiceRevenue = independentInvoices
          .filter((invoice: Record<string, unknown>) => invoice.status === 'paid')
          .reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        const pendingInvoiceRevenue = independentInvoices
          .filter((invoice: Record<string, unknown>) => invoice.status === 'pending' || invoice.status === 'sent')
          .reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        
        // Filter data by date range
        const filteredSalesData = salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || saleDate >= startOfDay) && 
                 (!endOfDay || saleDate <= endOfDay);
        });
        
        const filteredInvoicesData = invoicesData.filter((invoice: Record<string, unknown>) => {
          const invoiceDate = new Date(invoice.createdAt as string);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || invoiceDate >= startOfDay) && 
                 (!endOfDay || invoiceDate <= endOfDay);
        });
        
        const filteredReturnsData = returnsData.filter(ret => {
          const returnDate = new Date(ret.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || returnDate >= startOfDay) && 
                 (!endOfDay || returnDate <= endOfDay);
        });
        
        // Calculate basic revenue metrics
        // IMPORTANT: Revenue ONLY comes from sales. Invoices are tracked separately.
        // When an invoice is converted to a sale, THEN it contributes to revenue.
        const salesRevenue = filteredSalesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        const independentInvoiceRevenue = paidInvoiceRevenue; // Tracked separately, NOT in revenue
        const grossRevenue = salesRevenue; // ONLY sales revenue
        const returnAmount = filteredReturnsData.reduce((sum: number, ret: Return) => sum + ret.refundAmount, 0);
        const netRevenue = grossRevenue - returnAmount; // Net sales revenue after returns
        
        
        setStats(prev => ({
          ...prev,
          totalRevenue: netRevenue, // Net sales revenue only (after returns)
          totalInvoices: filteredInvoices.length,
          invoiceRevenue: independentInvoiceRevenue, // Independent invoice revenue (separate KPI)
          paidInvoiceRevenue,
          pendingInvoiceRevenue,
          totalReturns: returnsData.length,
          returnAmount,
          netRevenue,
        }));

        // Update weekly sales chart with filtered sales and independent invoices
        calculateWeeklySales(filteredSalesData, independentInvoices);
      } else {
        // If no invoices, just use sales revenue minus returns
        const filteredSalesData = salesData.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
          const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
          
          return (!startOfDay || saleDate >= startOfDay) && 
                 (!endOfDay || saleDate <= endOfDay);
        });
        
        // Calculate basic revenue metrics (no invoices)
        const grossRevenue = filteredSalesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        const returnAmount = returnsData.reduce((sum: number, ret: Return) => sum + ret.refundAmount, 0);
        const netRevenue = grossRevenue - returnAmount;

        setStats(prev => ({
          ...prev,
          totalRevenue: netRevenue, // Only sales revenue (no independent invoices)
          totalInvoices: 0,
          invoiceRevenue: 0, // No independent invoice revenue
          paidInvoiceRevenue: 0,
          pendingInvoiceRevenue: 0,
          totalReturns: returnsData.length,
          returnAmount,
          netRevenue,
        }));

        // Update weekly sales chart with filtered sales only
        calculateWeeklySales(filteredSalesData, []);
      }
      
             // Calculate quick stats based on date range
             const today = new Date();
             today.setHours(0, 0, 0, 0);
             const tomorrow = new Date(today);
             tomorrow.setDate(tomorrow.getDate() + 1);
             
             const filteredInvoicesData = invoicesRes.filter(invoice => {
               const invoiceDate = new Date(invoice.createdAt as string);
               const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
               const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
               
               return (!startOfDay || invoiceDate >= startOfDay) && 
                      (!endOfDay || invoiceDate <= endOfDay);
             });
             
             const filteredCustomersData = customersData.filter(customer => {
               const customerDate = new Date(customer.createdAt);
               const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
               const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
               
               return (!startOfDay || customerDate >= startOfDay) && 
                      (!endOfDay || customerDate <= endOfDay);
             });
             
             // Calculate today's sales (always based on today, not date range)
             // Only count completed and pending sales
             const todaySales = salesData.filter(sale => {
               const saleDate = new Date(sale.createdAt);
               return saleDate >= today && saleDate < tomorrow && 
                      (sale.status === 'completed' || sale.status === 'pending');
             }).reduce((sum, sale) => sum + sale.total, 0);
             
             // Calculate stats based on filtered data
             const pendingInvoices = filteredInvoicesData.filter(invoice => 
               invoice.status === 'pending' || invoice.status === 'sent'
             ).length;
             
             const lowStockProducts = productsData.filter(product => 
               product.stock <= (product.minStock || 10)
             ).length;
             
             const recentCustomers = filteredCustomersData.length;
      
      setQuickStatsData({
        todaySales,
        pendingInvoices,
        lowStockProducts,
        recentCustomers
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate weekly sales for the last 7 days (including independent paid invoices)
  const calculateWeeklySales = (salesData: Sale[], independentInvoices: Array<Record<string, unknown>>) => {
    const now = new Date();
    const weeklyTotals = [0, 0, 0, 0, 0, 0, 0]; // Last 7 days

    // Add sales data based on status
    salesData.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const daysDiff = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        if (sale.status === 'cancelled' || sale.status === 'refunded') {
          // Exclude cancelled and refunded sales
          return;
        } else {
          // Add completed and pending sales
          weeklyTotals[6 - daysDiff] += sale.total;
        }
      }
    });

    // Add paid INDEPENDENT invoice data (avoid double-counting with sales)
    if (independentInvoices.length > 0) {
      independentInvoices.forEach((invoice: Record<string, unknown>) => {
        if (invoice.status === 'paid' && !invoice.saleId) { // Only independent invoices
          const invoiceDate = new Date(invoice.createdAt as string);
          const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff < 7) {
            weeklyTotals[6 - daysDiff] += (invoice.total as number) || 0;
          }
        }
      });
    }

    setWeeklySalesData(weeklyTotals);
  };


  // Calculate top customers by total spending
  const calculateTopCustomers = (salesData: Sale[], customersData: Customer[]) => {
    const customerSpending = new Map<string, number>();
    const customerNames = new Map<string, string>();

    // Aggregate spending by customer based on sale status
    salesData.forEach(sale => {
      if (sale.customerId) {
        const currentSpending = customerSpending.get(sale.customerId) || 0;
        let saleAmount = 0;
        
        if (sale.status === 'cancelled' || sale.status === 'refunded') {
          // Exclude cancelled and refunded sales
          saleAmount = 0;
        } else {
          // Add completed and pending sales
          saleAmount = sale.total;
        }
        
        customerSpending.set(sale.customerId, currentSpending + saleAmount);
        
        // Store customer name
        if (!customerNames.has(sale.customerId)) {
          const customer = customersData.find(c => c.id === sale.customerId);
          if (customer) {
            customerNames.set(sale.customerId, customer.name);
          } else {
            customerNames.set(sale.customerId, sale.customerName || 'Unknown');
          }
        }
      } else if (sale.customerName) {
        // Handle sales without customerId but with customerName
        const currentSpending = customerSpending.get(sale.customerName) || 0;
        customerSpending.set(sale.customerName, currentSpending + sale.total);
        customerNames.set(sale.customerName, sale.customerName);
      }
    });

    // Sort by spending and get top 10
    const topCustomers = Array.from(customerSpending.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customerId, spending]) => ({
        id: customerId,
        label: customerNames.get(customerId) || 'Unknown Customer',
        value: formatCurrency(spending)
      }));

    setTopCustomersData(topCustomers);
  };

  // Calculate sales by product category
  const calculateCategorySales = (salesData: Sale[], productsData: Product[]) => {
    const categorySales = new Map<string, number>();

    salesData.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        if (sale.status === 'cancelled' || sale.status === 'refunded') {
          // Exclude cancelled and refunded sales
          return;
        }
        
        // Add completed and pending sales
        sale.items.forEach(item => {
          const product = productsData.find(p => p.id === item.productId);
          if (product && product.category) {
            const currentSales = categorySales.get(product.category) || 0;
            categorySales.set(product.category, currentSales + item.total);
          }
        });
      }
    });

    // Convert to object
    const categorySalesObj: Record<string, number> = {};
    categorySales.forEach((value, key) => {
      categorySalesObj[key] = value;
    });

    setCategorySalesData(categorySalesObj);
  };

  // Calculate recent sales for table
  const calculateRecentSales = (salesData: Sale[]) => {
    const recentSales = salesData
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(sale => {
        // Status badge
        let statusBadge: React.ReactElement;
        if (sale.status === 'completed') {
          statusBadge = (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: 'rgb(34, 197, 94)'
              }}
            >
              Completed
            </span>
          );
        } else if (sale.status === 'pending') {
          statusBadge = (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                color: 'rgb(251, 191, 36)'
              }}
            >
              Pending
            </span>
          );
        } else {
          statusBadge = (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(127, 127, 127, 0.1)',
                color: 'rgb(127, 127, 127)'
              }}
            >
              {sale.status}
            </span>
          );
        }

        return {
          id: sale.id.substring(0, 8).toUpperCase(),
          customer: sale.customerName || 'Walk-in Customer',
          total: formatCurrency(sale.total),
          status: statusBadge,
          date: new Date(sale.createdAt).toLocaleDateString()
        };
      });

    setRecentSalesData(recentSales);
  };


  // Chart options
  const lineOptions: ChartOptions<'line'> = { 
    responsive: true, 
    plugins: { legend: { display: false } }, 
    scales: { 
      x: { grid: { display: false } }, 
      y: { grid: { color: 'rgba(127,127,127,0.2)' } } 
    } 
  };

  const barOptions: ChartOptions<'bar'> = { 
    plugins: { legend: { display: false } }, 
    scales: { 
      x: { grid: { display: false } }, 
      y: { grid: { color: 'rgba(127,127,127,0.2)' } } 
    } 
  };

  // Table columns
  const tableColumns = [
    { key: 'id', label: 'Sale ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' }
  ];

  // Get day labels for the weekly sales chart
  const getDayLabels = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels: string[] = [];
    const today = new Date().getDay();
    
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      labels.push(days[dayIndex]);
    }
    
    return labels;
  };

  // Get category labels and data
  const getCategoryChartData = () => {
    const categories = Object.keys(categorySalesData);
    const values = Object.values(categorySalesData);
    
    return { categories, values };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Header with Date Range Picker and Quick Actions Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Dashboard Overview
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Comprehensive view of your business performance and analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Select date range"
            className="min-w-[250px]"
          />
          <QuickActionsPanel
            actions={quickActions}
            variant="inline"
            className=""
          />
        </div>
      </div>

             {/* Quick Stats */}
             <QuickStats
               stats={createQuickStats({
                 ...quickStatsData,
                 loading,
                 formatCurrency
               })}
               columns={4}
             />

      {/* KPI Section */}
      <CollapsibleSection 
        title="Key Performance Indicators" 
        defaultOpen={true}
        headerActions={
          <div className="text-sm text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
            {stats.totalSales > 0 || stats.totalCustomers > 0 || stats.totalInvoices > 0 
              ? "3 metrics" 
              : "No data yet"
            }
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard 
            title="Total Sales" 
            value={stats.totalSales.toString()} 
            className="md:col-span-1"
            loading={loading}
            empty={!loading && stats.totalSales === 0}
            emptyTitle="No sales yet"
            emptyDescription="Create your first sale to get started"
            icon={<IconShoppingCart className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor="#3b82f6"
          />
          <KPICard 
            title="Total Customers" 
            value={stats.totalCustomers.toString()} 
            className="md:col-span-1"
            loading={loading}
            empty={!loading && stats.totalCustomers === 0}
            emptyTitle="No customers yet"
            emptyDescription="Add customers to start tracking sales"
            icon={<IconUsers className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor="#8b5cf6"
          />
          <KPICard 
            title="Total Invoices" 
            value={stats.totalInvoices.toString()} 
            className="md:col-span-1"
            loading={loading}
            empty={!loading && stats.totalInvoices === 0}
            emptyTitle="No invoices yet"
            emptyDescription="Generate invoices for your sales"
            icon={<IconFileText className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
            accentColor="#6366f1"
          />
        </div>
      </CollapsibleSection>

      {/* Charts and Analytics Section */}
      <CollapsibleSection 
        title="Charts & Analytics" 
        defaultOpen={true}
        headerActions={
          <div className="text-sm text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
            {weeklySalesData.some(value => value > 0) || Object.keys(categorySalesData).length > 0 
              ? "3 charts" 
              : "No data yet"
            }
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-0 overflow-hidden">

        {/* Charts */}
        <ChartCard 
          title="Sales (last 7 days)" 
          className="md:col-span-4 h-full overflow-hidden"
          loading={loading}
          empty={!loading && weeklySalesData.every(value => value === 0)}
          emptyTitle="No sales data"
          emptyDescription="Sales will appear here once you start making transactions"
        >
          {weeklySalesData.every(value => value === 0) ? (
            <div className="h-[320px] flex items-center justify-center">
              <div className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No sales data for the last 7 days
              </div>
            </div>
          ) : (
            <ChartContainer
              config={{
                sales: { label: 'Sales', color: '#2563eb' },
              }}
              className="h-[360px] w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getDayLabels().map((label, idx) => ({
                  date: label,
                  sales: weeklySalesData[idx] || 0,
                }))}>
                  <defs>
                    <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-md">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Sales:</span>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    dataKey="sales"
                    type="natural"
                    fill="url(#fillSales)"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  <ChartLegend>
                    <ChartLegendContent />
                  </ChartLegend>
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ChartCard>

        </div>
      </CollapsibleSection>

      {/* Lists and Tables Section */}
      <CollapsibleSection 
        title="Lists & Tables" 
        defaultOpen={true}
        headerActions={
          <div className="text-sm text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
            {topCustomersData.length > 0 || recentSalesData.length > 0 
              ? "2 lists" 
              : "No data yet"
            }
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ListCard 
            title="Top Customers" 
            items={topCustomersData}
            className="md:col-span-2"
            itemsPerPage={0}
            loading={loading}
            empty={!loading && topCustomersData.length === 0}
            emptyTitle="No customers yet"
            emptyDescription="Add customers to see them listed here"
          />
          <ChartCard 
            title="Sales by Category" 
            className="md:col-span-2"
            loading={loading}
            empty={!loading && Object.keys(categorySalesData).length === 0}
            emptyTitle="No category data"
            emptyDescription="Sales will be categorized once you start making transactions"
          >
            {(() => {
              const { categories, values } = getCategoryChartData();
              return (
                <Bar
                  data={{
                    labels: categories,
                    datasets: [{
                      label: 'Category Sales',
                      data: values,
                      backgroundColor: accent,
                      borderRadius: 6,
                    }]
                  }}
                  options={barOptions}
                />
              );
            })()}
          </ChartCard>

          {/* Recent Sales table */}
          <PaginatedTableCard 
            title="Recent Sales" 
            columns={tableColumns}
            data={recentSalesData}
            className="md:col-span-4"
            loading={loading}
            empty={!loading && recentSalesData.length === 0}
            emptyTitle="No recent sales"
            emptyDescription="Recent sales will appear here once you start making transactions"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

