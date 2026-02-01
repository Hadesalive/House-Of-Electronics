/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

function registerSettingsHandlers(databaseService) {
  // Company settings IPC handlers
  ipcMain.handle('get-company-settings', async () => {
    try {
      const settings = await databaseService.getCompanySettings();
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-company-settings', async (event, settings) => {
    try {
      const updatedSettings = await databaseService.updateCompanySettings(settings);
      return { success: true, data: updatedSettings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Preferences IPC handlers
  ipcMain.handle('get-preferences', async () => {
    try {
      const preferences = await databaseService.getPreferences();
      return { success: true, data: preferences };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-preferences', async (event, preferences) => {
    try {
      const updatedPreferences = await databaseService.updatePreferences(preferences);
      return { success: true, data: updatedPreferences };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reports password IPC handlers
  ipcMain.handle('get-reports-password', async () => {
    try {
      const password = await databaseService.getReportsPassword();
      return { success: true, data: password };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('set-reports-password', async (event, password) => {
    try {
      const result = await databaseService.setReportsPassword(password);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerSettingsHandlers
};
