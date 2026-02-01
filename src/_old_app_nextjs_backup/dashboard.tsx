'use client';

import React, { useState, useEffect } from 'react';
import { 
  KPICard,
  ChartCard,
  ListCard,
  PaginatedTableCard
} from "@/components/ui/dashboard";
import { salesService, customerService, productService, returnService } from '@/lib/services';
import { Sale, Customer, Product, Return } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { Line, Bar } from "react-chartjs-2";
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
  
  // Get accent color from CSS variables
  const accent = (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--accent') : '') || '#ff6b00';

  useEffect(() => {
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        
        // Calculate sales revenue (will be updated with invoice revenue later)
        const salesRevenue = salesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        const salesWithInvoices = salesData.filter((sale: Sale) => sale.invoiceId).length;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: salesRevenue, // Will be updated with invoice revenue
          totalSales: salesData.length,
          salesWithInvoices,
        }));
        
        // Calculate weekly sales (last 7 days)
        calculateWeeklySales(salesData);
        
        // Calculate order status distribution (not displayed but calculated for completeness)
        // calculateOrderStatus(salesData);
        
        // Calculate recent sales
        calculateRecentSales(salesData);
      }

      // Process Customers Data
      if (customersRes.success && customersRes.data) {
        customersData = customersRes.data;
        
        setStats(prev => ({
          ...prev,
          totalCustomers: customersData.length,
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
        calculateTopCustomers(salesData, customersData);
      }

      // Calculate sales by category (requires both sales and products)
      if (salesData.length > 0 && productsData.length > 0) {
        calculateCategorySales(salesData, productsData);
      }

      // Calculate invoice revenue and combine with sales for total revenue
      if (Array.isArray(invoicesRes) && invoicesRes.length > 0) {
        const invoices = invoicesRes;
        setInvoicesData(invoices);
        
        // Separate invoices into those linked to sales and independent invoices
        const independentInvoices = invoices.filter((invoice: Record<string, unknown>) => !invoice.saleId);
        
        // Calculate revenue stats
        const invoiceRevenue = invoices.reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        
        // For invoice stats, only count INDEPENDENT invoices to avoid double-counting with sales
        const paidInvoiceRevenue = independentInvoices
          .filter((invoice: Record<string, unknown>) => invoice.status === 'paid')
          .reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        const pendingInvoiceRevenue = independentInvoices
          .filter((invoice: Record<string, unknown>) => invoice.status === 'pending' || invoice.status === 'sent')
          .reduce((sum: number, invoice: Record<string, unknown>) => sum + ((invoice.total as number) || 0), 0);
        
        // Calculate total revenue: Sales + Paid Independent Invoices ONLY (no double-counting)
        const salesRevenue = salesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        const grossRevenue = salesRevenue + paidInvoiceRevenue;
        
        // Calculate return impact (only completed/approved returns with cash/original_payment refunds)
        // Store credit and exchange returns don't reduce revenue
        const revenueReducingReturns = returnsData.filter(
          (ret: Return) => 
            ['completed', 'approved'].includes(ret.status) &&
            ['cash', 'original_payment'].includes(ret.refundMethod)
        );
        const returnAmount = revenueReducingReturns.reduce((sum: number, ret: Return) => sum + ret.refundAmount, 0);
        const netRevenue = grossRevenue - returnAmount;
        
        console.log('Revenue calculation with returns:', {
          salesRevenue,
          paidInvoiceRevenue,
          grossRevenue,
          independentInvoicesCount: independentInvoices.length,
          totalReturns: returnsData.length,
          revenueReducingReturns: revenueReducingReturns.length,
          returnAmount,
          netRevenue,
          returnRate: salesData.length > 0 ? ((returnsData.length / salesData.length) * 100).toFixed(2) + '%' : '0%'
        });
        
        setStats(prev => ({
          ...prev,
          totalRevenue: netRevenue, // Net revenue after returns
          totalInvoices: invoices.length,
          invoiceRevenue,
          paidInvoiceRevenue,
          pendingInvoiceRevenue,
          totalReturns: returnsData.length,
          returnAmount,
          netRevenue,
        }));
      } else {
        // If no invoices, just use sales revenue minus returns
        const salesRevenue = salesData.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        
        // Calculate return impact
        const revenueReducingReturns = returnsData.filter(
          (ret: Return) => 
            ['completed', 'approved'].includes(ret.status) &&
            ['cash', 'original_payment'].includes(ret.refundMethod)
        );
        const returnAmount = revenueReducingReturns.reduce((sum: number, ret: Return) => sum + ret.refundAmount, 0);
        const netRevenue = salesRevenue - returnAmount;
        
        setStats(prev => ({
          ...prev,
          totalRevenue: netRevenue,
          totalInvoices: 0,
          invoiceRevenue: 0,
          paidInvoiceRevenue: 0,
          pendingInvoiceRevenue: 0,
          totalReturns: returnsData.length,
          returnAmount,
          netRevenue,
        }));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate weekly sales for the last 7 days (including paid invoices)
  const calculateWeeklySales = (salesData: Sale[]) => {
    const now = new Date();
    const weeklyTotals = [0, 0, 0, 0, 0, 0, 0]; // Last 7 days

    // Add sales data
    salesData.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const daysDiff = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        weeklyTotals[6 - daysDiff] += sale.total;
      }
    });

    // Add paid INDEPENDENT invoice data (avoid double-counting with sales)
    if (invoicesData.length > 0) {
      invoicesData.forEach((invoice: Record<string, unknown>) => {
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

    // Aggregate spending by customer
    salesData.forEach(sale => {
      if (sale.customerId) {
        const currentSpending = customerSpending.get(sale.customerId) || 0;
        customerSpending.set(sale.customerId, currentSpending + sale.total);
        
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
      sale.items.forEach(item => {
        const product = productsData.find(p => p.id === item.productId);
        if (product && product.category) {
          const currentSales = categorySales.get(product.category) || 0;
          categorySales.set(product.category, currentSales + item.total);
        }
      });
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
        } else if (sale.status === 'cancelled') {
          statusBadge = (
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'rgb(239, 68, 68)'
              }}
            >
              Cancelled
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

  // Calculate monthly profit (revenue - cost of goods sold)
  const calculateMonthlyProfit = (salesData: Sale[], productsData: Product[]): number => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthSales = salesData.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
    });

    let totalRevenue = 0;
    let totalCost = 0;

    thisMonthSales.forEach(sale => {
      totalRevenue += sale.total;
      
      // Calculate cost of goods sold
      sale.items.forEach(item => {
        const product = productsData.find(p => p.id === item.productId);
        if (product && product.cost) {
          totalCost += product.cost * item.quantity;
        }
      });
    });

    // Add paid INDEPENDENT invoice revenue for this month (avoid double-counting with sales)
    if (invoicesData.length > 0) {
      const thisMonthIndependentInvoices = invoicesData.filter((invoice: Record<string, unknown>) => {
        if (invoice.status !== 'paid') return false;
        if (invoice.saleId) return false; // Skip invoices linked to sales (already counted)
        const invoiceDate = new Date(invoice.createdAt as string);
        return invoiceDate.getMonth() === thisMonth && invoiceDate.getFullYear() === thisYear;
      });
      
      thisMonthIndependentInvoices.forEach((invoice: Record<string, unknown>) => {
        totalRevenue += (invoice.total as number) || 0;
      });
    }

    // Subtract returns for this month (only cash/original_payment refunds)
    const thisMonthReturns = returnsData.filter(ret => {
      const returnDate = new Date(ret.createdAt);
      return returnDate.getMonth() === thisMonth && 
             returnDate.getFullYear() === thisYear &&
             ['completed', 'approved'].includes(ret.status) &&
             ['cash', 'original_payment'].includes(ret.refundMethod);
    });

    const returnAmount = thisMonthReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);

    return totalRevenue - totalCost - returnAmount;
  };

  // Calculate weekly profit trend for the current month
  const calculateWeeklyProfitTrend = (salesData: Sale[], productsData: Product[]): number[] => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthSales = salesData.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
    });

    const weeklyProfits = [0, 0, 0, 0]; // 4 weeks

    thisMonthSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const weekOfMonth = Math.floor((saleDate.getDate() - 1) / 7);
      const weekIndex = Math.min(weekOfMonth, 3); // Cap at week 3

      const revenue = sale.total;
      let cost = 0;

      sale.items.forEach(item => {
        const product = productsData.find(p => p.id === item.productId);
        if (product && product.cost) {
          cost += product.cost * item.quantity;
        }
      });

      weeklyProfits[weekIndex] += (revenue - cost);
    });

    // Add paid INDEPENDENT invoice revenue by week (avoid double-counting with sales)
    if (invoicesData.length > 0) {
      const thisMonthIndependentInvoices = invoicesData.filter((invoice: Record<string, unknown>) => {
        if (invoice.status !== 'paid') return false;
        if (invoice.saleId) return false; // Skip invoices linked to sales (already counted)
        const invoiceDate = new Date(invoice.createdAt as string);
        return invoiceDate.getMonth() === thisMonth && invoiceDate.getFullYear() === thisYear;
      });

      thisMonthIndependentInvoices.forEach((invoice: Record<string, unknown>) => {
        const invoiceDate = new Date(invoice.createdAt as string);
        const weekOfMonth = Math.floor((invoiceDate.getDate() - 1) / 7);
        const weekIndex = Math.min(weekOfMonth, 3); // Cap at week 3

        const invoiceRevenue = (invoice.total as number) || 0;
        weeklyProfits[weekIndex] += invoiceRevenue;
      });
    }

    // Subtract returns by week (only cash/original_payment refunds)
    const thisMonthReturns = returnsData.filter(ret => {
      const returnDate = new Date(ret.createdAt);
      return returnDate.getMonth() === thisMonth && 
             returnDate.getFullYear() === thisYear &&
             ['completed', 'approved'].includes(ret.status) &&
             ['cash', 'original_payment'].includes(ret.refundMethod);
    });

    thisMonthReturns.forEach(ret => {
      const returnDate = new Date(ret.createdAt);
      const weekOfMonth = Math.floor((returnDate.getDate() - 1) / 7);
      const weekIndex = Math.min(weekOfMonth, 3);

      weeklyProfits[weekIndex] -= ret.refundAmount;
    });

    return weeklyProfits;
  };

  // Calculate profit margin percentage
  const calculateProfitMargin = (salesData: Sale[], productsData: Product[]): number => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthSales = salesData.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
    });

    let totalRevenue = 0;
    let totalCost = 0;

    thisMonthSales.forEach(sale => {
      totalRevenue += sale.total;
      
      sale.items.forEach(item => {
        const product = productsData.find(p => p.id === item.productId);
        if (product && product.cost) {
          totalCost += product.cost * item.quantity;
        }
      });
    });

    // Add paid INDEPENDENT invoice revenue for this month (avoid double-counting with sales)
    if (invoicesData.length > 0) {
      const thisMonthIndependentInvoices = invoicesData.filter((invoice: Record<string, unknown>) => {
        if (invoice.status !== 'paid') return false;
        if (invoice.saleId) return false; // Skip invoices linked to sales (already counted)
        const invoiceDate = new Date(invoice.createdAt as string);
        return invoiceDate.getMonth() === thisMonth && invoiceDate.getFullYear() === thisYear;
      });
      
      thisMonthIndependentInvoices.forEach((invoice: Record<string, unknown>) => {
        totalRevenue += (invoice.total as number) || 0;
      });
    }

    // Subtract returns for this month (only cash/original_payment refunds)
    const thisMonthReturns = returnsData.filter(ret => {
      const returnDate = new Date(ret.createdAt);
      return returnDate.getMonth() === thisMonth && 
             returnDate.getFullYear() === thisYear &&
             ['completed', 'approved'].includes(ret.status) &&
             ['cash', 'original_payment'].includes(ret.refundMethod);
    });

    const returnAmount = thisMonthReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
    totalRevenue -= returnAmount;

    if (totalRevenue === 0) return 0;
    return ((totalRevenue - totalCost) / totalRevenue) * 100;
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
    <div className="space-y-6">
      {/* Dashboard grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI cards - Top 4 metrics */}
        <KPICard 
          title="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)} 
          className="md:col-span-1" 
        />
        <KPICard 
          title="Total Sales" 
          value={stats.totalSales.toString()} 
          className="md:col-span-1" 
        />
        <KPICard 
          title="Total Customers" 
          value={stats.totalCustomers.toString()} 
          className="md:col-span-1" 
        />
        <KPICard 
          title="Total Invoices" 
          value={stats.totalInvoices.toString()} 
          className="md:col-span-1" 
        />

        {/* Charts */}
        <ChartCard 
          title="Sales (last 7 days)" 
          className="md:col-span-3"
        >
          <Line
            data={{
              labels: getDayLabels(),
              datasets: [{
                label: "Sales",
                data: weeklySalesData,
                borderColor: accent,
                backgroundColor: 'transparent',
                tension: 0.35,
              }]
            }}
            options={lineOptions}
          />
        </ChartCard>

        {/* Profit Trend Indicator */}
        <ChartCard 
          title="Monthly Profit Trend" 
          className="md:col-span-1"
        >
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            {/* Profit/Loss Indicator */}
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">This Month</div>
              <div 
                className={`text-2xl font-bold ${calculateMonthlyProfit(salesData, productsData) >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {calculateMonthlyProfit(salesData, productsData) >= 0 ? '+' : ''}{formatCurrency(calculateMonthlyProfit(salesData, productsData))}
              </div>
              <div className="text-xs text-gray-400">
                {calculateMonthlyProfit(salesData, productsData) >= 0 ? 'Profit' : 'Loss'}
              </div>
            </div>

            {/* Mini Trend Line */}
            <div className="w-full h-16">
              <Line
                data={{
                  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                  datasets: [{
                    label: "Weekly Profit",
                    data: calculateWeeklyProfitTrend(salesData, productsData),
                    borderColor: calculateMonthlyProfit(salesData, productsData) >= 0 ? '#22c55e' : '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return formatCurrency(context.parsed.y);
                        }
                      }
                    }
                  },
                  scales: { 
                    x: { 
                      display: false
                    },
                    y: { 
                      display: false
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  }
                }}
              />
            </div>

            {/* Margin Percentage */}
            <div className="text-center">
              <div className="text-xs text-gray-500">Margin</div>
              <div className="text-sm font-semibold text-gray-700">
                {calculateProfitMargin(salesData, productsData).toFixed(1)}%
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Lists and charts */}
        <ListCard 
          title="Top Customers" 
          items={topCustomersData.length > 0 ? topCustomersData : [{ id: '0', label: 'No customers yet', value: formatCurrency(0) }]}
          className="md:col-span-2"
          itemsPerPage={0}
        />
        <ChartCard 
          title="Sales by Category" 
          className="md:col-span-2"
        >
          {(() => {
            const { categories, values } = getCategoryChartData();
            return categories.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No category data available yet
              </div>
            );
          })()}
        </ChartCard>

        {/* Recent Sales table */}
        <PaginatedTableCard 
          title="Recent Sales" 
          columns={tableColumns}
          data={recentSalesData.length > 0 ? recentSalesData : []}
          className="md:col-span-4"
        />
      </section>
    </div>
  );
}

