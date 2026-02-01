import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/core';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import { Modal } from '@/components/ui/core/modal';
import { Input, Select } from '@/components/ui/forms';
import { useSettings } from '@/contexts/SettingsContext';
import { creditService, DebtRecord } from '@/lib/services/credit.service';
import { productService, customerService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { CustomerForm } from '@/components/ui/forms/customer-form';
import { ProductForm } from '@/components/ui/forms/product-form';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, EllipsisVerticalIcon, EyeIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
// Tabler Icons
import {
  IconAlertTriangle,
  IconClock,
  IconCurrencyDollar,
  IconWallet,
  IconUsers,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Alert } from '@/components/ui/core';


type CustomerOption = { id: string; name: string; contact?: string };

export default function CreditPage() {
  const { formatCurrency, formatDate } = useSettings();
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'overdue' | 'due-soon'>('all');

  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showPayDebt, setShowPayDebt] = useState<null | DebtRecord>(null);
  const [showHistory, setShowHistory] = useState<null | DebtRecord>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const [newDebt, setNewDebt] = useState({
    customerId: '',
    amount: '',
    deposit: '',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const [newDebtItems, setNewDebtItems] = useState<Array<{ productName: string; quantity: number; unitPrice: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const debtsRes = await creditService.getAllDebts();
        if (debtsRes.success) setDebts(debtsRes.data || []);
        else setError(debtsRes.error || 'Failed to load debts');
        if (typeof window !== 'undefined' && window.electronAPI) {
          const custRes = await window.electronAPI.getCustomers();
          if (custRes.success) setCustomers((custRes.data || []).map((c: any) => ({ id: c.id, name: c.name, contact: c.phone })));
        }
        // Load products
        const prodRes = await productService.getAllProducts();
        if (prodRes.success) setProducts(prodRes.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshDebts = async () => {
    const res = await creditService.getAllDebts();
    if (res.success) setDebts(res.data || []);
  };

  // Calculate overdue days for each debt (assuming 30 days default payment period)
  const calculateOverdueDays = (createdAt: string): number => {
    const createdDate = new Date(createdAt);
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment period
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getOverdueStatus = (debt: DebtRecord): 'current' | 'due-soon' | 'overdue' => {
    if (debt.status === 'paid') return 'current';
    const overdueDays = calculateOverdueDays(debt.created_at);
    if (overdueDays === 0) return 'current';
    if (overdueDays <= 7) return 'due-soon';
    return 'overdue';
  };

  const kpi = useMemo(() => {
    const totalOriginal = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPaid = debts.reduce((sum, d) => sum + (d.paid || 0), 0);
    const outstanding = Math.max(0, totalOriginal - totalPaid);
    const activeCount = debts.filter(d => d.status === 'active').length;
    const overdueCount = debts.filter(d => d.status === 'active' && getOverdueStatus(d) === 'overdue').length;
    const overdueAmount = debts
      .filter(d => d.status === 'active' && getOverdueStatus(d) === 'overdue')
      .reduce((sum, d) => sum + Math.max(0, (d.amount || 0) - (d.paid || 0)), 0);
    return { totalOriginal, totalPaid, outstanding, activeCount, overdueCount, overdueAmount };
  }, [debts]);

  const filtered = useMemo(() => {
    let result = debts;
    
    // Apply search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(d =>
        (d as any).customer_name?.toLowerCase().includes(q) ||
        (d as any).customer_phone?.toLowerCase().includes(q)
      );
    }
    
    // Apply overdue filter
    if (overdueFilter === 'overdue') {
      result = result.filter(d => d.status === 'active' && getOverdueStatus(d) === 'overdue');
    } else if (overdueFilter === 'due-soon') {
      result = result.filter(d => d.status === 'active' && getOverdueStatus(d) === 'due-soon');
    }
    
    // Sort by overdue status (most overdue first), then by balance
    result = [...result].sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      
      const aOverdue = calculateOverdueDays(a.created_at);
      const bOverdue = calculateOverdueDays(b.created_at);
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      
      const aBalance = Math.max(0, (a.amount || 0) - (a.paid || 0));
      const bBalance = Math.max(0, (b.amount || 0) - (b.paid || 0));
      return bBalance - aBalance;
    });
    
    return result;
  }, [debts, searchTerm, overdueFilter]);

  const columns = useMemo(() => ([
    { key: 'customer', label: 'Customer' },
    { key: 'date', label: 'Date' },
    { key: 'balance', label: 'Balance' },
    { key: 'overdue', label: 'Status' },
    { key: 'status', label: 'Payment Status' },
    { key: 'actions', label: '', sortable: false, className: 'w-[60px]' },
  ]), []);

  const tableData = useMemo(() => filtered.map((d) => {
    const overdueDays = calculateOverdueDays(d.created_at);
    const overdueStatus = getOverdueStatus(d);
    const balance = Math.max(0, (d.amount || 0) - (d.paid || 0));
    
    let overdueDisplay: React.ReactNode = '—';
    if (d.status === 'active') {
      if (overdueStatus === 'overdue') {
        overdueDisplay = (
          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            color: 'var(--destructive)',
            border: '1px solid color-mix(in srgb, var(--destructive) 20%, transparent)'
          }}>
            <IconAlertTriangle className="h-3 w-3" stroke={1.5} />
            {overdueDays} days
          </span>
        );
      } else if (overdueStatus === 'due-soon') {
        overdueDisplay = (
          <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{
            backgroundColor: 'color-mix(in srgb, rgb(251, 146, 60) 10%, transparent)',
            color: 'rgb(251, 146, 60)',
            border: '1px solid color-mix(in srgb, rgb(251, 146, 60) 20%, transparent)'
          }}>
            <IconClock className="h-3 w-3" stroke={1.5} />
            Due soon
          </span>
        );
      } else {
        overdueDisplay = (
          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
            backgroundColor: 'color-mix(in srgb, rgb(34, 197, 94) 10%, transparent)',
            color: 'rgb(34, 197, 94)',
            border: '1px solid color-mix(in srgb, rgb(34, 197, 94) 20%, transparent)'
          }}>
            Current
          </span>
        );
      }
    }
    
    return {
      customer: (
        <div>
          <div className="font-medium text-xs" style={{ color: 'var(--foreground)' }}>
            {(d as any).customer_name || d.customer_id || '—'}
          </div>
          {(d as any).customer_phone && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {(d as any).customer_phone}
            </div>
          )}
        </div>
      ),
      date: (
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {d.created_at ? formatDate?.(d.created_at) || (d.created_at || '').slice(0, 10) : '—'}
        </div>
      ),
      balance: (
        <div className="font-semibold text-xs" style={{ color: 'var(--foreground)' }}>
          {formatCurrency(balance)}
        </div>
      ),
      overdue: overdueDisplay,
      status: (
        <span className={`px-2 py-1 rounded-full text-xs font-medium`} style={{
          backgroundColor: d.status === 'paid' ? 'color-mix(in srgb, rgb(34, 197, 94) 10%, transparent)' : 'color-mix(in srgb, rgb(249, 115, 22) 10%, transparent)',
          color: d.status === 'paid' ? 'rgb(34, 197, 94)' : 'rgb(249, 115, 22)',
          border: `1px solid ${d.status === 'paid' ? 'color-mix(in srgb, rgb(34, 197, 94) 20%, transparent)' : 'color-mix(in srgb, rgb(249, 115, 22) 20%, transparent)'}`
        }}>{d.status === 'paid' ? 'Paid Off' : 'Active'}</span>
      ),
      actions: (
        <div className="flex items-center gap-1">
          {/* Desktop: Show all buttons */}
          <div className="hidden md:flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => navigate(`/credit/${d.id}`)}
              className="p-1.5 h-8 w-8"
              style={{ 
                '--hover-bg': 'color-mix(in srgb, var(--accent) 10%, transparent)'
              } as React.CSSProperties}
              title="View"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            {d.status === 'active' && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowPayDebt(d)}
                className="p-1.5 h-8 w-8"
                title="Record Payment"
              >
                <IconCurrencyDollar className="h-4 w-4" stroke={1.5} />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowHistory(d)}
              className="p-1.5 h-8 w-8"
              title="History"
            >
              <IconClock className="h-4 w-4" stroke={1.5} />
            </Button>
            {d.status === 'paid' && !d.sale_id && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleConvertToSale(d.id)}
                className="p-1.5 h-8 w-8"
                title="Convert to Sale"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={async () => {
                if (confirm('Delete this debt? This cannot be undone.')) {
                  const res = await creditService.deleteDebt(d.id);
                  if (res.success) await refreshDebts();
                }
              }}
              className="p-1.5 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mobile: Dropdown menu */}
          <div className="md:hidden relative action-menu-container">
            <Button 
              size="sm" 
              variant="ghost" 
              className="p-1.5 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setOpenActionMenu(openActionMenu === d.id ? null : d.id);
              }}
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
            {openActionMenu === d.id && (
              <div className="absolute right-0 top-full mt-1 border rounded-lg shadow-lg z-50 min-w-[160px]" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ 
                    color: 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    setOpenActionMenu(null);
                    navigate(`/credit/${d.id}`);
                  }}
                >
                  <EyeIcon className="h-4 w-4" />
                  View
                </button>
                {d.status === 'active' && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                    style={{ 
                      color: 'var(--foreground)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      setOpenActionMenu(null);
                      setShowPayDebt(d);
                    }}
                  >
                    <IconCurrencyDollar className="h-4 w-4" stroke={1.5} />
                    Record Payment
                  </button>
                )}
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ 
                    color: 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    setOpenActionMenu(null);
                    setShowHistory(d);
                  }}
                >
                  <IconClock className="h-4 w-4" stroke={1.5} />
                  History
                </button>
                {d.status === 'paid' && !d.sale_id && (
                  <button
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                    style={{ 
                      color: 'var(--foreground)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      setOpenActionMenu(null);
                      handleConvertToSale(d.id);
                    }}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Convert
                  </button>
                )}
                <button
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ 
                    color: 'var(--destructive)',
                    '--hover-bg': 'color-mix(in srgb, var(--destructive) 10%, transparent)'
                  } as React.CSSProperties & { '--hover-bg': string }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--destructive) 10%, transparent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={async () => {
                    setOpenActionMenu(null);
                    if (confirm('Delete this debt? This cannot be undone.')) {
                      const res = await creditService.deleteDebt(d.id);
                      if (res.success) await refreshDebts();
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )
    };
  }), [filtered, formatCurrency, formatDate, navigate]);

  const handleAddDebt = async () => {
    const amountNum = +newDebt.amount;
    if (!newDebt.customerId || !amountNum) return;
    setLoading(true);
    setError(null);
    try {
      const addRes = await creditService.addDebt({
        customerId: newDebt.customerId,
        amount: amountNum,
        description: newDebt.description,
        items: newDebtItems
      });
      if (!addRes.success) throw new Error(addRes.error || 'Failed to add debt');
      const depositNum = newDebt.deposit ? +newDebt.deposit : 0;
      if (depositNum > 0 && addRes.data?.id) {
        await creditService.addDebtPayment({ debtId: addRes.data.id, amount: depositNum });
      }
      await refreshDebts();
      setShowAddDebt(false);
      setNewDebt({ customerId: '', amount: '', deposit: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setNewDebtItems([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to add debt');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebt = async (debtId: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const payRes = await creditService.addDebtPayment({ debtId, amount });
      if (!payRes.success) throw new Error(payRes.error || 'Failed to record payment');
      await refreshDebts();
      setShowPayDebt(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToSale = async (debtId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await creditService.convertDebtToSale({ debtId, saleId: '' });
      if (!res.success) throw new Error(res.error || 'Failed to convert');
      await refreshDebts();
    } catch (e: any) {
      setError(e?.message || 'Failed to convert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Customer Debts
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-64">
            <Input
              placeholder="Search by customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <select
            className="px-3 py-2 rounded-md border text-sm"
            style={{ 
              background: 'var(--card)', 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)' 
            }}
            value={overdueFilter}
            onChange={(e) => setOverdueFilter(e.target.value as 'all' | 'overdue' | 'due-soon')}
          >
            <option value="all">All Debts</option>
            <option value="overdue">Overdue</option>
            <option value="due-soon">Due Soon</option>
          </select>
          <Button onClick={() => navigate('/credit/new')} disabled={loading} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Debt
          </Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {kpi.overdueCount > 0 && (
        <Alert variant="warning" className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5" stroke={1.5} />
          <div className="flex-1">
            <strong>{kpi.overdueCount} overdue debt{kpi.overdueCount > 1 ? 's' : ''}</strong> totaling {formatCurrency(kpi.overdueAmount)}. 
            Consider following up with these customers.
          </div>
          <Button size="sm" variant="outline" onClick={() => setOverdueFilter('overdue')}>
            View Overdue
          </Button>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Original" 
          value={formatCurrency(kpi.totalOriginal)}
          icon={<IconCurrencyDollar className="h-5 w-5" stroke={1.5} />}
          accentColor="#3b82f6"
        />
        <KPICard 
          title="Total Paid" 
          value={formatCurrency(kpi.totalPaid)}
          icon={<IconWallet className="h-5 w-5" stroke={1.5} />}
          accentColor="#10b981"
        />
        <KPICard 
          title="Outstanding" 
          value={formatCurrency(kpi.outstanding)}
          icon={<IconTrendingUp className="h-5 w-5" stroke={1.5} />}
          accentColor="#f59e0b"
        />
        <KPICard 
          title="Active Debts" 
          value={kpi.activeCount.toString()}
          icon={<IconUsers className="h-5 w-5" stroke={1.5} />}
          accentColor="#8b5cf6"
        />
      </div>
      
      {/* Overdue KPI */}
      {kpi.overdueCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard 
            title="Overdue Debts" 
            value={kpi.overdueCount.toString()}
            icon={<IconAlertTriangle className="h-5 w-5" stroke={1.5} />}
            accentColor="#ef4444"
          />
          <KPICard 
            title="Overdue Amount" 
            value={formatCurrency(kpi.overdueAmount)}
            icon={<IconAlertTriangle className="h-5 w-5" stroke={1.5} />}
            accentColor="#ef4444"
          />
        </div>
      )}

      {/* Table */}
      <PaginatedTableCard 
        title="Debts"
        columns={columns}
        data={tableData}
        itemsPerPage={10}
        loading={loading}
        empty={tableData.length === 0}
        emptyTitle="No debts"
        emptyDescription="Add a new debt to get started"
        headerActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshDebts}>Refresh</Button>
          </div>
        }
      />

      {/* Add Debt Modal */}
      <Modal isOpen={showAddDebt} onClose={() => setShowAddDebt(false)} title="Add Customer Debt" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Customer</label>
            <Button size="sm" variant="outline" onClick={() => setShowCustomerForm(true)}>New Customer</Button>
          </div>
          <Select
            value={newDebt.customerId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewDebt(v => ({ ...v, customerId: e.target.value }))}
            placeholder="Select customer"
            options={[
              { value: '', label: '-- Select --' },
              ...customers.map(c => ({ value: c.id, label: c.name }))
            ]}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Items</label>
            <DebtItemsEditor 
              products={products}
              onAddProduct={() => setShowProductForm(true)}
              onChange={(items, total) => { setNewDebtItems(items.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice }))); setNewDebt(v => ({ ...v, amount: String(total) })); }} 
            />
          </div>

          <Input
            label="Description (Reference)"
            value={newDebt.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDebt(v => ({ ...v, description: e.target.value }))}
            placeholder="Optional reference notes"
          />

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" variant="outline" onClick={() => setShowAddDebt(false)}>Cancel</Button>
            <Button type="button" onClick={handleAddDebt} disabled={loading}>Add Debt</Button>
          </div>
        </div>
      </Modal>

      {/* New Customer Modal */}
      <CustomerForm 
        isOpen={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        onSave={async (payload) => {
          const res = await window.electronAPI.createCustomer(payload);
          if (res.success && res.data) {
            const createdCustomer: any = res.data as any;
            const list = await window.electronAPI.getCustomers();
            if (list.success) setCustomers((list.data || []).map((c: any) => ({ id: c.id, name: c.name, contact: c.phone })));
            if (createdCustomer?.id) setNewDebt(v => ({ ...v, customerId: createdCustomer.id }));
          }
        }}
        title="Add Customer"
      />

      {/* New Product Modal */}
      <ProductForm 
        isOpen={showProductForm}
        onClose={() => setShowProductForm(false)}
        onSave={async (payload) => {
          const res = await window.electronAPI.createProduct(payload);
          if (res.success && res.data) {
            const p = await productService.getAllProducts();
            if (p.success) setProducts(p.data || []);
          }
        }}
        title="Add Product"
      />

      {/* Pay Debt Modal */}
      <Modal isOpen={!!showPayDebt} onClose={() => setShowPayDebt(null)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <Input
            label="Payment Amount"
            type="number"
            min={1}
            max={(showPayDebt?.amount || 0) - (showPayDebt?.paid || 0)}
            autoFocus
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.stopPropagation()}
            id="pay-debt-amount"
            placeholder={`Maximum: ${formatCurrency((showPayDebt?.amount || 0) - (showPayDebt?.paid || 0))}`}
          />
          <div className="flex gap-2 pt-3 border-t justify-end" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" variant="outline" onClick={() => setShowPayDebt(null)}>Cancel</Button>
            <Button type="button" disabled={loading} onClick={() => {
              const amt = +(document.getElementById('pay-debt-amount') as HTMLInputElement)?.value;
              if (amt && amt > 0 && showPayDebt) handlePayDebt(showPayDebt.id, amt);
            }}>Submit Payment</Button>
          </div>
        </div>
      </Modal>

      {/* Payment History Modal */}
      <Modal isOpen={!!showHistory} onClose={() => setShowHistory(null)} title="Payment History" size="md">
        <div className="space-y-4">
          {(showHistory?.payments || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Date</th>
                    <th className="px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Amount</th>
                    <th className="px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {(showHistory?.payments || []).map((pmt: any) => (
                    <tr key={pmt.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{formatDate?.(pmt.date) || (pmt.date || '').slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(pmt.amount || 0)}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{pmt.method || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--muted-foreground)' }}>
              No payments recorded yet
            </div>
          )}
          <div className="flex gap-2 pt-3 border-t justify-end" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" variant="outline" onClick={() => setShowHistory(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      {error && (
        <div className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</div>
      )}
    </div>
  );
}

function DebtItemsEditor({ 
  products = [], 
  onAddProduct,
  onChange 
}: { 
  products?: Product[]; 
  onAddProduct?: () => void;
  onChange: (items: Array<{ productId?: string; productName: string; quantity: number; unitPrice: number }>, total: number) => void 
}) {
  const { formatCurrency } = useSettings();
  const [rows, setRows] = useState<Array<{ productId?: string; productName: string; quantity: number; unitPrice: number }>>([
    { productName: '', quantity: 1, unitPrice: 0 }
  ]);

  const sync = (next: typeof rows) => {
    setRows(next);
    const total = next.reduce((s, r) => s + (Number(r.quantity || 0) * Number(r.unitPrice || 0)), 0);
    onChange(next, total);
  };

  const update = (idx: number, patch: Partial<{ productId?: string; productName: string; quantity: number; unitPrice: number }>) => {
    const next = rows.map((r, i) => i === idx ? { ...r, ...patch } : r);
    // If selecting a product, set name and unitPrice if available
    if (patch.productId) {
      const prod = products.find(p => p.id === patch.productId);
      if (prod) next[idx] = { ...next[idx], productName: prod.name, unitPrice: Number(prod.price || 0) };
    }
    sync(next);
  };

  const addRow = () => sync([...rows, { productName: '', quantity: 1, unitPrice: 0 }]);
  const removeRow = (idx: number) => sync(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="p-3 border rounded-lg" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <Select
                value={row.productId || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update(idx, { productId: e.target.value || undefined })}
                placeholder="Select product"
                options={[
                  { value: '', label: 'Select product…' },
                  ...products.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
            </div>
            <div className="col-span-3">
              <Input
                placeholder="Product name"
                value={row.productName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(idx, { productName: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={row.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(idx, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Unit Price"
                value={row.unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(idx, { unitPrice: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-1">
              <Button variant="outline" size="sm" onClick={() => removeRow(idx)} className="w-full">−</Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>Add Item</Button>
          {onAddProduct && (
            <Button variant="outline" size="sm" onClick={onAddProduct}>New Product</Button>
          )}
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Total: {formatCurrency(rows.reduce((s, r) => s + (Number(r.quantity || 0) * Number(r.unitPrice || 0)), 0))}
        </div>
      </div>
    </div>
  );
}
