#!/usr/bin/env node

/**
 * Port Detection Script for Electron + Next.js
 *
 * This script detects what port the Next.js dev server is running on
 * and saves it to a .dev-port file that Electron can read.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Common dev server ports (Vite default is 5173, Next.js is 3000)
const possiblePorts = [5173, 3000, 3001, 3002, 3003, 3004, 3005];

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => {
      resolve(port);
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function detectDevServerPort() {
  console.log('🔍 Detecting dev server port...');

  // Check all possible ports
  for (const port of possiblePorts) {
    const detectedPort = await checkPort(port);
    if (detectedPort) {
      console.log(`✅ Found dev server on port ${detectedPort}`);
      return detectedPort;
    }
  }

  // If no port found, default to 5173 (Vite's default)
  console.log('⚠️ No dev server found, defaulting to port 5173');
  return 5173;
}

async function main() {
  try {
    const port = await detectDevServerPort();

    // Save port to file for Electron to read
    const portFile = path.join(__dirname, '..', '.dev-port');
    fs.writeFileSync(portFile, port.toString());

    console.log(`📝 Saved port ${port} to .dev-port file`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error detecting port:', error);
    process.exit(1);
  }
}

main();
