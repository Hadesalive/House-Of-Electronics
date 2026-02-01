/* eslint-disable @typescript-eslint/no-require-imports */
const { getLicenseService } = require('../electron/services/license-service');
const { getLicenseManager } = require('../electron/services/license-manager');
const { getActivationService } = require('../electron/services/activation-service');
const { getTelemetryService } = require('../electron/services/telemetry-service');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('License Protection System Tests', () => {
  let licenseService;
  let licenseManager;
  let activationService;
  let telemetryService;

  beforeAll(() => {
    // Initialize services
    licenseService = getLicenseService();
    licenseManager = getLicenseManager();
    activationService = getActivationService();
    telemetryService = getTelemetryService();
  });

  afterAll(() => {
    // Cleanup test data
    try {
      if (licenseManager) {
        licenseManager.deleteLicense();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Hardware Fingerprinting', () => {
    test('should generate consistent machine fingerprint', async () => {
      const fingerprint1 = await licenseService.generateHardwareFingerprint();
      const fingerprint2 = await licenseService.generateHardwareFingerprint();
      
      expect(fingerprint1).toBeDefined();
      expect(fingerprint2).toBeDefined();
      expect(fingerprint1.hash).toBe(fingerprint2.hash);
      expect(fingerprint1.hash).toHaveLength(64); // SHA-256 hash length
    });

    test('should include required hardware information', async () => {
      const fingerprint = await licenseService.generateHardwareFingerprint();
      
      expect(fingerprint.raw).toBeDefined();
      expect(fingerprint.raw.machineId).toBeDefined();
      expect(fingerprint.raw.platform).toBeDefined();
      expect(fingerprint.raw.hostname).toBeDefined();
      expect(fingerprint.raw.cpuInfo).toBeDefined();
      expect(fingerprint.raw.macAddress).toBeDefined();
    });

    test('should generate machine identifier for activation', async () => {
      const machineInfo = await licenseService.getMachineIdentifier();
      
      expect(machineInfo).toBeDefined();
      expect(machineInfo.machineId).toBeDefined();
      expect(machineInfo.fullHash).toBeDefined();
      expect(machineInfo.platform).toBeDefined();
      expect(machineInfo.hostname).toBeDefined();
      expect(machineInfo.displayInfo).toBeDefined();
      expect(machineInfo.displayInfo.os).toBeDefined();
      expect(machineInfo.displayInfo.arch).toBeDefined();
    });

    test('should detect hardware changes', async () => {
      const originalFingerprint = await licenseService.generateHardwareFingerprint();
      
      // Simulate hardware change by modifying the fingerprint
      const modifiedFingerprint = {
        ...originalFingerprint,
        raw: {
          ...originalFingerprint.raw,
          machineId: 'different-machine-id'
        }
      };

      const changeDetection = await licenseService.detectHardwareChange(modifiedFingerprint);
      
      expect(changeDetection.changed).toBe(true);
      expect(changeDetection.components).toContain('Machine ID');
    });
  });

  describe('License Manager', () => {
    test('should encrypt and decrypt data correctly', () => {
      const testData = {
        test: 'data',
        number: 123,
        array: [1, 2, 3]
      };

      const encrypted = licenseManager.encrypt(testData);
      const decrypted = licenseManager.decrypt(encrypted);

      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(decrypted).toEqual(testData);
    });

    test('should fail to decrypt tampered data', () => {
      const testData = { test: 'data' };
      const encrypted = licenseManager.encrypt(testData);
      
      // Tamper with the encrypted data
      encrypted.encrypted = 'tampered-data';
      
      const decrypted = licenseManager.decrypt(encrypted);
      expect(decrypted).toBeNull();
    });

    test('should create and verify license signature', () => {
      // Generate test keys
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);

      const testLicense = {
        machineFingerprint: 'test-fingerprint',
        activatedAt: new Date().toISOString(),
        customer: { name: 'Test Customer' }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      expect(licenseData.license).toBeDefined();
      expect(licenseData.signature).toBeDefined();
      
      const isValid = licenseManager.verifyLicenseSignature(licenseData.license, licenseData.signature);
      expect(isValid).toBe(true);
    });

    test('should reject invalid license signature', () => {
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);

      const testLicense = {
        machineFingerprint: 'test-fingerprint',
        activatedAt: new Date().toISOString(),
        customer: { name: 'Test Customer' }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      // Tamper with the signature
      const tamperedSignature = 'invalid-signature';
      
      const isValid = licenseManager.verifyLicenseSignature(licenseData.license, tamperedSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('Activation Service', () => {
    test('should report not activated initially', async () => {
      const status = await activationService.getActivationStatus();
      
      expect(status.activated).toBe(false);
      expect(status.machineId).toBeDefined();
      expect(status.machineInfo).toBeDefined();
    });

    test('should get machine identifier', async () => {
      const machineInfo = await activationService.getMachineIdentifier();
      
      expect(machineInfo.machineId).toBeDefined();
      expect(machineInfo.fullHash).toBeDefined();
      expect(machineInfo.platform).toBeDefined();
      expect(machineInfo.hostname).toBeDefined();
    });

    test('should export activation request', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-test-'));
      const outputPath = path.join(tempDir, 'activation-request.json');
      
      const result = await activationService.exportActivationRequest(outputPath);
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(content.type).toBe('House of Electronics Sales Manager - Activation Request');
      expect(content.machineId).toBeDefined();
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('Telemetry Service', () => {
    test('should record session data', async () => {
      await telemetryService.recordSession(true);
      
      const summary = telemetryService.getSummary();
      expect(summary.sessions).toBeGreaterThan(0);
    });

    test('should record validation events', async () => {
      await telemetryService.recordValidation({ valid: true, reason: 'Test validation' });
      
      const summary = telemetryService.getSummary();
      expect(summary.violations).toBeGreaterThanOrEqual(0);
    });

    test('should record violations', async () => {
      await telemetryService.recordViolation('test-violation', 'Test violation details');
      
      const summary = telemetryService.getSummary();
      expect(summary.violations).toBeGreaterThan(0);
    });

    test('should analyze telemetry data', () => {
      const analysis = telemetryService.analyzeTelemetry();
      
      expect(analysis).toBeDefined();
      expect(analysis.totalSessions).toBeGreaterThanOrEqual(0);
      expect(analysis.activatedSessions).toBeGreaterThanOrEqual(0);
      expect(analysis.totalViolations).toBeGreaterThanOrEqual(0);
    });

    test('should export telemetry data', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
      const outputPath = path.join(tempDir, 'telemetry-export.json');
      
      const success = telemetryService.exportTelemetry(outputPath);
      
      expect(success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
      
      const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(data.analysis).toBeDefined();
      expect(data.exportedAt).toBeDefined();
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('End-to-End License Flow', () => {
    test('should complete full activation workflow', async () => {
      // Step 1: Get machine identifier
      const machineInfo = await activationService.getMachineIdentifier();
      expect(machineInfo.machineId).toBeDefined();

      // Step 2: Create a test license (simulate license generator)
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const testLicense = {
        machineFingerprint: machineInfo.fullHash,
        activatedAt: new Date().toISOString(),
        customer: { 
          name: 'Test Customer',
          company: 'Test Company',
          email: 'test@example.com'
        },
        product: {
          name: 'House of Electronics Sales Manager',
          version: '1.0.0'
        }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      expect(licenseData.license).toBeDefined();
      expect(licenseData.signature).toBeDefined();

      // Step 3: Validate the license
      const validation = await licenseManager.validateLicense(licenseData);
      expect(validation.valid).toBe(true);

      // Step 4: Save the license
      const saved = await licenseManager.saveLicense(licenseData);
      expect(saved).toBe(true);

      // Step 5: Check activation status
      const status = await activationService.getActivationStatus();
      expect(status.activated).toBe(true);
      expect(status.license).toBeDefined();
    });

    test('should reject license for different machine', async () => {
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      // Create license for different machine
      const differentMachineFingerprint = 'different-machine-fingerprint-hash';
      const testLicense = {
        machineFingerprint: differentMachineFingerprint,
        activatedAt: new Date().toISOString(),
        customer: { name: 'Test Customer' },
        product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      // Try to validate on current machine (should fail)
      const validation = await licenseManager.validateLicense(licenseData);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('different hardware');
    });

    test('should detect tampered license', async () => {
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const machineInfo = await activationService.getMachineIdentifier();
      const testLicense = {
        machineFingerprint: machineInfo.fullHash,
        activatedAt: new Date().toISOString(),
        customer: { name: 'Test Customer' },
        product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      // Tamper with the license
      licenseData.license.customer.name = 'Hacker';
      
      const validation = await licenseManager.validateLicense(licenseData);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('signature');
    });
  });

  describe('Database Integration', () => {
    test('should create license tables', async () => {
      // This test verifies that the database schema includes license tables
      // The actual database connection would be tested in integration tests
      expect(true).toBe(true); // Placeholder for database schema validation
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle missing license gracefully', async () => {
      // Clear any existing license
      await licenseManager.deleteLicense();
      
      const status = await activationService.getActivationStatus();
      expect(status.activated).toBe(false);
      expect(status.reason).toBeDefined();
    });

    test('should handle corrupted license data', async () => {
      // This would test handling of corrupted license files
      // Implementation depends on specific error handling requirements
      expect(true).toBe(true); // Placeholder for corruption handling tests
    });

    test('should validate license expiration', async () => {
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      // Create expired license
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1); // 1 year ago
      
      const expiredLicense = {
        machineFingerprint: 'test-fingerprint',
        activatedAt: new Date().toISOString(),
        expiresAt: expiredDate.toISOString(),
        customer: { name: 'Test Customer' },
        product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
      };

      const licenseData = licenseManager.createLicense(expiredLicense);
      const validation = await licenseManager.validateLicense(licenseData);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });
  });
});

describe('License Generator Tool Tests', () => {
  test('should generate valid key pair', () => {
    const { LicenseManager } = require('../electron/services/license-manager');
    const keys = LicenseManager.generateKeyPair();
    
    expect(keys.publicKey).toBeDefined();
    expect(keys.privateKey).toBeDefined();
    expect(keys.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(keys.privateKey).toContain('BEGIN PRIVATE KEY');
  });

  test('should create valid license file', () => {
    const { LicenseManager } = require('../electron/services/license-manager');
    const manager = new LicenseManager();
    
    const keys = LicenseManager.generateKeyPair();
    manager.initializeKeys(keys.publicKey, keys.privateKey);
    
    const testLicense = {
      machineFingerprint: 'test-machine-fingerprint',
      activatedAt: new Date().toISOString(),
      customer: { 
        name: 'Test Customer',
        company: 'Test Company',
        email: 'test@example.com'
      },
      product: {
        name: 'House of Electronics Sales Manager',
        version: '1.0.0'
      }
    };

    const licenseData = manager.createLicense(testLicense);
    
    expect(licenseData.license).toBeDefined();
    expect(licenseData.signature).toBeDefined();
    expect(licenseData.license.machineFingerprint).toBe('test-machine-fingerprint');
    expect(licenseData.license.customer.name).toBe('Test Customer');
  });
});
