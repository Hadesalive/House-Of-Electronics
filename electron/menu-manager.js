/* eslint-disable @typescript-eslint/no-require-imports */
const { Menu } = require('electron');

// Helper function to check if user is typing in an input field
async function isTypingInInput(mainWindow) {
  try {
    const result = await mainWindow.webContents.executeJavaScript(`
      (function() {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        const tagName = activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isContentEditable = activeElement.isContentEditable || 
                                  activeElement.getAttribute('contenteditable') === 'true';
        return isInput || isContentEditable;
      })();
    `);
    return result;
  } catch (error) {
    console.error('Error checking if typing in input:', error);
    return false;
  }
}

function createApplicationMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sale',
          accelerator: 'CmdOrCtrl+N',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-new-sale');
            }
          }
        },
        {
          label: 'New Customer',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-new-customer');
            }
          }
        },
        {
          label: 'New Product',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-new-product');
            }
          }
        },
        {
          label: 'New Debt',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-new-debt');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-export-data');
            }
          }
        },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: async () => {
            const typing = await isTypingInInput(mainWindow);
            if (!typing) {
              mainWindow.webContents.send('menu-import-data');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            const { app } = require('electron');
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = {
  createApplicationMenu
};
