/* eslint-disable @typescript-eslint/no-require-imports */
const NodeRSA = require('node-rsa');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getLicenseService } = require('./license-service');
const { getKeyManager } = require('./key-manager');

// Windows Registry support (only on Windows)
let Registry = null;
if (process.platform === 'win32') {
    try {
        Registry = require('winreg');
    } catch {
        console.warn('Windows Registry module not available');
    }
}

/**
 * License Manager - License Validation, Storage, and Encryption
 * 
 * This service manages license validation, storage across multiple locations,
 * and provides tamper detection. It uses RSA encryption to ensure licenses
 * cannot be forged or modified.
 */

class LicenseManager {
    constructor() {
        this.licenseService = getLicenseService();
        this.keyManager = getKeyManager();
        this.encryptionKey = this.deriveEncryptionKey();

        // Storage locations for redundancy
        this.storagePaths = this.getStoragePaths();

        // Legacy support for single public key
        this.publicKey = null;
        this.privateKey = null; // Only used in license generator tool
    }

    /**
     * Initialize RSA keys
     * Public key is embedded in app, private key only exists in license generator
     */
    initializeKeys(publicKeyPem, privateKeyPem = null) {
        this.publicKey = new NodeRSA(publicKeyPem, 'public');
        if (privateKeyPem) {
            this.privateKey = new NodeRSA(privateKeyPem, 'private');
        }
    }

    /**
     * Generate RSA key pair (only used in license generator tool)
     */
    static generateKeyPair() {
        const key = new NodeRSA({ b: 2048 });
        return {
            publicKey: key.exportKey('public'),
            privateKey: key.exportKey('private')
        };
    }

    /**
     * Derive an encryption key from machine-specific data
     * This adds an extra layer of protection
     */
    deriveEncryptionKey() {
        try {
            const machineId = this.licenseService.getMachineId();
            const salt = 'HouseOfElectronicsSalesManager-2025'; // Application-specific salt
            const key = crypto.pbkdf2Sync(machineId || 'fallback', salt, 100000, 32, 'sha256');
            return key;
        } catch (error) {
            console.error('Failed to derive encryption key:', error);
            // Fallback key (less secure but ensures app doesn't crash)
            return crypto.randomBytes(32);
        }
    }

    /**
     * Get all storage paths for license files
     * Multiple locations for redundancy and tamper detection
     */
    getStoragePaths() {
        const paths = [];

        try {
            // Get user data directory
            const { app } = require('electron');
            if (app && app.getPath) {
                const userDataPath = app.getPath('userData');
                paths.push(path.join(userDataPath, '.license'));
                paths.push(path.join(userDataPath, 'config', '.lic'));
            }
        } catch {
            // Fallback if Electron app not available
        }

        // Additional hidden locations
        if (process.platform === 'win32') {
            paths.push(path.join(os.homedir(), 'AppData', 'Local', 'HouseOfElectronics', '.license'));
            paths.push(path.join(os.homedir(), 'AppData', 'Roaming', 'HouseOfElectronics', '.lic'));
        } else {
            paths.push(path.join(os.homedir(), '.houseofelectronics', '.license'));
            paths.push(path.join(os.homedir(), '.config', 'houseofelectronics', '.lic'));
        }

        return paths;
    }

    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encryptedData) {
        try {
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                this.encryptionKey,
                Buffer.from(encryptedData.iv, 'hex')
            );

            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    /**
     * Create a signed license (used in license generator tool)
     */
    createLicense(machineFingerprint, customerInfo = {}) {
        if (!this.privateKey) {
            throw new Error('Private key required to create licenses');
        }

        const license = {
            version: '1.0',
            machineFingerprint: machineFingerprint,
            activatedAt: new Date().toISOString(),
            customer: {
                name: customerInfo.name || '',
                email: customerInfo.email || '',
                company: customerInfo.company || ''
            },
            product: {
                name: 'House of Electronics Sales Manager',
                version: '1.0.0'
            },
            expiresAt: null // null = perpetual license
        };

        // Sign the license with private key
        const licenseData = JSON.stringify(license);
        const signature = this.privateKey.sign(licenseData, 'base64');

        return {
            license,
            signature
        };
    }

    /**
     * Verify a license signature using the key manager
     */
    verifyLicenseSignature(license, signature) {
        try {
            // Use the key manager to try all available public keys
            const licenseData = JSON.stringify(license, null, 2);
            return this.keyManager.verifySignature(licenseData, signature);
        } catch (error) {
            console.error('License signature verification failed:', error);
            return false;
        }
    }

    /**
     * Validate a license against the current machine
     */
    async validateLicense(licenseData) {
        try {
            const { license, signature } = licenseData;

            // 1. Verify signature
            if (!this.verifyLicenseSignature(license, signature)) {
                return {
                    valid: false,
                    reason: 'Invalid license signature - license has been tampered with'
                };
            }

            // 2. Check if license has expired
            if (license.expiresAt) {
                const expiryDate = new Date(license.expiresAt);
                if (new Date() > expiryDate) {
                    return {
                        valid: false,
                        reason: 'License has expired'
                    };
                }
            }

            // 3. Verify machine fingerprint
            const currentFingerprint = await this.licenseService.generateHardwareFingerprint();
            if (currentFingerprint.hash !== license.machineFingerprint) {
                // Check if it's a minor hardware change
                const hardwareChange = await this.licenseService.detectHardwareChange({
                    raw: { machineId: license.machineFingerprint },
                    hash: license.machineFingerprint
                });

                if (hardwareChange.changed && hardwareChange.severity === 'high') {
                    return {
                        valid: false,
                        reason: 'License is locked to different hardware',
                        details: `Changed components: ${hardwareChange.components.join(', ')}`
                    };
                }
            }

            // 4. All checks passed
            return {
                valid: true,
                license: license
            };
        } catch (error) {
            console.error('License validation error:', error);
            return {
                valid: false,
                reason: 'License validation failed: ' + error.message
            };
        }
    }

    /**
     * Save license to all storage locations
     */
    async saveLicense(licenseData) {
        try {
            // Encrypt the license data
            const encrypted = this.encrypt(licenseData);
            const encryptedString = JSON.stringify(encrypted);

            // Save to filesystem locations
            let savedCount = 0;
            for (const storagePath of this.storagePaths) {
                try {
                    const dir = path.dirname(storagePath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    fs.writeFileSync(storagePath, encryptedString, 'utf8');
                    savedCount++;
                } catch (error) {
                    console.error(`Failed to save license to ${storagePath}:`, error);
                }
            }

            // Save to Windows Registry (if available)
            if (Registry && process.platform === 'win32') {
                try {
                    await this.saveLicenseToRegistry(encryptedString);
                    savedCount++;
                } catch (error) {
                    console.error('Failed to save license to registry:', error);
                }
            }

            return savedCount > 0;
        } catch (error) {
            console.error('Failed to save license:', error);
            return false;
        }
    }

    /**
     * Save license to Windows Registry
     */
    saveLicenseToRegistry(encryptedLicense) {
        return new Promise((resolve, reject) => {
            if (!Registry) {
                return reject(new Error('Registry not available'));
            }

            const regKey = new Registry({
                hive: Registry.HKCU,
                key: '\\Software\\HouseOfElectronics\\SalesManager'
            });

            regKey.set('License', Registry.REG_SZ, encryptedLicense, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Load license from storage
     */
    async loadLicense() {
        // Try filesystem locations first
        for (const storagePath of this.storagePaths) {
            try {
                if (fs.existsSync(storagePath)) {
                    const encryptedString = fs.readFileSync(storagePath, 'utf8');
                    const encrypted = JSON.parse(encryptedString);
                    const decrypted = this.decrypt(encrypted);

                    if (decrypted) {
                        return decrypted;
                    }
                }
            } catch (error) {
                console.error(`Failed to load license from ${storagePath}:`, error);
            }
        }

        // Try Windows Registry
        if (Registry && process.platform === 'win32') {
            try {
                const licenseData = await this.loadLicenseFromRegistry();
                if (licenseData) {
                    return licenseData;
                }
            } catch (error) {
                console.error('Failed to load license from registry:', error);
            }
        }

        return null;
    }

    /**
     * Load license from Windows Registry
     */
    loadLicenseFromRegistry() {
        return new Promise((resolve) => {
            if (!Registry) {
                return resolve(null);
            }

            const regKey = new Registry({
                hive: Registry.HKCU,
                key: '\\Software\\HouseOfElectronics\\SalesManager'
            });

            regKey.get('License', (err, item) => {
                if (err || !item) {
                    resolve(null);
                } else {
                    try {
                        const encrypted = JSON.parse(item.value);
                        const decrypted = this.decrypt(encrypted);
                        resolve(decrypted);
                    } catch {
                        resolve(null);
                    }
                }
            });
        });
    }

    /**
     * Check if a valid license exists
     */
    async hasValidLicense() {
        try {
            const licenseData = await this.loadLicense();
            if (!licenseData) {
                return {
                    valid: false,
                    reason: 'No license found'
                };
            }

            return await this.validateLicense(licenseData);
        } catch (error) {
            console.error('Failed to check license:', error);
            return {
                valid: false,
                reason: 'License check failed: ' + error.message
            };
        }
    }

    /**
     * Delete all license files (for testing or license reset)
     */
    async deleteLicense() {
        let deletedCount = 0;

        // Delete from filesystem
        for (const storagePath of this.storagePaths) {
            try {
                if (fs.existsSync(storagePath)) {
                    fs.unlinkSync(storagePath);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Failed to delete license from ${storagePath}:`, error);
            }
        }

        // Delete from Registry
        if (Registry && process.platform === 'win32') {
            try {
                await this.deleteLicenseFromRegistry();
                deletedCount++;
            } catch (error) {
                console.error('Failed to delete license from registry:', error);
            }
        }

        return deletedCount > 0;
    }

    /**
     * Delete license from Windows Registry
     */
    deleteLicenseFromRegistry() {
        return new Promise((resolve) => {
            if (!Registry) {
                return resolve();
            }

            const regKey = new Registry({
                hive: Registry.HKCU,
                key: '\\Software\\HouseOfElectronics\\SalesManager'
            });

            regKey.remove('License', () => {
                resolve(); // Always resolve, even if it fails
            });
        });
    }
}

// Export singleton instance
let instance = null;

function getLicenseManager() {
    if (!instance) {
        instance = new LicenseManager();
    }
    return instance;
}

module.exports = {
    getLicenseManager,
    LicenseManager
};

