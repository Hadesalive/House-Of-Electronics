/**
 * Sync Service
 * 
 * Handles synchronization between local SQLite database and cloud storage.
 * Tracks changes, manages sync queue, and handles conflict resolution.
 * 
 * FIXED VERSION - Addresses all critical race conditions and edge cases
 */

const { executeInTransaction } = require('./transaction-service');

/**
 * Sync Status Enum
 */
const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error'
};

/**
 * Change Type Enum
 */
const CHANGE_TYPE = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

/**
 * Tables that should be synced
 */
const SYNCABLE_TABLES = [
  'customers',
  'products',
  'sales',
  'invoices',
  'orders',
  'returns',
  'deals',
  'debts',
  'debt_payments',
  'boqs',
  'users'                  // User accounts (password_hash synced for internal Electron app)
];

/**
 * Tables that should NOT be synced (security/local config)
 */
const EXCLUDED_TABLES = [
  'company_settings',      // Single row, local config
  'license_activations',   // Security - license data
  'license_validations',   // Security - validation logs
  'hardware_snapshots',    // Security - hardware fingerprints
  'sync_queue',            // Internal sync state
  'sync_metadata'          // Internal sync config
];

/**
 * Create Sync Service
 */
function createSyncService(databaseService, cloudApiClient) {
  const db = databaseService.db;
  
  // Sync lock to prevent concurrent syncs
  let syncLock = false;
  let syncLockTimeout = null;
  const SYNC_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  
  // Store cloud client reference (can be updated dynamically)
  let currentCloudApiClient = cloudApiClient;

  /**
   * Initialize sync tables
   */
  function initializeSyncTables() {
    // Sync queue table - tracks pending changes
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
        data TEXT, -- JSON data for the change
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        locked_at DATETIME, -- When item was locked for syncing
        UNIQUE(table_name, record_id, change_type)
      )
    `);

    // Sync metadata table - tracks last sync info
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_sync_at DATETIME,
        sync_enabled INTEGER DEFAULT 1,
        sync_interval_minutes INTEGER DEFAULT 5,
        cloud_provider TEXT DEFAULT 'supabase',
        cloud_url TEXT,
        api_key TEXT,
        device_id TEXT,
        conflict_resolution_strategy TEXT DEFAULT 'server_wins' CHECK (conflict_resolution_strategy IN ('server_wins', 'client_wins', 'manual')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);

    // Migrate existing tables - add locked_at column if it doesn't exist
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (!hasLockedAt) {
        console.log('Migrating sync_queue table: adding locked_at column');
        db.exec(`ALTER TABLE sync_queue ADD COLUMN locked_at DATETIME`);
        // Reset cache so functions pick up the new column
        hasLockedAtColumn = true;
      } else {
        hasLockedAtColumn = true;
      }
    } catch (error) {
      console.error('Error checking/migrating sync_queue table:', error);
      hasLockedAtColumn = false;
      // Continue anyway - table might not exist yet
    }

    // Create indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
      ON sync_queue(sync_status, created_at)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record 
      ON sync_queue(table_name, record_id)
    `);

    // Create locked_at index only if column exists
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_locked 
          ON sync_queue(sync_status, locked_at)
        `);
      }
    } catch (error) {
      console.error('Error creating locked_at index:', error);
    }
  }

  /**
   * Validate table name
   */
  function validateTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Invalid table name: must be a non-empty string');
    }
    if (EXCLUDED_TABLES.includes(tableName)) {
      throw new Error(`Table ${tableName} is excluded from sync`);
    }
    if (!SYNCABLE_TABLES.includes(tableName)) {
      console.warn(`Table ${tableName} is not in syncable tables list`);
    }
    return true;
  }

  /**
   * Validate record ID
   */
  function validateRecordId(recordId) {
    if (!recordId || typeof recordId !== 'string') {
      throw new Error('Invalid record ID: must be a non-empty string');
    }
    return true;
  }

  /**
   * Get sync configuration
   */
  function getSyncConfig() {
    const stmt = db.prepare('SELECT * FROM sync_metadata WHERE id = 1');
    const config = stmt.get();
    
    if (!config) {
      // Initialize default config
      const deviceId = require('crypto').randomUUID();
      const insertStmt = db.prepare(`
        INSERT INTO sync_metadata 
        (sync_enabled, device_id, last_sync_at) 
        VALUES (0, ?, NULL)
      `);
      insertStmt.run(deviceId);
      return getSyncConfig();
    }
    
    return config;
  }

  /**
   * Update sync configuration
   */
  function updateSyncConfig(updates) {
    const allowedFields = [
      'sync_enabled',
      'sync_interval_minutes',
      'cloud_provider',
      'cloud_url',
      'api_key',
      'conflict_resolution_strategy'
    ];

    const setClause = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        // Don't update api_key if it's empty, null, or masked placeholder
        // This prevents accidentally clearing a valid API key
        if (key === 'api_key') {
          const apiKeyValue = updates[key];
          if (apiKeyValue && apiKeyValue !== '***' && apiKeyValue.trim().length > 10) {
            setClause.push(`${key} = ?`);
            values.push(apiKeyValue);
          }
          // Skip if empty/null/masked - don't update the field
        } else {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1); // WHERE id = 1

    const stmt = db.prepare(`
      UPDATE sync_metadata 
      SET ${setClause.join(', ')} 
      WHERE id = ?
    `);

    stmt.run(...values);
    return { success: true, data: getSyncConfig() };
  }

  /**
   * Acquire sync lock
   */
  function acquireSyncLock() {
    if (syncLock) {
      return false;
    }
    syncLock = true;
    // Set timeout to release lock if sync gets stuck
    syncLockTimeout = setTimeout(() => {
      console.warn('Sync lock timeout - releasing lock');
      syncLock = false;
    }, SYNC_LOCK_TIMEOUT_MS);
    return true;
  }

  /**
   * Release sync lock
   */
  function releaseSyncLock() {
    if (syncLockTimeout) {
      clearTimeout(syncLockTimeout);
      syncLockTimeout = null;
    }
    syncLock = false;
  }

  /**
   * Recover stuck sync items (items stuck in 'syncing' state)
   */
  function recoverStuckItems() {
    try {
      // Check if locked_at column exists
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
        const stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              locked_at = NULL,
              error_message = 'Recovered from stuck state',
              retry_count = retry_count + 1
          WHERE sync_status = 'syncing' 
          AND (locked_at IS NULL OR locked_at < ?)
        `);
        const result = stmt.run(stuckThreshold);
        return result.changes;
      } else {
        // Fallback: recover all syncing items if locked_at doesn't exist
        const stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = 'Recovered from stuck state',
              retry_count = retry_count + 1
          WHERE sync_status = 'syncing'
        `);
        const result = stmt.run();
        return result.changes;
      }
    } catch (error) {
      console.error('Error recovering stuck items:', error);
      return 0;
    }
  }

  /**
   * Track a change for syncing (with transaction safety)
   */
  function trackChange(tableName, recordId, changeType, data = null) {
    try {
      // Validate inputs
      validateTableName(tableName);
      validateRecordId(recordId);
      
      if (!Object.values(CHANGE_TYPE).includes(changeType)) {
        throw new Error(`Invalid change type: ${changeType}`);
      }

      const config = getSyncConfig();
      
      // Don't track if sync is disabled
      if (!config.sync_enabled) {
        return { success: true, skipped: true };
      }

      // Use transaction to ensure atomicity
      return executeInTransaction(db, () => {
        // Check if this change is already in queue
        const existingStmt = db.prepare(`
          SELECT id, sync_status FROM sync_queue 
          WHERE table_name = ? AND record_id = ? AND change_type = ?
        `);
        const existing = existingStmt.get(tableName, recordId, changeType);

        if (existing) {
          // Don't update if currently syncing (race condition protection)
          if (existing.sync_status === 'syncing') {
            return { success: true, skipped: true, reason: 'Item currently syncing' };
          }

          // Update existing queue item with latest data
          const updateStmt = db.prepare(`
            UPDATE sync_queue 
            SET data = ?, 
                sync_status = 'pending', 
                retry_count = 0, 
                created_at = CURRENT_TIMESTAMP,
                error_message = NULL
            WHERE id = ?
          `);
          updateStmt.run(data ? JSON.stringify(data) : null, existing.id);
        } else {
          // Insert new queue item
          const insertStmt = db.prepare(`
            INSERT INTO sync_queue (table_name, record_id, change_type, data, sync_status)
            VALUES (?, ?, ?, ?, 'pending')
          `);
          insertStmt.run(
            tableName,
            recordId,
            changeType,
            data ? JSON.stringify(data) : null
          );
        }

        return { success: true };
      });
    } catch (error) {
      console.error('Error tracking change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending sync items (with stuck item recovery)
   */
  function getPendingSyncItems(limit = 50) {
    // First, recover any stuck items
    recoverStuckItems();

    const stmt = db.prepare(`
      SELECT * FROM sync_queue 
      WHERE sync_status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    
    const items = stmt.all(limit);
    return items.map(item => {
      try {
        return {
          ...item,
          data: item.data ? JSON.parse(item.data) : null
        };
      } catch (parseError) {
        console.error(`Invalid JSON in queue item ${item.id}:`, parseError);
        // Mark as error
        markAsError(item.id, 'Invalid JSON data in queue');
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Get all sync queue items with optional status filter
   */
  function getSyncQueueItems(options = {}) {
    const { status = null, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM sync_queue';
    const params = [];
    
    if (status) {
      query += ' WHERE sync_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const items = stmt.all(...params);
    
    return items.map(item => {
      try {
        return {
          ...item,
          data: item.data ? JSON.parse(item.data) : null
        };
      } catch (parseError) {
        console.error(`Invalid JSON in queue item ${item.id}:`, parseError);
        return {
          ...item,
          data: null,
          parseError: true
        };
      }
    });
  }

  /**
   * Check if locked_at column exists (cached for performance)
   */
  let hasLockedAtColumn = null;
  function checkLockedAtColumn() {
    if (hasLockedAtColumn === null) {
      try {
        const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
        hasLockedAtColumn = tableInfo.some(col => col.name === 'locked_at');
      } catch (error) {
        console.error('Error checking locked_at column:', error);
        hasLockedAtColumn = false;
      }
    }
    return hasLockedAtColumn;
  }

  /**
   * Mark sync item as syncing (with lock timestamp)
   */
  function markAsSyncing(queueId) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'syncing', 
            locked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'syncing'
        WHERE id = ?
      `);
      stmt.run(queueId);
    }
  }

  /**
   * Mark sync item as synced
   */
  function markAsSynced(queueId) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'synced', 
            synced_at = CURRENT_TIMESTAMP,
            locked_at = NULL
        WHERE id = ?
      `);
      stmt.run(queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'synced', 
            synced_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(queueId);
    }
  }

  /**
   * Mark sync item as error
   */
  function markAsError(queueId, errorMessage) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'error', 
            error_message = ?,
            retry_count = retry_count + 1,
            locked_at = NULL
        WHERE id = ?
      `);
      stmt.run(errorMessage, queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'error', 
            error_message = ?,
            retry_count = retry_count + 1
        WHERE id = ?
      `);
      stmt.run(errorMessage, queueId);
    }
  }

  /**
   * Reset failed sync items for retry
   * @param {number|null} maxRetries - Maximum retry count to reset (null = reset all, default = 100 for manual retry)
   * @param {number|number[]|null} itemIds - Optional: specific item ID(s) to reset. If provided, only resets those items.
   */
  function resetFailedItems(maxRetries = 100, itemIds = null) {
    let stmt;
    const hasLockedAt = checkLockedAtColumn();
    
    if (itemIds !== null) {
      // Reset specific items by ID
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
      const placeholders = ids.map(() => '?').join(',');
      
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE id IN (${placeholders}) AND sync_status = 'error'
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE id IN (${placeholders}) AND sync_status = 'error'
        `);
      }
      const result = stmt.run(...ids);
      return result.changes;
    } else if (maxRetries === null) {
      // Reset ALL error items regardless of retry count
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE sync_status = 'error'
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE sync_status = 'error'
        `);
      }
      const result = stmt.run();
      return result.changes;
    } else {
      // Reset items with retry_count < maxRetries
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE sync_status = 'error' AND retry_count < ?
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE sync_status = 'error' AND retry_count < ?
        `);
      }
      const result = stmt.run(maxRetries);
      return result.changes;
    }
  }

  /**
   * Automatically retry failed items (with exponential backoff)
   * Only retries items that:
   * - Are in error state
   * - Have retry_count < maxRetries (default 5)
   * - Were created within the last 24 hours (to avoid retrying old errors)
   */
  function autoRetryFailedItems(maxRetries = 5) {
    try {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'pending', 
            error_message = NULL,
            retry_count = retry_count + 1
        WHERE sync_status = 'error' 
          AND retry_count < ?
          AND created_at > datetime('now', '-24 hours')
      `);
      const result = stmt.run(maxRetries);
      
      if (result.changes > 0) {
        console.log(`🔄 Auto-retrying ${result.changes} failed sync items`);
      }
      
      return result.changes;
    } catch (error) {
      console.error('Error auto-retrying failed items:', error);
      return 0;
    }
  }

  /**
   * Fetch latest data from database before syncing
   */
  async function fetchLatestData(tableName, recordId, changeType) {
    try {
      // For DELETE, we need to store data before deletion
      if (changeType === CHANGE_TYPE.DELETE) {
        const record = await getRecordById(tableName, recordId);
        return record;
      }

      // For CREATE/UPDATE, fetch latest from DB
      const record = await getRecordById(tableName, recordId);
      return record;
    } catch (error) {
      console.error(`Error fetching latest data for ${tableName}:${recordId}:`, error);
      return null;
    }
  }

  /**
   * Sync a single item to cloud (with retry and latest data)
   */
  async function syncItem(queueItem) {
    // Dynamically create/update cloud client from config if needed
    if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
      const config = getSyncConfig();
      if (config.cloud_url && config.api_key) {
        console.log('🔄 Creating cloud API client from config for syncItem...');
        const { createCloudApiClient } = require('./cloud-api-client');
        currentCloudApiClient = createCloudApiClient(
          config.cloud_provider || 'supabase',
          {
            url: config.cloud_url || '',
            apiKey: config.api_key || '',
            tablePrefix: config.table_prefix || ''
          }
        );
      } else {
        throw new Error('Cloud API client not configured. Please set Supabase URL and API key in sync settings.');
      }
    }
    
    if (!currentCloudApiClient) {
      throw new Error('Cloud API client not configured');
    }

    const { table_name, record_id, change_type, data } = queueItem;

    try {
      markAsSyncing(queueItem.id);

      // Fetch latest data from database to avoid stale data
      let syncData = data;
      if (change_type !== CHANGE_TYPE.DELETE) {
        const latestData = await fetchLatestData(table_name, record_id, change_type);
        if (latestData) {
          syncData = latestData;
        }
      } else {
        // For DELETE, use stored data or fetch before delete
        if (!syncData) {
          syncData = await fetchLatestData(table_name, record_id, change_type);
        }
      }

      // For internal Electron app, we sync all user data including password_hash
      // No sanitization needed

      let result;
      switch (change_type) {
        case CHANGE_TYPE.CREATE:
        case CHANGE_TYPE.UPDATE:
          result = await currentCloudApiClient.upsertRecord(table_name, record_id, syncData);
          break;
        case CHANGE_TYPE.DELETE:
          result = await currentCloudApiClient.deleteRecord(table_name, record_id);
          break;
        default:
          throw new Error(`Unknown change type: ${change_type}`);
      }

      if (result.success) {
        markAsSynced(queueItem.id);
        return { success: true };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      markAsError(queueItem.id, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get record count for a table
   */
  function getTableRecordCount(tableName) {
    try {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
      const result = stmt.get();
      return result.count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all record IDs from a table
   */
  function getTableRecordIds(tableName) {
    try {
      const stmt = db.prepare(`SELECT id FROM ${tableName}`);
      const records = stmt.all();
      return new Set(records.map(r => r.id?.toString()).filter(Boolean));
    } catch (error) {
      return new Set();
    }
  }

  /**
   * Perform initial bidirectional sync - industry standard approach
   * 
   * Strategy (like Dropbox, Google Drive, etc.):
   * 1. Fetch all records from cloud (single API call)
   * 2. Fetch all records from local database
   * 3. Compare both sides:
   *    - Records only on cloud → download to local
   *    - Records only on local → queue for upload
   *    - Records on both → compare timestamps, use conflict resolution
   * 4. This ensures both sides end up with the same data
   */
  async function performInitialSync() {
    const config = getSyncConfig();
    
    // Only perform initial sync if:
    // 1. Sync is enabled
    // 2. Cloud client is configured
    // 3. Never synced before (last_sync_at is null)
      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config for pull...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
        }
      }
      
      if (!config.sync_enabled || !currentCloudApiClient || !currentCloudApiClient.isConfigured() || config.last_sync_at) {
      return { success: true, skipped: true, message: 'Initial sync not needed' };
    }

    console.log('🔄 Starting initial bidirectional sync (industry standard)...');
    
    let uploaded = 0;
    let downloaded = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      // Step 1: Fetch all records from cloud (single API call for efficiency)
      console.log('📥 Step 1: Fetching all records from cloud...');
      const cloudChanges = await currentCloudApiClient.getChanges(null); // null = get everything
      
      if (!cloudChanges.success) {
        return cloudChanges;
      }

      const cloudRecords = new Map(); // table_name -> Set of record_ids
      const cloudRecordsByTable = new Map(); // table_name -> Map(record_id -> record_data)
      
      if (cloudChanges.data) {
        for (const change of cloudChanges.data) {
          const { table_name, record_id, data, server_updated_at } = change;
          
          if (!cloudRecords.has(table_name)) {
            cloudRecords.set(table_name, new Set());
            cloudRecordsByTable.set(table_name, new Map());
          }
          
          cloudRecords.get(table_name).add(record_id);
          cloudRecordsByTable.get(table_name).set(record_id, {
            data,
            server_updated_at
          });
        }
      }

      console.log(`   Found ${cloudChanges.data?.length || 0} records on cloud`);

      // Step 2: Compare with local records and handle bidirectional sync
      console.log('🔄 Step 2: Comparing local and cloud records...');
      
      for (const tableName of SYNCABLE_TABLES) {
        try {
          // Get all local record IDs and their data
          const localRecordIds = getTableRecordIds(tableName);
          const cloudRecordIds = cloudRecords.get(tableName) || new Set();
          
          let tableDownloaded = 0;
          let tableUploaded = 0;
          let tableConflicts = 0;
          let tableErrors = 0;

          console.log(`   Table ${tableName}: ${localRecordIds.size} local, ${cloudRecordIds.size} cloud`);

          // Records only on cloud → download to local
          for (const cloudRecordId of cloudRecordIds) {
            if (!localRecordIds.has(cloudRecordId)) {
              // Record exists on cloud but not locally → download it
              const cloudRecordData = cloudRecordsByTable.get(tableName)?.get(cloudRecordId);
              if (cloudRecordData) {
                try {
                  const result = await applyRemoteChange({
                    table_name: tableName,
                    record_id: cloudRecordId,
                    change_type: CHANGE_TYPE.CREATE,
                    data: cloudRecordData.data,
                    server_updated_at: cloudRecordData.server_updated_at
                  }, config.conflict_resolution_strategy);
                  
                  if (result.success) {
                    tableDownloaded++;
                  } else if (result.conflict) {
                    tableConflicts++;
                  } else {
                    tableErrors++;
                  }
                } catch (error) {
                  console.error(`Error downloading ${tableName}:${cloudRecordId}:`, error);
                  tableErrors++;
                }
              }
            } else {
              // Record exists on both → compare timestamps (handled by applyRemoteChange)
              const cloudRecordData = cloudRecordsByTable.get(tableName)?.get(cloudRecordId);
              if (cloudRecordData) {
                try {
                  const localRecord = await getRecordById(tableName, cloudRecordId);
                  if (localRecord) {
                    // Compare timestamps - applyRemoteChange will handle conflict resolution
                    const result = await applyRemoteChange({
                      table_name: tableName,
                      record_id: cloudRecordId,
                      change_type: CHANGE_TYPE.UPDATE,
                      data: cloudRecordData.data,
                      server_updated_at: cloudRecordData.server_updated_at
                    }, config.conflict_resolution_strategy);
                    
                    if (result.conflict) {
                      tableConflicts++;
                    } else if (!result.success && !result.skipped) {
                      tableErrors++;
                    }
                  }
                } catch (error) {
                  console.error(`Error comparing ${tableName}:${cloudRecordId}:`, error);
                  tableErrors++;
                }
              }
            }
          }

          // Records only on local → queue for upload
          for (const localRecordId of localRecordIds) {
            if (!cloudRecordIds.has(localRecordId)) {
              // Record exists locally but not on cloud → queue for upload
              const record = await getRecordById(tableName, localRecordId);
              if (record) {
                // Check if already in queue to avoid duplicates
                const existingStmt = db.prepare(`
                  SELECT id FROM sync_queue 
                  WHERE table_name = ? AND record_id = ? AND change_type = 'create'
                `);
                const existing = existingStmt.get(tableName, localRecordId);
                
                if (!existing) {
                  trackChange(tableName, localRecordId, CHANGE_TYPE.CREATE, record);
                  tableUploaded++;
                }
              }
            }
          }

          downloaded += tableDownloaded;
          uploaded += tableUploaded;
          conflicts += tableConflicts;
          errors += tableErrors;

          console.log(`   Table ${tableName}: ${tableDownloaded} downloaded, ${tableUploaded} queued for upload, ${tableConflicts} conflicts`);
        } catch (tableError) {
          console.error(`Error processing table ${tableName} for initial sync:`, tableError.message);
          errors++;
          // Continue with other tables
        }
      }

      console.log(`✅ Initial bidirectional sync complete:`);
      console.log(`   📥 Downloaded: ${downloaded} records`);
      console.log(`   📤 Queued for upload: ${uploaded} records`);
      console.log(`   ⚠️  Conflicts: ${conflicts}`);
      console.log(`   ❌ Errors: ${errors}`);

      return {
        success: true,
        downloaded,
        uploaded,
        conflicts,
        errors,
        message: `Initial sync: ${downloaded} downloaded, ${uploaded} queued for upload`
      };
    } catch (error) {
      console.error('Error during initial bidirectional sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync all pending items (with lock protection)
   */
  async function syncAll() {
    // Acquire lock
    if (!acquireSyncLock()) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      const config = getSyncConfig();
      
      if (!config.sync_enabled) {
        return { success: false, error: 'Sync is disabled' };
      }

      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        const config = getSyncConfig();
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
          console.log('✅ Cloud API client created');
        } else {
          return { success: false, error: 'Cloud API client not configured. Please set Supabase URL and API key in sync settings.' };
        }
      }
      
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        return { success: false, error: 'Cloud API client not configured' };
      }

      // Check if this is the first sync - perform initial full sync
      if (!config.last_sync_at) {
        console.log('🔄 First sync detected - performing initial full sync...');
        const initialSyncResult = await performInitialSync();
        if (!initialSyncResult.success) {
          return initialSyncResult;
        }
        
        // Initial sync is bidirectional - it both pulls and queues uploads
        // Continue with normal sync to upload the queued items
        if (initialSyncResult.downloaded !== undefined) {
          console.log(`Initial sync: ${initialSyncResult.downloaded} downloaded, ${initialSyncResult.uploaded || 0} queued for upload`);
          // Continue to sync the queued uploads below
        }
      }

      // Recover stuck items first
      recoverStuckItems();

      // Auto-retry failed items before syncing new ones
      const autoRetried = autoRetryFailedItems(5);
      if (autoRetried > 0) {
        console.log(`🔄 Auto-retried ${autoRetried} failed items`);
      }

      const pendingItems = getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        return { success: true, synced: 0, message: 'No pending items to sync' };
      }

      let synced = 0;
      let errors = 0;

      // Rate limiting: Add delay between items to avoid hitting API limits
      const RATE_LIMIT_DELAY_MS = 100; // 100ms delay between items (10 items/second max)

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        const result = await syncItem(item);
        if (result.success) {
          synced++;
        } else {
          errors++;
        }

        // Add rate limiting delay (except for last item)
        if (i < pendingItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      }

      // Only update last sync time if all items succeeded
      // (or if we want partial success, update only if synced > 0)
      if (synced > 0) {
        const updateStmt = db.prepare(`
          UPDATE sync_metadata 
          SET last_sync_at = CURRENT_TIMESTAMP 
          WHERE id = 1
        `);
        updateStmt.run();
      }

      return {
        success: true,
        synced,
        errors,
        total: pendingItems.length
      };
    } finally {
      releaseSyncLock();
    }
  }

  /**
   * Pull changes from cloud (with optional lock protection)
   * @param {string|null} lastSyncAt - Override last sync timestamp (null = pull all)
   * @param {boolean} skipLock - If true, skip lock acquisition (for internal calls)
   */
  async function pullChanges(lastSyncAt = null, skipLock = false) {
    // Acquire lock unless explicitly skipped (for internal calls)
    if (!skipLock) {
      if (!acquireSyncLock()) {
        return { success: false, error: 'Sync already in progress' };
      }
    }

    try {
      const config = getSyncConfig();
      
      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
        }
      }
      
      if (!config.sync_enabled || !currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        return { success: false, error: 'Sync not configured' };
      }

      // If lastSyncAt is null and config.last_sync_at is also null, pull everything
      const syncTimestamp = lastSyncAt !== null ? lastSyncAt : (config.last_sync_at || null);
      const changes = await currentCloudApiClient.getChanges(syncTimestamp);
      
      if (!changes.success) {
        return changes;
      }

      let applied = 0;
      let conflicts = 0;
      let errors = 0;

      // Apply changes to local database in transaction
      for (const change of changes.data || []) {
        try {
          const result = await applyRemoteChange(change, config.conflict_resolution_strategy);
          if (result.success) {
            applied++;
          } else if (result.conflict) {
            conflicts++;
          } else {
            errors++;
          }
        } catch (error) {
          console.error('Error applying remote change:', error);
          errors++;
        }
      }

      // Update last sync time only if changes were applied
      if (applied > 0 || (changes.data?.length === 0)) {
        const updateStmt = db.prepare(`
          UPDATE sync_metadata 
          SET last_sync_at = CURRENT_TIMESTAMP 
          WHERE id = 1
        `);
        updateStmt.run();
      }

      return {
        success: true,
        applied,
        conflicts,
        errors,
        total: changes.data?.length || 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Only release lock if we acquired it
      if (!skipLock) {
        releaseSyncLock();
      }
    }
  }

  /**
   * Get record by table name and ID (with full schema support)
   */
  async function getRecordById(tableName, recordId) {
    const methodMap = {
      'customers': 'getCustomerById',
      'products': 'getProductById',
      'sales': 'getSaleById',
      'invoices': 'getInvoiceById',
      'orders': 'getOrderById',
      'returns': 'getReturnById',
      'deals': 'getDealById',
      'debts': 'getDebtById',
      'debt_payments': 'getDebtPaymentById',
      'users': 'getUserById'
    };

    const method = methodMap[tableName];
    if (!method || !databaseService[method]) {
      // Try generic query as fallback
      try {
        const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
        const record = stmt.get(recordId);
        return record;
      } catch (error) {
        console.error(`Error fetching ${tableName}:${recordId}:`, error);
        return null;
      }
    }

    return await databaseService[method](recordId);
  }

  /**
   * Check for conflicts (improved logic)
   */
  function checkConflict(localRecord, serverUpdatedAt, lastSyncAt, changeType) {
    // If local record doesn't exist and remote is DELETE, no conflict
    if (!localRecord && changeType === CHANGE_TYPE.DELETE) {
      return false;
    }

    // If local record doesn't exist and remote is CREATE/UPDATE, no conflict
    if (!localRecord) {
      return false;
    }

    // Check if there's a pending sync for this record
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE table_name = ? AND record_id = ? AND sync_status IN ('pending', 'syncing')
    `);
    const pending = pendingStmt.get(localRecord.table_name || 'unknown', localRecord.id);
    
    if (pending.count > 0) {
      return true; // Conflict: local change pending
    }

    // Check timestamp conflict
    if (localRecord.updated_at && serverUpdatedAt) {
      const localTime = new Date(localRecord.updated_at).getTime();
      const serverTime = new Date(serverUpdatedAt).getTime();
      const lastSyncTime = new Date(lastSyncAt || 0).getTime();
      
      // If local was modified after last sync, we have a conflict
      if (localTime > lastSyncTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert snake_case to camelCase (reverse of convertToSnakeCase)
   * Needed when pulling data from Supabase (snake_case) to local DB (camelCase)
   */
  function convertToCamelCase(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(convertToCamelCase);
    }
    
    if (typeof obj !== 'object' || obj instanceof Date) {
      return obj;
    }
    
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle specific known conversions
      let camelKey = key;
      if (key === 'customer_id') camelKey = 'customerId';
      else if (key === 'customer_name') camelKey = 'customerName';
      else if (key === 'customer_email') camelKey = 'customerEmail';
      else if (key === 'customer_address') camelKey = 'customerAddress';
      else if (key === 'customer_phone') camelKey = 'customerPhone';
      else if (key === 'sale_id') camelKey = 'saleId';
      else if (key === 'user_id') camelKey = 'userId';
      else if (key === 'sales_rep_name') camelKey = 'salesRepName';
      else if (key === 'sales_rep_id') camelKey = 'salesRepId';
      else if (key === 'invoice_id') camelKey = 'invoiceId';
      else if (key === 'invoice_number') camelKey = 'invoiceNumber';
      else if (key === 'invoice_type') camelKey = 'invoiceType';
      else if (key === 'paid_amount') camelKey = 'paidAmount';
      else if (key === 'due_date') camelKey = 'dueDate';
      else if (key === 'bank_details') camelKey = 'bankDetails';
      else if (key === 'created_at') camelKey = 'createdAt';
      else if (key === 'updated_at') camelKey = 'updatedAt';
      else if (key === 'order_number') camelKey = 'orderNumber';
      else if (key === 'supplier_id') camelKey = 'supplierId';
      else if (key === 'supplier_name') camelKey = 'supplierName';
      else if (key === 'payment_method') camelKey = 'paymentMethod';
      else if (key === 'payment_status') camelKey = 'paymentStatus';
      else if (key === 'expected_delivery_date') camelKey = 'expectedDeliveryDate';
      else if (key === 'actual_delivery_date') camelKey = 'actualDeliveryDate';
      else if (key === 'return_number') camelKey = 'returnNumber';
      else if (key === 'refund_method') camelKey = 'refundMethod';
      else if (key === 'processed_by') camelKey = 'processedBy';
      else if (key === 'debt_id') camelKey = 'debtId';
      else if (key === 'full_name') camelKey = 'fullName';
      else if (key === 'password_hash') camelKey = 'passwordHash';
      else if (key === 'employee_id') camelKey = 'employeeId';
      else if (key === 'last_login') camelKey = 'lastLogin';
      else if (key === 'is_active') camelKey = 'isActive';
      else if (key === 'store_credit') camelKey = 'storeCredit';
      else if (key === 'has_backorder') camelKey = 'hasBackorder';
      else if (key === 'backorder_details') camelKey = 'backorderDetails';
      else if (key === 'cashier_name') camelKey = 'cashierName';
      else if (key === 'cashier_employee_id') camelKey = 'cashierEmployeeId';
      else {
        // Generic snake_case to camelCase conversion
        camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      }
      
      converted[camelKey] = convertToCamelCase(value);
    }
    return converted;
  }

  /**
   * Apply a remote change to local database (with improved conflict handling)
   */
  async function applyRemoteChange(change, conflictStrategy) {
    const { table_name, record_id, change_type, data, server_updated_at } = change;

    try {
      // Validate table name
      if (!SYNCABLE_TABLES.includes(table_name)) {
        return { success: false, error: `Table ${table_name} is not syncable` };
      }
      
      // Convert snake_case data from Supabase to camelCase for local database
      // IMPORTANT: Preserve the id from Supabase to maintain relationships
      const camelCaseData = convertToCamelCase(data);
      // Ensure id is set (it should be in the data, but make sure it's preserved)
      if (!camelCaseData.id && record_id) {
        camelCaseData.id = record_id;
      }
      
      // Debug logging for invoices to verify customer_id is converted
      if (table_name === 'invoices') {
        console.log(`[Sync Debug] Applying invoice ${record_id}:`, {
          hasId: !!camelCaseData.id,
          customerId: camelCaseData.customerId,
          customerName: camelCaseData.customerName,
          saleId: camelCaseData.saleId,
          originalDataKeys: Object.keys(data || {}),
          convertedKeys: Object.keys(camelCaseData || {})
        });
      }

      // Get local record and last sync time
      const localRecord = await getRecordById(table_name, record_id);
      const config = getSyncConfig();
      const lastSyncAt = config.last_sync_at;

      // Check for conflicts
      const hasConflict = checkConflict(localRecord, server_updated_at, lastSyncAt, change_type);

      if (hasConflict) {
        if (conflictStrategy === 'manual') {
          // Queue for manual resolution
          trackChange(table_name, record_id, 'conflict', {
            local: localRecord,
            remote: data,
            conflict_type: 'update_conflict',
            change_type: change_type
          });
          return { success: false, conflict: true };
        } else if (conflictStrategy === 'client_wins') {
          // Skip this change
          return { success: true, skipped: true };
        }
        // server_wins - continue to apply
      }

      // If cloud marks deleted_at but sends as update, treat it as delete
      const effectiveChangeType = (change_type === CHANGE_TYPE.UPDATE && data && data.deleted_at)
        ? CHANGE_TYPE.DELETE
        : change_type;

      // Handle DELETE conflicts specially
      if (effectiveChangeType === CHANGE_TYPE.DELETE) {
        if (!localRecord) {
          // Already deleted, no-op
          return { success: true, skipped: true };
        }
        // Check if local has pending changes
        if (hasConflict && conflictStrategy === 'client_wins') {
          return { success: true, skipped: true };
        }
      }

      // Apply the change using appropriate database service method
      const updateMethodMap = {
        'customers': 'updateCustomer',
        'products': 'updateProduct',
        'sales': 'updateSale',
        'invoices': 'updateInvoice',
        'orders': 'updateOrder',
        'returns': 'updateReturn',
        'deals': 'updateDeal',
        'debts': 'updateDebt',
        'debt_payments': 'updateDebtPayment',
        'boqs': 'updateBOQ',
        'users': 'updateUser'
      };

      const createMethodMap = {
        'customers': 'createCustomer',
        'products': 'createProduct',
        'sales': 'createSale',
        'invoices': 'createInvoice',
        'orders': 'createOrder',
        'returns': 'createReturn',
        'deals': 'createDeal',
        'debts': 'addDebt', // Uses addDebt method
        'debt_payments': 'addDebtPayment', // Uses addDebtPayment method
        'boqs': 'createBOQ',
        'users': 'createUser'
      };

      const deleteMethodMap = {
        'customers': 'deleteCustomer',
        'products': 'deleteProduct',
        'sales': 'deleteSale',
        'invoices': 'deleteInvoice',
        'orders': 'deleteOrder',
        'returns': 'deleteReturn',
        'deals': 'deleteDeal',
        'debts': 'deleteDebt',
        'debt_payments': 'deleteDebtPayment',
        'boqs': 'deleteBOQ',
        'users': 'deleteUser'
      };

      // Check if record exists before transaction (for DELETE operations)
      let existingRecord = null;
      if (change_type === CHANGE_TYPE.DELETE) {
        existingRecord = await getRecordById(table_name, record_id);
      }

      // Use transaction for atomicity
      return executeInTransaction(db, () => {
        switch (effectiveChangeType) {
          case CHANGE_TYPE.CREATE:
            const createMethod = createMethodMap[table_name];
            // Handle special cases where method names differ
            let actualCreateMethod = createMethod;
            if (table_name === 'debts' && !databaseService[createMethod] && databaseService.addDebt) {
              actualCreateMethod = 'addDebt';
            } else if (table_name === 'debt_payments' && !databaseService[createMethod] && databaseService.addDebtPayment) {
              actualCreateMethod = 'addDebtPayment';
            }
            
            if (actualCreateMethod && databaseService[actualCreateMethod]) {
              // CRITICAL: Use the id from Supabase to maintain relationships
              // This ensures customer_id, sale_id, etc. reference the correct records
              camelCaseData.id = record_id;
              
              // For users, we need to set a default password_hash if creating from sync
              if (table_name === 'users' && !camelCaseData.passwordHash) {
                // Set a temporary password that user must reset (or use a default)
                // In production, you might want to require password reset on first login
                const crypto = require('crypto');
                camelCaseData.passwordHash = crypto.createHash('sha256').update('TEMP_PASSWORD_RESET_REQUIRED').digest('hex');
              }
              // Parse JSON fields (items, taxes, etc.) if they're strings
              if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                try {
                  camelCaseData.items = JSON.parse(camelCaseData.items);
                } catch (e) {
                  console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                try {
                  camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                } catch (e) {
                  console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                try {
                  camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                } catch (e) {
                  console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                try {
                  camelCaseData.notes = JSON.parse(camelCaseData.notes);
                } catch (e) {
                  console.warn(`Failed to parse notes for ${table_name}:${record_id}:`, e);
                }
              }
              databaseService[actualCreateMethod](camelCaseData);
            } else {
              // Fallback to direct insert
              const insertStmt = db.prepare(`INSERT INTO ${table_name} (id, ...) VALUES (?, ...)`);
              // This is a simplified example - would need proper column mapping
            }
            break;
          case CHANGE_TYPE.UPDATE:
            // If local record doesn't exist, create it instead of updating
            if (!localRecord) {
              const createMethod = createMethodMap[table_name];
              // Handle special cases where method names differ
              let actualCreateMethod = createMethod;
              if (table_name === 'debts' && !databaseService[createMethod] && databaseService.addDebt) {
                actualCreateMethod = 'addDebt';
              } else if (table_name === 'debt_payments' && !databaseService[createMethod] && databaseService.addDebtPayment) {
                actualCreateMethod = 'addDebtPayment';
              }
              
              if (actualCreateMethod && databaseService[actualCreateMethod]) {
                // For users, we need to set a default password_hash if creating from sync
                if (table_name === 'users' && !camelCaseData.passwordHash) {
                  // Set a temporary password that user must reset (or use a default)
                  // In production, you might want to require password reset on first login
                  const crypto = require('crypto');
                  camelCaseData.passwordHash = crypto.createHash('sha256').update('TEMP_PASSWORD_RESET_REQUIRED').digest('hex');
                }
                // Parse JSON fields (items, taxes, etc.) if they're strings
                if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                  try {
                    camelCaseData.items = JSON.parse(camelCaseData.items);
                  } catch (e) {
                    console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                  try {
                    camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                  } catch (e) {
                    console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                  try {
                    camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                  } catch (e) {
                    console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                  try {
                    camelCaseData.notes = JSON.parse(camelCaseData.notes);
                  } catch (e) {
                    console.warn(`Failed to parse notes for ${table_name}:${record_id}:`, e);
                  }
                }
                databaseService[actualCreateMethod](camelCaseData);
              } else {
                throw new Error(`Cannot create record in ${table_name} - method not available`);
              }
            } else {
              const updateMethod = updateMethodMap[table_name];
              if (updateMethod && databaseService[updateMethod]) {
                // Parse JSON fields (items, taxes, etc.) if they're strings
                if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                  try {
                    camelCaseData.items = JSON.parse(camelCaseData.items);
                  } catch (e) {
                    console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                  try {
                    camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                  } catch (e) {
                    console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                  try {
                    camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                  } catch (e) {
                    console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                  try {
                    camelCaseData.notes = JSON.parse(camelCaseData.notes);
                  } catch (e) {
                    console.warn(`Failed to parse notes for ${table_name}:${record_id}:`, e);
                  }
                }
                databaseService[updateMethod](record_id, camelCaseData);
              } else {
                throw new Error(`Cannot update record in ${table_name} - method not available`);
              }
            }
            break;
          case CHANGE_TYPE.DELETE:
            const deleteMethod = deleteMethodMap[table_name];
            if (deleteMethod && databaseService[deleteMethod]) {
              // existingRecord was checked before transaction
              if (existingRecord) {
                console.log(`[Sync] Applying delete for ${table_name}:${record_id}`);
                databaseService[deleteMethod](record_id);
              } else {
                console.log(`[Sync] Record ${table_name}:${record_id} already deleted or doesn't exist locally - skipping`);
              }
            } else {
              console.warn(`[Sync] No delete method found for ${table_name} - record ${record_id} will remain`);
            }
            break;
        }

        // Remove from sync queue if it exists (already synced from server)
        const deleteStmt = db.prepare(`
          DELETE FROM sync_queue 
          WHERE table_name = ? AND record_id = ? AND change_type = ?
        `);
        deleteStmt.run(table_name, record_id, effectiveChangeType);

        return { success: true };
      });
    } catch (error) {
      console.error('Error applying remote change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status
   */
  function getSyncStatus() {
    const config = getSyncConfig();
    
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'pending'
    `);
    const pending = pendingStmt.get().count;

    const errorStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'error'
    `);
    const errors = errorStmt.get().count;

    // Check if locked_at column exists
    let stuck = 0;
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        const stuckStmt = db.prepare(`
          SELECT COUNT(*) as count FROM sync_queue 
          WHERE sync_status = 'syncing' 
          AND (locked_at IS NULL OR locked_at < datetime('now', '-5 minutes'))
        `);
        stuck = stuckStmt.get().count;
      } else {
        // Fallback: count all syncing items if locked_at doesn't exist
        const stuckStmt = db.prepare(`
          SELECT COUNT(*) as count FROM sync_queue 
          WHERE sync_status = 'syncing'
        `);
        stuck = stuckStmt.get().count;
      }
    } catch (error) {
      console.error('Error getting stuck items count:', error);
      stuck = 0;
    }

    return {
      enabled: config.sync_enabled === 1,
      lastSyncAt: config.last_sync_at,
      pending,
      errors,
      stuck,
      deviceId: config.device_id,
      cloudProvider: config.cloud_provider,
      isConfigured: currentCloudApiClient?.isConfigured() || false,
      isLocked: syncLock
    };
  }

  /**
   * Get sync health metrics and status
   * Returns health indicators for monitoring and alerting
   */
  function getSyncHealth() {
    const status = getSyncStatus();
    const config = getSyncConfig();
    
    // Calculate total items
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue
    `);
    const total = totalStmt.get().count || 0;

    // Calculate error rate
    const errorRate = total > 0 ? (status.errors / total) * 100 : 0;

    // Calculate last sync age (in minutes)
    let lastSyncAgeMinutes = null;
    if (status.lastSyncAt) {
      const lastSyncTime = new Date(status.lastSyncAt).getTime();
      const now = Date.now();
      lastSyncAgeMinutes = Math.floor((now - lastSyncTime) / 60000);
    }

    // Get items with high retry count (potential persistent failures)
    const highRetryStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE retry_count >= 3 AND sync_status = 'error'
    `);
    const highRetryErrors = highRetryStmt.get().count || 0;

    // Get recent errors (last hour)
    const recentErrorsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE sync_status = 'error' 
      AND created_at > datetime('now', '-1 hour')
    `);
    const recentErrors = recentErrorsStmt.get().count || 0;

    // Determine health status
    let healthStatus = 'healthy';
    const warnings = [];
    const alerts = [];

    // Check error rate
    if (errorRate > 20) {
      healthStatus = 'critical';
      alerts.push(`High error rate: ${errorRate.toFixed(1)}%`);
    } else if (errorRate > 10) {
      healthStatus = 'warning';
      warnings.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
    }

    // Check stuck items
    if (status.stuck > 10) {
      healthStatus = 'critical';
      alerts.push(`${status.stuck} items stuck in syncing state`);
    } else if (status.stuck > 5) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${status.stuck} items stuck in syncing state`);
    }

    // Check last sync age
    if (lastSyncAgeMinutes !== null) {
      if (lastSyncAgeMinutes > 60) {
        healthStatus = 'critical';
        alerts.push(`Last sync was ${lastSyncAgeMinutes} minutes ago`);
      } else if (lastSyncAgeMinutes > 30) {
        healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
        warnings.push(`Last sync was ${lastSyncAgeMinutes} minutes ago`);
      }
    } else if (status.enabled && config.sync_enabled) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push('Never synced (initial sync pending)');
    }

    // Check high retry errors
    if (highRetryErrors > 5) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${highRetryErrors} items with 3+ retry attempts`);
    }

    // Check recent errors
    if (recentErrors > 20) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${recentErrors} errors in the last hour`);
    }

    return {
      status: healthStatus, // 'healthy' | 'warning' | 'critical'
      metrics: {
        total,
        pending: status.pending,
        errors: status.errors,
        stuck: status.stuck,
        synced: total - status.pending - status.errors - status.stuck,
        errorRate: parseFloat(errorRate.toFixed(2)),
        highRetryErrors,
        recentErrors,
        lastSyncAgeMinutes,
        lastSyncAt: status.lastSyncAt
      },
      warnings,
      alerts,
      enabled: status.enabled,
      isConfigured: status.isConfigured,
      isLocked: status.isLocked
    };
  }

  /**
   * Clear sync queue
   */
  function clearSyncQueue(status = null) {
    if (status) {
      const stmt = db.prepare('DELETE FROM sync_queue WHERE sync_status = ?');
      stmt.run(status);
    } else {
      db.prepare('DELETE FROM sync_queue').run();
    }
  }

  return {
    initializeSyncTables,
    getSyncConfig,
    updateSyncConfig,
    trackChange,
    getPendingSyncItems,
    getSyncQueueItems,
    syncAll,
    pullChanges,
    getSyncStatus,
    getSyncHealth,
    clearSyncQueue,
    resetFailedItems,
    autoRetryFailedItems,
    recoverStuckItems,
    performInitialSync,
    SYNCABLE_TABLES,
    EXCLUDED_TABLES
  };
}

module.exports = {
  createSyncService,
  SYNC_STATUS,
  CHANGE_TYPE
};
