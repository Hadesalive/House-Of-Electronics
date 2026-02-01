/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const NodeRSA = require('node-rsa');

/**
 * Key Manager - Manages multiple public keys for license validation
 * 
 * This service allows the application to validate licenses signed with
 * different key pairs, providing backward compatibility and key rotation.
 */

class KeyManager {
  constructor() {
    this.keysDirectory = path.join(__dirname, '..', '..', 'tools', '.keys');
    this.publicKeys = [];
    this.primaryKey = null;
  }

  /**
   * Initialize the key manager with all available public keys
   */
  initialize() {
    try {
      // Load all public keys from the keys directory
      this.loadAllPublicKeys();
      
      // If no keys found, add the embedded fallback key
      if (this.publicKeys.length === 0) {
        this.addEmbeddedKey();
      }
      
      // Set the primary key (most recent or specified)
      this.setPrimaryKey();
      
      console.log(`🔑 Loaded ${this.publicKeys.length} public keys`);
      return true;
    } catch (error) {
      console.error('Failed to initialize key manager:', error);
      return false;
    }
  }

  /**
   * Load all public keys from the keys directory
   */
  loadAllPublicKeys() {
    try {
      if (!fs.existsSync(this.keysDirectory)) {
        console.warn('Keys directory not found, using embedded keys only');
        return;
      }

      const files = fs.readdirSync(this.keysDirectory);
      const publicKeyFiles = files.filter(file => file.endsWith('.pem') && file.includes('public'));

      for (const file of publicKeyFiles) {
        try {
          const keyPath = path.join(this.keysDirectory, file);
          const keyContent = fs.readFileSync(keyPath, 'utf8');
          
          // Parse key info from filename (e.g., "public-2025-01-01.pem")
          const keyInfo = this.parseKeyFilename(file);
          
          this.publicKeys.push({
            id: keyInfo.id,
            date: keyInfo.date,
            content: keyContent,
            path: keyPath
          });
          
          console.log(`🔑 Loaded public key: ${keyInfo.id} (${keyInfo.date})`);
        } catch (error) {
          console.error(`Failed to load key ${file}:`, error);
        }
      }

      // Sort keys by date (newest first)
      this.publicKeys.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Failed to load public keys:', error);
    }
  }

  /**
   * Parse key information from filename
   */
  parseKeyFilename(filename) {
    // Expected format: "public-2025-01-01.pem" or "public.pem"
    const match = filename.match(/public(?:-(\d{4}-\d{2}-\d{2}))?\.pem/);
    
    if (match) {
      return {
        id: match[1] ? `key-${match[1]}` : 'default',
        date: match[1] || '2025-01-01'
      };
    }
    
    return {
      id: 'unknown',
      date: '2025-01-01'
    };
  }

  /**
   * Set the primary key (most recent or specified)
   */
  setPrimaryKey() {
    if (this.publicKeys.length > 0) {
      this.primaryKey = this.publicKeys[0]; // Most recent key
      console.log(`🔑 Primary key set to: ${this.primaryKey.id}`);
    } else {
      console.warn('No public keys found, using embedded key only');
    }
  }

  /**
   * Verify a license signature with all available public keys
   */
  verifySignature(licenseData, signature) {
    // Try primary key first
    if (this.primaryKey) {
      const isValid = this.verifyWithKey(this.primaryKey.content, licenseData, signature);
      if (isValid) {
        console.log(`✅ License verified with primary key: ${this.primaryKey.id}`);
        return true;
      }
    }

    // Try all other keys
    for (const key of this.publicKeys) {
      if (key === this.primaryKey) continue; // Already tried
      
      const isValid = this.verifyWithKey(key.content, licenseData, signature);
      if (isValid) {
        console.log(`✅ License verified with key: ${key.id}`);
        return true;
      }
    }

    console.log('❌ License signature verification failed with all keys');
    return false;
  }

  /**
   * Verify signature with a specific public key
   */
  verifyWithKey(publicKeyContent, licenseData, signature) {
    try {
      const publicKey = new NodeRSA(publicKeyContent, 'public');
      // licenseData is already a JSON string, don't stringify it again
      return publicKey.verify(licenseData, signature, 'utf8', 'base64');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get all available public keys (for debugging)
   */
  getAllKeys() {
    return this.publicKeys.map(key => ({
      id: key.id,
      date: key.date,
      path: key.path
    }));
  }

  /**
   * Get the primary key content
   */
  getPrimaryKey() {
    return this.primaryKey ? this.primaryKey.content : null;
  }

  /**
   * Add a new public key (for key rotation)
   */
  addPublicKey(keyContent, keyId = null) {
    const keyInfo = {
      id: keyId || `key-${new Date().toISOString().split('T')[0]}`,
      date: new Date().toISOString().split('T')[0],
      content: keyContent,
      path: null
    };

    this.publicKeys.unshift(keyInfo); // Add to beginning (newest first)
    console.log(`🔑 Added new public key: ${keyInfo.id}`);
  }

  /**
   * Add the embedded fallback public key
   */
  addEmbeddedKey() {
    const embeddedKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzT9baE4KCINz0g03DU5a
C/gU0+mb7qeE0/a/bcqEjTrrvkRz/xE28POwV9rjdMO/+oEW5BtAO20bXyClZQ/7
ItUhuAEopQol+Ni4nVbUclFWpy63LgS/lA0+Qdp0HA4tIV0MRsENQCjDxoxvKsW1
f/ooWEJtrcACNWmzjDbKKFJRCmI2agYFHaC6k0VF2cPXwUDCudKDezI6DJBy9Ggh
tzmI5fcTPfTKEfdOutqtNMHxXwxJ0hNHYUTqmCJNt7XrQ0iEX2H4DXiXjEr9aRo1
fUR8FXa5W/KeFa7fNWa0QptE6dulaDejFBb+29Zo4m9rJXcVZ526KVerH2DTeNGG
lQIDAQAB
-----END PUBLIC KEY-----`;

    this.publicKeys.push({
      id: 'embedded-fallback',
      date: '2025-01-01',
      content: embeddedKey,
      path: 'embedded'
    });

    console.log('🔑 Added embedded fallback key');
  }
}

// Export singleton instance
let instance = null;

function getKeyManager() {
  if (!instance) {
    instance = new KeyManager();
    instance.initialize();
  }
  return instance;
}

module.exports = {
  getKeyManager,
  KeyManager
};
