import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PaginatedTableCard, KPICard, ChartCard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  ChartContainer, 
  ChartLegend, 
  ChartLegendContent
} from '@/components/ui/chart';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PrinterIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    number: string;
    type: string;
    status: string;
    customerName: string;
    customerEmail: string;
    issueDate: string;
    dueDate: string;
    paidDate: string | null;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    balance: number;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'issueDate' | 'dueDate' | 'total' | 'customerName'>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // New states for enhanced functionality
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [quickFilter, setQuickFilter] = useState('');
  const applyDatePreset = (preset: 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (preset === 'all') {
      setDateRange({ start: '', end: '' });
      return;
    }
    if (preset === 'last7') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setDateRange({ start: fmt(start), end: fmt(today) });
      return;
    }
    if (preset === 'last30') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setDateRange({ start: fmt(start), end: fmt(today) });
      return;
    }
    if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateRange({ start: fmt(start), end: fmt(end) });
      return;
    }
    if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setDateRange({ start: fmt(start), end: fmt(end) });
      return;
    }
  };

  // Load invoices using Electron IPC
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        
        // Use Electron IPC if available (production/dev)
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          console.log('Loading invoices via IPC...');
          const result = await window.electron.ipcRenderer.invoke('get-invoices') as { 
            success: boolean; 
            data?: typeof invoices; 
            error?: string 
          };
          
          if (result.success) {
            console.log('Invoices loaded via IPC:', result.data?.length || 0);
            setInvoices(result.data || []);
          } else {
            console.error('Failed to load invoices via IPC:', result.error);
            setToast({ message: result.error || 'Failed to load invoices', type: 'error' });
          }
        } else {
          console.warn('Electron IPC not available - this should not happen in production');
          setToast({ message: 'Unable to connect to database', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to load invoices:', error);
        setToast({ message: 'Failed to load invoices', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // Helper function to check if invoice is in date range
  const isInvoiceInDateRange = useCallback((invoice: typeof invoices[0]) => {
    if (!dateRange.start || !dateRange.end) return true;
    
    const invoiceDate = new Date(invoice.issueDate);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    return invoiceDate >= startDate && invoiceDate <= endDate;
  }, [dateRange]);

  // Filter and sort invoices
  const filteredAndSortedInvoices = useMemo(() => {
    const filtered = invoices.filter(invoice => {
      const matchesSearch = !searchTerm || 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || invoice.status === statusFilter;
      const matchesType = !typeFilter || invoice.type === typeFilter;
      const matchesDateRange = isInvoiceInDateRange(invoice);
      
      // Quick filter logic
      let matchesQuickFilter = true;
      if (quickFilter) {
        switch (quickFilter) {
          case 'overdue':
            matchesQuickFilter = invoice.status === 'overdue' || 
              (invoice.status === 'pending' && new Date(invoice.dueDate) < new Date());
            break;
          case 'paid':
            matchesQuickFilter = invoice.status === 'paid';
            break;
          case 'pending':
            matchesQuickFilter = invoice.status === 'pending' && new Date(invoice.dueDate) >= new Date();
            break;
          case 'draft':
            matchesQuickFilter = invoice.status === 'draft';
            break;
          case 'thisMonth':
            const thisMonth = new Date();
            const invoiceDate = new Date(invoice.issueDate);
            matchesQuickFilter = invoiceDate.getMonth() === thisMonth.getMonth() && 
              invoiceDate.getFullYear() === thisMonth.getFullYear();
            break;
          case 'lastMonth':
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const invoiceDateLastMonth = new Date(invoice.issueDate);
            matchesQuickFilter = invoiceDateLastMonth.getMonth() === lastMonth.getMonth() && 
              invoiceDateLastMonth.getFullYear() === lastMonth.getFullYear();
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDateRange && matchesQuickFilter;
    });

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy];
      let bValue: string | number | Date = b[sortBy];
      
      if (sortBy === 'issueDate' || sortBy === 'dueDate') {
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
  }, [invoices, searchTerm, statusFilter, typeFilter, sortBy, sortOrder, isInvoiceInDateRange, quickFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const sentInvoices = invoices.filter(inv => inv.status === 'sent').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
    const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const sentAmount = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const draftAmount = invoices.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    return {
      totalInvoices,
      paidInvoices,
      sentInvoices,
      overdueInvoices,
      draftInvoices,
      totalRevenue,
      sentAmount,
      overdueAmount,
      draftAmount
    };
  }, [invoices]);

  // Bulk action functions
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('update-invoice', {
          id: invoiceId,
          body: { status: newStatus }
        }) as { success: boolean; error?: string };
        
        if (result.success) {
          setInvoices(prev => prev.map(inv => 
            inv.id === invoiceId ? { ...inv, status: newStatus } : inv
          ));
          setToast({ message: 'Invoice status updated successfully', type: 'success' });
        } else {
          setToast({ message: result.error || 'Failed to update invoice status', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Failed to update invoice status:', error);
      setToast({ message: 'Failed to update invoice status', type: 'error' });
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedInvoices.size === 0) return;
    
    try {
      const invoiceIds = Array.from(selectedInvoices);
      
      if (bulkAction === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${invoiceIds.length} invoice(s)?`)) {
          return;
        }
        
        // Delete invoices one by one
        for (const id of invoiceIds) {
          await handleDeleteInvoice(id);
        }
        
        setSelectedInvoices(new Set());
        setBulkAction('');
        setToast({ message: `${invoiceIds.length} invoice(s) deleted successfully`, type: 'success' });
      } else if (bulkAction === 'markPaid') {
        // Update status to paid
        for (const id of invoiceIds) {
          await updateInvoiceStatus(id, 'paid');
        }
        
        setSelectedInvoices(new Set());
        setBulkAction('');
        setToast({ message: `${invoiceIds.length} invoice(s) marked as paid`, type: 'success' });
      } else if (bulkAction === 'markSent') {
        // Update status to sent
        for (const id of invoiceIds) {
          await updateInvoiceStatus(id, 'sent');
        }
        
        setSelectedInvoices(new Set());
        setBulkAction('');
        setToast({ message: `${invoiceIds.length} invoice(s) marked as sent`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      setToast({ message: 'Failed to perform bulk action', type: 'error' });
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const selectAllInvoices = () => {
    setSelectedInvoices(new Set(filteredAndSortedInvoices.map(inv => inv.id)));
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  // Export and print functions
  const exportToCSV = () => {
    const csvData = filteredAndSortedInvoices.map(invoice => ({
      'Invoice #': invoice.number,
      'Customer': invoice.customerName,
      'Email': invoice.customerEmail,
      'Type': invoice.type,
      'Status': invoice.status,
      'Issue Date': formatDate(invoice.issueDate),
      'Due Date': formatDate(invoice.dueDate),
      'Total': invoice.total,
      'Paid': invoice.paidAmount,
      'Balance': invoice.balance
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setToast({ message: 'Invoices exported to CSV successfully', type: 'success' });
  };

  const printInvoicesReport = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoices Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 20px; }
            .stat { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoices Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <div class="stats">
              <div class="stat">
                <h3>${stats.totalInvoices}</h3>
                <p>Total Invoices</p>
              </div>
              <div class="stat">
                <h3>${stats.paidInvoices}</h3>
                <p>Paid</p>
              </div>
              <div class="stat">
                <h3>${stats.sentInvoices}</h3>
                <p>Sent</p>
              </div>
              <div class="stat">
                <h3>${stats.overdueInvoices}</h3>
                <p>Overdue</p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedInvoices.map(invoice => `
                <tr>
                  <td>${invoice.number}</td>
                  <td>${invoice.customerName}</td>
                  <td>${invoice.status}</td>
                  <td>${formatCurrency(invoice.total)}</td>
                  <td>${formatCurrency(invoice.balance)}</td>
                  <td>${formatDate(invoice.dueDate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    } else {
      setToast({ message: 'Please allow popups for printing', type: 'error' });
    }
  };

  // Chart data calculation
  const chartData = useMemo(() => {
    const sourceInvoices = filteredAndSortedInvoices;
    // Daily invoice trends (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyInvoices = last30Days.map((date) => {
       const dayInvoices = sourceInvoices.filter(inv => inv.issueDate === date);
      const paidInvoices = dayInvoices.filter(inv => inv.status === 'paid');
      const sentInvoices = dayInvoices.filter(inv => inv.status === 'sent');
      
      return {
        date,
        count: dayInvoices.length,
        revenue: paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        paidCount: paidInvoices.length,
        sentAmount: sentInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0)
      };
    });


    // Monthly revenue (last 12 months)
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      };
    });

    const monthlyRevenue = last12Months.map(({ month, year, monthKey }) => {
       const monthInvoices = sourceInvoices.filter(inv => 
        inv.issueDate && inv.issueDate.startsWith(monthKey) && inv.status === 'paid'
      );
      return {
        month: `${month} ${year}`,
        revenue: monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      };
    });

    // Top customers by invoice count
     const customerStats = sourceInvoices.reduce((acc, invoice) => {
      const key = invoice.customerName || 'No Customer';
      if (!acc[key]) {
        acc[key] = { name: key, count: 0, total: 0 };
      }
      acc[key].count += 1;
      acc[key].total += (invoice.total || 0);
      return acc;
    }, {} as Record<string, { name: string; count: number; total: number }>);

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Status distribution
    const statusDistribution = [
      { status: 'Paid', count: stats.paidInvoices, color: '#22c55e' },
      { status: 'Sent', count: stats.sentInvoices, color: '#3b82f6' },
      { status: 'Overdue', count: stats.overdueInvoices, color: '#ef4444' },
      { status: 'Draft', count: stats.draftInvoices, color: '#6b7280' }
    ];

    return {
      dailyInvoices,
      monthlyRevenue,
      topCustomers,
      statusDistribution
    };
   }, [filteredAndSortedInvoices, stats]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this invoice?')) {
        return;
      }

      // Use Electron IPC if available
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('delete-invoice', invoiceId) as { 
          success: boolean; 
          error?: string 
        };
        
        if (result.success) {
          setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
          setToast({ message: 'Invoice deleted successfully', type: 'success' });
        } else {
          setToast({ message: result.error || 'Failed to delete invoice', type: 'error' });
        }
      } else {
        setToast({ message: 'Unable to connect to database', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      setToast({ message: 'Failed to delete invoice', type: 'error' });
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}/edit`);
  };

  const getStatusIcon = (status: string) => {
    const iconStyle = { height: '16px', width: '16px' };
    switch (status) {
      case 'paid':
        return <CheckCircleIcon style={{ ...iconStyle, color: '#22c55e' }} />; // green-500
      case 'sent':
        return <ArrowUpTrayIcon style={{ ...iconStyle, color: '#3b82f6' }} />; // blue-500
      case 'overdue':
        return <XCircleIcon style={{ ...iconStyle, color: '#ef4444' }} />; // red-500
      case 'draft':
        return <DocumentTextIcon style={{ ...iconStyle, color: '#6b7280' }} />; // gray-500
      case 'cancelled':
        return <XCircleIcon style={{ ...iconStyle, color: '#6b7280' }} />; // gray-500
      default:
        return <ClockIcon style={{ ...iconStyle, color: '#6b7280' }} />; // gray-500
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { backgroundColor: '#dcfce7', color: '#166534' }; // bg-green-100 text-green-800
      case 'sent':
        return { backgroundColor: '#dbeafe', color: '#1e40af' }; // bg-blue-100 text-blue-800
      case 'overdue':
        return { backgroundColor: '#fee2e2', color: '#991b1b' }; // bg-red-100 text-red-800
      case 'draft':
        return { backgroundColor: '#f3f4f6', color: '#374151' }; // bg-gray-100 text-gray-800
      case 'cancelled':
        return { backgroundColor: '#f3f4f6', color: '#6b7280' }; // bg-gray-100 text-gray-500
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' }; // bg-gray-100 text-gray-800
    }
  };

  // Table configuration
  const tableColumns = [
    { key: 'select', label: '', sortable: false, width: '40px' },
    { key: 'invoice', label: 'Invoice', sortable: true, width: '180px' },
    { key: 'customer', label: 'Customer', sortable: true, width: '220px' },
    { key: 'status', label: 'Status', sortable: false, width: '140px' },
    { key: 'amount', label: 'Amount', sortable: true, width: '140px' },
    { key: 'dueDate', label: 'Due Date', sortable: true, width: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '140px' }
  ];

  const tableData = filteredAndSortedInvoices.map(invoice => ({
    select: (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={selectedInvoices.has(invoice.id)}
          onChange={() => toggleInvoiceSelection(invoice.id)}
          className="rounded border-gray-300 text-accent focus:ring-accent h-4 w-4"
        />
      </div>
    ),
    invoice: (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {invoice.number || 'No Number'}
          </span>
          <div className="text-xs px-1.5 py-0.5 rounded font-medium" 
               style={{ 
                 backgroundColor: 'var(--muted)', 
                 color: 'var(--muted-foreground)',
                 letterSpacing: '0.025em'
               }}>
            {invoice.type ? 
              invoice.type === 'invoice' ? 'INV' :
              invoice.type === 'proforma' ? 'PRO' :
              invoice.type === 'credit_note' ? 'CR' :
              invoice.type === 'delivery' ? 'DEL' :
              invoice.type === 'quote' ? 'QUO' :
              invoice.type.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase()).join('') : 'U'}
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {invoice.issueDate ? formatDate(invoice.issueDate) : 'No date'}
        </div>
      </div>
    ),
    customer: (
      <div className="space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {invoice.customerName || 'No Customer'}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
          {invoice.customerEmail || 'No email provided'}
        </div>
      </div>
    ),
    status: (
      <div className="flex items-center gap-2">
        {getStatusIcon(invoice.status)}
        <select
          value={invoice.status}
          onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
          className="text-sm px-2 py-1 rounded border-0 font-medium transition-all duration-200"
          style={{ 
            color: getStatusColor(invoice.status).color,
            backgroundColor: getStatusColor(invoice.status).backgroundColor,
            border: `1px solid ${getStatusColor(invoice.status).color}30`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    ),
    amount: (
      <div className="text-right space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {formatCurrency(invoice.total || 0)}
        </div>
        <div className="text-xs" style={{ 
          color: (invoice.balance || 0) > 0 ? 'var(--muted-foreground)' : '#22c55e' 
        }}>
          {(invoice.balance || 0) > 0 ? `Bal: ${formatCurrency(invoice.balance || 0)}` : 'Paid'}
        </div>
      </div>
    ),
    dueDate: (
      <div className="space-y-1">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {invoice.dueDate ? formatDate(invoice.dueDate) : 'No date'}
        </div>
        {invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' && (
          <div className="text-xs text-red-500 font-medium">Overdue</div>
        )}
      </div>
    ),
    actions: (
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleViewInvoice(invoice.id)} 
          title="View Invoice"
          className="h-8 w-8 p-0 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleEditInvoice(invoice.id)} 
          title="Edit Invoice"
          className="h-8 w-8 p-0 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Link to={`/invoices/${invoice.id}`}>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Download PDF"
            className="h-8 w-8 p-0 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDeleteInvoice(invoice.id)}
          className="h-8 w-8 p-0 rounded text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          title="Delete Invoice"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Invoices
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Manage your invoices and billing
          </p>
        </div>
        <Button onClick={() => navigate('/invoices/new')} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Total Invoices" 
            value={stats.totalInvoices.toString()}
            icon={<DocumentTextIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#6366f1"
          />
          <KPICard 
            title="Paid Invoices" 
            value={stats.paidInvoices.toString()}
            icon={<CheckCircleIcon className="h-6 w-6 text-green-500" />}
            accentColor="#22c55e"
          />
          <KPICard 
            title="Sent Amount" 
            value={formatCurrency(stats.sentAmount)}
            icon={<ArrowUpTrayIcon className="h-6 w-6 text-blue-500" />}
            accentColor="#3b82f6"
          />
          <KPICard 
            title="Overdue Amount" 
            value={formatCurrency(stats.overdueAmount)}
            icon={<XCircleIcon className="h-6 w-6 text-red-500" />}
            accentColor="#ef4444"
          />
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="Search invoices by number, customer, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="min-w-[140px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                <option value="">Quick Filter</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
                <option value="sent">Sent</option>
                <option value="draft">Draft</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
              </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                className="min-w-[120px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
                className="min-w-[140px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
            >
              <option value="">All Types</option>
                <option value="invoice">Invoice</option>
              <option value="proforma">Proforma</option>
              <option value="credit_note">Credit Note</option>
              <option value="delivery">Delivery Note</option>
              <option value="quote">Quote</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'issueDate' | 'dueDate' | 'total' | 'customerName')}
                className="min-w-[120px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
            >
              <option value="issueDate">Sort by Issue Date</option>
              <option value="dueDate">Sort by Due Date</option>
              <option value="total">Sort by Total</option>
              <option value="customerName">Sort by Customer</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Date Range:</span>
            </div>
            <select
              value={(() => {
                // Determine current preset based on dateRange
                if (!dateRange.start || !dateRange.end) return 'all';
                const today = new Date();
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                const fmt = (d: Date) => d.toISOString().split('T')[0];
                
                // Check last 7 days
                const last7Start = new Date(today);
                last7Start.setDate(last7Start.getDate() - 6);
                if (fmt(start) === fmt(last7Start) && fmt(end) === fmt(today)) return 'last7';
                
                // Check last 30 days
                const last30Start = new Date(today);
                last30Start.setDate(last30Start.getDate() - 29);
                if (fmt(start) === fmt(last30Start) && fmt(end) === fmt(today)) return 'last30';
                
                // Check this month
                const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                if (fmt(start) === fmt(thisMonthStart) && fmt(end) === fmt(thisMonthEnd)) return 'thisMonth';
                
                // Check last month
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                if (fmt(start) === fmt(lastMonthStart) && fmt(end) === fmt(lastMonthEnd)) return 'lastMonth';
                
                return 'custom';
              })()}
              onChange={(e) => {
                const preset = e.target.value as 'all' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';
                if (preset === 'custom') return; // Don't change if custom is selected
                applyDatePreset(preset);
              }}
              className="min-w-[160px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All time</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="thisMonth">This month</option>
              <option value="lastMonth">Last month</option>
              <option value="custom">Custom range</option>
            </select>
            {(dateRange.start || dateRange.end) && (
              <>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-40"
                  placeholder="Start Date"
                />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>to</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-40"
                  placeholder="End Date"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Results Summary and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
            {searchTerm && ` matching "${searchTerm}"`}
            {statusFilter && ` with status "${statusFilter}"`}
            {typeFilter && ` of type "${typeFilter}"`}
              {quickFilter && ` (${quickFilter})`}
            </span>
            {dateRange.start && dateRange.end && (
              <div className="text-xs mt-1">
                From {formatDate(dateRange.start)} to {formatDate(dateRange.end)}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export and Print Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={printInvoicesReport}
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print Report
              </Button>
            </div>
            
            {/* Bulk Actions */}
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedInvoices.size} selected
          </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="min-w-[140px] px-3 py-2 border rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                >
                  <option value="">Bulk Actions</option>
                  <option value="markPaid">Mark as Paid</option>
                  <option value="markSent">Mark as Sent</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            )}
            
            {/* Select All/None - Only show when items are selected */}
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllInvoices}
                  disabled={selectedInvoices.size === filteredAndSortedInvoices.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Select None
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <PaginatedTableCard 
          title="All Invoices"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={15}
          headerActions={
            <div className="flex items-center gap-2 flex-wrap">
              {searchTerm && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full font-medium">
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {statusFilter && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full font-medium">
                  {statusFilter}
                </span>
              )}
              {typeFilter && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm rounded-full font-medium">
                  {typeFilter}
                </span>
              )}
              {quickFilter && (
                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-sm rounded-full font-medium">
                  {quickFilter}
                </span>
              )}
            </div>
          }
          emptyTitle={
            filteredAndSortedInvoices.length === 0 ? (
              searchTerm || statusFilter || typeFilter || quickFilter ? 'No invoices found' : 'No invoices yet'
            ) : undefined
          }
          emptyDescription={
            filteredAndSortedInvoices.length === 0 ? (
              searchTerm || statusFilter || typeFilter || quickFilter 
                ? 'Try adjusting your filters to see more results'
                : 'Get started by creating your first invoice'
            ) : undefined
          }
          emptyAction={
            filteredAndSortedInvoices.length === 0 && !searchTerm && !statusFilter && !typeFilter && !quickFilter ? (
              <Button onClick={() => navigate('/invoices/new')} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Create First Invoice
              </Button>
            ) : undefined
          }
        />

        {/* Interactive Area Chart */}
        <ChartCard title="Invoice Performance" className="overflow-hidden">
          {chartData.dailyInvoices.some(day => day.count > 0 || day.revenue > 0) ? (
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "#2563eb",
                },
                count: {
                  label: "Invoices",
                  color: "#60a5fa",
                },
              }}
              className="h-[300px] w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyInvoices}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#2563eb"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="#2563eb"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillInvoices" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#60a5fa"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="#60a5fa"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
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
                          {label ? new Date(label).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            weekday: "short"
                          }) : 'Unknown Date'}
                        </p>
                        <div className="space-y-1 mt-2">
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.dataKey === 'revenue' ? 'Revenue' : 'Invoices'}:
                              </span>
                              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {entry.dataKey === 'revenue' 
                                  ? formatCurrency(Number(entry.value)) 
                                  : entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="url(#fillInvoices)"
                  stroke="#60a5fa"
                  stackId="a"
                  strokeWidth={2}
                />
                <Area
                  dataKey="revenue"
                  type="natural"
                  fill="url(#fillRevenue)"
                  stroke="#2563eb"
                  stackId="a"
                  strokeWidth={2}
                />
                <ChartLegend>
                  <ChartLegendContent />
                </ChartLegend>
              </AreaChart>
            </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm text-muted-foreground">No invoice data available for the last 30 days</p>
                <p className="text-xs text-muted-foreground mt-1">Create some invoices to see the performance chart</p>
              </div>
            </div>
          )}
        </ChartCard>

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
