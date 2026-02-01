/* eslint-disable @typescript-eslint/no-require-imports */
const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

function getDevServerPort() {
    // Try to read from .dev-port file first (created by detect-port.js)
    try {
        const portFile = path.join(__dirname, '..', '.dev-port');
        if (fs.existsSync(portFile)) {
            const port = parseInt(fs.readFileSync(portFile, 'utf8').trim());
            if (port && port > 0) {
                return port;
            }
        }
    } catch (error) {
        console.log('Could not read .dev-port file:', error.message);
    }

    // Fallback to environment variable
    if (process.env.DEV_PORT) {
        return parseInt(process.env.DEV_PORT);
    }

    // Final fallback to default port (Vite's default)
    return 5173;
}

function createMainWindow() {
    // Create the browser window
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // Allow loading local files for development
            spellcheck: false, // Disable spellcheck to avoid input interference
            enableWebSQL: false,
            // Ensure inputs can receive keyboard events properly
            nativeWindowOpen: true
        },
        icon: path.join(__dirname, '../public/images/hoe logo.png'),
        titleBarStyle: 'default',
        show: false,
        title: 'House Of Electronics'
    });

    // Load the app
    if (isDev) {
        // In development, detect the actual port the dev server is running on
        const devPort = getDevServerPort();
        console.log(`🔗 Loading dev server on port ${devPort}`);

        // Add debugging for page load events
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('✅ Page finished loading');
        });

        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('❌ Page failed to load:', errorCode, errorDescription);
        });

        mainWindow.webContents.on('console-message', (event, level, message) => {
            console.log(`🌐 Browser console [${level}]:`, message);
        });

        mainWindow.loadURL(`http://localhost:${devPort}`);
        // mainWindow.webContents.openDevTools(); // Disabled for cleaner development
    } else {
        // In production, serve the static files via HTTP server
        const express = require('express');
        const app = express();
        const server = require('http').createServer(app);

        // Get the correct path to dist folder (works both in dev and packaged app)
        const { app: electronApp } = require('electron');
        const distPath = isDev
            ? path.join(__dirname, '../dist')
            : path.join(electronApp.getAppPath(), 'dist');

        console.log('Production dist path:', distPath);
        console.log('Dist exists:', fs.existsSync(distPath));
        if (fs.existsSync(distPath)) {
            console.log('Dist contents:', fs.readdirSync(distPath));
        }

        // Serve static files from Vite build output with proper MIME types
        app.use(express.static(distPath, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                } else if (filePath.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css');
                } else if (filePath.endsWith('.html')) {
                    res.setHeader('Content-Type', 'text/html');
                }
            }
        }));

        // SPA fallback: serve index.html for all non-static routes (React Router handles routing)
        app.use((req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });

        // Start server on a random port
        const port = 0; // Let the system choose an available port
        server.listen(port, () => {
            const actualPort = server.address().port;
            console.log(`🌐 Serving production build on port ${actualPort}`);
            mainWindow.loadURL(`http://localhost:${actualPort}/`);

            // DevTools disabled for production
            // mainWindow.webContents.openDevTools();
        });

        // Handle server errors gracefully
        server.on('error', (err) => {
            console.error('Server error:', err.message);
        });
    }

    // Show window when ready
    mainWindow.once('ready-to-show', async () => {
        mainWindow.show();

        // Note: License validation and redirects are handled by LicenseGuard component
        // in the React app, which uses client-side navigation. This avoids full page reloads.
        // The initial license check happens during app initialization in main.js
    });

    return mainWindow;
}

module.exports = {
    createMainWindow
};
