/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Complete License Flow Simulation Test
 * 
 * This test simulates the entire customer activation process:
 * 1. Customer runs app (gets Machine ID)
 * 2. Customer sends Machine ID to vendor
 * 3. Vendor generates license using tool
 * 4. Customer receives and imports license
 * 5. Application validates and activates
 */

describe('Complete License Flow Simulation', () => {
  let tempDir;
  let keysDir;
  let licensesDir;
  let testMachineId;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-flow-'));
    keysDir = path.join(__dirname, '..', 'tools', '.keys');
    licensesDir = path.join(__dirname, '..', 'tools', 'licenses');
    
    // Ensure directories exist
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    if (!fs.existsSync(licensesDir)) {
      fs.mkdirSync(licensesDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test data
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Step 1: Generate RSA Keys (Vendor Setup)', () => {
    test('should generate RSA key pair for vendor', (done) => {
      const licenseGeneratorPath = path.join(__dirname, '..', 'tools', 'license-generator.js');
      const process = spawn('node', [licenseGeneratorPath, 'generate-keys'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Keys generated successfully');
        
        // Verify keys were created
        expect(fs.existsSync(path.join(keysDir, 'public.pem'))).toBe(true);
        expect(fs.existsSync(path.join(keysDir, 'private.pem'))).toBe(true);
        
        // Verify key content
        const publicKey = fs.readFileSync(path.join(keysDir, 'public.pem'), 'utf8');
        const privateKey = fs.readFileSync(path.join(keysDir, 'private.pem'), 'utf8');
        
        expect(publicKey).toContain('BEGIN PUBLIC KEY');
        expect(privateKey).toContain('BEGIN PRIVATE KEY');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('Step 2: Customer Gets Machine ID', () => {
    test('should generate machine identifier for customer', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const machineInfo = await activationService.getMachineIdentifier();
      
      expect(machineInfo).toBeDefined();
      expect(machineInfo.machineId).toBeDefined();
      expect(machineInfo.fullHash).toBeDefined();
      expect(machineInfo.platform).toBeDefined();
      expect(machineInfo.hostname).toBeDefined();
      
      // Store for later use in the flow
      testMachineId = machineInfo.fullHash;
      
      console.log('Customer Machine ID:', machineInfo.machineId);
      console.log('Customer Full Hash:', machineInfo.fullHash);
    });

    test('should export activation request file', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const outputPath = path.join(tempDir, 'customer-activation-request.json');
      const result = await activationService.exportActivationRequest(outputPath);
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(content.type).toBe('House of Electronics Sales Manager - Activation Request');
      expect(content.machineId).toBeDefined();
      expect(content.machineInfo).toBeDefined();
      
      console.log('Activation request exported to:', outputPath);
    });
  });

  describe('Step 3: Vendor Creates License', () => {
    test('should create license for customer machine', (done) => {
      const licenseGeneratorPath = path.join(__dirname, '..', 'tools', 'license-generator.js');
      const process = spawn('node', [licenseGeneratorPath, 'create-license'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Simulate vendor entering customer information
      setTimeout(() => {
        process.stdin.write(testMachineId + '\n'); // Machine fingerprint
        process.stdin.write('John Doe\n'); // Customer name
        process.stdin.write('john.doe@company.com\n'); // Email
        process.stdin.write('Acme Corporation\n'); // Company
      }, 1000);

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('License created successfully');
        expect(output).toContain('Customer: John Doe');
        expect(output).toContain('Company: Acme Corporation');
        expect(output).toContain('Email: john.doe@company.com');
        
        // Verify license file was created
        const licenseFiles = fs.readdirSync(licensesDir);
        const licenseFile = licenseFiles.find(f => f.endsWith('.lic'));
        expect(licenseFile).toBeDefined();
        
        const licensePath = path.join(licensesDir, licenseFile);
        const licenseContent = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
        
        expect(licenseContent.license.machineFingerprint).toBe(testMachineId);
        expect(licenseContent.license.customer.name).toBe('John Doe');
        expect(licenseContent.license.customer.company).toBe('Acme Corporation');
        expect(licenseContent.license.customer.email).toBe('john.doe@company.com');
        expect(licenseContent.signature).toBeDefined();
        
        console.log('License created:', licensePath);
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('Step 4: Customer Imports License', () => {
    test('should import license file successfully', async () => {
      // Find the created license file
      const licenseFiles = fs.readdirSync(licensesDir);
      const licenseFile = licenseFiles.find(f => f.endsWith('.lic'));
      expect(licenseFile).toBeDefined();
      
      const licensePath = path.join(licensesDir, licenseFile);
      
      // Test license import
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const importResult = await activationService.importLicenseFile(licensePath);
      
      expect(importResult.success).toBe(true);
      expect(importResult.license).toBeDefined();
      expect(importResult.license.customer.name).toBe('John Doe');
      expect(importResult.license.customer.company).toBe('Acme Corporation');
    });

    test('should validate license after import', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const status = await activationService.getActivationStatus();
      
      expect(status.activated).toBe(true);
      expect(status.license).toBeDefined();
      expect(status.license.customer.name).toBe('John Doe');
      expect(status.license.customer.company).toBe('Acme Corporation');
      expect(status.license.product.name).toBe('House of Electronics Sales Manager');
    });
  });

  describe('Step 5: Application Runtime Validation', () => {
    test('should pass runtime validation', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const isValid = await activationService.validateRuntime();
      expect(isValid).toBe(true);
    });

    test('should record telemetry data', async () => {
      const { getTelemetryService } = require('../electron/services/telemetry-service');
      const telemetryService = getTelemetryService();
      
      // Record session
      await telemetryService.recordSession(true);
      
      // Record validation
      await telemetryService.recordValidation({ valid: true, reason: 'Runtime validation' });
      
      const summary = telemetryService.getSummary();
      expect(summary.sessions).toBeGreaterThan(0);
    });
  });

  describe('Step 6: Security Validation', () => {
    test('should reject license for different machine', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      
      // Create license for different machine
      const differentMachineFingerprint = 'different-machine-fingerprint-hash-12345';
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const differentMachineLicense = {
        machineFingerprint: differentMachineFingerprint,
        activatedAt: new Date().toISOString(),
        customer: { name: 'Different Customer' },
        product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
      };

      const licenseData = licenseManager.createLicense(differentMachineLicense);
      
      // Try to validate on current machine (should fail)
      const validation = await licenseManager.validateLicense(licenseData);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('different hardware');
    });

    test('should detect tampered license', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const testLicense = {
        machineFingerprint: testMachineId,
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

    test('should handle expired license', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      // Create expired license
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1); // 1 year ago
      
      const expiredLicense = {
        machineFingerprint: testMachineId,
        activatedAt: new Date().toISOString(),
        expiresAt: expiredDate.toISOString(),
        customer: { name: 'Expired Customer' },
        product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
      };

      const licenseData = licenseManager.createLicense(expiredLicense);
      const validation = await licenseManager.validateLicense(licenseData);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });
  });

  describe('Step 7: Cleanup and Reset', () => {
    test('should deactivate license for testing', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      const result = await activationService.deactivate();
      expect(result.success).toBe(true);
      
      const status = await activationService.getActivationStatus();
      expect(status.activated).toBe(false);
    });

    test('should clear telemetry data', () => {
      const { getTelemetryService } = require('../electron/services/telemetry-service');
      const telemetryService = getTelemetryService();
      
      const cleared = telemetryService.clearTelemetry();
      expect(cleared).toBe(true);
      
      const summary = telemetryService.getSummary();
      expect(summary.sessions).toBe(0);
      expect(summary.violations).toBe(0);
    });
  });
});

describe('License System Performance Tests', () => {
  test('should handle multiple rapid validations', async () => {
    const { getActivationService } = require('../electron/services/activation-service');
    const activationService = getActivationService();
    
    const startTime = Date.now();
    const promises = [];
    
    // Run 100 validations in parallel
    for (let i = 0; i < 100; i++) {
      promises.push(activationService.validateRuntime());
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results.every(result => typeof result === 'boolean')).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`100 validations completed in ${endTime - startTime}ms`);
  });

  test('should handle concurrent license operations', async () => {
    const { getLicenseManager } = require('../electron/services/license-manager');
    const licenseManager = getLicenseManager();
    
    const testData = { test: 'concurrent-data', timestamp: Date.now() };
    
    const startTime = Date.now();
    const promises = [];
    
    // Run 50 concurrent encrypt/decrypt operations
    for (let i = 0; i < 50; i++) {
      promises.push(
        licenseManager.encrypt({ ...testData, id: i })
          .then(encrypted => licenseManager.decrypt(encrypted))
      );
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results.every(result => result && result.id !== undefined)).toBe(true);
    expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    
    console.log(`50 concurrent operations completed in ${endTime - startTime}ms`);
  });
});
