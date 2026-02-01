/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain, dialog } = require('electron');
const fs = require('fs');

function registerDataHandlers(databaseService) {
  // Data export/import IPC handlers
  ipcMain.handle('export-data', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Sales Data',
        defaultPath: 'house-of-electronics-sales-export.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        // Get data without showing another dialog
        const exportResult = await databaseService.exportData({ showDialog: false });
        fs.writeFileSync(result.filePath, JSON.stringify(exportResult.data, null, 2));
        return { success: true, path: result.filePath };
      }
      
      return { success: false, error: 'Export cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import-data', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Sales Data',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const data = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(data);
        
        // Import data to database
        await databaseService.importData(parsedData);
        
        return { success: true, data: parsedData };
      }
      
      return { success: false, error: 'Import cancelled' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Legacy data handlers (for backward compatibility)
  ipcMain.handle('save-data', async (event, data) => {
    try {
      await databaseService.importData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('load-data', async () => {
    try {
      const result = await databaseService.exportData({ showDialog: false });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerDataHandlers
};
