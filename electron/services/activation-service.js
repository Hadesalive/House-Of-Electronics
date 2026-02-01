/* eslint-disable @typescript-eslint/no-require-imports */
const { getLicenseService } = require('./license-service');
const { getSimpleLicenseManager } = require('./simple-license-manager');
const fs = require('fs');

/**
 * Activation Service - Handles license activation workflow
 * 
 * This service manages the activation process including:
 * - Generating machine IDs for customers
 * - Importing license files
 * - Activation status checking
 */

class ActivationService {
  constructor() {
    this.licenseService = getLicenseService();
    this.licenseManager = getSimpleLicenseManager();
    this.activationCallbacks = [];
  }

  /**
   * Initialize the activation service
   * The key manager will handle key loading automatically
   */
  initialize() {
    // The key manager is now responsible for key loading
    // No need to manually initialize keys here
    console.log('🔑 Activation service initialized - key manager will handle keys');
  }

  /**
   * Check if the application is activated
   */
  async isActivated() {
    try {
      const result = await this.licenseManager.hasValidLicense();
      return result.valid;
    } catch (error) {
      console.error('Failed to check activation status:', error);
      return false;
    }
  }

  /**
   * Get activation status with details
   */
  async getActivationStatus() {
    try {
      const result = await this.licenseManager.hasValidLicense();
      
      if (result.valid) {
        return {
          activated: true,
          license: result.license,
          message: 'Application is activated'
        };
      } else {
        // Get machine identifier for activation
        const machineInfo = await this.licenseService.getMachineIdentifier();
        
        return {
          activated: false,
          reason: result.reason,
          machineId: machineInfo.machineId,
          machineInfo: machineInfo,
          message: 'Application requires activation'
        };
      }
    } catch (error) {
      console.error('Failed to get activation status:', error);
      return {
        activated: false,
        reason: 'Failed to check activation status',
        error: error.message
      };
    }
  }

  /**
   * Get machine identifier for activation request
   */
  async getMachineIdentifier() {
    try {
      return await this.licenseService.getMachineIdentifier();
    } catch (error) {
      console.error('Failed to get machine identifier:', error);
      throw error;
    }
  }

  /**
   * Import a license file
   */
  async importLicenseFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'License file not found'
        };
      }

      // Read license file
      const licenseContent = fs.readFileSync(filePath, 'utf8');
      let licenseData;
      
      try {
        licenseData = JSON.parse(licenseContent);
      } catch {
        return {
          success: false,
          error: 'Invalid license file format'
        };
      }

      // Validate license structure
      if (!licenseData.license || !licenseData.signature) {
        return {
          success: false,
          error: 'Invalid license file structure'
        };
      }

      // SECURITY: Never trust public keys from license files
      // Only use the embedded public key to prevent key substitution attacks
      // The public key in the license is only for reference/display purposes

      // Validate license
      const validation = await this.licenseManager.validateLicense(licenseData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
          details: validation.details
        };
      }

      // Save license
      const saved = await this.licenseManager.saveLicense(licenseData);
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save license'
        };
      }

      // Notify listeners
      this.notifyActivationChange(true);

      return {
        success: true,
        license: validation.license
      };
    } catch (error) {
      console.error('Failed to import license:', error);
      return {
        success: false,
        error: 'Failed to import license: ' + error.message
      };
    }
  }

  /**
   * Import license from raw data (for drag-and-drop or paste)
   */
  async importLicenseData(licenseContent) {
    try {
      let licenseData;
      
      try {
        licenseData = JSON.parse(licenseContent);
      } catch {
        return {
          success: false,
          error: 'Invalid license data format'
        };
      }

      // Validate license structure
      if (!licenseData.license || !licenseData.signature) {
        return {
          success: false,
          error: 'Invalid license data structure'
        };
      }

      // SECURITY: Never trust public keys from license files
      // Only use the embedded public key to prevent key substitution attacks
      // The public key in the license is only for reference/display purposes

      // Validate license
      const validation = await this.licenseManager.validateLicense(licenseData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
          details: validation.details
        };
      }

      // Save license
      const saved = await this.licenseManager.saveLicense(licenseData);
      if (!saved) {
        return {
          success: false,
          error: 'Failed to save license'
        };
      }

      // Notify listeners
      this.notifyActivationChange(true);

      return {
        success: true,
        license: validation.license
      };
    } catch (error) {
      console.error('Failed to import license data:', error);
      return {
        success: false,
        error: 'Failed to import license: ' + error.message
      };
    }
  }

  /**
   * Deactivate the application (for testing or license reset)
   */
  async deactivate() {
    try {
      const deleted = await this.licenseManager.deleteLicense();
      
      // Notify listeners
      this.notifyActivationChange(false);
      
      return {
        success: deleted,
        message: deleted ? 'License deactivated' : 'No license to deactivate'
      };
    } catch (error) {
      console.error('Failed to deactivate:', error);
      return {
        success: false,
        error: 'Failed to deactivate: ' + error.message
      };
    }
  }

  /**
   * Export machine information for activation request
   * Creates a file that customers can send to you
   */
  async exportActivationRequest(outputPath) {
    try {
      const machineInfo = await this.licenseService.getMachineIdentifier();
      
      const activationRequest = {
        type: 'House of Electronics Sales Manager - Activation Request',
        version: '1.0',
        machineId: machineInfo.machineId,
        fullHash: machineInfo.fullHash,
        machineInfo: machineInfo.displayInfo,
        requestedAt: new Date().toISOString()
      };

      const content = JSON.stringify(activationRequest, null, 2);
      fs.writeFileSync(outputPath, content, 'utf8');

      return {
        success: true,
        path: outputPath
      };
    } catch (error) {
      console.error('Failed to export activation request:', error);
      return {
        success: false,
        error: 'Failed to export activation request: ' + error.message
      };
    }
  }

  /**
   * Register a callback for activation status changes
   */
  onActivationChange(callback) {
    this.activationCallbacks.push(callback);
  }

  /**
   * Notify all listeners of activation change
   */
  notifyActivationChange(activated) {
    for (const callback of this.activationCallbacks) {
      try {
        callback(activated);
      } catch (error) {
        console.error('Activation callback error:', error);
      }
    }
  }

  /**
   * Validate license periodically (runtime protection)
   */
  async validateRuntime() {
    try {
      const result = await this.licenseManager.hasValidLicense();
      
      if (!result.valid) {
        console.error('Runtime license validation failed:', result.reason);
        // Notify listeners that license is no longer valid
        this.notifyActivationChange(false);
        return false;
      }
      
      // Only notify if status changed - don't send events if license is still valid
      // This prevents unnecessary frontend refreshes
      return true;
    } catch (error) {
      console.error('Runtime validation error:', error);
      return false;
    }
  }

  /**
   * Start periodic validation (every 30 minutes)
   */
  startPeriodicValidation() {
    // Initial validation
    this.validateRuntime();

    // Set up periodic validation (every 30 minutes)
    setInterval(() => {
      this.validateRuntime();
    }, 30 * 60 * 1000); // 30 minutes
  }
}

// Export singleton instance
let instance = null;

function getActivationService() {
  if (!instance) {
    instance = new ActivationService();
    instance.initialize();
  }
  return instance;
}

module.exports = {
  getActivationService,
  ActivationService
};

