import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PaginatedTableCard, KPICard, ChartCard, DateRangePicker, type DateRange } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { salesService, returnService, invoiceService } from '@/lib/services';
import { Sale, Return, Invoice } from '@/lib/types/core';
import { RevenueCalculatorService } from '@/lib/services/revenue-calculator.service';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
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
} from 'chart.js';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
// Tabler Icons - Clean and unique design
import {
  IconShoppingCart,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconMinus,
  IconCalendar,
  IconDownload,
  IconPrinter,
  IconCreditCard,
} from '@tabler/icons-react';
import { customerService } from '@/lib/services';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export default function SalesPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'customerName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date range filter states
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null
  });
  const [quickFilter, setQuickFilter] = useState<string>('');
  
  // Bulk actions state
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  
  // Credit dialog state
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [selectedSaleForCredit, setSelectedSaleForCredit] = useState<Sale | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [customerCredit, setCustomerCredit] = useState(0);

  // Quick filter options
  const quickFilterOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last90Days', label: 'Last 90 Days' },
  ];

  useEffect(() => {
    loadSales();
  }, []);

  // Handle quick filter changes
  const handleQuickFilter = (filterValue: string) => {
    setQuickFilter(filterValue);
    
    if (filterValue === '') {
      setDateRange({ start: null, end: null });
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let start: Date | null = null;
    let end: Date | null = null;

    switch (filterValue) {
      case 'today':
        start = today;
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'yesterday':
        start = yesterday;
        end = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        start = startOfWeek;
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        start = lastWeekStart;
        end = lastWeekEnd;
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'last30Days':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'last90Days':
        start = new Date(today);
        start.setDate(today.getDate() - 90);
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
    }

    setDateRange({ start, end });
  };

  // Check if a sale matches the current date range
  const isSaleInDateRange = useCallback((sale: Sale) => {
    if (!dateRange.start && !dateRange.end) return true;
    
    const saleDate = new Date(sale.createdAt);
    const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
    const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
    
    return (!startOfDay || saleDate >= startOfDay) && 
           (!endOfDay || saleDate <= endOfDay);
  }, [dateRange]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const [salesRes, returnsRes, invoicesRes] = await Promise.all([
        salesService.getAllSales(),
        returnService.getAllReturns(),
        invoiceService.getAllInvoices()
      ]);
      
      if (salesRes.success && salesRes.data) {
        setSales(salesRes.data);
      } else {
        setToast({ message: 'Failed to load sales', type: 'error' });
      }

      if (returnsRes.success && returnsRes.data) {
        setReturns(returnsRes.data);
      } else {
        setToast({ message: 'Failed to load returns', type: 'error' });
      }

      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(invoicesRes.data);
      } else {
        setToast({ message: 'Failed to load invoices', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
      setToast({ message: 'Failed to load sales', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Quick status update
  const updateSaleStatus = async (saleId: string, newStatus: Sale['status']) => {
    try {
      const result = await salesService.updateSale(saleId, { status: newStatus });
      if (result.success) {
        setSales(prev => prev.map(sale => 
          sale.id === saleId ? { ...sale, status: newStatus } : sale
        ));
        setToast({ message: 'Sale status updated successfully', type: 'success' });
      } else {
        setToast({ message: result.error || 'Failed to update sale status', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to update sale status:', error);
      setToast({ message: 'Failed to update sale status', type: 'error' });
    }
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (selectedSales.size === 0 || !bulkAction) return;

    try {
      const promises = Array.from(selectedSales).map(saleId => {
        if (bulkAction === 'delete') {
          return salesService.deleteSale(saleId);
        } else if (['pending', 'completed', 'refunded'].includes(bulkAction)) {
          return salesService.updateSale(saleId, { status: bulkAction as Sale['status'] });
        }
        return Promise.resolve({ success: false, error: 'Invalid action' });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        await loadSales(); // Reload to get updated data
        setSelectedSales(new Set());
        setBulkAction('');
        setToast({ 
          message: `${successCount} sales ${bulkAction}ed successfully`, 
          type: 'success' 
        });
      } else {
        setToast({ message: 'Failed to perform bulk action', type: 'error' });
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      setToast({ message: 'Bulk action failed', type: 'error' });
    }
  };

  // Toggle sale selection
  const toggleSaleSelection = (saleId: string) => {
    setSelectedSales(prev => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  };

  // Select all sales
  const selectAllSales = () => {
    setSelectedSales(new Set(filteredAndSortedSales.map(sale => sale.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSales(new Set());
  };

  // Export functions
  const exportToCSV = () => {
    const csvData = filteredAndSortedSales.map(sale => ({
      'Sale ID': sale.id,
      'Customer': sale.customerName || 'Walk-in Customer',
      'Status': sale.status,
      'Payment Method': sale.paymentMethod,
      'Subtotal': sale.subtotal,
      'Tax': sale.tax,
      'Discount': sale.discount,
      'Total': sale.total,
      'Date': formatDate(sale.createdAt),
      'Notes': sale.notes || ''
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printSalesReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const salesData = filteredAndSortedSales.map(sale => ({
      id: sale.id,
      customer: sale.customerName || 'Walk-in Customer',
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      total: formatCurrency(sale.total),
      date: formatDate(sale.createdAt)
    }));

    const totalRevenue = filteredAndSortedSales.reduce((sum, sale) => {
      if (sale.status === 'completed' || sale.status === 'pending') {
        return sum + sale.total;
      }
      return sum;
    }, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sales Report</h1>
          <p>Generated on ${formatDate(new Date().toISOString())}</p>
        </div>
        
        <div class="summary">
          <p><strong>Total Sales:</strong> ${filteredAndSortedSales.length}</p>
          <p><strong>Total Revenue:</strong> ${formatCurrency(totalRevenue)}</p>
          <p><strong>Date Range:</strong> ${dateRange.start ? formatDate(dateRange.start.toISOString()) : 'All Time'} - ${dateRange.end ? formatDate(dateRange.end.toISOString()) : 'Present'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${salesData.map(sale => `
              <tr>
                <td>${sale.id}</td>
                <td>${sale.customer}</td>
                <td>${sale.status}</td>
                <td>${sale.paymentMethod}</td>
                <td>${sale.total}</td>
                <td>${sale.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDeleteSale = (saleId: string) => {
    confirm({
      title: 'Delete Sale',
      message: `Are you sure you want to delete this sale? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await salesService.deleteSale(saleId);
        if (response.success) {
          setToast({ message: 'Sale deleted successfully', type: 'success' });
          loadSales();
        } else {
          setToast({ message: response.error || 'Failed to delete sale', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete sale:', error);
        setToast({ message: 'Failed to delete sale', type: 'error' });
      }
    });
  };

  const handleViewSale = (sale: Sale) => {
    navigate(`/sales/${sale.id}`);
  };

  const handleEditSale = (sale: Sale) => {
    navigate(`/sales/${sale.id}/edit`);
  };

  const handleApplyCredit = async (sale: Sale) => {
    setSelectedSaleForCredit(sale);
    
    // Load customer credit
    if (sale.customerId) {
      try {
        const response = await customerService.getCustomerById(sale.customerId);
        if (response.success && response.data) {
          setCustomerCredit(response.data.storeCredit || 0);
        }
      } catch (error) {
        console.error('Failed to load customer credit:', error);
        setToast({ message: 'Failed to load customer credit', type: 'error' });
        return;
      }
    }
    
    setShowCreditDialog(true);
  };

  const handleCreditConfirm = async () => {
    if (!selectedSaleForCredit || !creditAmount || parseFloat(creditAmount) <= 0) {
      setToast({ message: 'Please enter a valid credit amount', type: 'error' });
      return;
    }

    try {
      const creditToApply = parseFloat(creditAmount);
      
      if (creditToApply > customerCredit) {
        setToast({ message: `Only ${formatCurrency(customerCredit)} credit available`, type: 'error' });
        return;
      }

      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron IPC not available');
      }

      const result = await window.electron.ipcRenderer.invoke('apply-customer-credit-to-sale', {
        saleId: selectedSaleForCredit.id,
        customerId: selectedSaleForCredit.customerId,
        creditAmount: creditToApply
      }) as {
        success: boolean;
        data?: {
          creditApplied: number;
          remainingCredit: number;
        };
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply store credit');
      }

      setToast({ 
        message: `${formatCurrency(creditToApply)} credit applied successfully!`, 
        type: 'success' 
      });
      setShowCreditDialog(false);
      setCreditAmount('');
      setCustomerCredit(result.data?.remainingCredit || 0);
      
      // Reload sales to show updated data
      await loadSales();
    } catch (error) {
      console.error('Failed to apply store credit:', error);
      setToast({ message: 'Failed to apply store credit', type: 'error' });
    }
  };

  // Filter and sort sales
  const filteredAndSortedSales = useMemo(() => {
    const currentSales = sales || [];
    const filtered = currentSales.filter(sale => {
      const matchesSearch = !searchTerm || 
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || sale.status === statusFilter;
      const matchesPayment = !paymentMethodFilter || sale.paymentMethod === paymentMethodFilter;
      const matchesDateRange = isSaleInDateRange(sale);
      
      return matchesSearch && matchesStatus && matchesPayment && matchesDateRange;
    });

    // Sort sales
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy] || '';
      let bValue: string | number | Date = b[sortBy] || '';
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, sortBy, sortOrder, isSaleInDateRange, dateRange]);

  // Calculate stats using RevenueCalculator service
  const stats = useMemo(() => {
    const currentSales = sales || [];
    const currentReturns = returns || [];
    const currentInvoices = invoices || [];
    
    // Filter data by date range (same as Dashboard)
    const filteredSales = currentSales.filter(isSaleInDateRange);
    const filteredReturns = currentReturns.filter(ret => {
      if (!dateRange.start && !dateRange.end) return true;
      const returnDate = new Date(ret.createdAt);
      const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
      const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
      return (!startOfDay || returnDate >= startOfDay) && (!endOfDay || returnDate <= endOfDay);
    });
    const filteredInvoices = currentInvoices.filter(invoice => {
      if (!dateRange.start && !dateRange.end) return true;
      const invoiceDate = new Date(invoice.createdAt as string);
      const startOfDay = dateRange.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate()) : null;
      const endOfDay = dateRange.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999) : null;
      return (!startOfDay || invoiceDate >= startOfDay) && (!endOfDay || invoiceDate <= endOfDay);
    });
    
    // Use RevenueCalculator for consistent revenue calculations (same as Dashboard)
    const grossRevenue = RevenueCalculatorService.calculateGrossRevenue(filteredSales, filteredInvoices);
    const returnAmount = RevenueCalculatorService.calculateReturnImpact(filteredReturns);
    const netRevenue = RevenueCalculatorService.calculateNetRevenue(grossRevenue, returnAmount);
    
    const totalSales = filteredSales.length;
    const pendingSales = filteredSales.filter(sale => sale.status === 'pending').length;
    const completedSales = filteredSales.filter(sale => sale.status === 'completed').length;
    const refundedSales = filteredSales.filter(sale => sale.status === 'refunded').length;
    const refundedAmount = filteredSales.filter(sale => sale.status === 'refunded').reduce((sum, sale) => sum + sale.total, 0);
    const cancelledSales = filteredSales.filter(sale => sale.status === 'cancelled').length;
    const totalReturns = filteredReturns.length;
    
    return {
      grossRevenue,
      returnAmount,
      netRevenue,
      totalSales,
      pendingSales,
      completedSales,
      refundedSales,
      refundedAmount,
      cancelledSales,
      totalReturns
    };
  }, [sales, returns, invoices, dateRange, isSaleInDateRange]);

  // Chart data calculations
  const chartData = useMemo(() => {
    const currentSales = filteredAndSortedSales || [];
    
    // Daily sales trend (last 7 days)
    const dailySales = [];
    const dailyLabels = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      
      const daySales = currentSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= startOfDay && saleDate <= endOfDay && 
               (sale.status === 'completed' || sale.status === 'pending');
      });
      
      const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total, 0);
      dailySales.push(dayRevenue);
      dailyLabels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = [];
    const monthlyLabels = [];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const nextMonth = new Date(currentYear, currentMonth - i + 1, 1);
      
      const monthSales = currentSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= monthDate && saleDate < nextMonth && 
               (sale.status === 'completed' || sale.status === 'pending');
      });
      
      const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);
      monthlyRevenue.push(monthRevenue);
      monthlyLabels.push(monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    // Top customers by revenue
    const customerRevenue = currentSales.reduce((acc, sale) => {
      if ((sale.status === 'completed' || sale.status === 'pending') && sale.customerName) {
        const customer = sale.customerName;
        acc[customer] = (acc[customer] || 0) + sale.total;
      }
      return acc;
    }, {} as Record<string, number>);

    const topCustomers = Object.entries(customerRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const customerLabels = topCustomers.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name);
    const customerData = topCustomers.map(([,revenue]) => revenue);

    // Status distribution
    const statusCounts = currentSales.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusLabels = Object.keys(statusCounts);
    const statusData = Object.values(statusCounts);
    const statusColors = {
      'completed': '#22c55e', // green for completed
      'pending': '#f59e0b', // yellow for pending
      'refunded': '#ef4444', // red for refunded
      'cancelled': '#6b7280' // gray for cancelled
    };

    return {
      dailySales: {
        labels: dailyLabels,
        datasets: [{
          label: 'Daily Revenue',
          data: dailySales,
          borderColor: '#ff6b00',
          backgroundColor: 'rgba(255, 107, 0, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ff6b00',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      monthlyRevenue: {
        labels: monthlyLabels,
        datasets: [{
          label: 'Monthly Revenue',
          data: monthlyRevenue,
          backgroundColor: '#ff6b00',
          borderColor: '#ff6b00',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      topCustomers: {
        labels: customerLabels,
        datasets: [{
          data: customerData,
          backgroundColor: [
            '#ff6b00',
            '#ff8c42', 
            '#ffa726',
            '#ffb74d',
            '#ffcc80'
          ],
          borderWidth: 0,
          hoverBorderWidth: 0,
          cutout: '60%'
        }]
      },
      statusDistribution: {
        labels: statusLabels.map(status => status.charAt(0).toUpperCase() + status.slice(1)),
        datasets: [{
          data: statusData,
          backgroundColor: statusLabels.map(status => statusColors[status as keyof typeof statusColors] || '#6b7280'),
          borderWidth: 0
        }]
      }
    };
  }, [filteredAndSortedSales]);

  // Table configuration
  const tableColumns = [
    { key: 'select', label: '', sortable: false, width: '40px' },
    { key: 'sale', label: 'Sale Details', sortable: true, width: 'auto' },
    { key: 'customer', label: 'Customer', sortable: true, width: '200px' },
    { key: 'cashier', label: 'Cashier', sortable: true, width: '180px' },
    { key: 'amount', label: 'Amount', sortable: true, width: '120px' },
    { key: 'status', label: 'Status', sortable: false, width: '140px' },
    { key: 'payment', label: 'Payment', sortable: false, width: '120px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '100px' }
  ];

  const tableData = filteredAndSortedSales.map(sale => {
    // Get returns for this sale
    const saleReturns = returns.filter(ret => ret.saleId === sale.id);
    const completedReturns = saleReturns.filter(ret => ['completed', 'approved'].includes(ret.status));
    const totalReturnedAmount = completedReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
    const hasCashRefunds = completedReturns.some(ret => ['cash', 'original_payment'].includes(ret.refundMethod));
    const hasStoreCreditRefunds = completedReturns.some(ret => ret.refundMethod === 'store_credit');
    
    return {
    select: (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={selectedSales.has(sale.id)}
          onChange={() => toggleSaleSelection(sale.id)}
          className="rounded border-gray-300 w-4 h-4"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>
    ),
    sale: (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            #{sale.id.substring(0, 8)}
          </span>
          {totalReturnedAmount > 0 && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: hasCashRefunds ? '#fecaca' : '#fef3c7',
                color: hasCashRefunds ? '#991b1b' : '#92400e',
              }}
            >
              {hasCashRefunds && hasStoreCreditRefunds ? 'Mixed Refund' : 
               hasCashRefunds ? 'Cash Refund' : 'Store Credit'}
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
          {totalReturnedAmount > 0 && (
            <span className="ml-2">
              • {formatCurrency(totalReturnedAmount)} returned
            </span>
          )}
        </div>
      </div>
    ),
    customer: (
      <div className="space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {sale.customerName || 'Walk-in Customer'}
        </div>
        {sale.customerId && (
          <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            ID: {sale.customerId.substring(0, 8)}
          </div>
        )}
      </div>
    ),
    cashier: (
      <div className="space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {sale.cashierName || '—'}
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
          {sale.cashierEmployeeId || (sale.userId ? `ID: ${sale.userId.substring(0, 8)}` : '')}
        </div>
      </div>
    ),
    amount: (
      <div className="text-right space-y-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
          {formatCurrency(sale.total)}
        </div>
        {sale.discount > 0 && (
          <div className="text-xs text-green-600">
            -{formatCurrency(sale.discount)} discount
          </div>
        )}
      </div>
    ),
    status: (
      <div className="flex items-center gap-2">
        {sale.status === 'completed' && <IconCheck className="h-4 w-4" style={{ color: '#22c55e' }} stroke={1.5} />}
        {sale.status === 'pending' && <IconClock className="h-4 w-4" style={{ color: '#eab308' }} stroke={1.5} />}
        {sale.status === 'refunded' && <IconAlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} stroke={1.5} />}
        {sale.status === 'cancelled' && <IconMinus className="h-4 w-4" style={{ color: '#6b7280' }} stroke={1.5} />}
        <select
          value={sale.status}
          onChange={(e) => updateSaleStatus(sale.id, e.target.value as Sale['status'])}
          className="px-2 py-1 rounded text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{
            backgroundColor: sale.status === 'completed' 
              ? '#dcfce7' 
              : sale.status === 'pending'
              ? '#fef3c7'
              : sale.status === 'refunded'
              ? '#fecaca'
              : '#f3f4f6',
            color: sale.status === 'completed' 
              ? '#166534' 
              : sale.status === 'pending'
              ? '#92400e'
              : sale.status === 'refunded'
              ? '#991b1b'
              : '#374151',
            minWidth: '80px'
          }}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    ),
    payment: (
      <div className="space-y-1">
        <div className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>
          {sale.paymentMethod.replace('_', ' ')}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {sale.tax > 0 && `+${formatCurrency(sale.tax)} tax`}
        </div>
      </div>
    ),
    date: (
      <div className="space-y-1">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {formatDate(sale.createdAt)}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
    actions: (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewSale(sale)}
          className="p-1 h-8 w-8 hover:bg-blue-50"
          title="View Details"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditSale(sale)}
          className="p-1 h-8 w-8 hover:bg-orange-50"
          title="Edit Sale"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        {sale.customerId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleApplyCredit(sale)}
            className="p-1 h-8 w-8 hover:bg-green-50"
            title="Apply Store Credit"
          >
            <IconCreditCard className="h-4 w-4" stroke={1.5} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteSale(sale.id)}
          className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Delete Sale"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Sales
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Manage your sales transactions and revenue
            </p>
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select date range"
              className="min-w-[250px]"
            />
            <Button onClick={() => navigate('/sales/new')} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              New Sale
            </Button>
          </div>
        </div>


               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <KPICard 
                   title="Total Sales" 
                   value={stats.totalSales.toString()}
                   icon={<IconShoppingCart className="h-6 w-6" style={{ color: 'var(--accent)' }} stroke={1.5} />}
                   accentColor="#3b82f6"
                 />
                 <KPICard 
                   title="Completed" 
                   value={stats.completedSales.toString()}
                   icon={<IconCheck className="h-6 w-6" style={{ color: '#22c55e' }} stroke={1.5} />}
                   accentColor="#22c55e"
                 />
                 <KPICard 
                   title="Pending" 
                   value={stats.pendingSales.toString()}
                   icon={<IconClock className="h-6 w-6" style={{ color: '#eab308' }} stroke={1.5} />}
                   accentColor="#eab308"
                 />
               </div>



        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                <Input
                  placeholder="Search sales by ID, customer, or payment method..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[120px] px-3 py-2 rounded-md border transition-colors text-sm"
                style={{
                  background: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="min-w-[140px] px-3 py-2 rounded-md border transition-colors text-sm"
                style={{
                  background: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <option value="">All Payment</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'total' | 'customerName')}
                className="min-w-[120px] px-3 py-2 rounded-md border transition-colors text-sm"
                style={{
                  background: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <option value="createdAt">Sort by Date</option>
                <option value="total">Sort by Total</option>
                <option value="customerName">Sort by Customer</option>
              </select>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 text-sm"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Date Range and Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Quick Filter Dropdown */}
            <div className="relative">
              <IconCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} stroke={1.5} />
              <select
                value={quickFilter}
                onChange={(e) => handleQuickFilter(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-md border transition-colors"
                style={{
                  background: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  minWidth: '140px'
                }}
              >
                {quickFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-2"
                disabled={filteredAndSortedSales.length === 0}
              >
                <IconDownload className="h-4 w-4" stroke={1.5} />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={printSalesReport}
                className="flex items-center gap-2"
                disabled={filteredAndSortedSales.length === 0}
              >
                <IconPrinter className="h-4 w-4" stroke={1.5} />
                Print Report
              </Button>
            </div>
          </div>

          {/* Date Range Display */}
          {quickFilter && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <span>
                Showing sales for: <strong>{quickFilterOptions.find(opt => opt.value === quickFilter)?.label}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange({ start: null, end: null });
                  setQuickFilter('');
                }}
                className="text-xs"
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {/* Results Summary and Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-medium">
              Showing {filteredAndSortedSales.length} of {(sales || []).length} sales
            </span>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="px-2 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}>
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {statusFilter && (
                <span className="px-2 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}>
                  {statusFilter}
                </span>
              )}
              {paymentMethodFilter && (
                <span className="px-2 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}>
                  {paymentMethodFilter}
                </span>
              )}
              {quickFilter && (
                <span className="px-2 py-1 text-xs rounded-full" style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}>
                  {quickFilterOptions.find(opt => opt.value === quickFilter)?.label}
                </span>
              )}
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedSales.size > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ 
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
              }}>
                {selectedSales.size} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border transition-colors"
                  style={{
                    background: 'var(--input)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                    minWidth: '140px',
                    height: '32px'
                  }}
                >
                  <option value="">Select Action</option>
                  <option value="completed">Mark as Completed</option>
                  <option value="pending">Mark as Pending</option>
                  <option value="refunded">Mark as Refunded</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <Button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  size="sm"
                  className="px-3 py-2 text-sm h-8"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="px-3 py-2 text-sm h-8"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <PaginatedTableCard 
          title="Sales Transactions"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          empty={tableData.length === 0}
          emptyTitle="No sales found"
          emptyDescription={
            searchTerm || statusFilter || paymentMethodFilter 
              ? "No sales match your current filters. Try adjusting your search criteria."
              : "You haven't made any sales yet. Create your first sale to get started!"
          }
          emptyAction={
            tableData.length === 0 && !searchTerm && !statusFilter && !paymentMethodFilter ? (
              <Button 
                onClick={() => navigate('/sales/new')}
                className="mt-4"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                Create First Sale
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPaymentMethodFilter('');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )
          }
          headerActions={
            <div className="flex items-center gap-4">
              {/* Select All */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSales.size === filteredAndSortedSales.length && filteredAndSortedSales.length > 0}
                  onChange={(e) => e.target.checked ? selectAllSales() : clearSelection()}
                  className="rounded border-gray-300"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Select All
                </span>
              </div>
              
              {/* Filter Badges */}
              <div className="flex items-center gap-2">
                {searchTerm && (
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    &quot;{searchTerm}&quot;
                  </span>
                )}
                {statusFilter && (
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    {statusFilter}
                  </span>
                )}
                {paymentMethodFilter && (
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    {paymentMethodFilter}
                  </span>
                )}
              </div>
            </div>
          }
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />

        {/* Store Credit Dialog */}
        {showCreditDialog && selectedSaleForCredit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" style={{ backgroundColor: 'var(--card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Apply Store Credit</h3>
                <button
                  onClick={() => {
                    setShowCreditDialog(false);
                    setSelectedSaleForCredit(null);
                    setCreditAmount('');
                  }}
                  style={{ color: 'var(--muted-foreground)' }}
                  className="hover:opacity-80"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="p-4 rounded-lg border" style={{ 
                  backgroundColor: 'var(--success)10', 
                  borderColor: 'var(--success)30' 
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: 'var(--success)' }}>Available Credit:</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                      {formatCurrency(customerCredit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sale Total:</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(selectedSaleForCredit.total)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    Credit Amount to Apply
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={Math.min(customerCredit, selectedSaleForCredit.total)}
                    step="0.01"
                    placeholder="Enter amount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Maximum: {formatCurrency(Math.min(customerCredit, selectedSaleForCredit.total))}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const maxCredit = Math.min(customerCredit, selectedSaleForCredit.total);
                      setCreditAmount(maxCredit.toString());
                    }}
                    className="flex-1"
                  >
                    Use Maximum
                  </Button>
                  <Button
                    onClick={handleCreditConfirm}
                    disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                    className="flex-1"
                  >
                    Apply Credit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toast && (
          <Toast
            title={toast.message}
            variant={toast.type}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}
    </div>
  );
}

