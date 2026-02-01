/* eslint-disable @typescript-eslint/no-require-imports */

// Load env (for Supabase keys, etc.)
const path = require('path');
const fs = require('fs');

// Try to load .env file (only in development or if it exists)
// In production builds, env vars should be injected via electron-builder
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    require('dotenv').config({ path: envPath });
    console.log('✅ Loaded .env file');
  } catch (error) {
    console.warn('⚠️  Failed to load .env file:', error.message);
  }
} else {
  console.log('ℹ️  No .env file found (this is normal in production builds)');
}

// Set NODE_ENV to production if not already set (for packaged apps)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// In production, try to read from config file or package.json extraMetadata
// This allows electron-builder to inject env vars at build time
if (process.env.NODE_ENV === 'production') {
  // Try to read from config.json (included in build)
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.SUPABASE_URL && !process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL = config.SUPABASE_URL;
        console.log('✅ Loaded SUPABASE_URL from config.json');
      }
      if (config.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;
        console.log('✅ Loaded SUPABASE_SERVICE_ROLE_KEY from config.json');
      }
    } catch (error) {
      console.warn('⚠️  Could not read config.json:', error.message);
    }
  }
  
  // Also try package.json extraMetadata (alternative method)
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.extraMetadata) {
        if (packageJson.extraMetadata.SUPABASE_URL && !process.env.SUPABASE_URL) {
          process.env.SUPABASE_URL = packageJson.extraMetadata.SUPABASE_URL;
        }
        if (packageJson.extraMetadata.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
          process.env.SUPABASE_SERVICE_ROLE_KEY = packageJson.extraMetadata.SUPABASE_SERVICE_ROLE_KEY;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read extraMetadata from package.json:', error.message);
  }
}

const { app, BrowserWindow } = require('electron');
const isDev = process.env.NODE_ENV === 'development';

// Import our modular components
const { initializeDatabaseService } = require('./services/database-service');
const { createSyncService } = require('./services/sync-service');
const { createCloudApiClient } = require('./services/cloud-api-client');
const { registerAllHandlers } = require('./handlers');
const { createMainWindow } = require('./window-manager');
const { createApplicationMenu } = require('./menu-manager');
const { getProductKeyService } = require('./services/product-key-service');

// Global references
let mainWindow;
let databaseService;
let syncService;

async function initializeApp() {
  try {
    // Initialize database service FIRST (needed for product key check)
    databaseService = initializeDatabaseService();
    
    // Initialize database and WAIT for it to complete
    await databaseService.initialize();

    // Check product key activation (simple check for internal system)
    console.log('🔐 Checking product key activation...');
    const productKeyService = getProductKeyService(databaseService);
    const isActivated = await productKeyService.isActivated();
    
    if (!isActivated) {
      console.log('⚠️ Product key not activated - user will see installation wizard');
      // Don't block - let the UI handle showing the installation wizard
    } else {
      console.log('✅ Product key activated');
    }

    // Initialize sync service
    // First create sync service to initialize tables
    syncService = createSyncService(databaseService, null);
    syncService.initializeSyncTables();
    
    // Then get config and initialize cloud client
    const syncConfig = syncService.getSyncConfig();
    if (syncConfig.sync_enabled && syncConfig.cloud_url && syncConfig.api_key) {
      const cloudApiClient = createCloudApiClient(
        syncConfig.cloud_provider || 'supabase',
        {
          url: syncConfig.cloud_url || '',
          apiKey: syncConfig.api_key || '',
          tablePrefix: syncConfig.table_prefix || ''
        }
      );
      // Recreate sync service with cloud client
      syncService = createSyncService(databaseService, cloudApiClient);
      syncService.initializeSyncTables();
    }

    // Register all IPC handlers AFTER database is ready
    registerAllHandlers(databaseService, syncService);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Show error dialog to user
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Database Initialization Error',
      `Failed to start the application. The database system is not working properly.\n\nError: ${error.message}\n\nThis usually means better-sqlite3 is not properly installed or rebuilt for Electron.`
    );
    
    // Quit the app - can't run without database
    app.quit();
    return false;
  }
}

async function setupApp() {
  try {
    // Create window AFTER database and handlers are ready
    mainWindow = createMainWindow();

    // Create application menu
    createApplicationMenu(mainWindow);

    // Handle window closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error('Failed to setup app:', error);
    throw error;
  }
}

// App event listeners
app.whenReady().then(async () => {
  const initialized = await initializeApp();
  if (initialized) {
    await setupApp(); // ← CRITICAL: Wait for database to be ready
  }
});

app.on('window-all-closed', () => {
  // Close database connection
  if (databaseService) {
    databaseService.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const initialized = await initializeApp();
    if (initialized) {
      await setupApp(); // ← Also wait here (macOS reactivation)
    }
  }
});


// Export for testing or other modules
module.exports = {
  mainWindow,
  databaseService,
  syncService
};
