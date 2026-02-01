#!/usr/bin/env node

/**
 * macOS License Generator Tool
 * 
 * Standalone license generator that works on macOS without Electron dependencies.
 * This version includes all necessary components inline.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');

// Key storage paths (KEEP THESE SECURE!)
const KEYS_DIR = path.join(__dirname, '.keys');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const LICENSES_DIR = path.join(__dirname, 'licenses');

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
    console.log('📁 Created keys directory');
  }
  
  try {
    // Generate 2048-bit RSA key pair
    const key = new NodeRSA({ b: 2048 });
    
    const publicKey = key.exportKey('public');
    const privateKey = key.exportKey('private');
    
    // Save keys to files
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    
    console.log('✅ Keys generated successfully!');
    console.log(`📄 Public key: ${PUBLIC_KEY_PATH}`);
    console.log(`🔑 Private key: ${PRIVATE_KEY_PATH}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Keep your private key secure!');
    console.log('   Never share the private key with customers.');
    console.log('   Only the public key is embedded in your app.');
    
    return { publicKey, privateKey };
  } catch (error) {
    console.error('❌ Failed to generate keys:', error.message);
    return null;
  }
}

/**
 * Get machine identifier (simplified version for license generation)
 */
function getMachineIdentifier() {
  const os = require('os');
  const { networkInterfaces } = require('os');
  
  try {
    // Get basic system info
    const platform = os.platform();
    const hostname = os.hostname();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const uptime = os.uptime();
    
    // Get CPU info
    const cpus = os.cpus();
    const cpuInfo = cpus && cpus.length > 0 ? cpus[0].model : 'Unknown';
    
    // Get MAC addresses
    const interfaces = networkInterfaces();
    const macAddresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.mac && iface.mac !== '00:00:00:00:00:00' && !iface.internal) {
          macAddresses.push(iface.mac);
        }
      }
    }
    
    // Create a deterministic identifier
    const rawIdentifier = `${platform}-${hostname}-${totalMem}-${freeMem}-${uptime}-${cpuInfo}-${macAddresses.sort().join('-')}`;
    const hash = crypto.createHash('sha256').update(rawIdentifier).digest('hex');
    
    return {
      machineId: hash.substring(0, 16).toUpperCase(),
      fullHash: hash,
      platform,
      hostname,
      displayInfo: {
        os: `${os.platform()} ${os.release()}`,
        arch: os.arch(),
        cpu: cpuInfo,
        cores: cpus ? cpus.length : 0
      }
    };
  } catch (error) {
    console.error('❌ Failed to get machine identifier:', error.message);
    return null;
  }
}

/**
 * Create a license for a machine
 */
async function createLicense() {
  console.log('📝 Creating license...');
  
  // Check if keys exist
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.log('❌ Private key not found. Please generate keys first.');
    console.log('   Run: node tools/license-generator-macos.js generate-keys');
    return;
  }
  
  try {
    // Load private key
    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    const privateKey = new NodeRSA(privateKeyPem, 'private');
    
    // Get customer information
    const customerName = await question('👤 Customer name: ');
    const customerEmail = await question('📧 Customer email: ');
    const customerCompany = await question('🏢 Customer company: ');
    
    // Get machine ID
    const machineId = await question('🖥️  Machine ID (64-character hash): ');
    
    if (machineId.length !== 64) {
      console.log('❌ Invalid machine ID. Must be 64-character SHA-256 hash.');
      return;
    }
    
    // Create license data
    const licenseData = {
      version: '1.0',
      machineFingerprint: machineId,
      activatedAt: new Date().toISOString(),
      customer: {
        name: customerName,
        email: customerEmail,
        company: customerCompany
      },
      product: {
        name: 'House of Electronics Sales Manager',
        version: '1.0.0'
      },
      expiresAt: null // null = perpetual license
    };
    
    // Sign the license
    const licenseString = JSON.stringify(licenseData, null, 2);
    const signature = privateKey.sign(licenseString, 'base64');
    
    // Create final license
    const license = {
      license: licenseData,
      signature: signature
    };
    
    // Create licenses directory
    if (!fs.existsSync(LICENSES_DIR)) {
      fs.mkdirSync(LICENSES_DIR, { recursive: true });
    }
    
    // Save license file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `license-${customerCompany.replace(/\s+/g, '')}-${timestamp}.lic`;
    const licensePath = path.join(LICENSES_DIR, filename);
    
    fs.writeFileSync(licensePath, JSON.stringify(license, null, 2));
    
    console.log('✅ License created successfully!');
    console.log(`📄 License file: ${licensePath}`);
    console.log('');
    console.log('📋 License Details:');
    console.log(`   Customer: ${customerName} (${customerEmail})`);
    console.log(`   Company: ${customerCompany}`);
    console.log(`   Machine ID: ${machineId.substring(0, 16)}...`);
    console.log(`   Issued: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Failed to create license:', error.message);
  }
}

/**
 * Verify a license file
 */
async function verifyLicense() {
  console.log('🔍 Verifying license...');
  
  const licensePath = await question('📄 License file path: ');
  
  if (!fs.existsSync(licensePath)) {
    console.log('❌ License file not found.');
    return;
  }
  
  try {
    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    const license = JSON.parse(licenseContent);
    
    // Load public key
    const publicKey = new NodeRSA(license.publicKey, 'public');
    
    // Verify signature
    const licenseString = JSON.stringify(license.license, null, 2);
    const isValid = publicKey.verify(licenseString, license.signature, 'utf8', 'base64');
    
    if (isValid) {
      console.log('✅ License is valid!');
      console.log('');
      console.log('📋 License Details:');
      console.log(`   Customer: ${license.license.customer.name}`);
      console.log(`   Company: ${license.license.customer.company}`);
      console.log(`   Machine ID: ${license.license.machineFingerprint.substring(0, 16)}...`);
      console.log(`   Issued: ${new Date(license.license.issuedAt).toLocaleString()}`);
    } else {
      console.log('❌ License signature is invalid!');
    }
    
  } catch (error) {
    console.error('❌ Failed to verify license:', error.message);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('🔐 House of Electronics Sales Manager - License Generator (macOS)');
  console.log('====================================================');
  console.log('');
  console.log('Usage: node tools/license-generator-macos.js <command>');
  console.log('');
  console.log('Commands:');
  console.log('  generate-keys     Generate new RSA key pair');
  console.log('  create-license    Create a license for a machine');
  console.log('  verify-license    Verify a license file');
  console.log('  help              Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node tools/license-generator-macos.js generate-keys');
  console.log('  node tools/license-generator-macos.js create-license');
  console.log('  node tools/license-generator-macos.js verify-license');
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  
  console.log('🍎 House of Electronics Sales Manager - License Generator (macOS)');
  console.log('====================================================');
  console.log('');
  
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
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.log('❌ Unknown command. Use "help" to see available commands.');
      showHelp();
      break;
  }
  
  rl.close();
}

// Run the main function
main().catch(console.error);
