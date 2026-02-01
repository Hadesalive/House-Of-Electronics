/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const { processLogo } = require('../../utils/logoAutoProcessor');
const path = require('path');

function setupLogoHandlers() {
  console.log('Setting up logo processing handlers...');

  // Handle automatic logo processing
  ipcMain.handle('auto-process-logo', async (event, filePath) => {
    try {
      console.log('Received logo processing request for:', filePath);
      
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }

      // Check if file exists
      const fs = require('fs').promises;
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error('File does not exist: ' + filePath);
      }

      // Process the logo
      const processedPath = await processLogo(filePath);
      
      console.log('Logo processing completed. Processed file:', processedPath);
      return processedPath;
      
    } catch (error) {
      console.error('Error in logo processing handler:', error);
      throw error;
    }
  });

  // Handle logo validation (check if file is a valid image)
  ipcMain.handle('validate-logo-file', async (event, filePath) => {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        return { valid: false, error: 'File too large. Maximum size is 10MB.' };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
      
      if (!validExtensions.includes(ext)) {
        return { valid: false, error: 'Invalid file type. Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP' };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error validating logo file:', error);
      return { valid: false, error: 'File validation failed: ' + error.message };
    }
  });

  // Handle getting processed logo info
  ipcMain.handle('get-processed-logo-info', async (event, processedPath) => {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(processedPath);
      
      return {
        path: processedPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
      
    } catch (error) {
      console.error('Error getting processed logo info:', error);
      throw error;
    }
  });

  // Handle converting processed logo to base64 data URL
  ipcMain.handle('get-processed-logo-base64', async (event, processedPath) => {
    try {
      const fs = require('fs').promises;
      const imageBuffer = await fs.readFile(processedPath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = 'image/png'; // Assuming PNG output
      return `data:${mimeType};base64,${base64}`;
      
    } catch (error) {
      console.error('Error converting processed logo to base64:', error);
      throw error;
    }
  });

  console.log('Logo processing handlers registered successfully');
}

module.exports = {
  setupLogoHandlers
};
