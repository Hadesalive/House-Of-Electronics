/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDev:', isDev);

// Import database service - handle both dev and production builds
let databaseService;
try {
    if (isDev) {
        // For development, use the TypeScript source directly
        // We need to compile it on the fly or use a different approach
        console.log('Development mode: Using persistent mock database service');
        // For now, let's use a persistent mock that saves to a JSON file
        const os = require('os');
        const dataPath = path.join(os.homedir(), '.house-of-electronics-sales-manager', 'data.json');

        // Ensure directory exists
        const dataDir = path.dirname(dataPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Load existing data or create default
        let persistentData = {};
        try {
            if (fs.existsSync(dataPath)) {
                persistentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            }
        } catch {
            console.log('Error loading persistent data, starting fresh');
        }

        // Initialize default data if not exists
        if (!persistentData.settings) {
            persistentData.settings = {
                companyName: 'Eklas Solar Installations',
                address: '',
                phone: '',
                email: '',
                taxRate: 0.15,
                currency: 'NLe',
            };
        }
        if (!persistentData.preferences) {
            persistentData.preferences = {
                autoSaveDrafts: true,
                confirmBeforeDelete: true,
                showAnimations: true,
                lowStockAlerts: true,
                defaultPaymentMethod: 'cash',
                invoiceNumberFormat: 'INV-{YYYY}-{MM}-{####}',
                receiptFooter: 'Thank you for your business!',
                autoBackup: true,
                backupFrequency: 'daily',
                showProductImages: true,
                defaultInvoiceStatus: 'completed',
                receiptPaperSize: 'A4',
                showTaxBreakdown: true,
                requireCustomerInfo: false,
                autoCalculateTax: true,
                defaultDiscountPercent: 0,
                showProfitMargin: false,
                inventoryTracking: true,
                barcodeScanning: false,
                darkMode: false,
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                currencyPosition: 'before',
                decimalPlaces: 2,
                autoLogout: false,
                sessionTimeout: 30,
                printReceipts: true,
                soundEffects: true
            };
        }
        if (!persistentData.customers) persistentData.customers = [];
        if (!persistentData.products) persistentData.products = [];
        if (!persistentData.sales) persistentData.sales = [];

        databaseService = {
            async initialize() {
                console.log('Persistent mock database initialized');
                return Promise.resolve();
            },
            close() {
                console.log('Persistent mock database closed');
                // Save data to file
                try {
                    fs.writeFileSync(dataPath, JSON.stringify(persistentData, null, 2));
                    console.log('Data saved to:', dataPath);
                } catch (error) {
                    console.error('Error saving data:', error);
                }
            },
            async getCompanySettings() {
                return persistentData.settings;
            },
            async updateCompanySettings(settings) {
                console.log('Updating persistent settings:', settings);
                persistentData.settings = { ...persistentData.settings, ...settings };
                // Save immediately
                try {
                    fs.writeFileSync(dataPath, JSON.stringify(persistentData, null, 2));
                } catch (error) {
                    console.error('Error saving settings:', error);
                }
                return persistentData.settings;
            },
            async getPreferences() {
                return persistentData.preferences;
            },
            async updatePreferences(preferences) {
                console.log('Updating persistent preferences:', preferences);
                persistentData.preferences = { ...persistentData.preferences, ...preferences };
                // Save immediately
                try {
                    fs.writeFileSync(dataPath, JSON.stringify(persistentData, null, 2));
                } catch (error) {
                    console.error('Error saving preferences:', error);
                }
                return persistentData.preferences;
            },
            async exportData() {
                return {
                    customers: persistentData.customers || [],
                    products: persistentData.products || [],
                    sales: persistentData.sales || [],
                    settings: persistentData.settings || {
                        companyName: 'Eklas Solar Installations',
                        address: '',
                        phone: '',
                        email: '',
                        taxRate: 0.15,
                        currency: 'NLe',
                    },
                    exportedAt: new Date().toISOString(),
                };
            },
            async importData(data) {
                console.log('Importing persistent data:', data);
                persistentData.customers = data.customers || [];
                persistentData.products = data.products || [];
                persistentData.sales = data.sales || [];
                persistentData.settings = data.settings || persistentData.settings;

                // Save immediately
                try {
                    fs.writeFileSync(dataPath, JSON.stringify(persistentData, null, 2));
                } catch (error) {
                    console.error('Error saving imported data:', error);
                }
                return Promise.resolve();
            }
        };
    } else {
        // Try production build path
        databaseService = require('../out/server/lib/database/database.js').databaseService;
    }
} catch {
    console.log('Production database module not found, using development fallback');
    // Fallback mock database service (same as above)
    databaseService = {
        async initialize() {
            console.log('Fallback mock database initialized');
            return Promise.resolve();
        },
        close() {
            console.log('Fallback mock database closed');
        },
        async getCompanySettings() {
            return {
                companyName: 'Eklas Solar Installations',
                address: '',
                phone: '',
                email: '',
                taxRate: 0.15,
                currency: 'NLe',
            };
        },
        async updateCompanySettings(settings) {
            console.log('Mock update settings:', settings);
            return {
                companyName: settings.companyName || 'Eklas Solar Installations',
                address: settings.address || '',
                phone: settings.phone || '',
                email: settings.email || '',
                taxRate: settings.taxRate || 0.15,
                currency: settings.currency || 'NLe',
            };
        },
        async exportData() {
            return {
                customers: [],
                products: [],
                sales: [],
                settings: {
                    companyName: 'Eklas Solar Installations',
                    address: '',
                    phone: '',
                    email: '',
                    taxRate: 0.15,
                    currency: 'NLe',
                },
                exportedAt: new Date().toISOString(),
            };
        },
        async importData(data) {
            console.log('Mock import data:', data);
            return Promise.resolve();
        }
    };
}

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../public/icon.ico'),
        titleBarStyle: 'default',
        show: false,
        title: 'Eklas Solar Installations'
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App event listeners
app.whenReady().then(async () => {
    // Initialize database
    try {
        await databaseService.initialize();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }

    createWindow();
});

app.on('window-all-closed', () => {
    // Close database connection
    databaseService.close();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Create application menu
const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New Sale',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    mainWindow.webContents.send('menu-new-sale');
                }
            },
            {
                label: 'New Customer',
                accelerator: 'CmdOrCtrl+Shift+C',
                click: () => {
                    mainWindow.webContents.send('menu-new-customer');
                }
            },
            {
                label: 'New Product',
                accelerator: 'CmdOrCtrl+Shift+P',
                click: () => {
                    mainWindow.webContents.send('menu-new-product');
                }
            },
            { type: 'separator' },
            {
                label: 'Export Data',
                accelerator: 'CmdOrCtrl+E',
                click: () => {
                    mainWindow.webContents.send('menu-export-data');
                }
            },
            {
                label: 'Import Data',
                accelerator: 'CmdOrCtrl+I',
                click: () => {
                    mainWindow.webContents.send('menu-import-data');
                }
            },
            { type: 'separator' },
            {
                label: 'Exit',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
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

// IPC handlers for database operations
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
        const data = await databaseService.exportData();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

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

ipcMain.handle('export-data', async () => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Sales Data',
            defaultPath: 'house-of-electronics-sales-export.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            const data = await databaseService.exportData();
            fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
            return { success: true, path: result.filePath };
        }

        return { success: false, error: 'Export cancelled' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-data', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
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
