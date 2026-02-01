#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * License Generator Tool
 * 
 * This is a standalone tool for generating signed license files
 * for House of Electronics Sales Manager.
 * 
 * Usage:
 *   node tools/license-generator.js <command> [options]
 * 
 * Commands:
 *   generate-keys              Generate new RSA key pair
 *   create-license             Create a license for a machine
 *   verify-license             Verify a license file
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { LicenseManager } = require('../electron/services/license-manager');

// Key storage paths (KEEP THESE SECURE!)
const KEYS_DIR = path.join(__dirname, '.keys');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Generate new RSA key pair
 */
function generateKeys() {
  console.log('🔐 Generating RSA key pair...');
  
  // Create keys directory if it doesn't exist
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  // Generate key pair
  const keys = LicenseManager.generateKeyPair();

  // Save keys
  fs.writeFileSync(PUBLIC_KEY_PATH, keys.publicKey, 'utf8');
  fs.writeFileSync(PRIVATE_KEY_PATH, keys.privateKey, 'utf8');

  // Restrict permissions on private key (Unix-like systems)
  try {
    fs.chmodSync(PRIVATE_KEY_PATH, 0o600);
  } catch (e) {
    // Windows doesn't support chmod, ignore
  }

  console.log('✅ Keys generated successfully!');
  console.log(`📁 Public key:  ${PUBLIC_KEY_PATH}`);
  console.log(`🔒 Private key: ${PRIVATE_KEY_PATH}`);
  console.log('\n⚠️  IMPORTANT: Keep the private key secure! Never share it!');
  console.log('📋 Copy the public key content into activation-service.js');
}

/**
 * Load keys from storage
 */
function loadKeys() {
  if (!fs.existsSync(PUBLIC_KEY_PATH) || !fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('❌ Keys not found! Run "generate-keys" command first.');
    process.exit(1);
  }

  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const manager = new LicenseManager();
  manager.initializeKeys(publicKey, privateKey);

  return manager;
}

/**
 * Create a license for a machine
 */
async function createLicense() {
  console.log('📝 Creating license for House of Electronics Sales Manager\n');

  const manager = loadKeys();

  // Get machine fingerprint
  const machineFingerprint = await question('Enter machine fingerprint (hash): ');
  if (!machineFingerprint || machineFingerprint.length !== 64) {
    console.error('❌ Invalid machine fingerprint. Must be 64-character SHA-256 hash.');
    rl.close();
    return;
  }

  // Get customer information
  console.log('\n👤 Customer Information (optional):');
  const customerName = await question('Customer name: ');
  const customerEmail = await question('Customer email: ');
  const customerCompany = await question('Customer company: ');

  // Create license
  console.log('\n🔨 Generating license...');
  const licenseData = manager.createLicense(machineFingerprint, {
    name: customerName,
    email: customerEmail,
    company: customerCompany
  });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `license-${licenseData.license.customer.company || 'customer'}-${timestamp}.lic`;
  const outputPath = path.join(__dirname, 'licenses', filename);

  // Create licenses directory if it doesn't exist
  const licensesDir = path.dirname(outputPath);
  if (!fs.existsSync(licensesDir)) {
    fs.mkdirSync(licensesDir, { recursive: true });
  }

  // Save license file
  fs.writeFileSync(outputPath, JSON.stringify(licenseData, null, 2), 'utf8');

  console.log('\n✅ License created successfully!');
  console.log(`📁 License file: ${outputPath}`);
  console.log('\n📋 License Details:');
  console.log(`   Customer: ${licenseData.license.customer.name || 'N/A'}`);
  console.log(`   Company:  ${licenseData.license.customer.company || 'N/A'}`);
  console.log(`   Email:    ${licenseData.license.customer.email || 'N/A'}`);
  console.log(`   Activated: ${licenseData.license.activatedAt}`);
  console.log(`   Expires:   ${licenseData.license.expiresAt || 'Never (Perpetual)'}`);
  console.log('\n📧 Send this license file to the customer.');

  rl.close();
}

/**
 * Verify a license file
 */
async function verifyLicense() {
  console.log('🔍 Verifying license file\n');

  const manager = loadKeys();

  // Get license file path
  const licenseFilePath = await question('Enter path to license file: ');
  
  if (!fs.existsSync(licenseFilePath)) {
    console.error('❌ License file not found!');
    rl.close();
    return;
  }

  // Read license file
  const licenseContent = fs.readFileSync(licenseFilePath, 'utf8');
  let licenseData;
  
  try {
    licenseData = JSON.parse(licenseContent);
  } catch (e) {
    console.error('❌ Invalid license file format!');
    rl.close();
    return;
  }

  // Verify signature
  const isValid = manager.verifyLicenseSignature(licenseData.license, licenseData.signature);

  console.log('\n📋 License Verification Results:');
  console.log(`   Signature: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (isValid) {
    console.log('\n📋 License Details:');
    console.log(`   Customer:  ${licenseData.license.customer.name || 'N/A'}`);
    console.log(`   Company:   ${licenseData.license.customer.company || 'N/A'}`);
    console.log(`   Email:     ${licenseData.license.customer.email || 'N/A'}`);
    console.log(`   Product:   ${licenseData.license.product.name} v${licenseData.license.product.version}`);
    console.log(`   Activated: ${licenseData.license.activatedAt}`);
    console.log(`   Expires:   ${licenseData.license.expiresAt || 'Never (Perpetual)'}`);
    console.log(`   Machine:   ${licenseData.license.machineFingerprint.substring(0, 16)}...`);
  }

  rl.close();
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('📄 House of Electronics Sales Manager - License Generator Tool\n');
  console.log('Usage:');
  console.log('  node tools/license-generator.js <command>\n');
  console.log('Commands:');
  console.log('  generate-keys    Generate new RSA key pair (run this first!)');
  console.log('  create-license   Create a signed license for a customer');
  console.log('  verify-license   Verify a license file signature');
  console.log('  help             Show this help message\n');
  console.log('Examples:');
  console.log('  node tools/license-generator.js generate-keys');
  console.log('  node tools/license-generator.js create-license');
  console.log('  node tools/license-generator.js verify-license\n');
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    showUsage();
    process.exit(0);
  }

  switch (command) {
    case 'generate-keys':
      generateKeys();
      break;

    case 'create-license':
      await createLicense();
      break;

    case 'verify-license':
      await verifyLicense();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Run the tool
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

