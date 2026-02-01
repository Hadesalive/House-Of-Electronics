/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('License System Integration Tests', () => {
  let tempDir;
  let licenseGeneratorPath;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'license-integration-'));
    licenseGeneratorPath = path.join(__dirname, '..', 'tools', 'license-generator.js');
  });

  afterAll(() => {
    // Cleanup
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('License Generator Tool Integration', () => {
    test('should generate RSA key pair', (done) => {
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
        expect(output).toContain('Public key:');
        expect(output).toContain('Private key:');
        
        // Verify keys were created
        const keysDir = path.join(__dirname, '..', 'tools', '.keys');
        expect(fs.existsSync(path.join(keysDir, 'public.pem'))).toBe(true);
        expect(fs.existsSync(path.join(keysDir, 'private.pem'))).toBe(true);
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);

    test('should create license file', (done) => {
      // First ensure keys exist
      if (!fs.existsSync(path.join(__dirname, '..', 'tools', '.keys', 'private.pem'))) {
        return done(new Error('Keys not found. Run generate-keys test first.'));
      }

      const testMachineId = 'test-machine-id-12345';
      const process = spawn('node', [licenseGeneratorPath, 'create-license'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send test inputs
      setTimeout(() => {
        process.stdin.write(testMachineId + '\n');
        process.stdin.write('Test Customer\n');
        process.stdin.write('test@example.com\n');
        process.stdin.write('Test Company\n');
      }, 1000);

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('License created successfully');
        expect(output).toContain('Customer: Test Customer');
        expect(output).toContain('Company: Test Company');
        
        // Verify license file was created
        const licensesDir = path.join(__dirname, '..', 'tools', 'licenses');
        const licenseFiles = fs.readdirSync(licensesDir);
        expect(licenseFiles.length).toBeGreaterThan(0);
        
        const licenseFile = licenseFiles.find(f => f.endsWith('.lic'));
        expect(licenseFile).toBeDefined();
        
        const licenseContent = JSON.parse(fs.readFileSync(path.join(licensesDir, licenseFile), 'utf8'));
        expect(licenseContent.license.machineFingerprint).toBe(testMachineId);
        expect(licenseContent.license.customer.name).toBe('Test Customer');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 15000);

    test('should verify license file', (done) => {
      // Find a license file to verify
      const licensesDir = path.join(__dirname, '..', 'tools', 'licenses');
      if (!fs.existsSync(licensesDir)) {
        return done(new Error('No licenses directory found'));
      }

      const licenseFiles = fs.readdirSync(licensesDir);
      const licenseFile = licenseFiles.find(f => f.endsWith('.lic'));
      
      if (!licenseFile) {
        return done(new Error('No license file found to verify'));
      }

      const licenseFilePath = path.join(licensesDir, licenseFile);
      const process = spawn('node', [licenseGeneratorPath, 'verify-license'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Send license file path
      setTimeout(() => {
        process.stdin.write(licenseFilePath + '\n');
      }, 1000);

      process.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('License Verification Results');
        expect(output).toContain('Signature: ✅ Valid');
        expect(output).toContain('Customer: Test Customer');
        
        done();
      });

      process.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });

  describe('Application License Flow', () => {
    test('should show activation page when not activated', (done) => {
      // This test would require the actual Electron app to be running
      // For now, we'll test the service directly
      
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      activationService.getActivationStatus().then(status => {
        expect(status).toBeDefined();
        expect(status.activated).toBe(false);
        expect(status.machineId).toBeDefined();
        done();
      }).catch(done);
    });

    test('should validate license correctly', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const { getActivationService } = require('../electron/services/activation-service');
      
      const licenseManager = getLicenseManager();
      const activationService = getActivationService();
      
      // Get current machine info
      const machineInfo = await activationService.getMachineIdentifier();
      
      // Create a valid license for this machine
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const testLicense = {
        machineFingerprint: machineInfo.fullHash,
        activatedAt: new Date().toISOString(),
        customer: { 
          name: 'Integration Test Customer',
          company: 'Integration Test Company',
          email: 'integration@test.com'
        },
        product: {
          name: 'House of Electronics Sales Manager',
          version: '1.0.0'
        }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      // Validate the license
      const validation = await licenseManager.validateLicense(licenseData);
      expect(validation.valid).toBe(true);
      expect(validation.license).toBeDefined();
    });

    test('should save and load license correctly', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const { getActivationService } = require('../electron/services/activation-service');
      
      const licenseManager = getLicenseManager();
      const activationService = getActivationService();
      
      // Get current machine info
      const machineInfo = await activationService.getMachineIdentifier();
      
      // Create a valid license
      const keys = licenseManager.constructor.generateKeyPair();
      licenseManager.initializeKeys(keys.publicKey, keys.privateKey);
      
      const testLicense = {
        machineFingerprint: machineInfo.fullHash,
        activatedAt: new Date().toISOString(),
        customer: { 
          name: 'Save Test Customer',
          company: 'Save Test Company',
          email: 'save@test.com'
        },
        product: {
          name: 'House of Electronics Sales Manager',
          version: '1.0.0'
        }
      };

      const licenseData = licenseManager.createLicense(testLicense);
      
      // Save the license
      const saved = await licenseManager.saveLicense(licenseData);
      expect(saved).toBe(true);
      
      // Load the license
      const loadedLicense = await licenseManager.loadLicense();
      expect(loadedLicense).toBeDefined();
      expect(loadedLicense.license.machineFingerprint).toBe(machineInfo.fullHash);
      expect(loadedLicense.license.customer.name).toBe('Save Test Customer');
    });

    test('should detect hardware changes', async () => {
      const { getLicenseService } = require('../electron/services/license-service');
      const licenseService = getLicenseService();
      
      // Get current fingerprint
      const currentFingerprint = await licenseService.generateHardwareFingerprint();
      
      // Simulate hardware change
      const modifiedFingerprint = {
        ...currentFingerprint,
        raw: {
          ...currentFingerprint.raw,
          machineId: 'different-machine-id',
          macAddress: 'different:mac:address'
        }
      };
      
      const changeDetection = await licenseService.detectHardwareChange(modifiedFingerprint);
      expect(changeDetection.changed).toBe(true);
      expect(changeDetection.components).toContain('Machine ID');
      expect(changeDetection.components).toContain('Network Adapter');
    });
  });

  describe('Telemetry Integration', () => {
    test('should record and analyze telemetry data', async () => {
      const { getTelemetryService } = require('../electron/services/telemetry-service');
      const telemetryService = getTelemetryService();
      
      // Record some test data
      await telemetryService.recordSession(true);
      await telemetryService.recordValidation({ valid: true, reason: 'Integration test' });
      await telemetryService.recordViolation('test-violation', 'Integration test violation');
      
      // Get summary
      const summary = telemetryService.getSummary();
      expect(summary.enabled).toBe(true);
      expect(summary.sessions).toBeGreaterThan(0);
      
      // Analyze telemetry
      const analysis = telemetryService.analyzeTelemetry();
      expect(analysis).toBeDefined();
      expect(analysis.totalSessions).toBeGreaterThan(0);
      expect(analysis.totalViolations).toBeGreaterThan(0);
    });

    test('should export telemetry data', async () => {
      const { getTelemetryService } = require('../electron/services/telemetry-service');
      const telemetryService = getTelemetryService();
      
      const exportPath = path.join(tempDir, 'telemetry-export.json');
      const success = telemetryService.exportTelemetry(exportPath);
      
      expect(success).toBe(true);
      expect(fs.existsSync(exportPath)).toBe(true);
      
      const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(data.analysis).toBeDefined();
      expect(data.exportedAt).toBeDefined();
      expect(data.sessions).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing license gracefully', async () => {
      const { getActivationService } = require('../electron/services/activation-service');
      const activationService = getActivationService();
      
      // Clear any existing license
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      await licenseManager.deleteLicense();
      
      const status = await activationService.getActivationStatus();
      expect(status.activated).toBe(false);
      expect(status.reason).toBeDefined();
    });

    test('should handle invalid license data', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      
      // Try to decrypt invalid data
      const invalidData = {
        encrypted: 'invalid-data',
        iv: 'invalid-iv',
        authTag: 'invalid-tag'
      };
      
      const result = licenseManager.decrypt(invalidData);
      expect(result).toBeNull();
    });

    test('should handle corrupted license files', async () => {
      const { getLicenseManager } = require('../electron/services/license-manager');
      const licenseManager = getLicenseManager();
      
      // Create corrupted license data
      const corruptedLicense = {
        license: {
          machineFingerprint: 'test-fingerprint',
          activatedAt: new Date().toISOString(),
          customer: { name: 'Test Customer' },
          product: { name: 'House of Electronics Sales Manager', version: '1.0.0' }
        },
        signature: 'invalid-signature'
      };
      
      const validation = await licenseManager.validateLicense(corruptedLicense);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('signature');
    });
  });
});
