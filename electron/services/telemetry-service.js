/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getLicenseService } = require('./license-service');

/**
 * Telemetry Service - Anonymous usage tracking and violation detection
 * 
 * This service collects anonymous usage data to help detect:
 * - Multiple activations of the same license
 * - Pattern of abuse
 * - Hardware manipulation attempts
 * 
 * All data is hashed and anonymized - no personal information is collected
 */

class TelemetryService {
  constructor() {
    this.licenseService = getLicenseService();
    this.telemetryPath = this.getTelemetryPath();
    this.sessionId = this.generateSessionId();
    this.enabled = true; // Can be toggled by user preference
  }

  /**
   * Get telemetry storage path
   */
  getTelemetryPath() {
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'telemetry.json');
      }
    } catch (e) {
      // Fallback
    }
    
    return path.join(os.homedir(), '.houseofelectronics', 'telemetry.json');
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash data for anonymity
   */
  hashData(data) {
    return crypto.createHash('sha256').update(String(data)).digest('hex');
  }

  /**
   * Load existing telemetry data
   */
  loadTelemetry() {
    try {
      if (fs.existsSync(this.telemetryPath)) {
        const content = fs.readFileSync(this.telemetryPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load telemetry:', error);
    }
    
    return {
      version: '1.0',
      sessions: [],
      validations: [],
      violations: []
    };
  }

  /**
   * Save telemetry data
   */
  saveTelemetry(data) {
    try {
      const dir = path.dirname(this.telemetryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.telemetryPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save telemetry:', error);
      return false;
    }
  }

  /**
   * Record an application session
   */
  async recordSession(activated) {
    if (!this.enabled) return;

    try {
      const telemetry = this.loadTelemetry();
      const machineInfo = await this.licenseService.getMachineIdentifier();

      const session = {
        sessionId: this.sessionId,
        machineHash: this.hashData(machineInfo.fullHash),
        timestamp: new Date().toISOString(),
        activated: activated,
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        appVersion: this.getAppVersion()
      };

      telemetry.sessions.push(session);

      // Keep only last 100 sessions
      if (telemetry.sessions.length > 100) {
        telemetry.sessions = telemetry.sessions.slice(-100);
      }

      this.saveTelemetry(telemetry);
    } catch (error) {
      console.error('Failed to record session:', error);
    }
  }

  /**
   * Record a license validation event
   */
  async recordValidation(result) {
    if (!this.enabled) return;

    try {
      const telemetry = this.loadTelemetry();
      const machineInfo = await this.licenseService.getMachineIdentifier();

      const validation = {
        sessionId: this.sessionId,
        machineHash: this.hashData(machineInfo.fullHash),
        timestamp: new Date().toISOString(),
        valid: result.valid,
        reason: result.reason || 'Valid',
        type: 'license-check'
      };

      telemetry.validations.push(validation);

      // Keep only last 100 validations
      if (telemetry.validations.length > 100) {
        telemetry.validations = telemetry.validations.slice(-100);
      }

      this.saveTelemetry(telemetry);
    } catch (error) {
      console.error('Failed to record validation:', error);
    }
  }

  /**
   * Record a potential violation
   */
  async recordViolation(type, details) {
    if (!this.enabled) return;

    try {
      const telemetry = this.loadTelemetry();
      const machineInfo = await this.licenseService.getMachineIdentifier();

      const violation = {
        sessionId: this.sessionId,
        machineHash: this.hashData(machineInfo.fullHash),
        timestamp: new Date().toISOString(),
        type: type,
        details: details,
        severity: this.calculateSeverity(type)
      };

      telemetry.violations.push(violation);

      // Keep only last 50 violations
      if (telemetry.violations.length > 50) {
        telemetry.violations = telemetry.violations.slice(-50);
      }

      this.saveTelemetry(telemetry);

      // Log severe violations
      if (violation.severity === 'high') {
        console.warn('Security violation detected:', type, details);
      }
    } catch (error) {
      console.error('Failed to record violation:', error);
    }
  }

  /**
   * Calculate violation severity
   */
  calculateSeverity(type) {
    const highSeverity = [
      'license-tampered',
      'hardware-mismatch',
      'signature-invalid',
      'multiple-machines'
    ];
    
    const mediumSeverity = [
      'license-expired',
      'hardware-changed'
    ];
    
    if (highSeverity.includes(type)) {
      return 'high';
    } else if (mediumSeverity.includes(type)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Analyze telemetry for patterns of abuse
   */
  analyzeTelemetry() {
    try {
      const telemetry = this.loadTelemetry();
      
      const analysis = {
        totalSessions: telemetry.sessions.length,
        activatedSessions: telemetry.sessions.filter(s => s.activated).length,
        totalViolations: telemetry.violations.length,
        highSeverityViolations: telemetry.violations.filter(v => v.severity === 'high').length,
        recentViolations: telemetry.violations.filter(v => {
          const violationDate = new Date(v.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return violationDate > dayAgo;
        }).length,
        uniqueMachines: new Set(telemetry.sessions.map(s => s.machineHash)).size,
        suspiciousActivity: false
      };

      // Detect suspicious patterns
      if (analysis.uniqueMachines > 1) {
        analysis.suspiciousActivity = true;
        analysis.suspiciousReason = 'Multiple machines detected';
      }

      if (analysis.highSeverityViolations > 5) {
        analysis.suspiciousActivity = true;
        analysis.suspiciousReason = 'Multiple high severity violations';
      }

      return analysis;
    } catch (error) {
      console.error('Failed to analyze telemetry:', error);
      return null;
    }
  }

  /**
   * Get application version
   */
  getAppVersion() {
    try {
      const { app } = require('electron');
      if (app) {
        return app.getVersion();
      }
    } catch (e) {
      // Fallback
    }
    return '1.0.0';
  }

  /**
   * Export telemetry data (for debugging or manual review)
   */
  exportTelemetry(outputPath) {
    try {
      const telemetry = this.loadTelemetry();
      const analysis = this.analyzeTelemetry();
      
      const report = {
        ...telemetry,
        analysis,
        exportedAt: new Date().toISOString()
      };

      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to export telemetry:', error);
      return false;
    }
  }

  /**
   * Clear telemetry data
   */
  clearTelemetry() {
    try {
      if (fs.existsSync(this.telemetryPath)) {
        fs.unlinkSync(this.telemetryPath);
      }
      return true;
    } catch (error) {
      console.error('Failed to clear telemetry:', error);
      return false;
    }
  }

  /**
   * Enable or disable telemetry
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get telemetry summary for display
   */
  getSummary() {
    try {
      const analysis = this.analyzeTelemetry();
      return {
        enabled: this.enabled,
        sessions: analysis?.totalSessions || 0,
        violations: analysis?.totalViolations || 0,
        suspiciousActivity: analysis?.suspiciousActivity || false
      };
    } catch (error) {
      console.error('Failed to get telemetry summary:', error);
      return {
        enabled: this.enabled,
        sessions: 0,
        violations: 0,
        suspiciousActivity: false
      };
    }
  }
}

// Export singleton instance
let instance = null;

function getTelemetryService() {
  if (!instance) {
    instance = new TelemetryService();
  }
  return instance;
}

module.exports = {
  getTelemetryService,
  TelemetryService
};

