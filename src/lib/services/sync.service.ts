// Sync Service - Frontend
// Handles sync operations via Electron IPC

import { BaseService } from './base.service';
import { ApiResponse } from '../types/core';

export interface SyncStatus {
  enabled: boolean;
  lastSyncAt: string | null;
  pending: number;
  errors: number;
  deviceId: string;
  cloudProvider: string;
  isConfigured: boolean;
}

export interface SyncHealth {
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    total: number;
    pending: number;
    errors: number;
    stuck: number;
    synced: number;
    errorRate: number;
    highRetryErrors: number;
    recentErrors: number;
    lastSyncAgeMinutes: number | null;
    lastSyncAt: string | null;
  };
  warnings: string[];
  alerts: string[];
  enabled: boolean;
  isConfigured: boolean;
  isLocked: boolean;
}

export interface SyncConfig {
  sync_enabled: number;
  sync_interval_minutes: number;
  cloud_provider: string;
  cloud_url: string;
  api_key: string | null;
  conflict_resolution_strategy: 'server_wins' | 'client_wins' | 'manual';
  device_id: string;
  last_sync_at: string | null;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  errors?: number;
  total?: number;
  applied?: number;
  conflicts?: number;
  message?: string;
  error?: string;
}

export class SyncService extends BaseService {
  /**
   * Check if running in Electron
   */
  private isElectron(): boolean {
    return typeof window !== 'undefined' && 
           ((window as any).electron?.ipcRenderer || (window as any).electronAPI);
  }

  /**
   * Invoke Electron IPC handler
   */
  private async invoke<T>(channel: string, ...args: any[]): Promise<ApiResponse<T>> {
    if (!this.isElectron()) {
      return this.createErrorResponse<T>('Not running in Electron environment');
    }

    try {
      // Try electron.ipcRenderer.invoke first (for sync handlers)
      if ((window as any).electron?.ipcRenderer?.invoke) {
        const result = await (window as any).electron.ipcRenderer.invoke(channel, ...args);
        return result;
      }
      // Fallback to electronAPI if available
      if ((window as any).electronAPI?.invoke) {
        const result = await (window as any).electronAPI.invoke(channel, ...args);
        return result;
      }
      return this.createErrorResponse<T>('IPC not available');
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<ApiResponse<SyncStatus>> {
    return this.invoke<SyncStatus>('sync:get-status');
  }

  /**
   * Get sync health metrics
   */
  async getHealth(): Promise<ApiResponse<SyncHealth>> {
    return this.invoke<SyncHealth>('sync:get-health');
  }

  /**
   * Get sync configuration
   */
  async getConfig(): Promise<ApiResponse<SyncConfig>> {
    return this.invoke<SyncConfig>('sync:get-config');
  }

  /**
   * Update sync configuration
   */
  async updateConfig(updates: Partial<SyncConfig>): Promise<ApiResponse<SyncConfig>> {
    return this.invoke<SyncConfig>('sync:update-config', updates);
  }

  /**
   * Enable or disable sync
   */
  async setEnabled(enabled: boolean): Promise<ApiResponse<SyncConfig>> {
    return this.invoke<SyncConfig>('sync:set-enabled', enabled);
  }

  /**
   * Sync all pending changes
   */
  async syncAll(): Promise<ApiResponse<SyncResult>> {
    return this.invoke<SyncResult>('sync:sync-all');
  }

  /**
   * Pull changes from cloud
   */
  async pullChanges(): Promise<ApiResponse<SyncResult>> {
    return this.invoke<SyncResult>('sync:pull-changes');
  }

  /**
   * Get pending sync items
   */
  async getPending(): Promise<ApiResponse<any[]>> {
    return this.invoke<any[]>('sync:get-pending');
  }

  /**
   * Get all sync queue items with optional filters
   */
  async getQueue(options?: { status?: string; limit?: number; offset?: number }): Promise<ApiResponse<any[]>> {
    return this.invoke<any[]>('sync:get-queue', options);
  }

  /**
   * Clear sync queue
   */
  async clearQueue(status?: string): Promise<ApiResponse<void>> {
    return this.invoke<void>('sync:clear-queue', status);
  }

  /**
   * Reset failed items
   */
  async resetFailed(): Promise<ApiResponse<{ reset: number }>> {
    return this.invoke<{ reset: number }>('sync:reset-failed');
  }

  /**
   * Test connection to cloud
   */
  async testConnection(testConfig?: Partial<SyncConfig>): Promise<ApiResponse<{ message?: string }>> {
    return this.invoke<{ message?: string }>('sync:test-connection', testConfig);
  }
}

export const syncService = new SyncService();
