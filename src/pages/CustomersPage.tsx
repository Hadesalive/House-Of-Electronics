/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge, Toast } from '@/components/ui/core';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import { Input, Select, Switch } from '@/components/ui/forms';
import { CustomerForm } from '@/components/ui/forms/customer-form';
import { useSettings } from '@/contexts/SettingsContext';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { customerService } from '@/lib/services';
import { Customer } from '@/lib/types/core';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAllCustomers();
      
      if (response.success && response.data) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      setToast({ message: 'Failed to load customers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await customerService.deleteCustomer(customerId);
        if (response && response.success) {
          setCustomers((customers || []).filter(c => c.id !== customerId));
          setToast({ message: 'Customer deleted successfully', type: 'success' });
        }
      } catch (error) {
        console.error('Failed to delete customer:', error);
        setToast({ message: 'Failed to delete customer', type: 'error' });
      }
    });
  };

  const handleExportCustomers = async () => {
    try {
      const response = await customerService.exportCustomers();
      if (response.success) {
        setToast({ message: `Customers exported successfully to ${response.data?.path}`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to export customers:', error);
      setToast({ message: 'Failed to export customers', type: 'error' });
    }
  };

  const handleImportCustomers = async () => {
    try {
      const response = await customerService.importCustomers();
      if (response.success) {
        await loadCustomers(); // Reload customers after import
        setToast({ message: `Successfully imported ${response.data?.importedCount} customers`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to import customers:', error);
      setToast({ message: 'Failed to import customers', type: 'error' });
    }
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedCustomer) {
        // Update existing customer
        const response = await customerService.updateCustomer(selectedCustomer.id, customerData);
        if (response.success) {
          await loadCustomers();
          setToast({ message: 'Customer updated successfully', type: 'success' });
        }
      } else {
        // Create new customer
        const response = await customerService.createCustomer(customerData);
        if (response.success) {
          await loadCustomers();
          setToast({ message: 'Customer created successfully', type: 'success' });
        }
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
      setToast({ message: 'Failed to save customer', type: 'error' });
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSelectedCustomer(null);
  };

  const handleViewCustomer = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleDeleteCustomerFromTable = (customer: Customer) => {
    handleDeleteCustomer(customer.id);
  };

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    const currentCustomers = customers || [];
    const filtered = currentCustomers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone?.includes(searchTerm);
      
      const matchesStatus = showInactive || customer.name; // For now, all customers are "active"
      
      return matchesSearch && matchesStatus;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [customers, searchTerm, sortBy, sortOrder, showInactive]);

  // Table configuration
  const tableColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'company', label: 'Company', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedCustomers.map(customer => ({
    id: customer.id,
    name: (
      <div className="flex items-center space-x-3">
        {customer.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.avatar}
            alt={customer.name}
            className="h-8 w-8 rounded-full object-cover border"
            style={{ borderColor: 'var(--border)' }}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="font-medium">{customer.name}</span>
      </div>
    ),
    email: customer.email || '-',
    phone: customer.phone || '-',
    company: customer.company || '-',
    createdAt: formatDate(customer.createdAt),
    actions: (
      <div className="flex items-center space-x-2">
        <Link to={`/customers/${customer.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditCustomer(customer)}
          className="p-1 h-8 w-8"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteCustomerFromTable(customer)}
          className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  // Calculate customer statistics
  const customerStats: CustomerStats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.length; // All customers are active for now
    const totalRevenue = 0; // Would come from sales data
    const averageOrderValue = 0; // Would be calculated from sales

    return {
      totalCustomers,
      activeCustomers,
      totalRevenue,
      averageOrderValue
    };
  }, [customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Customer Management
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Manage your customer database and track customer relationships
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCustomers}
              className="flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleImportCustomers}
              className="flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Total Customers" 
            value={customerStats.totalCustomers}
            icon={<UserGroupIcon style={{ height: '32px', width: '32px', color: '#2563eb' }} />}
            accentColor="#2563eb"
          />
          
          <KPICard
            title="Active Customers"
            value={customerStats.activeCustomers}
            icon={<UsersIcon style={{ height: '32px', width: '32px', color: '#16a34a' }} />}
            accentColor="#16a34a"
          />
          
          <KPICard
            title="Total Revenue"
            value={formatCurrency(customerStats.totalRevenue)}
            icon={<CurrencyDollarIcon style={{ height: '32px', width: '32px', color: '#ca8a04' }} />}
            accentColor="#ca8a04"
          />
          
          <KPICard
            title="Avg Order Value"
            value={formatCurrency(customerStats.averageOrderValue)}
            icon={<ShoppingBagIcon style={{ height: '32px', width: '32px', color: '#9333ea' }} />}
            accentColor="#9333ea"
          />
        </div>

        {/* Search and Filters */}
        <div 
          className="p-6 rounded-lg border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                <Input
                  type="text"
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'createdAt')}
                  options={[
                    { value: 'name', label: 'Sort by Name' },
                    { value: 'email', label: 'Sort by Email' },
                    { value: 'createdAt', label: 'Sort by Date' }
                  ]}
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Show Inactive
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <PaginatedTableCard
          title={`Customers (${filteredAndSortedCustomers.length})`}
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          headerActions={
            searchTerm && (
              <Badge variant="secondary">
                Filtered by: &ldquo;{searchTerm}&rdquo;
              </Badge>
            )
          }
        />

        {/* Toast Notifications */}
        {toast && (
          <Toast
            title={toast.message}
            variant={toast.type === 'success' ? 'success' : 'error'}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}

        {/* Customer Form Modal */}
        <CustomerForm
          customer={selectedCustomer}
          isOpen={showAddForm || !!selectedCustomer}
          onClose={handleCloseForm}
          onSave={handleSaveCustomer}
          title={selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
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
      </div>
  );
}

