import React, { useEffect, useState, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import { useParams, useNavigate } from 'react-router-dom';
import { creditService, DebtRecord } from '@/lib/services/credit.service';
import { Modal } from '@/components/ui/core/modal';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  CurrencyDollarIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui/core';

export default function CreditDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  const [debt, setDebt] = useState<DebtRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await creditService.getAllDebts();
      if (res.success) {
        const found = (res.data || []).find(d => d.id === id) || null;
        setDebt(found || null);
      } else {
        setError(res.error || 'Failed to load debt');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const balance = useMemo(() => Math.max(0, (debt?.amount || 0) - (debt?.paid || 0)), [debt]);

  // Calculate overdue days (assuming 30 days default payment period)
  const calculateOverdueDays = (createdAt: string): number => {
    const createdDate = new Date(createdAt);
    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment period
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getOverdueStatus = (debt: DebtRecord | null): 'current' | 'due-soon' | 'overdue' => {
    if (!debt || debt.status === 'paid') return 'current';
    const overdueDays = calculateOverdueDays(debt.created_at);
    if (overdueDays === 0) return 'current';
    if (overdueDays <= 7) return 'due-soon';
    return 'overdue';
  };

  const overdueDays = debt ? calculateOverdueDays(debt.created_at) : 0;
  const overdueStatus = getOverdueStatus(debt);

  // All hooks must be called before any early returns
  const items = useMemo(() => {
    if (!debt) return [];
    try {
      return typeof (debt as any).items === 'string' 
        ? JSON.parse((debt as any).items as any) 
        : ((debt as any).items || []);
    } catch {
      return [];
    }
  }, [debt]);

  // Payment history table configuration
  const paymentColumns = useMemo(() => [
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Payment Method' },
  ], []);

  const paymentTableData = useMemo(() => {
    if (!debt || !debt.payments) return [];
    try {
      return (debt.payments || []).map((p: any) => ({
        date: (
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>
            {formatDate?.(p.date) || (p.date || '').slice(0, 10)}
          </div>
        ),
        amount: (
          <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {formatCurrency(p.amount || 0)}
          </div>
        ),
        method: (
          <div className="text-sm" style={{ color: 'var(--foreground)' }}>
            {p.method || '—'}
          </div>
        ),
      }));
    } catch {
      return [];
    }
  }, [debt, formatDate, formatCurrency]);

  const recordPayment = async () => {
    const input = document.getElementById('detail-pay-amount') as HTMLInputElement | null;
    const amt = input ? parseFloat(input.value) : 0;
    if (!id || !amt || amt <= 0) return;
    try {
      const res = await creditService.addDebtPayment({ debtId: id, amount: amt });
      if (res.success) {
        setToast({ message: 'Payment recorded', type: 'success' });
        setShowPay(false);
        await load();
      } else {
        setToast({ message: res.error || 'Failed to record payment', type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Failed to record payment', type: 'error' });
    }
  };

  const convertIfEligible = async () => {
    if (!id) return;
    try {
      const res = await creditService.convertDebtToSale({ debtId: id });
      if (res.success) {
        setToast({ message: 'Debt converted to sale', type: 'success' });
        await load();
        // If backend linked a sale, navigate to it
        const updated = res.data as any;
        if (updated?.sale_id) {
          navigate(`/sales/${updated.sale_id}`);
        }
      } else {
        setToast({ message: res.error || 'Failed to convert', type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Failed to convert', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading debt details...</p>
        </div>
      </div>
    );
  }

  if (error || !debt) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/credit')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Debts
          </Button>
        </div>
        <Alert variant="error" title="Error">
          {error || 'Debt not found'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/credit')}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Debts
        </Button>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {balance > 0 && (
            <Button onClick={() => setShowPay(true)} className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          {debt.status === 'paid' && !(debt as any).sale_id && (
            <Button variant="outline" onClick={convertIfEligible}>Convert to Sale</Button>
          )}
          <Button 
            variant="outline" 
            onClick={async () => {
              if (confirm('Delete this debt? This cannot be undone.')) {
                const res = await creditService.deleteDebt(debt.id);
                if (res.success) navigate('/credit');
              }
            }}
            className="flex items-center gap-2"
            style={{ color: 'var(--destructive)' }}
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Debt Info */}
      <div
        className="rounded-xl border bg-[color:var(--card)]/90 shadow-sm backdrop-blur-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                {debt.status === 'paid' ? (
                  <CheckCircleIcon className="h-7 w-7" />
                ) : (
                  <CurrencyDollarIcon className="h-7 w-7" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                <span
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  Debt
                </span>
                <span
                  className="px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: debt.status === 'paid' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
                    color: debt.status === 'paid' ? 'rgb(34,197,94)' : 'rgb(249,115,22)',
                    border: `1px solid ${debt.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)'}`
                  }}
                >
                  {debt.status === 'paid' ? 'Paid off' : 'Active'}
                </span>
                {overdueStatus !== 'current' && (
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: overdueStatus === 'overdue' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                      color: overdueStatus === 'overdue' ? 'rgb(239,68,68)' : 'rgb(249,115,22)',
                      border: `1px solid ${overdueStatus === 'overdue' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)'}`
                    }}
                  >
                    {overdueStatus === 'overdue' ? `${overdueDays} days overdue` : 'Due soon'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                  Debt #{debt.id ? debt.id.substring(0, 8).toUpperCase() : 'N/A'}
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {formatDate?.(debt.created_at) || (debt.created_at || '').slice(0, 10)} · {(debt as any).customer_name || debt.customer_id || '—'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {(debt as any).customer_name || debt.customer_id || '—'}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <CurrencyDollarIcon className="h-3.5 w-3.5" />
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Balance: {formatCurrency(balance)}</span>
                </div>
                {overdueStatus !== 'current' && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <ExclamationTriangleIcon
                        className="h-3.5 w-3.5"
                        style={{ color: overdueStatus === 'overdue' ? 'rgb(239, 68, 68)' : 'rgb(249, 115, 22)' }}
                      />
                      <span>{overdueStatus === 'overdue' ? `${overdueDays} days overdue` : 'Due soon'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {debt && debt.status === 'active' && overdueStatus === 'overdue' && (
        <Alert variant="warning" className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <div className="flex-1">
            <strong>This debt is {overdueDays} days overdue.</strong> Consider following up with the customer to collect payment.
          </div>
        </Alert>
      )}

      {debt && debt.status === 'active' && overdueStatus === 'due-soon' && (
        <Alert variant="info" className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          <div className="flex-1">
            <strong>This debt is due soon.</strong> Payment is expected within the next {7 - overdueDays} days.
          </div>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Original Amount" 
          value={formatCurrency(debt.amount || 0)}
          accentColor="#3b82f6"
        />
        <KPICard 
          title="Amount Paid" 
          value={formatCurrency(debt.paid || 0)}
          accentColor="#22c55e"
        />
        <KPICard 
          title="Outstanding Balance" 
          value={formatCurrency(balance)}
          icon={overdueStatus === 'overdue' ? (
            <ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--destructive)' }} />
          ) : overdueStatus === 'due-soon' ? (
            <ClockIcon className="h-6 w-6" style={{ color: 'rgb(251, 146, 60)' }} />
          ) : undefined}
          accentColor={
            overdueStatus === 'overdue' ? "#ef4444" :
            overdueStatus === 'due-soon' ? "#f59e0b" :
            "#3b82f6"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Customer / Payments */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer Card */}
          <div 
            className="p-4 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <h2 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <UserIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-[11px] mb-1" style={{ color: 'var(--muted-foreground)' }}>Name</p>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {(debt as any).customer_name || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</p>
                <p style={{ color: 'var(--foreground)' }}>
                  {(debt as any).customer_phone || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <PaginatedTableCard
            title="Payments"
            columns={paymentColumns}
            data={paymentTableData}
            itemsPerPage={5}
            empty={paymentTableData.length === 0}
            emptyTitle="No payments recorded"
            emptyDescription="Record a payment to get started"
            headerActions={
              balance > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setShowPay(true)}>
                  Record
                </Button>
              ) : undefined
            }
          />

          <div 
            className="p-4 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Description
            </h3>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{debt.description || 'No description provided'}</p>
          </div>
        </div>

        {/* Main - Items */}
        <div className="lg:col-span-3 space-y-4">
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="p-4 text-sm font-semibold flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <DocumentTextIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              Items
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="px-5 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Product</th>
                    <th className="px-5 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Qty</th>
                    <th className="px-5 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Unit Price</th>
                    <th className="px-5 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).length > 0 ? (
                    (items || []).map((it: any, idx: number) => (
                      <tr key={idx} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-5 py-3" style={{ color: 'var(--foreground)' }}>{it.productName || it.name || '—'}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--foreground)' }}>{it.quantity || 0}</td>
                        <td className="px-5 py-3" style={{ color: 'var(--foreground)' }}>{formatCurrency(it.unitPrice || 0)}</td>
                        <td className="px-5 py-3 font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency((Number(it.quantity || 0) * Number(it.unitPrice || 0)))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
                        No items recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showPay} onClose={() => setShowPay(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <Input
            id="detail-pay-amount"
            label="Payment Amount"
            type="number"
            min={1}
            max={balance}
            placeholder={`Maximum: ${formatCurrency(balance)}`}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowPay(false)}>Cancel</Button>
            <Button onClick={recordPayment}>Record Payment</Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast title={toast.message} variant={toast.type} onClose={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
    </div>
  );
}
