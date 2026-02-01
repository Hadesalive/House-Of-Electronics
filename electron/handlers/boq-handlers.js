/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

function registerBOQHandlers(databaseService, syncService) {
  console.log('Registering BOQ handlers');

  // Get all BOQs
  ipcMain.handle('get-boqs', async () => {
    try {
      const boqs = await databaseService.getAllBOQs();
      return { success: true, data: boqs };
    } catch (error) {
      console.error('Error getting BOQs:', error);
      return { success: false, error: error.message };
    }
  });

  // Get BOQ by ID
  ipcMain.handle('get-boq-by-id', async (event, id) => {
    try {
      const boq = await databaseService.getBOQById(id);
      if (!boq) {
        return { success: false, error: 'BOQ not found' };
      }
      return { success: true, data: boq };
    } catch (error) {
      console.error('Error getting BOQ:', error);
      return { success: false, error: error.message };
    }
  });

  // Create BOQ
  ipcMain.handle('create-boq', async (event, boqData) => {
    try {
      const boq = await databaseService.createBOQ(boqData);
      
      // Track sync change
      if (syncService && boq && boq.id) {
        syncService.trackChange('boqs', boq.id.toString(), 'create', boq);
      }
      
      return { success: true, data: boq };
    } catch (error) {
      console.error('Error creating BOQ:', error);
      return { success: false, error: error.message };
    }
  });

  // Update BOQ
  ipcMain.handle('update-boq', async (event, id, updates) => {
    try {
      const boq = await databaseService.updateBOQ(id, updates);
      
      // Track sync change
      if (syncService && boq && boq.id) {
        syncService.trackChange('boqs', boq.id.toString(), 'update', boq);
      }
      
      return { success: true, data: boq };
    } catch (error) {
      console.error('Error updating BOQ:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete BOQ
  ipcMain.handle('delete-boq', async (event, id) => {
    try {
      const success = await databaseService.deleteBOQ(id);
      
      if (success && syncService) {
        syncService.trackChange('boqs', id.toString(), 'delete');
      }
      
      return { success };
    } catch (error) {
      console.error('Error deleting BOQ:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate BOQ PDF from HTML content
  ipcMain.handle('generate-boq-pdf-from-html', async (event, { htmlContent }) => {
    let win = null;
    let tempFilePath = null;
    
    try {
      console.log('Starting BOQ PDF generation with Electron native...');
      
      // Write HTML to a temporary file (data URLs are too long for Electron)
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `boq-${Date.now()}.html`);
      fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
      console.log('HTML written to temp file:', tempFilePath);
      
      // Create an invisible window for PDF generation
      win = new BrowserWindow({
        width: 794,
        height: 1123,
        show: false, // Don't show the window
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false
        }
      });
      
      console.log('Window created, loading HTML from file...');
      
      // Load the HTML file
      await win.loadFile(tempFilePath);
      
      console.log('Content loaded, waiting for rendering...');
      
      // Wait for page to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Generating PDF with Electron...');
      
      // Generate PDF using Electron's printToPDF
      // Standard A4 margins: 10mm (0.39 inches) on all sides
      const pdfBuffer = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          top: 0.39,    // 10mm in inches
          bottom: 0.39, // 10mm in inches
          left: 0.39,   // 10mm in inches
          right: 0.39   // 10mm in inches
        }
      });
      
      console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Return PDF as base64
      return pdfBuffer.toString('base64');
      
    } catch (error) {
      console.error('Error generating BOQ PDF:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    } finally {
      // Clean up - close window
      if (win && !win.isDestroyed()) {
        try {
          console.log('Closing window...');
          win.close();
          console.log('Window closed successfully');
        } catch (closeError) {
          console.error('Error closing window:', closeError.message);
        }
      }
      
      // Clean up - delete temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('Temp file deleted');
        } catch (deleteError) {
          console.error('Error deleting temp file:', deleteError.message);
        }
      }
    }
  });

  console.log('BOQ handlers registered');
}

module.exports = { registerBOQHandlers };
