import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { 
  CloudArrowUpIcon, 
  CloudArrowDownIcon, 
  TrashIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { backupService, type BackupInfo, type BackupStats } from '@/lib/services/backup.service';
import { Toast } from '@/components/ui/core';

interface BackupManagerProps {
  onClose: () => void;
}

export function BackupManager({ onClose }: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const [backupList, backupStats] = await Promise.all([
        backupService.getBackupList(),
        backupService.getBackupStats()
      ]);

      if (backupList.success) {
        setBackups(backupList.backups);
      }

      if (backupStats) {
        setStats(backupStats);
      }
    } catch (error) {
      console.error('Failed to load backup data:', error);
      setToast({ message: 'Failed to load backup data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const result = await backupService.createBackup();
      
      if (result.success) {
        setToast({ message: 'Backup created successfully', type: 'success' });
        await loadBackupData(); // Refresh the list
      } else {
        setToast({ message: result.error || 'Failed to create backup', type: 'error' });
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      setToast({ message: 'Backup creation failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupFileName: string) => {
    if (!confirm(`Are you sure you want to restore from ${backupFileName}? This will replace your current database.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await backupService.restoreBackup(backupFileName);
      
      if (result.success) {
        setToast({ message: 'Database restored successfully. Please restart the application.', type: 'success' });
        // Note: In a real app, you'd want to restart the app or reload the data
      } else {
        setToast({ message: result.error || 'Failed to restore backup', type: 'error' });
      }
    } catch (error) {
      console.error('Backup restore failed:', error);
      setToast({ message: 'Backup restore failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupFileName: string) => {
    if (!confirm(`Are you sure you want to delete ${backupFileName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await backupService.deleteBackup(backupFileName);
      
      if (result.success) {
        setToast({ message: 'Backup deleted successfully', type: 'success' });
        await loadBackupData(); // Refresh the list
      } else {
        setToast({ message: result.error || 'Failed to delete backup', type: 'error' });
      }
    } catch (error) {
      console.error('Backup deletion failed:', error);
      setToast({ message: 'Backup deletion failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async (backupFileName: string) => {
    setLoading(true);
    try {
      const result = await backupService.exportBackup(backupFileName);
      
      if (result.success) {
        setToast({ message: 'Backup exported successfully', type: 'success' });
      } else {
        setToast({ message: result.error || 'Failed to export backup', type: 'error' });
      }
    } catch (error) {
      console.error('Backup export failed:', error);
      setToast({ message: 'Backup export failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl border border-border max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FolderIcon className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-xl font-semibold">Backup Manager</h2>
              <p className="text-sm text-muted-foreground">Manage your database backups</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderIcon className="h-5 w-5 text-accent" />
                  <span className="font-medium">Total Backups</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalBackups}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CloudArrowUpIcon className="h-5 w-5 text-accent" />
                  <span className="font-medium">Total Size</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalSizeFormatted}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClockIcon className="h-5 w-5 text-accent" />
                  <span className="font-medium">Max Backups</span>
                </div>
                <div className="text-2xl font-bold">{stats.maxBackups}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCreateBackup} disabled={loading}>
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
            <Button variant="outline" onClick={loadBackupData} disabled={loading}>
              Refresh
            </Button>
          </div>

          {/* Backup List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Available Backups</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups found</p>
                <p className="text-sm">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup, index) => (
                  <div key={backup.fileName} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FolderIcon className="h-5 w-5 text-accent" />
                          <span className="font-medium">{backup.fileName}</span>
                          {index === 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Size: {backup.sizeFormatted}</div>
                          <div>Created: {backup.createdFormatted}</div>
                          <div>Modified: {backup.modifiedFormatted}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup.fileName)}
                          disabled={loading}
                        >
                          <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportBackup(backup.fileName)}
                          disabled={loading}
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBackup(backup.fileName)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Backup Directory Info */}
          {stats && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Backup Directory</h4>
              <p className="text-sm text-muted-foreground font-mono">
                {stats.backupDirectory}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.type}
          onClose={() => setToast(null)}
          dismissible
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}
