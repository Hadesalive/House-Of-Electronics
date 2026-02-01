export interface BackupInfo {
  fileName: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
  createdFormatted: string;
  modifiedFormatted: string;
}

export interface BackupListResponse {
  success: boolean;
  backups: BackupInfo[];
  totalSize: number;
  totalSizeFormatted: string;
  error?: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  totalSizeFormatted: string;
  backupDirectory: string;
  maxBackups: number;
  error?: string;
}

export interface BackupResponse {
  success: boolean;
  path?: string;
  fileName?: string;
  size?: number;
  sizeFormatted?: string;
  timestamp?: string;
  error?: string;
}

export interface RestoreResponse {
  success: boolean;
  restoredFrom?: string;
  restoredTo?: string;
  currentBackup?: string;
  error?: string;
}

class BackupService {
  async createBackup(options: any = {}): Promise<BackupResponse> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.createBackup(options);
      return result;
    } catch (error) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBackupList(): Promise<BackupListResponse> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.getBackupList();
      return {
        success: result.success,
        backups: (result.backups as BackupInfo[]) || [],
        totalSize: result.totalSize || 0,
        totalSizeFormatted: result.totalSizeFormatted || '0 Bytes',
        error: result.error
      };
    } catch (error) {
      console.error('Failed to get backup list:', error);
      return {
        success: false,
        backups: [],
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restoreBackup(backupFileName: string): Promise<RestoreResponse> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.restoreBackup(backupFileName);
      return result;
    } catch (error) {
      console.error('Backup restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteBackup(backupFileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.deleteBackup(backupFileName);
      return result;
    } catch (error) {
      console.error('Backup deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exportBackup(backupFileName: string): Promise<{ success: boolean; exportedTo?: string; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.exportBackup(backupFileName);
      return result;
    } catch (error) {
      console.error('Backup export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBackupStats(): Promise<BackupStats> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.getBackupStats();
      return result;
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        backupDirectory: '',
        maxBackups: 30,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scheduleBackups(options: any = {}): Promise<BackupResponse> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.scheduleBackups(options);
      return result;
    } catch (error) {
      console.error('Backup scheduling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const backupService = new BackupService();
