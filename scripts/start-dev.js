#!/usr/bin/env node

/**
 * Windows-compatible development server startup script
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port) {
  console.log(`⏳ Waiting for dev server on port ${port}...`);
  
  for (let i = 0; i < 30; i++) {
    if (await checkPort(port)) {
      console.log(`✅ Dev server is ready on port ${port}`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`❌ Dev server not ready after 30 seconds`);
  return false;
}

async function findVitePort() {
  // Try common Vite ports
  const ports = [5173, 5174, 5175, 5176, 5177];
  
  for (const port of ports) {
    if (await checkPort(port)) {
      return port;
    }
  }
  
  return null;
}

async function main() {
  console.log('🚀 Starting development environment...');
  
  // Start Vite dev server
  console.log('📦 Starting Vite dev server...');
  const vite = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  
  // Wait a moment for Vite to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Find which port Vite is actually using
  const vitePort = await findVitePort();
  
  if (vitePort) {
    console.log(`✅ Dev server is ready on port ${vitePort}`);
    console.log('🎯 Starting Electron...');
    
    // Start Electron with the correct port
    const electron = spawn('npx', ['cross-env', `NODE_ENV=development`, `DEV_PORT=${vitePort}`, 'electron', '.'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      vite.kill();
      electron.kill();
      process.exit(0);
    });
    
    electron.on('close', () => {
      console.log('🔚 Electron closed');
      vite.kill();
      process.exit(0);
    });
  } else {
    console.log('❌ Failed to find Vite dev server on any port');
    vite.kill();
    process.exit(1);
  }
}

main().catch(console.error);
