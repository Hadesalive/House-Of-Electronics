'use client';

import React, { useState } from 'react';
import { useSync } from '@/contexts/SyncContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, loading, updateConfig, setEnabled, error, testConnection } = useSync();
  const [formData, setFormData] = useState({
    cloud_provider: 'supabase',
    cloud_url: '',
    api_key: '',
    sync_interval_minutes: 5,
    conflict_resolution_strategy: 'server_wins' as 'server_wins' | 'client_wins' | 'manual'
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  React.useEffect(() => {
    if (config) {
      setFormData({
        cloud_provider: config.cloud_provider || 'supabase',
        cloud_url: config.cloud_url || '',
        api_key: config.api_key || '',
        sync_interval_minutes: config.sync_interval_minutes || 5,
        conflict_resolution_strategy: config.conflict_resolution_strategy || 'server_wins'
      });
    }
  }, [config]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily update config for testing
      await updateConfig({
        cloud_provider: formData.cloud_provider,
        cloud_url: formData.cloud_url,
        api_key: formData.api_key
      });
      const result = await testConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfig(formData);
    onClose();
  };

  const handleToggle = async (enabled: boolean) => {
    await setEnabled(enabled);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Sync Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Sync</label>
            <button
              type="button"
              onClick={() => handleToggle(!config?.sync_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config?.sync_enabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config?.sync_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config?.sync_enabled && (
            <>
              {/* Cloud Provider */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cloud Provider
                </label>
                <select
                  value={formData.cloud_provider}
                  onChange={(e) => setFormData({ ...formData, cloud_provider: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="supabase">Supabase</option>
                  <option value="firebase">Firebase</option>
                  <option value="custom">Custom API</option>
                </select>
              </div>

              {/* Cloud URL */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cloud URL
                </label>
                <input
                  type="url"
                  value={formData.cloud_url}
                  onChange={(e) => setFormData({ ...formData, cloud_url: e.target.value })}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Enter your API key"
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || !formData.cloud_url || !formData.api_key}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {testing ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    testResult.success 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {testResult.success 
                      ? '✅ Connection successful!' 
                      : `❌ ${testResult.message || 'Connection failed'}`}
                  </div>
                )}
              </div>

              {/* Sync Interval */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.sync_interval_minutes}
                  onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {/* Conflict Resolution */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Conflict Resolution
                </label>
                <select
                  value={formData.conflict_resolution_strategy}
                  onChange={(e) => setFormData({ ...formData, conflict_resolution_strategy: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="server_wins">Server Wins (Cloud data takes priority)</option>
                  <option value="client_wins">Client Wins (Local data takes priority)</option>
                  <option value="manual">Manual (Require user confirmation)</option>
                </select>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
