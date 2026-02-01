/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain, BrowserWindow } = require('electron');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Polyfill for ReadableStream (required for Puppeteer in Electron)
if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.log('Error closing old browser:', error.message);
      }
    }
    
    console.log('Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }
  return browser;
}

function setupPdfHandlers() {
  // Generate PDF from HTML content using Electron's native PDF generation
  // This is much more reliable than Puppeteer in Electron
  ipcMain.handle('generate-invoice-pdf-from-html', async (event, { htmlContent }) => {
    let win = null;
    let tempFilePath = null;
    
    try {
      console.log('Starting PDF generation with Electron native...');
      
      // Write HTML to a temporary file (data URLs are too long for Electron)
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `invoice-${Date.now()}.html`);
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
      console.error('Error generating PDF:', error.message);
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
  
  // Cleanup on app quit
  process.on('exit', async () => {
    if (browser) {
      await browser.close();
    }
  });
  
  // Handle PDF download using Electron's native file dialog
  ipcMain.handle('download-pdf-file', async (event, { pdfBase64, filename }) => {
    try {
      const { dialog } = require('electron');
      const fs = require('fs');
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save PDF Invoice',
        defaultPath: filename,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled) {
        return { success: false, error: 'User cancelled save dialog' };
      }
      
      // Convert base64 to buffer and save
      const buffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(result.filePath, buffer);
      
      return { success: true, filePath: result.filePath };
      
    } catch (error) {
      console.error('Error saving PDF:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setupPdfHandlers
};

