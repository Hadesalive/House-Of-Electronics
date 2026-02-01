/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain, shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Email Handlers
 * Handles email-related IPC calls from the renderer process
 */

function setupEmailHandlers() {
  // Email invoice with PDF attachment
  ipcMain.handle('email-invoice', async (event, { to, subject, body, pdfBase64, fileName }) => {
    try {
      // Create temp directory for PDF
      const tempDir = path.join(os.tmpdir(), 'house-of-electronics-invoices');
      await fs.mkdir(tempDir, { recursive: true });
      
      // Save PDF to temp file
      const pdfPath = path.join(tempDir, fileName);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      await fs.writeFile(pdfPath, pdfBuffer);
      
      console.log(`PDF saved to: ${pdfPath}`);
      
      // Construct mailto URL with attachment (platform-specific)
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS: Use AppleScript to open Mail.app with attachment
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Escape quotes in AppleScript
        const escapedTo = to.replace(/"/g, '\\"');
        const escapedSubject = subject.replace(/"/g, '\\"');
        const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const escapedPath = pdfPath.replace(/"/g, '\\"');
        
        const appleScript = `
tell application "Mail"
  activate
  set newMessage to make new outgoing message with properties {subject:"${escapedSubject}", content:"${escapedBody}", visible:true}
  tell newMessage
    make new to recipient at end of to recipients with properties {address:"${escapedTo}"}
    make new attachment with properties {file name:POSIX file "${escapedPath}"} at after the last paragraph
  end tell
end tell
`;
        
        await execPromise(`osascript -e '${appleScript.replace(/'/g, "'\"'\"'")}'`);
        
        return { 
          success: true, 
          message: 'Email opened in Mail.app with PDF attached',
          pdfPath 
        };
        
      } else if (platform === 'win32') {
        // Windows: Save PDF and open default email client
        // Note: Windows doesn't support mailto with attachments directly
        // We'll open the email client and reveal the PDF file
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\nPLEASE ATTACH: ' + pdfPath)}`;
        await shell.openExternal(mailto);
        
        // Also show the PDF in file explorer
        shell.showItemInFolder(pdfPath);
        
        return { 
          success: true, 
          message: 'Email client opened. PDF is shown in file explorer - please attach it manually.',
          pdfPath 
        };
        
      } else {
        // Linux: Similar to Windows, no direct attachment support
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await shell.openExternal(mailto);
        
        // Open the temp folder
        await shell.openPath(tempDir);
        
        return { 
          success: true, 
          message: 'Email client opened. PDF saved in temp folder - please attach it manually.',
          pdfPath 
        };
      }
      
    } catch (error) {
      console.error('Error in email-invoice handler:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Clean up temp invoice PDFs (optional, call periodically)
  ipcMain.handle('cleanup-temp-invoices', async () => {
    try {
      const tempDir = path.join(os.tmpdir(), 'house-of-electronics-invoices');
      const files = await fs.readdir(tempDir);
      
      // Delete files older than 24 hours
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log(`Deleted old temp invoice: ${file}`);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error cleaning up temp invoices:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupEmailHandlers };

