#!/usr/bin/env node

/**
 * Setup script for the automatic logo processor
 * This script installs the required dependencies and sets up the necessary directories
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Automatic Logo Processor...\n');

try {
  // Create processed directory
  const processedDir = path.join(process.cwd(), 'processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
    console.log('✅ Created processed directory');
  } else {
    console.log('✅ Processed directory already exists');
  }

  // Install required dependencies
  console.log('\n📦 Installing required dependencies...');
  
  const dependencies = [
    'jimp@^0.22.12',
    'tesseract.js@^5.0.4'
  ];

  for (const dep of dependencies) {
    console.log(`Installing ${dep}...`);
    execSync(`npm install ${dep}`, { stdio: 'inherit' });
  }

  console.log('\n✅ All dependencies installed successfully!');

  // Rebuild native modules for Electron
  console.log('\n🔧 Rebuilding native modules for Electron...');
  execSync('npx electron-rebuild', { stdio: 'inherit' });

  console.log('\n🎉 Logo Processor setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart your Electron application');
  console.log('2. Go to Settings > Company');
  console.log('3. Upload a logo to test the automatic processing');
  console.log('\n💡 The system will automatically:');
  console.log('   - Detect text in your logo using OCR');
  console.log('   - Separate the icon from the text');
  console.log('   - Create a clean vertical layout (icon above, text below)');
  console.log('   - Save the processed logo for use in invoices');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
