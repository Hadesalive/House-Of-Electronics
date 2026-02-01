/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

/**
 * Register Sync Handlers
 */
function registerSyncHandlers(syncService) {
  // Get sync status
  ipcMain.handle('sync:get-status', async () => {
    try {
      const status = syncService.getSyncStatus();
      return { success: true, data: status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get sync health metrics
  ipcMain.handle('sync:get-health', async () => {
    try {
      const health = syncService.getSyncHealth();
      return { success: true, data: health };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get sync configuration
  ipcMain.handle('sync:get-config', async () => {
    try {
      const config = syncService.getSyncConfig();
      // Return actual API key - it's safe in local Electron app and user needs to see/edit it
      // The anon/public key is designed for client-side use
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update sync configuration
  ipcMain.handle('sync:update-config', async (event, updates) => {
    try {
      const result = syncService.updateSyncConfig(updates);
      
      // If credentials are being set for the first time (cloud_url and api_key), 
      // and sync is enabled, trigger initial sync check
      if (result.success && result.data) {
        const config = result.data;
        if (config.sync_enabled && 
            config.cloud_url && 
            config.api_key && 
            !config.last_sync_at &&
            (updates.cloud_url || updates.api_key)) {
          console.log('🔄 Credentials set for first time - will perform initial sync on next sync');
        }
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Enable/disable sync
  ipcMain.handle('sync:set-enabled', async (event, enabled) => {
    try {
      const result = syncService.updateSyncConfig({ sync_enabled: enabled ? 1 : 0 });
      
      // If enabling sync for the first time, trigger initial sync
      if (enabled && result.success && result.data) {
        const config = result.data;
        // Check if this is first time enabling (no last_sync_at)
        if (!config.last_sync_at) {
          console.log('🔄 Sync enabled for first time - will perform initial sync on next sync');
        }
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Sync all pending changes
  ipcMain.handle('sync:sync-all', async () => {
    try {
      const result = await syncService.syncAll();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Pull changes from cloud
  ipcMain.handle('sync:pull-changes', async () => {
    try {
      const result = await syncService.pullChanges();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get pending sync items
  ipcMain.handle('sync:get-pending', async () => {
    try {
      const items = syncService.getPendingSyncItems();
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get all sync queue items with optional filters
  ipcMain.handle('sync:get-queue', async (event, options = {}) => {
    try {
      const items = syncService.getSyncQueueItems(options);
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Clear sync queue
  ipcMain.handle('sync:clear-queue', async (event, status) => {
    try {
      syncService.clearSyncQueue(status);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reset failed items (manual retry - resets all error items)
  ipcMain.handle('sync:reset-failed', async (event, options = {}) => {
    try {
      // For manual retry, reset all error items (pass null to reset all)
      // Or use a very high number to reset almost all items
      // Can also reset specific items by ID
      const maxRetries = options.resetAll ? null : (options.maxRetries || 100);
      const itemIds = options.itemIds || null; // Can be a single ID or array of IDs
      const count = syncService.resetFailedItems(maxRetries, itemIds);
      return { success: true, data: { reset: count } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Test connection to cloud
  ipcMain.handle('sync:test-connection', async (event, testConfig) => {
    try {
      // Use provided test config or fall back to saved config
      const config = testConfig || syncService.getSyncConfig();
      if (!config.cloud_url || !config.api_key) {
        return { success: false, error: 'Cloud URL and API key required' };
      }

      const { createCloudApiClient } = require('../services/cloud-api-client');
      const cloudApiClient = createCloudApiClient(
        config.cloud_provider || 'supabase',
        {
          url: config.cloud_url,
          apiKey: config.api_key,
          tablePrefix: config.table_prefix || ''
        }
      );

      const result = await cloudApiClient.testConnection();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Sync handlers registered');
}

module.exports = {
  registerSyncHandlers
};
