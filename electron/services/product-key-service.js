/**
 * Simple Product Key Service
 * For internal Electron app - simple hash-based validation
 */

const crypto = require('crypto');
const os = require('os');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Fetch implementation using built-in Node.js modules
 * Works in both development and production without external dependencies
 */
async function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, requestOptions.timeout);

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: async () => data,
          json: async () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              throw new Error('Invalid JSON response');
            }
          }
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send body if provided
    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Use global.fetch if available (Electron 22+), otherwise use our implementation
const fetch = global.fetch || nodeFetch;

class ProductKeyService {
  constructor(databaseService) {
    this.db = databaseService?.db;
    // Supabase config
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set! Online activation will fail.');
    }
  }

  /**
   * Generate a simple machine identifier (no extra deps)
   * Combines hostname + platform + arch and hashes it
   */
  getCurrentMachineId() {
    const raw = `${os.hostname()}|${os.platform()}|${os.arch()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  normalizeKey(productKey) {
    return productKey.trim().replace(/\s+/g, '').toUpperCase();
  }

  hashKey(normalizedKey) {
    return crypto.createHash('sha256').update(normalizedKey).digest('hex');
  }

  /**
   * Check if product key is already activated
   */
  async isActivated() {
    if (!this.db) {
      return false;
    }

    try {
      const result = this.db.prepare(`
        SELECT activated_at, machine_id, machine_name FROM product_key 
        WHERE id = 1 AND is_active = 1
      `).get();

      if (!result) return false;

      const currentMachineId = this.getCurrentMachineId();
      if (result.machine_id && result.machine_id !== currentMachineId) {
        console.error('Product key bound to a different machine');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking activation:', error);
      return false;
    }
  }

  /**
   * Activate with product key
   * @param {string} productKey - The product key
   * @returns {{success: boolean, error?: string}}
   */
  async validateOnline(productKey) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      return { success: false, error: 'Supabase not configured' };
    }

    const normalizedKey = this.normalizeKey(productKey);
    const keyHash = this.hashKey(normalizedKey);

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/product_keys?key_hash=eq.${keyHash}&select=key_hash,status,machine_id,machine_name`, {
        method: 'GET',
        headers: {
          apikey: this.supabaseServiceKey,
          Authorization: `Bearer ${this.supabaseServiceKey}`
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Supabase validation failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return { success: false, error: 'Invalid product key' };
      }

      const row = data[0];
      if (row.status === 'used' && row.machine_id && row.machine_id !== this.getCurrentMachineId()) {
        return { success: false, error: 'Product key already used on another machine' };
      }

      return { success: true, row };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async redeemOnline(productKey) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      return { success: false, error: 'Supabase not configured' };
    }

    const normalizedKey = this.normalizeKey(productKey);
    const keyHash = this.hashKey(normalizedKey);
    const currentMachineId = this.getCurrentMachineId();
    const currentMachineName = os.hostname();

    // Fetch current status first
    const validateResult = await this.validateOnline(productKey);
    if (!validateResult.success) {
      return validateResult;
    }

    const row = validateResult.row;
    if (row.status === 'used' && row.machine_id && row.machine_id !== currentMachineId) {
      return { success: false, error: 'Product key already used on another machine' };
    }

    // If already used on this machine, consider activated
    if (row.status === 'used' && row.machine_id === currentMachineId) {
      return { success: true };
    }

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/product_keys?key_hash=eq.${keyHash}`, {
        method: 'PATCH',
        headers: {
          apikey: this.supabaseServiceKey,
          Authorization: `Bearer ${this.supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          status: 'used',
          activated_at: new Date().toISOString(),
          machine_id: currentMachineId,
          machine_name: currentMachineName
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Supabase redeem failed (${res.status})`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async activate(productKey) {
    if (!this.db) {
      return { success: false, error: 'Database not available' };
    }

    const normalizedKey = this.normalizeKey(productKey);
    const keyHash = this.hashKey(normalizedKey);
    const currentMachineId = this.getCurrentMachineId();
    const currentMachineName = os.hostname();

    // Redeem online first
    const redeemResult = await this.redeemOnline(productKey);
    if (!redeemResult.success) {
      return redeemResult;
    }

    try {
      // Upsert local activation info
      const existing = this.db.prepare('SELECT id, machine_id FROM product_key WHERE id = 1').get();
      
      if (existing) {
        // If already bound to another machine, block reuse locally
        if (existing.machine_id && existing.machine_id !== currentMachineId) {
          return { success: false, error: 'Product key already activated on a different machine (local)' };
        }

        this.db.prepare(`
          UPDATE product_key 
          SET product_key_hash = ?, activated_at = CURRENT_TIMESTAMP, is_active = 1, machine_id = ?, machine_name = ?
          WHERE id = 1
        `).run(
          keyHash,
          currentMachineId,
          currentMachineName
        );
      } else {
        this.db.prepare(`
          INSERT INTO product_key (id, product_key_hash, activated_at, is_active, machine_id, machine_name)
          VALUES (1, ?, CURRENT_TIMESTAMP, 1, ?, ?)
        `).run(
          keyHash,
          currentMachineId,
          currentMachineName
        );
      }

      console.log('✅ Product key activated successfully (online + local)');
      return { success: true };
    } catch (error) {
      console.error('Error saving local activation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate (for testing/reset)
   */
  async deactivate() {
    if (!this.db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      this.db.prepare('UPDATE product_key SET is_active = 0 WHERE id = 1').run();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get activation info
   */
  async getActivationInfo() {
    if (!this.db) {
      return null;
    }

    try {
      const result = this.db.prepare(`
        SELECT activated_at, is_active 
        FROM product_key 
        WHERE id = 1
      `).get();

      return result || null;
    } catch (error) {
      console.error('Error getting activation info:', error);
      return null;
    }
  }
}

// Singleton instance
let productKeyServiceInstance = null;

function getProductKeyService(databaseService) {
  if (!productKeyServiceInstance && databaseService) {
    productKeyServiceInstance = new ProductKeyService(databaseService);
  }
  return productKeyServiceInstance;
}

module.exports = {
  ProductKeyService,
  getProductKeyService
};
