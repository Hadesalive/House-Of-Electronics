'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { syncService } from '@/lib/services/sync.service';
import { Button, Toast } from '@/components/ui/core';
import { Select } from '@/components/ui/forms';
import { KPICard, PaginatedTableCard } from '@/components/ui/dashboard';
import {
  IconRefresh,
  IconCloudUpload,
  IconCloudDownload,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconX,
  IconTrash,
  IconRotateClockwise,
  IconDatabase,
  IconAlertTriangle,
  IconInfoCircle
} from '@tabler/icons-react';

interface QueueItem {
  id: number;
  table_name: string;
  record_id: string;
  change_type: 'create' | 'update' | 'delete';
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message?: string;
  retry_count: number;
  created_at: string;
  synced_at?: string;
  data?: any;
}

export default function SyncPage() {
  const { 
    status, 
    config,
    health,
    connectionStatus,
    syncing,
    syncAll, 
    pullChanges, 
    refreshStatus,
    refreshHealth,
    resetFailed,
    clearQueue
  } = useSync();

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'incoming' | 'conflicts'>('queue');

  const loadQueueItems = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const options: any = { limit: 100 };
      if (statusFilter !== 'all') {
        options.status = statusFilter;
      }
      const response = await syncService.getQueue(options);
      if (response.success && response.data) {
        // Only update state if data changed (reduce flashing)
        setQueueItems(prev => {
          const prevSerialized = JSON.stringify(prev.map(i => ({ id: i.id, status: i.sync_status, retry: i.retry_count, err: i.error_message })));
          const nextSerialized = JSON.stringify(response.data.map((i: QueueItem) => ({ id: i.id, status: i.sync_status, retry: i.retry_count, err: i.error_message })));
          if (prevSerialized === nextSerialized) return prev;
          return response.data;
        });
      }
    } catch (err) {
      console.error('Failed to load queue items:', err);
      setToast({ message: 'Failed to load queue items', type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadQueueItems();
  }, [loadQueueItems]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadQueueItems(true); // silent refresh to avoid UI flashing
      refreshStatus();
      refreshHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadQueueItems, refreshStatus, refreshHealth]);

  const handleSyncNow = async () => {
    try {
      await syncAll();
      setToast({ message: 'Sync completed', type: 'success' });
      setTimeout(() => loadQueueItems(), 1000);
    } catch (err) {
      setToast({ message: 'Sync failed', type: 'error' });
    }
  };

  const handlePullChanges = async () => {
    try {
      await pullChanges();
      setToast({ message: 'Changes pulled successfully', type: 'success' });
      setTimeout(() => loadQueueItems(), 1000);
    } catch (err) {
      setToast({ message: 'Failed to pull changes', type: 'error' });
    }
  };

  const handleResetFailed = async () => {
    try {
      await resetFailed();
      setToast({ message: 'Failed items reset', type: 'success' });
      setTimeout(() => loadQueueItems(), 1000);
    } catch (err) {
      setToast({ message: 'Failed to reset items', type: 'error' });
    }
  };

  const handleClearQueue = async (status?: string) => {
    try {
      await clearQueue(status);
      setToast({ message: `Queue cleared${status ? ` (${status})` : ''}`, type: 'success' });
      setTimeout(() => loadQueueItems(), 1000);
    } catch (err) {
      setToast({ message: 'Failed to clear queue', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      syncing: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      synced: 'bg-green-500/20 text-green-600 dark:text-green-400',
      error: 'bg-red-500/20 text-red-600 dark:text-red-400'
    };

    const icons = {
      pending: <IconClock className="w-4 h-4" />,
      syncing: <IconRefresh className="w-4 h-4 animate-spin" />,
      synced: <IconCheck className="w-4 h-4" />,
      error: <IconAlertCircle className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${styles[status as keyof typeof styles] || ''}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getChangeTypeBadge = (type: string) => {
    const styles = {
      create: 'bg-green-500/20 text-green-600 dark:text-green-400',
      update: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      delete: 'bg-red-500/20 text-red-600 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${styles[type as keyof typeof styles] || ''}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const pendingCount = queueItems.filter(item => item.sync_status === 'pending').length;
  const syncingCount = queueItems.filter(item => item.sync_status === 'syncing').length;
  const syncedCount = queueItems.filter(item => item.sync_status === 'synced').length;
  const errorCount = queueItems.filter(item => item.sync_status === 'error').length;
  const incomingItems = queueItems.filter(item => item.change_type === 'create' || item.change_type === 'update');
  const conflictItems = queueItems.filter(item => item.sync_status === 'error');

  // Get health status badge
  const getHealthBadge = () => {
    if (!health) return null;

    const statusConfig = {
      healthy: {
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-500/20',
        icon: IconCheck,
        label: 'Healthy'
      },
      warning: {
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-500/20',
        icon: IconAlertTriangle,
        label: 'Warning'
      },
      critical: {
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/20',
        icon: IconAlertCircle,
        label: 'Critical'
      }
    };

    const config = statusConfig[health.status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${config.bg} ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-6 space-y-6" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                Sync Management
              </h1>
              {getHealthBadge()}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Monitor and manage cloud synchronization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoRefresh(!autoRefresh);
              if (!autoRefresh) {
                loadQueueItems();
                refreshStatus();
              }
            }}
            className="flex items-center gap-2"
          >
            <IconRefresh className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadQueueItems();
              refreshStatus();
            }}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Alerts */}
      {health && (health.status === 'warning' || health.status === 'critical') && (
        <div className={`p-4 rounded-lg border ${
          health.status === 'critical' 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-start gap-3">
            {health.status === 'critical' ? (
              <IconAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <IconAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                health.status === 'critical' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                Sync Health: {health.status === 'critical' ? 'Critical Issues Detected' : 'Warnings'}
              </h3>
              {health.alerts.length > 0 && (
                <ul className="list-disc list-inside space-y-1 mb-2" style={{ color: 'var(--foreground)' }}>
                  {health.alerts.map((alert, idx) => (
                    <li key={idx} className="text-sm">{alert}</li>
                  ))}
                </ul>
              )}
              {health.warnings.length > 0 && (
                <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--foreground)' }}>
                  {health.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">{warning}</li>
                  ))}
                </ul>
              )}
              {health.metrics && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span style={{ color: 'var(--muted-foreground)' }}>Error Rate: </span>
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                        {health.metrics.errorRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--muted-foreground)' }}>Stuck Items: </span>
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                        {health.metrics.stuck}
                      </span>
                    </div>
                    {health.metrics.lastSyncAgeMinutes !== null && (
                      <div>
                        <span style={{ color: 'var(--muted-foreground)' }}>Last Sync: </span>
                        <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                          {health.metrics.lastSyncAgeMinutes}m ago
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--muted-foreground)' }}>Recent Errors: </span>
                      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                        {health.metrics.recentErrors}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <KPICard
          title="Connection"
          value={connectionStatus.connected === true 
            ? 'Connected' 
            : connectionStatus.connected === false 
              ? 'Disconnected' 
              : 'Checking...'}
          icon={<IconDatabase className="h-6 w-6" stroke={1.5} />}
          accentColor={connectionStatus.connected === true 
            ? '#10b981' 
            : connectionStatus.connected === false 
              ? '#ef4444' 
              : '#f59e0b'}
          loading={connectionStatus.connected === null}
        />

        {/* Pending */}
        <KPICard
          title="Pending"
          value={status?.pending || 0}
          icon={<IconClock className="h-6 w-6" stroke={1.5} />}
          accentColor="#f59e0b"
          loading={loading}
        />

        {/* Errors */}
        <KPICard
          title="Errors"
          value={status?.errors || 0}
          icon={<IconAlertCircle className="h-6 w-6" stroke={1.5} />}
          accentColor="#ef4444"
          loading={loading}
        />

        {/* Last Sync */}
        <KPICard
          title="Last Sync"
          value={status?.lastSyncAt 
            ? formatTimeAgo(status.lastSyncAt) 
            : 'Never'}
          icon={<IconCheck className="h-6 w-6" stroke={1.5} />}
          accentColor="#10b981"
          loading={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 p-4 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <Button
          variant="default"
          size="sm"
          onClick={handleSyncNow}
          disabled={syncing || !config?.sync_enabled}
          className="flex items-center gap-2"
        >
          <IconCloudUpload className="w-4 h-4" />
          Sync Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePullChanges}
          disabled={syncing || !config?.sync_enabled}
          className="flex items-center gap-2"
        >
          <IconCloudDownload className="w-4 h-4" />
          Pull Changes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetFailed}
          disabled={syncing || errorCount === 0}
          className="flex items-center gap-2"
        >
          <IconRotateClockwise className="w-4 h-4" />
          Reset Failed ({errorCount})
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleClearQueue('synced')}
          disabled={syncedCount === 0}
          className="flex items-center gap-2 text-red-600 dark:text-red-400"
        >
          <IconTrash className="w-4 h-4" />
          Clear Synced
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'queue', label: 'Queue' },
          { id: 'incoming', label: 'Incoming' },
          { id: 'conflicts', label: 'Conflicts' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-blue-500' : 'border-transparent'
            }`}
            style={{ color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      {activeTab === 'queue' && (
        <PaginatedTableCard
          title="Sync Queue"
          columns={[
            { key: 'id', label: 'ID', sortable: true },
            { key: 'table_name', label: 'Table', sortable: true },
            { key: 'record_id', label: 'Record ID', sortable: true, className: 'font-mono' },
            { key: 'change_type', label: 'Type', sortable: true },
            { key: 'sync_status', label: 'Status', sortable: true },
            { key: 'retry_count', label: 'Retries', sortable: true },
            { key: 'created_at', label: 'Created', sortable: true },
            { key: 'synced_at', label: 'Synced', sortable: true },
            { key: 'error_message', label: 'Error', sortable: false }
          ]}
          data={queueItems.map((item) => ({
            id: `#${item.id}`,
            table_name: item.table_name,
            record_id: <span style={{ color: 'var(--muted-foreground)' }}>{item.record_id}</span>,
            change_type: getChangeTypeBadge(item.change_type),
            sync_status: getStatusBadge(item.sync_status),
            retry_count: item.retry_count,
            created_at: formatTimeAgo(item.created_at),
            synced_at: item.synced_at ? formatTimeAgo(item.synced_at) : <span style={{ color: 'var(--muted-foreground)' }}>-</span>,
            error_message: item.error_message ? (
              <span className="text-red-600 dark:text-red-400" title={item.error_message}>
                {item.error_message.length > 50 
                  ? `${item.error_message.substring(0, 50)}...` 
                  : item.error_message}
              </span>
            ) : (
              <span style={{ color: 'var(--muted-foreground)' }}>-</span>
            )
          }))}
          itemsPerPage={10}
          loading={loading}
          empty={queueItems.length === 0}
          emptyTitle="No queue items found"
          emptyDescription="All items have been synced successfully"
          headerActions={
            <div className="flex items-center gap-4">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'syncing', label: 'Syncing' },
                  { value: 'synced', label: 'Synced' },
                  { value: 'error', label: 'Error' }
                ]}
                className="w-48"
              />
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>Pending: <strong style={{ color: 'var(--foreground)' }}>{pendingCount}</strong></span>
                <span>Syncing: <strong style={{ color: 'var(--foreground)' }}>{syncingCount}</strong></span>
                <span>Synced: <strong style={{ color: 'var(--foreground)' }}>{syncedCount}</strong></span>
                <span>Errors: <strong className="text-red-600 dark:text-red-400">{errorCount}</strong></span>
              </div>
            </div>
          }
        />
      )}

      {/* Incoming Changes */}
      {activeTab === 'incoming' && (
        <PaginatedTableCard
          title="Incoming Changes"
          columns={[
            { key: 'id', label: 'ID', sortable: true },
            { key: 'table_name', label: 'Table', sortable: true },
            { key: 'record_id', label: 'Record ID', sortable: true, className: 'font-mono' },
            { key: 'change_type', label: 'Type', sortable: true },
            { key: 'created_at', label: 'Created', sortable: true }
          ]}
          data={incomingItems.map(item => ({
            id: `#${item.id}`,
            table_name: item.table_name,
            record_id: <span style={{ color: 'var(--muted-foreground)' }}>{item.record_id}</span>,
            change_type: getChangeTypeBadge(item.change_type),
            created_at: formatTimeAgo(item.created_at)
          }))}
          itemsPerPage={10}
          loading={loading}
          empty={incomingItems.length === 0}
          emptyTitle="No incoming changes"
          emptyDescription="No new changes detected from cloud"
        />
      )}

      {/* Conflicts / Manual Resolution */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <IconAlertTriangle className="w-5 h-5 text-yellow-600" />
            <div className="text-sm" style={{ color: 'var(--foreground)' }}>
              These items failed to sync. Choose a resolution and retry.
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFailed}
              disabled={conflictItems.length === 0}
              className="flex items-center gap-2"
            >
              <IconRotateClockwise className="w-4 h-4" />
              Retry All Failed
            </Button>
          </div>
          <PaginatedTableCard
            title="Conflicts / Errors"
            columns={[
              { key: 'id', label: 'ID', sortable: true },
              { key: 'table_name', label: 'Table', sortable: true },
              { key: 'record_id', label: 'Record ID', sortable: true, className: 'font-mono' },
              { key: 'change_type', label: 'Type', sortable: true },
              { key: 'error_message', label: 'Error', sortable: false },
              { key: 'retry_count', label: 'Retries', sortable: true },
              { key: 'created_at', label: 'Created', sortable: true }
            ]}
            data={conflictItems.map(item => ({
              id: `#${item.id}`,
              table_name: item.table_name,
              record_id: <span style={{ color: 'var(--muted-foreground)' }}>{item.record_id}</span>,
              change_type: getChangeTypeBadge(item.change_type),
              error_message: item.error_message ? (
                <span className="text-red-600 dark:text-red-400" title={item.error_message}>
                  {item.error_message.length > 80 ? `${item.error_message.substring(0, 80)}...` : item.error_message}
                </span>
              ) : (
                <span style={{ color: 'var(--muted-foreground)' }}>-</span>
              ),
              retry_count: item.retry_count,
              created_at: formatTimeAgo(item.created_at)
            }))}
            itemsPerPage={10}
            loading={loading}
            empty={conflictItems.length === 0}
            emptyTitle="No conflicts"
            emptyDescription="No failed sync items"
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}
