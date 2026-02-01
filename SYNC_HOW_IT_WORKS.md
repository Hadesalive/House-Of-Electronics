# How the Sync System Works

## Overview

The sync system automatically synchronizes your local SQLite database with Supabase (cloud) when internet is available, and queues changes when offline.

---

## 1. Where Credentials Are Stored

### Storage Location
**All sync configuration is stored in your local SQLite database** in the `sync_metadata` table:

```sql
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1,  -- Always row 1
  sync_enabled INTEGER DEFAULT 1,    -- 0 = disabled, 1 = enabled
  sync_interval_minutes INTEGER DEFAULT 5,
  cloud_provider TEXT DEFAULT 'supabase',
  cloud_url TEXT,                    -- Your Supabase project URL
  api_key TEXT,                      -- Your anon/public API key (encrypted in memory)
  device_id TEXT,                    -- Unique ID for this device
  conflict_resolution_strategy TEXT DEFAULT 'server_wins',
  last_sync_at DATETIME,            -- Last successful sync timestamp
  updated_at DATETIME
)
```

### Security
- **API key is stored in plain text** in the SQLite database (local file on your computer)
- The database file is only accessible on your local machine
- The anon/public key is safe to store locally (it's designed for client-side use)
- **Never use the service_role key** - that's for server-side only

### How It's Saved
When you enter credentials in Settings:
1. You paste the **Project URL** and **API Key** in the Settings page
2. On blur (when you click away), it auto-saves via `updateSyncConfig()`
3. The values are written to `sync_metadata` table in SQLite
4. The sync service reads from this table whenever it needs to connect

---

## 2. How Auto-Sync Works (When Internet is ON)

### Initialization
When the app starts:
1. `SyncContext` loads configuration from `sync_metadata` table
2. If `sync_enabled = 1`, it starts an auto-sync interval
3. The interval runs every `sync_interval_minutes` (default: 5 minutes)

### Auto-Sync Process
```javascript
// In SyncContext.tsx - runs every N minutes
setInterval(async () => {
  // 1. Check if sync is enabled
  if (!config.sync_enabled) return;
  
  // 2. Check if already syncing (prevents overlap)
  if (syncing) return;
  
  // 3. Push local changes to cloud
  await syncService.syncAll();  // Sends pending changes
  
  // 4. Pull changes from cloud
  await syncService.pullChanges();  // Gets remote updates
}, intervalMinutes * 60 * 1000);
```

### What Gets Synced

**Push (Local → Cloud):**
- All changes tracked in `sync_queue` table
- When you create/update/delete: customers, products, sales, invoices, etc.
- The change is queued immediately, then synced on next interval

**Pull (Cloud → Local):**
- Fetches all records updated since `last_sync_at`
- Applies changes based on conflict resolution strategy
- Updates `last_sync_at` timestamp

### Sync Queue System
```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY,
  table_name TEXT,        -- e.g., 'customers'
  record_id TEXT,          -- e.g., 'customer-123'
  change_type TEXT,        -- 'create', 'update', or 'delete'
  data TEXT,              -- JSON of the record
  sync_status TEXT,       -- 'pending', 'syncing', 'synced', 'error'
  error_message TEXT,
  retry_count INTEGER,
  created_at DATETIME,
  synced_at DATETIME,
  locked_at DATETIME      -- Prevents concurrent sync
)
```

**How changes are tracked:**
- When you create a customer → `trackChange('customers', id, 'create', data)`
- When you update a product → `trackChange('products', id, 'update', data)`
- When you delete a sale → `trackChange('sales', id, 'delete', data)`

---

## 3. How It Handles Offline Scenarios

### When Internet Goes Offline

**1. Changes Are Still Tracked:**
- All create/update/delete operations continue working normally
- Each change is added to `sync_queue` with status `'pending'`
- Your app works completely offline - no data loss

**2. Sync Attempts Fail Gracefully:**
- When auto-sync tries to connect and fails:
  - Network errors are caught
  - Items in queue remain as `'pending'`
  - Error is logged but doesn't crash the app
  - Next sync attempt will retry

**3. Queue Accumulates:**
```
sync_queue:
  - customer-123 (pending) ← created offline
  - product-456 (pending) ← updated offline
  - sale-789 (pending)    ← created offline
```

### When Internet Comes Back Online

**1. Next Auto-Sync Cycle:**
- Auto-sync interval continues running (every 5 minutes)
- When internet is restored, the next cycle will:
  - Successfully connect to Supabase
  - Push all pending changes from queue
  - Pull any changes from cloud
  - Mark items as `'synced'`

**2. Manual Sync:**
- You can click "Sync Now" button anytime
- It immediately attempts to sync all pending items
- Useful after coming back online

**3. Retry Logic:**
- Items that fail sync are marked as `'error'`
- They have a `retry_count` that increments
- Failed items can be manually retried or auto-retried

### Error Handling

**Network Errors:**
```javascript
try {
  await cloudApiClient.upsertRecord(...);
} catch (error) {
  // Network error caught
  markAsError(queueItem.id, error.message);
  // Item stays in queue for retry
}
```

**Connection Timeout:**
- 10-15 second timeout per request
- If timeout occurs, item marked as error
- Will retry on next sync cycle

**Stuck Items Recovery:**
- Items stuck in `'syncing'` state for >5 minutes are auto-recovered
- They're reset to `'pending'` and retried
- Prevents permanent lock if app crashes during sync

---

## 4. Connection Flow

### How the System Connects

**1. Configuration Load:**
```javascript
// On app start
const config = getSyncConfig();  // Reads from sync_metadata table
// Returns: { cloud_url, api_key, sync_enabled, ... }
```

**2. Cloud Client Creation:**
```javascript
// In sync-service.js
const cloudApiClient = createCloudApiClient(
  config.cloud_provider,  // 'supabase'
  {
    url: config.cloud_url,      // From database
    apiKey: config.api_key,     // From database
    tablePrefix: ''
  }
);
```

**3. Connection Test:**
```javascript
// When you click "Test Connection"
const result = await cloudApiClient.testConnection();
// Makes HTTP request to: {cloud_url}/rest/v1/customers?limit=0
// Uses headers: { apikey, Authorization: Bearer {api_key} }
```

**4. Auto-Sync Connection:**
- Every sync cycle, it uses the same `cloudApiClient`
- Reads credentials from `sync_metadata` table
- No need to re-enter credentials - they persist in database

---

## 5. Conflict Resolution

When the same record is modified both locally and in cloud:

**Server Wins (default):**
- Cloud version overwrites local version
- Your local changes are lost

**Client Wins:**
- Local version overwrites cloud version
- Cloud changes are lost

**Manual:**
- Conflict is detected and logged
- Requires user intervention to resolve

---

## 6. Security Considerations

### What's Safe
✅ **Anon/Public Key** - Safe to store locally, designed for client use
✅ **Local SQLite Database** - Only accessible on your machine
✅ **HTTPS Connections** - All API calls use encrypted HTTPS

### What's NOT Synced
❌ `users` table - Passwords stay local
❌ `license_activations` - License data stays local
❌ `company_settings` - Local configuration
❌ `sync_queue` - Internal sync state
❌ `sync_metadata` - Sync configuration (API keys)

### Best Practices
1. **Use anon/public key** - Never use service_role key
2. **Enable RLS in Supabase** - Row Level Security for production
3. **Regular backups** - Backup your local database
4. **Monitor sync status** - Check for errors in sync queue

---

## 7. Troubleshooting

### Sync Not Working?
1. Check `sync_enabled = 1` in `sync_metadata`
2. Verify `cloud_url` and `api_key` are set
3. Test connection button - should show success
4. Check `sync_queue` for pending items
5. Look for error messages in console

### Items Stuck in Queue?
1. Check `sync_status` - should be 'pending' or 'synced'
2. Items with 'error' status need attention
3. Use "Reset Failed Items" to retry
4. Check error_message column for details

### Connection Issues?
1. Verify internet connection
2. Check Supabase URL is correct
3. Verify API key is anon/public (not service_role)
4. Check Supabase dashboard - tables must exist
5. Check firewall/proxy settings

---

## Summary

**Storage:** Credentials stored in local SQLite `sync_metadata` table
**Auto-Sync:** Runs every N minutes when enabled, pushes/pulls changes
**Offline:** Changes queued locally, synced when internet returns
**Online:** Automatic bidirectional sync every sync interval
**Security:** Uses anon key, HTTPS, excludes sensitive tables

The system is designed to work seamlessly online and offline, with all changes eventually syncing when connectivity is restored.
