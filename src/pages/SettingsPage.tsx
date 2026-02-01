import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Alert, Toast } from '@/components/ui/core';
import { Input, Textarea, Select, Switch } from '@/components/ui/forms';
import { CompanySettings } from '@/lib/types/core';
import { settingsService } from '@/lib/services';
import { useSync } from '@/contexts/SyncContext';
import { BackupManager } from '@/components/ui/backup/BackupManager';
import { SyncStatus } from '@/components/ui/sync-status';
import { CurrencySettings } from '@/components/ui/settings/currency-settings';
import {
  IconRefresh,
  IconDownload,
  IconUpload,
  IconCheck,
  IconDatabase,
  IconSettings,
  IconBuilding,
  IconBusinessplan,
  IconCloud,
  IconDatabaseExport,
  IconCurrencyDollar
} from '@tabler/icons-react';

interface Preferences {
  defaultPaymentMethod: string;
  invoiceNumberFormat: string;
  receiptFooter: string;
  autoCalculateTax: boolean;
  showTaxBreakdown: boolean;
  printReceipts: boolean;
  autoBackup: boolean;
  backupFrequency: string;
}

const CURRENCIES = [
  { value: 'NLe', label: 'NLe - New Leones', symbol: 'NLe ' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'CHF' },
  { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { value: 'BRL', label: 'BRL - Brazilian Real', symbol: 'R$' },
];

function SettingsContent() {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0.15,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [resettingActivation, setResettingActivation] = useState(false);

  const { 
    config: syncConfig, 
    status: syncStatus, 
    loading: syncLoading,
    connectionStatus,
    updateConfig: updateSyncConfig,
    setEnabled: setSyncEnabled,
    syncAll,
    testConnection,
    checkConnectionStatus
  } = useSync();
  
  const [preferences, setPreferences] = useState<Preferences>({
    defaultPaymentMethod: 'cash',
    invoiceNumberFormat: 'INV-{YYYY}-{MM}-{####}',
    receiptFooter: 'Thank you for your business!',
    autoCalculateTax: true,
    showTaxBreakdown: true,
    printReceipts: true,
    autoBackup: true,
    backupFrequency: 'daily',
  });

  const [syncFormData, setSyncFormData] = useState({
    cloud_provider: 'supabase',
    cloud_url: '',
    api_key: '',
    sync_interval_minutes: 5,
    conflict_resolution_strategy: 'server_wins' as 'server_wins' | 'client_wins' | 'manual'
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'currency' | 'sync' | 'backup'>('general');

  const loadSettings = useCallback(async () => {
    try {
      const response = await settingsService.getCompanySettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToastNotification('Failed to load settings', 'error');
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await settingsService.getPreferences();
      if (response.success && response.data) {
        const prefs = response.data as any;
        setPreferences({
          defaultPaymentMethod: prefs.defaultPaymentMethod || 'cash',
          invoiceNumberFormat: prefs.invoiceNumberFormat || 'INV-{YYYY}-{MM}-{####}',
          receiptFooter: prefs.receiptFooter || 'Thank you for your business!',
          autoCalculateTax: prefs.autoCalculateTax !== false,
          showTaxBreakdown: prefs.showTaxBreakdown !== false,
          printReceipts: prefs.printReceipts !== false,
          autoBackup: prefs.autoBackup !== false,
          backupFrequency: prefs.backupFrequency || 'daily',
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      showToastNotification('Failed to load preferences', 'error');
    }
  }, []);

  useEffect(() => {
    if (syncConfig) {
      setSyncFormData(prev => {
        const newData = {
          cloud_provider: syncConfig.cloud_provider || 'supabase',
          cloud_url: syncConfig.cloud_url || '',
          // Only update API key if it's a real value (not masked placeholder)
          // If we already have a real key in form, keep it unless new one is also real
          api_key: (syncConfig.api_key && syncConfig.api_key !== '***' && syncConfig.api_key.length > 10) 
            ? syncConfig.api_key 
            : (prev.api_key && prev.api_key !== '***' && prev.api_key.length > 10)
              ? prev.api_key  // Keep existing real key if new one is masked/empty
              : '',
          sync_interval_minutes: syncConfig.sync_interval_minutes || 5,
          conflict_resolution_strategy: syncConfig.conflict_resolution_strategy || 'server_wins'
        };
        // Only update if values actually changed
        if (
          prev.cloud_provider !== newData.cloud_provider ||
          prev.cloud_url !== newData.cloud_url ||
          (newData.api_key && prev.api_key !== newData.api_key) ||
          prev.sync_interval_minutes !== newData.sync_interval_minutes ||
          prev.conflict_resolution_strategy !== newData.conflict_resolution_strategy
        ) {
          return newData;
        }
        return prev;
      });
    }
  }, [
    syncConfig?.cloud_provider,
    syncConfig?.cloud_url,
    syncConfig?.api_key,
    syncConfig?.sync_interval_minutes,
    syncConfig?.conflict_resolution_strategy
  ]);

  useEffect(() => {
    loadSettings();
    loadPreferences();
  }, [loadSettings, loadPreferences]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!settings.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (settings.taxRate < 0 || settings.taxRate > 1) {
      newErrors.taxRate = 'Tax rate must be between 0% and 100%';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToastNotification = (message: string, variant: 'success' | 'error') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    if (!validateForm()) return;

        setLoading(true);
        try {
          const [settingsResponse, preferencesResponse] = await Promise.all([
            settingsService.updateCompanySettings(settings),
            settingsService.updatePreferences(preferences)
          ]);
          
          if (settingsResponse.success && preferencesResponse.success) {
            showToastNotification('Settings saved successfully!', 'success');
        if (settingsResponse.data) setSettings(settingsResponse.data);
        if (preferencesResponse.data) setPreferences(preferencesResponse.data as Preferences);
          } else {
        const errorMessage = settingsResponse.error || preferencesResponse.error || 'Failed to update settings.';
            showToastNotification(errorMessage, 'error');
          }
        } catch (error) {
          console.error('Failed to update settings:', error);
      showToastNotification('Failed to update settings.', 'error');
        } finally {
          setLoading(false);
        }
      };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateSyncConfig(syncFormData);
      showToastNotification('Sync settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to update sync settings:', error);
      showToastNotification('Failed to update sync settings.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSyncNow = async () => {
    try {
      setLoading(true);
      const result = await syncAll();
      if (result?.success) {
        showToastNotification('Sync completed successfully!', 'success');
      } else {
        showToastNotification(result?.error || 'Sync failed', 'error');
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      showToastNotification('Failed to sync.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CompanySettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.exportData();
      if (response.success) {
        const message = response.data?.path 
          ? `Data exported successfully to: ${response.data.path}`
          : 'Data exported successfully!';
        showToastNotification(message, 'success');
      } else {
        showToastNotification(response.error || 'Failed to export data', 'error');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      showToastNotification('Failed to export data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.importData();
      if (response.success) {
        showToastNotification('Data imported successfully!', 'success');
        await Promise.all([loadSettings(), loadPreferences()]);
      } else {
        showToastNotification(response.error || 'Failed to import data', 'error');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      showToastNotification('Failed to import data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetActivation = async () => {
    if (!window.electron?.ipcRenderer) {
      showToastNotification('Electron API not available', 'error');
      return;
    }
    setResettingActivation(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('deactivate-product-key') as {
        success: boolean;
        error?: string;
      };
      if (result?.success) {
        showToastNotification('Activation reset. Restart and enter product key again.', 'success');
      } else {
        showToastNotification(result?.error || 'Failed to reset activation', 'error');
      }
    } catch (error) {
      showToastNotification('Failed to reset activation', 'error');
    } finally {
      setResettingActivation(false);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: IconBuilding },
    { id: 'business' as const, label: 'Business', icon: IconBusinessplan },
    { id: 'currency' as const, label: 'Currency', icon: IconCurrencyDollar },
    { id: 'sync' as const, label: 'Sync', icon: IconCloud },
    { id: 'backup' as const, label: 'Backup', icon: IconDatabaseExport },
  ];

        return (
    <>
      {showToast && (
        <Toast variant={toastVariant} title={toastMessage} onClose={() => setShowToast(false)}>
          {toastMessage}
        </Toast>
      )}

      <div className="w-full h-full p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Manage your application preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium transition-colors
                  border-b-2 -mb-px
                  flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent hover:border-gray-300'
                  }
                `}
                style={{
                  color: activeTab === tab.id 
                    ? 'var(--accent)' 
                    : 'var(--muted-foreground)',
                  borderBottomColor: activeTab === tab.id 
                    ? 'var(--accent)' 
                    : 'transparent'
                }}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sync Tab - Outside main form since it has its own submit handler */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                  Cloud Sync
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Synchronize your data with Supabase
                </p>
              </div>
              <Switch 
                checked={!!syncConfig?.sync_enabled}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  try {
                    await setSyncEnabled(enabled);
                    showToastNotification(enabled ? 'Cloud sync enabled' : 'Cloud sync disabled', 'success');
                  } catch (error) {
                    showToastNotification(
                      error instanceof Error ? error.message : 'Failed to update sync status.',
                      'error'
                    );
                  }
                }}
                disabled={syncLoading}
              />
            </div>

            {!syncConfig?.sync_enabled && (
              <div className="py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
                <IconCloud className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Enable cloud sync to synchronize your data</p>
              </div>
            )}

              {syncConfig?.sync_enabled && (
                <div className="space-y-6">
                  {/* Connection Status - Automatic */}
                  {syncConfig?.cloud_url && (
                    <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            connectionStatus.connected === true 
                              ? 'bg-green-500' 
                              : connectionStatus.connected === false 
                                ? 'bg-red-500' 
                                : 'bg-yellow-500 animate-pulse'
                          }`} />
                          <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                              {connectionStatus.connected === true 
                                ? 'Connected' 
                                : connectionStatus.connected === false 
                                  ? 'Not Connected' 
                                  : 'Checking...'}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {connectionStatus.message || syncConfig.cloud_url}
                            </div>
                          </div>
                        </div>
                        {connectionStatus.connected === true && (
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                            Active
                          </span>
                        )}
                        {connectionStatus.connected === false && connectionStatus.message && (
                          <span className="text-xs px-2 py-1 rounded text-red-600 dark:text-red-400" style={{ backgroundColor: 'var(--muted)' }}>
                            {connectionStatus.message.includes('Network') ? 'No Internet' : 'Error'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                {/* Setup Instructions */}
                {!syncConfig?.cloud_url && (
                  <div className="p-5 rounded-lg border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                      Getting Started
                    </h3>
                    <div className="space-y-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <div className="flex gap-3">
                        <span className="font-semibold text-xs w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>1</span>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Create a Supabase Project</p>
                          <p className="text-xs">Visit <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a> and create a new project</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-semibold text-xs w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>2</span>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Set Up Database Schema</p>
                          <p className="text-xs">Run <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--muted)' }}>SUPABASE_SCHEMA.sql</code> in your Supabase SQL Editor</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-semibold text-xs w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>3</span>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Get Your Credentials</p>
                          <p className="text-xs">Go to Settings → API in your Supabase dashboard. Copy the Project URL and <strong>anon public</strong> key (not service_role)</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-semibold text-xs w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>4</span>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Enter Credentials Below</p>
                          <p className="text-xs">Paste your credentials in the form below and test the connection</p>
                        </div>
                      </div>
                    </div>
            <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Activation
              </h2>
              <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Reset the product key activation on this machine. You will need to restart and enter a valid product key again. Internet connection required.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={handleResetActivation}
                disabled={resettingActivation}
                className="flex items-center gap-2"
              >
                {resettingActivation ? 'Resetting...' : 'Reset Activation'}
              </Button>
            </div>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Select
                      label="Cloud Provider"
                      value={syncFormData.cloud_provider}
                      onChange={(e) => {
                        const newData = { ...syncFormData, cloud_provider: e.target.value };
                        setSyncFormData(newData);
                        // Auto-save on change
                        updateSyncConfig(newData).catch(err => console.error('Failed to save:', err));
                      }}
                      options={[
                        { value: 'supabase', label: 'Supabase' },
                        { value: 'firebase', label: 'Firebase' },
                        { value: 'custom', label: 'Custom API' }
                      ]}
                    />
                    <Input
                      label="Sync Interval (minutes)"
                      type="number"
                      min="1"
                      max="60"
                      value={syncFormData.sync_interval_minutes}
                      onChange={(e) => {
                        const newData = { ...syncFormData, sync_interval_minutes: parseInt(e.target.value) || 5 };
                        setSyncFormData(newData);
                      }}
                      onBlur={() => {
                        // Auto-save on blur
                        updateSyncConfig(syncFormData).catch(err => console.error('Failed to save:', err));
                      }}
                      helperText="How often to automatically sync data"
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Project URL"
                      type="url"
                      value={syncFormData.cloud_url}
                      onChange={(e) => {
                        setSyncFormData({ ...syncFormData, cloud_url: e.target.value });
                        // Trigger connection check after URL changes
                        if (e.target.value && syncFormData.api_key && syncFormData.api_key.length > 10) {
                          setTimeout(() => {
                            checkConnectionStatus();
                          }, 1000);
                        }
                      }}
                      onBlur={async () => {
                        // Auto-save on blur
                        if (syncFormData.cloud_url) {
                          try {
                            await updateSyncConfig(syncFormData);
                            showToastNotification('Project URL saved', 'success');
                            // Check connection after saving
                            setTimeout(() => checkConnectionStatus(), 500);
                          } catch (err) {
                            console.error('Failed to save:', err);
                          }
                        }
                      }}
                      placeholder="https://xxxxxxxxxxxxx.supabase.co"
                      helperText="Your Supabase project URL from Settings → API"
                    />
                  </div>
                  
                    <div>
                      <Input
                        label="API Key"
                        type="password"
                        value={syncFormData.api_key}
                        onChange={(e) => {
                          setSyncFormData({ ...syncFormData, api_key: e.target.value });
                          // Trigger connection check after a short delay when key changes
                          if (e.target.value.length > 10 && syncFormData.cloud_url) {
                            setTimeout(() => {
                              checkConnectionStatus();
                            }, 1000);
                          }
                        }}
                        onBlur={async () => {
                          // Auto-save on blur to persist the API key
                          // Only save if the key is not empty and not the masked placeholder
                          if (syncFormData.api_key && 
                              syncFormData.api_key !== '***' && 
                              syncFormData.api_key.length > 10 && // Basic validation - real keys are long
                              syncFormData.cloud_url) {
                            try {
                              await updateSyncConfig(syncFormData);
                              showToastNotification('API key saved', 'success');
                              // Check connection after saving
                              setTimeout(() => checkConnectionStatus(), 500);
                            } catch (err) {
                              console.error('Failed to save API key:', err);
                              showToastNotification('Failed to save API key', 'error');
                            }
                          }
                        }}
                        onCopy={(e) => {
                          e.preventDefault();
                          showToastNotification('Copying API key is disabled for security', 'error');
                        }}
                        onCut={(e) => {
                          e.preventDefault();
                          showToastNotification('Cutting API key is disabled for security', 'error');
                        }}
                        onContextMenu={(e) => {
                          // Prevent right-click context menu to make copying harder
                          e.preventDefault();
                        }}
                        className="select-none"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        helperText="Use the anon public key from Settings → API (not service_role)"
                      />
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={async () => {
                          setTestingConnection(true);
                          setTestResult(null);
                          try {
                            const result = await testConnection({
                              cloud_url: syncFormData.cloud_url,
                              api_key: syncFormData.api_key,
                              cloud_provider: syncFormData.cloud_provider
                            });
                            setTestResult(result);
                            // Also trigger automatic check to update status
                            await checkConnectionStatus();
                          } catch (err) {
                            setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
                          } finally {
                            setTestingConnection(false);
                          }
                        }}
                        disabled={testingConnection || !syncFormData.cloud_url || !syncFormData.api_key}
                        className="flex items-center gap-2"
                      >
                        {testingConnection ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <IconRefresh className="h-4 w-4" />
                            Refresh Status
                          </>
                        )}
                      </Button>
                      {connectionStatus.lastChecked && (
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Last checked: {new Date(connectionStatus.lastChecked).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Select
                      label="Conflict Resolution"
                      value={syncFormData.conflict_resolution_strategy}
                      onChange={(e) => {
                        const newData = { ...syncFormData, conflict_resolution_strategy: e.target.value as any };
                        setSyncFormData(newData);
                        updateSyncConfig(newData).catch(err => console.error('Failed to save:', err));
                      }}
                      options={[
                        { value: 'server_wins', label: 'Server Wins (Cloud data takes priority)' },
                        { value: 'client_wins', label: 'Client Wins (Local data takes priority)' },
                        { value: 'manual', label: 'Manual (Require user confirmation)' }
                      ]}
                      helperText="How to handle conflicts when data differs between local and cloud"
                    />
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--foreground)' }}>Manual Sync</div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Sync your data manually at any time
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleSyncNow}
                        disabled={loading || !syncConfig?.cloud_url}
                        className="flex items-center gap-2"
                      >
                        <IconRefresh className="h-4 w-4" />
                        {loading ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="button"
                      onClick={handleSyncSubmit}
                      disabled={loading || syncLoading}
                    >
                      {loading ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div 
                className="p-4 border rounded-lg"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                      Activation
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      Reset the product key activation on this machine. You will need to restart and enter a valid product key again (internet required).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleResetActivation}
                    disabled={resettingActivation}
                    className="flex items-center gap-2"
                  >
                    {resettingActivation ? 'Resetting...' : 'Reset Activation'}
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Company Information
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={settings.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('companyName', e.target.value)}
                error={errors.companyName}
                required
              />
              <Input
                label="Email"
                type="email"
                value={settings.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
                error={errors.email}
              />
              <Input
                label="Phone"
                value={settings.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)}
              />
            </div>
              <Textarea
                label="Address"
                value={settings.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('address', e.target.value)}
                    rows={3}
              />
            </div>
                    </div>

              <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Tax & Currency
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tax Rate (%)"
                type="number"
                value={settings.taxRate * 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taxRate', parseFloat(e.target.value) / 100)}
                min="0"
                max="100"
                step="0.1"
                error={errors.taxRate}
              />
              <Select
                label="Default Currency"
                value={settings.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('currency', e.target.value)}
                options={CURRENCIES.map(currency => ({
                  value: currency.value,
                  label: currency.label
                }))}
              />
            </div>
            </div>
            </div>
          )}

          {/* Currency Tab */}
          {activeTab === 'currency' && (
            <div className="space-y-6">
              <CurrencySettings
                onSave={(currencies) => {
                  showToastNotification('Currency settings saved successfully!', 'success');
                }}
              />
            </div>
          )}

          {/* Business Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
                  <div>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Business Preferences
                </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Default Payment Method"
                  value={preferences.defaultPaymentMethod}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultPaymentMethod: e.target.value }))}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                <Input
                  label="Invoice Number Format"
                  value={preferences.invoiceNumberFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, invoiceNumberFormat: e.target.value }))}
                      helperText="Use {YYYY} for year, {MM} for month, {####} for number"
                />
              </div>
                <Textarea
                  label="Receipt Footer Message"
                  value={preferences.receiptFooter}
                  onChange={(e) => setPreferences(prev => ({ ...prev, receiptFooter: e.target.value }))}
                    rows={2}
                />
              </div>
              </div>

              <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Sales Options
                </h2>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 px-1">
                  <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>Auto-calculate Tax</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Automatically calculate tax on sales
                      </div>
                  </div>
                  <Switch 
                    checked={preferences.autoCalculateTax}
                    onChange={(e) => setPreferences(prev => ({ ...prev, autoCalculateTax: e.target.checked }))}
                  />
                </div>
                  <div className="flex items-center justify-between py-3 px-1">
                  <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>Show Tax Breakdown</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Display detailed tax information on receipts
                      </div>
                  </div>
                  <Switch 
                    checked={preferences.showTaxBreakdown}
                    onChange={(e) => setPreferences(prev => ({ ...prev, showTaxBreakdown: e.target.checked }))}
                  />
                </div>
                  <div className="flex items-center justify-between py-3 px-1">
                  <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>Print Receipts</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Automatically print receipts after sales
                      </div>
                  </div>
                  <Switch 
                    checked={preferences.printReceipts}
                    onChange={(e) => setPreferences(prev => ({ ...prev, printReceipts: e.target.checked }))}
                  />
                </div>
              </div>
            </div>
            </div>
          )}


          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Backup Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-1">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>Enable Auto Backup</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        Automatically backup data to local storage
            </div>
          </div>
                    <Switch 
                      checked={preferences.autoBackup}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoBackup: e.target.checked }))}
                    />
        </div>

                  {preferences.autoBackup && (
                    <div className="pl-4">
                      <Select
                        label="Backup Frequency"
                        value={preferences.backupFrequency}
                        onChange={(e) => setPreferences(prev => ({ ...prev, backupFrequency: e.target.value }))}
                        options={[
                          { value: 'daily', label: 'Daily' },
                          { value: 'weekly', label: 'Weekly' },
                          { value: 'monthly', label: 'Monthly' }
                        ]}
                      />
                    </div>
                  )}
                </div>
        </div>

              <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="mb-3">
                  <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Manual Backup & Export</h2>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Export or import your data manually
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleExportData}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <IconDownload className="h-4 w-4" />
                    Export Data
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleImportData}
                    disabled={loading}
                    className="flex items-center gap-2"
              >
                    <IconUpload className="h-4 w-4" />
                    Import Data
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowBackupManager(true)}
                    className="flex items-center gap-2"
                  >
                    <IconDatabase className="h-4 w-4" />
                    Manage Backups
                  </Button>
              </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          {activeTab !== 'sync' && (
            <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button type="submit" disabled={loading} size="lg">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              </div>
          )}
          </form>
      </div>

      {showBackupManager && (
        <BackupManager onClose={() => setShowBackupManager(false)} />
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
