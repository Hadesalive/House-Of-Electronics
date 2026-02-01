/* eslint-disable @typescript-eslint/no-require-imports */
const NodeRSA = require('node-rsa');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Simple License Generator
 * 
 * This tool creates licenses using a single key pair.
 * Much simpler than the complex multi-key system.
 */

class SimpleLicenseGenerator {
  constructor() {
    this.keysPath = path.join(__dirname, '.keys');
    this.licensesPath = path.join(__dirname, 'licenses');
    this.privateKey = null;
    this.publicKey = null;
  }

  /**
   * Initialize the generator with keys
   */
  initialize() {
    try {
      // Load private key
      const privateKeyPath = path.join(this.keysPath, 'private.pem');
      const publicKeyPath = path.join(this.keysPath, 'public.pem');

      if (!fs.existsSync(privateKeyPath)) {
        console.error('❌ Private key not found at:', privateKeyPath);
        return false;
      }

      if (!fs.existsSync(publicKeyPath)) {
        console.error('❌ Public key not found at:', publicKeyPath);
        return false;
      }

      this.privateKey = new NodeRSA(fs.readFileSync(privateKeyPath, 'utf8'), 'private');
      this.publicKey = new NodeRSA(fs.readFileSync(publicKeyPath, 'utf8'), 'public');

      console.log('✅ Keys loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load keys:', error.message);
      return false;
    }
  }

  /**
   * Create a new license
   */
  async createLicense() {
    if (!this.initialize()) {
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('\n🔑 Simple License Generator');
      console.log('========================\n');

      // Get machine fingerprint
      const machineFingerprint = await this.askQuestion(rl, 'Enter machine fingerprint (64 characters): ');
      if (machineFingerprint.length !== 64) {
        console.log('❌ Machine fingerprint must be 64 characters');
        return;
      }

      // Get customer details
      const customerName = await this.askQuestion(rl, 'Customer name (optional): ');
      const customerEmail = await this.askQuestion(rl, 'Customer email (optional): ');
      const customerCompany = await this.askQuestion(rl, 'Customer company (optional): ');

      // Create license data
      const licenseData = {
        version: '1.0',
        machineFingerprint: machineFingerprint,
        activatedAt: new Date().toISOString(),
        customer: {
          name: customerName || 'Unknown',
          email: customerEmail || '',
          company: customerCompany || 'Unknown'
        },
        product: {
          name: 'House of Electronics Sales Manager',
          version: '1.0.0'
        },
        expiresAt: null // Perpetual license
      };

      console.log('\n📄 Creating license...');

      // Sign the license
      const licenseString = JSON.stringify(licenseData, null, 2);
      const signature = this.privateKey.sign(licenseString, 'base64');

      // Create license file
      const license = {
        license: licenseData,
        signature: signature
      };

      // Save license file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const companyName = customerCompany || 'Unknown';
      const filename = `license-${companyName}-${timestamp}.lic`;
      const filepath = path.join(this.licensesPath, filename);

      // Ensure licenses directory exists
      if (!fs.existsSync(this.licensesPath)) {
        fs.mkdirSync(this.licensesPath, { recursive: true });
      }

      fs.writeFileSync(filepath, JSON.stringify(license, null, 2));

      console.log('✅ License created successfully!');
      console.log(`📁 File: ${filepath}`);
      console.log(`👤 Customer: ${customerName || 'Unknown'}`);
      console.log(`🏢 Company: ${customerCompany || 'Unknown'}`);
      console.log(`🖥️ Machine: ${machineFingerprint.substring(0, 16)}...`);

      // Verify the license
      console.log('\n🔍 Verifying license...');
      const isValid = this.publicKey.verify(licenseString, signature, 'utf8', 'base64');
      console.log(isValid ? '✅ License verification: PASSED' : '❌ License verification: FAILED');

    } catch (error) {
      console.error('❌ Error creating license:', error.message);
    } finally {
      rl.close();
    }
  }

  /**
   * Verify a license file
   */
  async verifyLicense() {
    if (!this.initialize()) {
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('\n🔍 License Verifier');
      console.log('==================\n');

      const licensePath = await this.askQuestion(rl, 'Enter path to license file: ');
      
      if (!fs.existsSync(licensePath)) {
        console.log('❌ License file not found');
        return;
      }

      console.log('📄 Loading license file...');
      const licenseContent = fs.readFileSync(licensePath, 'utf8');
      const licenseData = JSON.parse(licenseContent);

      console.log('🔍 License Details:');
      console.log(`   Customer: ${licenseData.license.customer.name}`);
      console.log(`   Company: ${licenseData.license.customer.company}`);
      console.log(`   Machine: ${licenseData.license.machineFingerprint.substring(0, 16)}...`);
      console.log(`   Activated: ${licenseData.license.activatedAt}`);

      // Verify signature
      const licenseString = JSON.stringify(licenseData.license, null, 2);
      const isValid = this.publicKey.verify(licenseString, licenseData.signature, 'utf8', 'base64');

      console.log('\n🔐 Verification Result:');
      console.log(isValid ? '✅ License signature: VALID' : '❌ License signature: INVALID');

      if (isValid) {
        console.log('🎉 License is ready to use!');
      } else {
        console.log('⚠️ License has been tampered with');
      }

    } catch (error) {
      console.error('❌ Error verifying license:', error.message);
    } finally {
      rl.close();
    }
  }

  /**
   * Ask a question and return the answer
   */
  askQuestion(rl, question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Main execution
async function main() {
  const generator = new SimpleLicenseGenerator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'create-license':
      await generator.createLicense();
      break;
    case 'verify-license':
      await generator.verifyLicense();
      break;
    default:
      console.log('🔑 Simple License Generator');
      console.log('Usage:');
      console.log('  node simple-license-generator.js create-license');
      console.log('  node simple-license-generator.js verify-license');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleLicenseGenerator };
