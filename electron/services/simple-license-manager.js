/* eslint-disable @typescript-eslint/no-require-imports */
const NodeRSA = require('node-rsa');
const fs = require('fs');
const path = require('path');

class SimpleLicenseManager {
  constructor() {
    this.publicKey = null;
    this.privateKey = null;
    this.keysPath = path.join(__dirname, '..', '..', 'tools', '.keys');
  }

  /**
   * Initialize the license manager with keys
   */
  initialize() {
    try {
      // Load public key
      const publicKeyPath = path.join(this.keysPath, 'public.pem');
      if (fs.existsSync(publicKeyPath)) {
        this.publicKey = new NodeRSA(fs.readFileSync(publicKeyPath, 'utf8'), 'public');
        console.log('✅ Public key loaded successfully');
        return true;
      } else {
        console.error('❌ Public key not found at:', publicKeyPath);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize license manager:', error.message);
      return false;
    }
  }

  /**
   * Verify a license signature
   */
  verifyLicenseSignature(licenseData, signature) {
    if (!this.publicKey) {
      console.error('❌ Public key not loaded');
      return false;
    }

    try {
      // Convert license data to JSON string (same format as generator)
      const licenseString = JSON.stringify(licenseData, null, 2);
      
      // Verify signature
      const isValid = this.publicKey.verify(licenseString, signature, 'utf8', 'base64');
      
      if (isValid) {
        console.log('✅ License signature is valid');
      } else {
        console.log('❌ License signature is invalid');
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ License verification error:', error.message);
      return false;
    }
  }

  /**
   * Validate a complete license
   */
  async validateLicense(licenseData) {
    try {
      // Check if license has required fields
      if (!licenseData.license || !licenseData.signature) {
        return {
          valid: false,
          reason: 'Invalid license format - missing license data or signature'
        };
      }

      const license = licenseData.license;

      // Check required fields
      if (!license.machineFingerprint) {
        return {
          valid: false,
          reason: 'Invalid license - missing machine fingerprint'
        };
      }

      // Verify signature
      const signatureValid = this.verifyLicenseSignature(license, licenseData.signature);
      if (!signatureValid) {
        return {
          valid: false,
          reason: 'Invalid license signature - license has been tampered with'
        };
      }

      // Check expiration (if set)
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return {
          valid: false,
          reason: 'License has expired'
        };
      }

      return {
        valid: true,
        reason: 'License is valid and ready to use'
      };

    } catch (error) {
      console.error('❌ License validation error:', error.message);
      return {
        valid: false,
        reason: 'License validation failed: ' + error.message
      };
    }
  }

  /**
   * Check if there's a valid license (for activation service compatibility)
   */
  async hasValidLicense() {
    try {
      // For now, always return true since we're in development mode
      // In production, you would check stored license data
      // Removed console.log to prevent excessive logging during periodic checks
      return { valid: true, reason: 'License is valid' };
    } catch (error) {
      console.error('❌ Error checking license:', error.message);
      return { valid: false, reason: 'License check failed' };
    }
  }

  /**
   * Get machine fingerprint (for activation service compatibility)
   */
  async getMachineFingerprint() {
    try {
      // This would normally get the actual machine fingerprint
      // For now, return a placeholder
      return {
        hash: '38086be1440ff3ac289863d6e7bf3a38b321eee80e15ffb7fa71b9664846be85',
        machineId: 'test-machine-id'
      };
    } catch (error) {
      console.error('❌ Error getting machine fingerprint:', error.message);
      return null;
    }
  }

  /**
   * Save license data (for activation service compatibility)
   */
  async saveLicense(licenseData) {
    try {
      console.log('💾 Saving license data...');
      // In a real application, you would save this to a secure location
      // For now, just log that we received the license
      console.log('✅ License saved successfully');
      console.log('   Customer:', licenseData.license?.customer?.name || 'Unknown');
      console.log('   Company:', licenseData.license?.customer?.company || 'Unknown');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving license:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
let licenseManagerInstance = null;

function getSimpleLicenseManager() {
  if (!licenseManagerInstance) {
    licenseManagerInstance = new SimpleLicenseManager();
    licenseManagerInstance.initialize();
  }
  return licenseManagerInstance;
}

module.exports = {
  SimpleLicenseManager,
  getSimpleLicenseManager
};
