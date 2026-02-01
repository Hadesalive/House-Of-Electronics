'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { syncService, SyncStatus, SyncConfig, SyncResult, SyncHealth } from '@/lib/services/sync.service';

interface ConnectionStatus {
  connected: boolean | null; // null = checking, true = connected, false = disconnected
  message?: string;
  lastChecked?: Date;
}

interface SyncContextType {
  // Status
  status: SyncStatus | null;
  config: SyncConfig | null;
  health: SyncHealth | null;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  connectionStatus: ConnectionStatus;

  // Actions
  refreshStatus: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<SyncConfig>) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  syncAll: () => Promise<SyncResult | null>;
  pullChanges: () => Promise<SyncResult | null>;
  clearQueue: (status?: string) => Promise<void>;
  resetFailed: () => Promise<void>;
  testConnection: (testConfig?: Partial<SyncConfig>) => Promise<{ success: boolean; message?: string; error?: string } | null>;
  checkConnectionStatus: () => Promise<void>;

  // Auto-sync
  startAutoSync: (intervalMinutes?: number) => void;
  stopAutoSync: () => void;
  isAutoSyncRunning: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isAutoSyncRunning, setIsAutoSyncRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: null });
  
  // Use refs to avoid dependency issues
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncingRef = useRef(false);
  const configRef = useRef<SyncConfig | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    syncingRef.current = syncing;
  }, [syncing]);
  
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Refresh sync status
  const refreshStatus = useCallback(async () => {
    try {
      const response = await syncService.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to get sync status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Refresh sync health
  const refreshHealth = useCallback(async () => {
    try {
      const response = await syncService.getHealth();
      if (response.success && response.data) {
        setHealth(response.data);
      }
    } catch (err) {
      console.error('Failed to get sync health:', err);
    }
  }, []);

  // Refresh sync config
  const refreshConfig = useCallback(async () => {
    try {
      const response = await syncService.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to get sync config');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Update sync config
  const updateConfig = useCallback(async (updates: Partial<SyncConfig>) => {
    try {
      setLoading(true);
      const response = await syncService.updateConfig(updates);
      if (response.success && response.data) {
        setConfig(response.data);
        await refreshStatus();
        setError(null);
      } else {
        setError(response.error || 'Failed to update sync config');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  // Sync all pending changes
  const syncAll = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setSyncing(true);
      setError(null);
      const response = await syncService.syncAll();
      if (response.success && response.data) {
        await refreshStatus();
        return response.data;
      } else {
        setError(response.error || 'Sync failed');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [refreshStatus]);

  // Pull changes from cloud
  const pullChanges = useCallback(async (): Promise<SyncResult | null> => {
    try {
      setSyncing(true);
      setError(null);
      const response = await syncService.pullChanges();
      if (response.success && response.data) {
        await refreshStatus();
        return response.data;
      } else {
        setError(response.error || 'Pull failed');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [refreshStatus]);

  // Stop auto-sync
  const stopAutoSync = useCallback(() => {
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
      setIsAutoSyncRunning(false);
    }
  }, []);

  // Start auto-sync
  const startAutoSync = useCallback((intervalMinutes: number = 5) => {
    // Clear any existing interval
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const interval = setInterval(async () => {
      // Use refs to avoid stale closures
      if (syncingRef.current) return; // Skip if already syncing
      
      const currentConfig = configRef.current;
      if (!currentConfig?.sync_enabled) {
        stopAutoSync();
        return;
      }

      // Fetch fresh status
      const freshStatus = await syncService.getStatus();
      if (freshStatus.success && freshStatus.data?.enabled && !syncingRef.current) {
        // Push changes first, then pull
        try {
          await syncService.syncAll();
          await syncService.pullChanges();
          // Refresh status after sync
          const statusResponse = await syncService.getStatus();
          if (statusResponse.success && statusResponse.data) {
            setStatus(statusResponse.data);
          }
        } catch (err) {
          console.error('Auto-sync error:', err);
        }
      }
    }, intervalMs);

    autoSyncIntervalRef.current = interval;
    setIsAutoSyncRunning(true);
  }, [stopAutoSync]);

  // Enable/disable sync
  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      console.log('[SyncContext] setEnabled called with:', enabled);
      setLoading(true);
      const response = await syncService.setEnabled(enabled);
      console.log('[SyncContext] setEnabled response:', response);
      
      if (response.success && response.data) {
        setConfig(response.data);
        await refreshStatus();
        setError(null);
        
        // Start/stop auto-sync
        if (enabled) {
          const interval = response.data.sync_interval_minutes || 5;
          console.log('[SyncContext] Starting auto-sync with interval:', interval);
          startAutoSync(interval);
        } else {
          console.log('[SyncContext] Stopping auto-sync');
          stopAutoSync();
        }
      } else {
        const errorMsg = response.error || 'Failed to update sync status';
        console.error('[SyncContext] setEnabled failed:', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SyncContext] setEnabled error:', errorMsg, err);
      setError(errorMsg);
      throw err; // Re-throw so caller can handle it
    } finally {
      setLoading(false);
    }
  }, [refreshStatus, startAutoSync, stopAutoSync]);

  // Clear sync queue
  const clearQueue = useCallback(async (status?: string) => {
    try {
      await syncService.clearQueue(status);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [refreshStatus]);

  // Reset failed items
  const resetFailed = useCallback(async () => {
    try {
      await syncService.resetFailed();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [refreshStatus]);

  // Test connection
  const testConnection = useCallback(async (testConfig?: Partial<SyncConfig>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await syncService.testConnection(testConfig);
      if (response.success) {
        return { success: true, message: response.data?.message || 'Connection successful' };
      } else {
        setError(response.error || 'Connection failed');
        return { success: false, error: response.error || 'Connection failed', message: response.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Check connection status automatically
  const checkConnectionStatus = useCallback(async () => {
    const currentConfig = configRef.current;
    
    // Only check if sync is enabled and credentials are set
    if (!currentConfig?.sync_enabled || !currentConfig?.cloud_url || !currentConfig?.api_key) {
      setConnectionStatus({ 
        connected: false, 
        message: 'Sync not configured',
        lastChecked: new Date()
      });
      return;
    }

    // Set checking state
    setConnectionStatus(prev => ({ ...prev, connected: null }));

    try {
      const result = await testConnection({
        cloud_url: currentConfig.cloud_url,
        api_key: currentConfig.api_key,
        cloud_provider: currentConfig.cloud_provider
      });

      setConnectionStatus({
        connected: result?.success || false,
        message: result?.success ? 'Connected' : (result?.message || result?.error || 'Connection failed'),
        lastChecked: new Date()
      });
    } catch (err) {
      setConnectionStatus({
        connected: false,
        message: err instanceof Error ? err.message : 'Network error',
        lastChecked: new Date()
      });
    }
  }, [testConnection]);


  // Initial load
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      await Promise.all([refreshStatus(), refreshConfig(), refreshHealth()]);
      if (mounted) {
        setLoading(false);
      }
    };

    loadData();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Start auto-sync if enabled
  useEffect(() => {
    // Only manage auto-sync based on config changes, not function changes
    if (config?.sync_enabled && config.sync_interval_minutes) {
      startAutoSync(config.sync_interval_minutes);
    } else {
      stopAutoSync();
    }

    return () => {
      stopAutoSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.sync_enabled, config?.sync_interval_minutes]); // Only depend on config values

  // Auto-check connection status when sync is enabled and credentials are available
  useEffect(() => {
    // Clear any existing interval
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
      connectionCheckIntervalRef.current = null;
    }

    // Check immediately if sync is enabled and configured
    if (config?.sync_enabled && config?.cloud_url && config?.api_key) {
      checkConnectionStatus();
      
      // Then check every 30 seconds
      connectionCheckIntervalRef.current = setInterval(() => {
        checkConnectionStatus();
      }, 30000); // Check every 30 seconds
    } else {
      // Clear status if sync is disabled or not configured
      setConnectionStatus({ 
        connected: false, 
        message: config?.sync_enabled ? 'Missing credentials' : 'Sync disabled',
        lastChecked: new Date()
      });
    }

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
        connectionCheckIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.sync_enabled, config?.cloud_url, config?.api_key]); // Check when config changes

  // Refresh health when status changes
  useEffect(() => {
    if (status) {
      refreshHealth();
    }
  }, [status, refreshHealth]);

  const contextValue: SyncContextType = {
    status,
    config,
    health,
    loading,
    error,
    syncing,
    connectionStatus,
    refreshStatus,
    refreshHealth,
    refreshConfig,
    updateConfig,
    setEnabled,
    syncAll,
    pullChanges,
    clearQueue,
    resetFailed,
    testConnection,
    checkConnectionStatus,
    startAutoSync,
    stopAutoSync,
    isAutoSyncRunning
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};
