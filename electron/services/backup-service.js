const fs = require('fs');
const path = require('path');
const os = require('os');
const { dialog } = require('electron');

class BackupService {
  constructor() {
    this.backupDir = this.getBackupDirectory();
    this.maxBackups = 30; // Keep last 30 backups
    this.ensureBackupDirectory();
  }

  getBackupDirectory() {
    const userDataPath = process.env.NODE_ENV === 'production' 
      ? require('electron').app.getPath('userData')
      : path.join(os.homedir(), '.house-of-electronics-sales-manager');
    
    return path.join(userDataPath, 'backups');
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Created backup directory:', this.backupDir);
    }
  }

  getDatabasePath() {
    // Try to find the database file
    const possiblePaths = [
      path.join(process.cwd(), 'house-of-electronics-sales.db'),
      path.join(this.getBackupDirectory(), '..', 'house-of-electronics-sales.db'),
      path.join(os.homedir(), '.house-of-electronics-sales-manager', 'house-of-electronics-sales.db'),
      path.join(require('electron').app.getPath('userData'), 'house-of-electronics-sales.db')
    ];

    for (const dbPath of possiblePaths) {
      if (fs.existsSync(dbPath)) {
        return dbPath;
      }
    }

    throw new Error('Database file not found');
  }

  generateBackupFileName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `house-of-electronics-backup-${timestamp}.db`;
  }

  async createBackup(options = {}) {
    try {
      console.log('🔄 Starting backup process...');
      
      const dbPath = this.getDatabasePath();
      const backupFileName = this.generateBackupFileName();
      const backupPath = path.join(this.backupDir, backupFileName);

      // Copy database file
      fs.copyFileSync(dbPath, backupPath);
      
      // Get file stats
      const stats = fs.statSync(backupPath);
      const backupSize = stats.size;

      console.log('✅ Backup created successfully:');
      console.log(`   📁 Path: ${backupPath}`);
      console.log(`   📊 Size: ${this.formatBytes(backupSize)}`);
      console.log(`   📅 Date: ${new Date().toLocaleString()}`);

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        path: backupPath,
        fileName: backupFileName,
        size: backupSize,
        sizeFormatted: this.formatBytes(backupSize),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('house-of-electronics-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by modification time, newest first

      // Keep only the most recent backups
      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️  Deleted old backup: ${file.name}`);
        }

        console.log(`🧹 Cleaned up ${filesToDelete.length} old backups`);
      }

      return {
        success: true,
        totalBackups: files.length,
        deleted: files.length > this.maxBackups ? files.length - this.maxBackups : 0
      };

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBackupList() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('house-of-electronics-backup-') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            fileName: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            createdFormatted: stats.birthtime.toLocaleString(),
            modifiedFormatted: stats.mtime.toLocaleString()
          };
        })
        .sort((a, b) => b.modified - a.modified); // Sort by modification time, newest first

      return {
        success: true,
        backups: files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        totalSizeFormatted: this.formatBytes(files.reduce((sum, file) => sum + file.size, 0))
      };

    } catch (error) {
      console.error('❌ Failed to get backup list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async restoreBackup(backupFileName) {
    try {
      console.log('🔄 Starting restore process...');
      
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      const dbPath = this.getDatabasePath();
      
      // Create a backup of current database before restore
      const currentBackupName = `pre-restore-backup-${Date.now()}.db`;
      const currentBackupPath = path.join(this.backupDir, currentBackupName);
      fs.copyFileSync(dbPath, currentBackupPath);
      
      // Restore the backup
      fs.copyFileSync(backupPath, dbPath);
      
      console.log('✅ Database restored successfully:');
      console.log(`   📁 From: ${backupPath}`);
      console.log(`   📁 To: ${dbPath}`);
      console.log(`   💾 Current DB backed up to: ${currentBackupPath}`);

      return {
        success: true,
        restoredFrom: backupPath,
        restoredTo: dbPath,
        currentBackup: currentBackupPath
      };

    } catch (error) {
      console.error('❌ Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      fs.unlinkSync(backupPath);
      
      console.log('🗑️  Backup deleted:', backupFileName);

      return {
        success: true,
        deletedFile: backupFileName
      };

    } catch (error) {
      console.error('❌ Delete backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exportBackup(backupFileName, exportPath) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      fs.copyFileSync(backupPath, exportPath);
      
      console.log('📤 Backup exported:', exportPath);

      return {
        success: true,
        exportedTo: exportPath
      };

    } catch (error) {
      console.error('❌ Export backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async scheduleBackups() {
    // This would be called by a scheduler
    console.log('⏰ Running scheduled backup...');
    return await this.createBackup({ scheduled: true });
  }

  getBackupStats() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('house-of-electronics-backup-') && file.endsWith('.db'));

      const totalSize = files.reduce((sum, file) => {
        const filePath = path.join(this.backupDir, file);
        return sum + fs.statSync(filePath).size;
      }, 0);

      return {
        totalBackups: files.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        backupDirectory: this.backupDir,
        maxBackups: this.maxBackups
      };

    } catch (error) {
      console.error('❌ Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        backupDirectory: this.backupDir,
        maxBackups: this.maxBackups,
        error: error.message
      };
    }
  }
}

module.exports = BackupService;
