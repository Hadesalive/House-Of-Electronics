/* eslint-disable @typescript-eslint/no-require-imports */
const { machineIdSync } = require('node-machine-id');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * License Service - Hardware Fingerprinting and Machine Identification
 * 
 * This service generates a unique hardware fingerprint for the machine
 * using multiple hardware identifiers to prevent spoofing and ensure
 * the license is truly machine-locked.
 */

class LicenseService {
  constructor() {
    this.cachedFingerprint = null;
    this.cachedMachineId = null;
  }

  /**
   * Get the primary machine ID using node-machine-id
   * This is a quick, reliable identifier
   */
  getMachineId() {
    if (this.cachedMachineId) {
      return this.cachedMachineId;
    }

    try {
      // Get machine ID (works on Windows, macOS, Linux)
      this.cachedMachineId = machineIdSync({ original: true });
      return this.cachedMachineId;
    } catch (error) {
      console.error('Failed to get machine ID:', error);
      return null;
    }
  }

  /**
   * Get CPU information
   */
  getCpuInfo() {
    try {
      const cpus = os.cpus();
      if (cpus && cpus.length > 0) {
        return {
          model: cpus[0].model,
          cores: cpus.length,
          speed: cpus[0].speed
        };
      }
    } catch (error) {
      console.error('Failed to get CPU info:', error);
    }
    return null;
  }

  /**
   * Get primary MAC address
   */
  getMacAddress() {
    try {
      const networkInterfaces = os.networkInterfaces();
      
      // Find the first non-internal network interface with a MAC address
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get MAC address:', error);
    }
    return null;
  }

  /**
   * Get macOS-specific hardware identifiers
   * Uses system_profiler to get hardware serial numbers
   */
  async getMacOSHardwareInfo() {
    if (process.platform !== 'darwin') {
      return null;
    }

    try {
      const hardwareInfo = {};

      // Get hardware UUID (most reliable on macOS)
      try {
        const { stdout: hardwareUuid } = await execAsync('system_profiler SPHardwareDataType | grep "Hardware UUID"');
        const uuid = hardwareUuid.split(':')[1]?.trim();
        if (uuid) {
          hardwareInfo.hardwareUuid = uuid;
        }
      } catch (e) {
        console.log('Could not get hardware UUID');
      }

      // Get serial number
      try {
        const { stdout: serialNumber } = await execAsync('system_profiler SPHardwareDataType | grep "Serial Number"');
        const serial = serialNumber.split(':')[1]?.trim();
        if (serial && serial !== '(null)') {
          hardwareInfo.serialNumber = serial;
        }
      } catch (e) {
        console.log('Could not get serial number');
      }

      // Get model identifier
      try {
        const { stdout: modelId } = await execAsync('system_profiler SPHardwareDataType | grep "Model Identifier"');
        const model = modelId.split(':')[1]?.trim();
        if (model) {
          hardwareInfo.modelIdentifier = model;
        }
      } catch (e) {
        console.log('Could not get model identifier');
      }

      return Object.keys(hardwareInfo).length > 0 ? hardwareInfo : null;
    } catch (error) {
      console.error('Failed to get macOS hardware info:', error);
      return null;
    }
  }

  /**
   * Get Windows-specific hardware identifiers
   * Uses WMIC commands to get motherboard and BIOS info
   */
  async getWindowsHardwareInfo() {
    if (process.platform !== 'win32') {
      return null;
    }

    try {
      const hardwareInfo = {};

      // Get motherboard serial number
      try {
        const { stdout: mbSerial } = await execAsync('wmic baseboard get serialnumber');
        const serial = mbSerial.split('\n')[1]?.trim();
        if (serial && serial !== 'SerialNumber') {
          hardwareInfo.motherboardSerial = serial;
        }
      } catch (e) {
        console.log('Could not get motherboard serial');
      }

      // Get BIOS serial number
      try {
        const { stdout: biosSerial } = await execAsync('wmic bios get serialnumber');
        const serial = biosSerial.split('\n')[1]?.trim();
        if (serial && serial !== 'SerialNumber') {
          hardwareInfo.biosSerial = serial;
        }
      } catch (e) {
        console.log('Could not get BIOS serial');
      }

      // Get system UUID
      try {
        const { stdout: uuid } = await execAsync('wmic csproduct get uuid');
        const systemUuid = uuid.split('\n')[1]?.trim();
        if (systemUuid && systemUuid !== 'UUID') {
          hardwareInfo.systemUuid = systemUuid;
        }
      } catch (e) {
        console.log('Could not get system UUID');
      }

      // Get primary hard drive serial
      try {
        const { stdout: diskSerial } = await execAsync('wmic diskdrive get serialnumber');
        const serial = diskSerial.split('\n')[1]?.trim();
        if (serial && serial !== 'SerialNumber') {
          hardwareInfo.diskSerial = serial;
        }
      } catch (e) {
        console.log('Could not get disk serial');
      }

      // Get Windows product ID
      try {
        const { stdout: productId } = await execAsync('wmic os get serialnumber');
        const serial = productId.split('\n')[1]?.trim();
        if (serial && serial !== 'SerialNumber') {
          hardwareInfo.windowsProductId = serial;
        }
      } catch (e) {
        console.log('Could not get Windows product ID');
      }

      return Object.keys(hardwareInfo).length > 0 ? hardwareInfo : null;
    } catch (error) {
      console.error('Failed to get Windows hardware info:', error);
      return null;
    }
  }

  /**
   * Generate a comprehensive hardware fingerprint
   * Combines multiple hardware identifiers into a single hash
   */
  async generateHardwareFingerprint() {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    try {
      const fingerprint = {
        machineId: this.getMachineId(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuInfo: this.getCpuInfo(),
        macAddress: this.getMacAddress(),
        totalMemory: os.totalmem(),
        windowsInfo: null
      };

      // Add platform-specific hardware info
      if (process.platform === 'win32') {
        fingerprint.windowsInfo = await this.getWindowsHardwareInfo();
      } else if (process.platform === 'darwin') {
        fingerprint.macosInfo = await this.getMacOSHardwareInfo();
      }

      // Create a deterministic string from all hardware info
      const fingerprintString = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
      
      // Hash the fingerprint to create a unique machine ID
      const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex');
      
      this.cachedFingerprint = {
        raw: fingerprint,
        hash: hash,
        shortId: hash.substring(0, 16).toUpperCase() // Short version for display
      };

      return this.cachedFingerprint;
    } catch (error) {
      console.error('Failed to generate hardware fingerprint:', error);
      throw error;
    }
  }

  /**
   * Verify if a given fingerprint matches the current machine
   */
  async verifyFingerprint(storedFingerprint) {
    try {
      const currentFingerprint = await this.generateHardwareFingerprint();
      return currentFingerprint.hash === storedFingerprint;
    } catch (error) {
      console.error('Failed to verify fingerprint:', error);
      return false;
    }
  }

  /**
   * Get a human-readable machine identifier for display to users
   * This is what customers will send to you for activation
   */
  async getMachineIdentifier() {
    try {
      const fingerprint = await this.generateHardwareFingerprint();
      return {
        machineId: fingerprint.shortId,
        fullHash: fingerprint.hash,
        platform: os.platform(),
        hostname: os.hostname(),
        displayInfo: {
          os: `${os.platform()} ${os.release()}`,
          arch: os.arch(),
          cpu: fingerprint.raw.cpuInfo?.model || 'Unknown',
          cores: fingerprint.raw.cpuInfo?.cores || 0
        }
      };
    } catch (error) {
      console.error('Failed to get machine identifier:', error);
      throw error;
    }
  }

  /**
   * Detect if hardware has changed significantly
   * Returns true if hardware change is detected
   */
  async detectHardwareChange(originalFingerprint) {
    try {
      const currentFingerprint = await this.generateHardwareFingerprint();
      
      // Compare critical hardware components
      const original = originalFingerprint.raw;
      const current = currentFingerprint.raw;

      let changedComponents = [];

      // Check machine ID (most important)
      if (original.machineId !== current.machineId) {
        changedComponents.push('Machine ID');
      }

      // Check MAC address
      if (original.macAddress !== current.macAddress) {
        changedComponents.push('Network Adapter');
      }

      // Check CPU
      if (original.cpuInfo?.model !== current.cpuInfo?.model) {
        changedComponents.push('CPU');
      }

      // Check Windows hardware info if available
      if (original.windowsInfo && current.windowsInfo) {
        if (original.windowsInfo.motherboardSerial !== current.windowsInfo.motherboardSerial) {
          changedComponents.push('Motherboard');
        }
        if (original.windowsInfo.diskSerial !== current.windowsInfo.diskSerial) {
          changedComponents.push('Hard Drive');
        }
      }

      // Check macOS hardware info if available
      if (original.macosInfo && current.macosInfo) {
        if (original.macosInfo.hardwareUuid !== current.macosInfo.hardwareUuid) {
          changedComponents.push('Hardware UUID');
        }
        if (original.macosInfo.serialNumber !== current.macosInfo.serialNumber) {
          changedComponents.push('Serial Number');
        }
        if (original.macosInfo.modelIdentifier !== current.macosInfo.modelIdentifier) {
          changedComponents.push('Model Identifier');
        }
      }

      return {
        changed: changedComponents.length > 0,
        components: changedComponents,
        severity: changedComponents.length >= 2 ? 'high' : 'low'
      };
    } catch (error) {
      console.error('Failed to detect hardware change:', error);
      return { changed: true, components: ['Unknown'], severity: 'high' };
    }
  }

  /**
   * Clear cached fingerprint (useful for testing)
   */
  clearCache() {
    this.cachedFingerprint = null;
    this.cachedMachineId = null;
  }
}

// Export singleton instance
let instance = null;

function getLicenseService() {
  if (!instance) {
    instance = new LicenseService();
  }
  return instance;
}

module.exports = {
  getLicenseService,
  LicenseService
};

