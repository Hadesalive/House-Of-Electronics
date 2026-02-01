/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain, dialog } = require('electron');
const { getActivationService } = require('../services/activation-service');
const { getTelemetryService } = require('../services/telemetry-service');
const fs = require('fs');
const path = require('path');

/**
 * Register all license-related IPC handlers
 */
function registerLicenseHandlers() {
  const activationService = getActivationService();
  const telemetryService = getTelemetryService();

  // Get activation status
  ipcMain.handle('get-activation-status', async () => {
    try {
      const status = await activationService.getActivationStatus();
      
      // Record telemetry
      await telemetryService.recordSession(status.activated);
      
      return status;
    } catch (error) {
      console.error('Failed to get activation status:', error);
      return {
        activated: false,
        error: error.message
      };
    }
  });

  // Get machine identifier
  ipcMain.handle('get-machine-identifier', async () => {
    try {
      return await activationService.getMachineIdentifier();
    } catch (error) {
      console.error('Failed to get machine identifier:', error);
      throw error;
    }
  });

  // Import license from file
  ipcMain.handle('import-license-file', async () => {
    try {
      // Show file picker
      const result = await dialog.showOpenDialog({
        title: 'Select License File',
        filters: [
          { name: 'License Files', extensions: ['lic', 'json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          error: 'No file selected'
        };
      }

      const filePath = result.filePaths[0];
      const importResult = await activationService.importLicenseFile(filePath);

      // Record telemetry
      if (importResult.success) {
        await telemetryService.recordValidation({ valid: true, reason: 'Activated via file import' });
      } else {
        await telemetryService.recordViolation('activation-failed', importResult.error);
      }

      return importResult;
    } catch (error) {
      console.error('Failed to import license file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Import license from text/data
  ipcMain.handle('import-license-data', async (event, licenseData) => {
    try {
      const importResult = await activationService.importLicenseData(licenseData);

      // Record telemetry
      if (importResult.success) {
        await telemetryService.recordValidation({ valid: true, reason: 'Activated via data import' });
      } else {
        await telemetryService.recordViolation('activation-failed', importResult.error);
      }

      return importResult;
    } catch (error) {
      console.error('Failed to import license data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Export activation request
  ipcMain.handle('export-activation-request', async () => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Activation Request',
        defaultPath: 'activation-request.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          error: 'Save canceled'
        };
      }

      return await activationService.exportActivationRequest(result.filePath);
    } catch (error) {
      console.error('Failed to export activation request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Deactivate (for testing/debugging)
  ipcMain.handle('deactivate-license', async () => {
    try {
      const result = await activationService.deactivate();
      
      // Record telemetry
      await telemetryService.recordValidation({ valid: false, reason: 'Manually deactivated' });
      
      return result;
    } catch (error) {
      console.error('Failed to deactivate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Retry license validation
  ipcMain.handle('retry-license-validation', async () => {
    try {
      const isValid = await activationService.validateRuntime();
      
      // Record telemetry
      await telemetryService.recordValidation({ 
        valid: isValid, 
        reason: isValid ? 'Retry successful' : 'Retry failed' 
      });
      
      return { success: isValid };
    } catch (error) {
      console.error('Failed to retry validation:', error);
      throw error;
    }
  });

  // Get telemetry summary (for settings/debug page)
  ipcMain.handle('get-telemetry-summary', () => {
    try {
      return telemetryService.getSummary();
    } catch (error) {
      console.error('Failed to get telemetry summary:', error);
      return null;
    }
  });

  // Toggle telemetry
  ipcMain.handle('set-telemetry-enabled', (event, enabled) => {
    try {
      telemetryService.setEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to set telemetry enabled:', error);
      return { success: false, error: error.message };
    }
  });

  // Open external URL
  ipcMain.handle('open-external', (event, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });

  // Quit application
  ipcMain.handle('quit-application', () => {
    const { app } = require('electron');
    app.quit();
  });

  console.log('✅ License IPC handlers registered');
}

module.exports = {
  registerLicenseHandlers
};

