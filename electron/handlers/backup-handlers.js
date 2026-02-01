const { ipcMain } = require('electron');
const BackupService = require('../services/backup-service');
const { dialog } = require('electron');

let backupService;

function registerBackupHandlers() {
  backupService = new BackupService();

  // Create a new backup
  ipcMain.handle('create-backup', async (event, options = {}) => {
    try {
      console.log('🔄 Creating backup...');
      const result = await backupService.createBackup(options);
      
      if (result.success) {
        console.log('✅ Backup created successfully');
      } else {
        console.error('❌ Backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Backup handler error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get list of all backups
  ipcMain.handle('get-backup-list', async (event) => {
    try {
      console.log('📋 Getting backup list...');
      const result = await backupService.getBackupList();
      
      if (result.success) {
        console.log(`✅ Found ${result.backups.length} backups`);
      } else {
        console.error('❌ Failed to get backup list:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Get backup list error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Restore from backup
  ipcMain.handle('restore-backup', async (event, backupFileName) => {
    try {
      console.log('🔄 Restoring from backup:', backupFileName);
      const result = await backupService.restoreBackup(backupFileName);
      
      if (result.success) {
        console.log('✅ Database restored successfully');
      } else {
        console.error('❌ Restore failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Restore backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete backup
  ipcMain.handle('delete-backup', async (event, backupFileName) => {
    try {
      console.log('🗑️  Deleting backup:', backupFileName);
      const result = await backupService.deleteBackup(backupFileName);
      
      if (result.success) {
        console.log('✅ Backup deleted successfully');
      } else {
        console.error('❌ Delete backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Delete backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Export backup to external location
  ipcMain.handle('export-backup', async (event, backupFileName) => {
    try {
      console.log('📤 Exporting backup:', backupFileName);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Backup',
        defaultPath: `house-of-electronics-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return {
          success: false,
          canceled: true
        };
      }

      const exportResult = await backupService.exportBackup(backupFileName, result.filePath);
      
      if (exportResult.success) {
        console.log('✅ Backup exported successfully');
      } else {
        console.error('❌ Export backup failed:', exportResult.error);
      }
      
      return exportResult;
    } catch (error) {
      console.error('❌ Export backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get backup statistics
  ipcMain.handle('get-backup-stats', async (event) => {
    try {
      console.log('📊 Getting backup statistics...');
      const result = backupService.getBackupStats();
      
      console.log('✅ Backup stats retrieved');
      return result;
    } catch (error) {
      console.error('❌ Get backup stats error:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        error: error.message
      };
    }
  });

  // Schedule automatic backups
  ipcMain.handle('schedule-backups', async (event, options = {}) => {
    try {
      console.log('⏰ Scheduling backups...');
      
      // For now, we'll just create a backup immediately
      // In a real implementation, you'd set up a cron job or interval
      const result = await backupService.createBackup({ scheduled: true });
      
      if (result.success) {
        console.log('✅ Scheduled backup created');
      } else {
        console.error('❌ Scheduled backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Schedule backups error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ Backup handlers registered');
}

module.exports = { registerBackupHandlers };
