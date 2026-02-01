# Sync Engine Documentation

## Overview

The sync engine enables bidirectional synchronization between your local SQLite database and cloud storage (Supabase, Firebase, or custom API). It tracks all changes, handles conflicts, and keeps your data synchronized across devices.

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│  React Frontend │  IPC    │  Sync Service │  HTTP   │  Cloud API  │
│                 │────────>│               │────────>│  (Supabase) │
│  SyncContext    │         │  Queue Mgmt   │         │             │
└─────────────────┘         └──────────────┘         └─────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  SQLite Database│
                            │  + Sync Tables  │
                            └─────────────────┘
```

## Features

- ✅ **Automatic Change Tracking** - All CRUD operations are tracked
- ✅ **Sync Queue** - Pending changes are queued and synced in batches
- ✅ **Conflict Resolution** - Three strategies: server wins, client wins, or manual
- ✅ **Auto-Sync** - Periodic synchronization (configurable interval)
- ✅ **Error Handling** - Retry failed syncs with exponential backoff
- ✅ **Multi-Provider** - Supports Supabase, Firebase, and custom APIs

## Setup

### 1. Initialize Sync Service

The sync service is automatically initialized in `electron/main.js`. It creates the necessary tables:
- `sync_queue` - Tracks pending changes
- `sync_metadata` - Stores sync configuration

### 2. Configure Cloud Provider

#### Option A: Supabase (Recommended)

1. Create a Supabase project at https://supabase.com
2. Get your project URL and API key
3. Create tables in Supabase matching your local schema:

```sql
-- Example: customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- ... other fields
);
```

4. Enable Row Level Security (RLS) or use service role key

#### Option B: Custom API

Create REST endpoints:
- `PUT /api/sync/{table}/{id}` - Upsert record
- `DELETE /api/sync/{table}/{id}` - Delete record
- `GET /api/sync/changes?since={timestamp}` - Get changes

### 3. Enable Sync in UI

Use the `SyncSettingsModal` component to configure:

```tsx
import { SyncSettingsModal } from '@/components/ui/sync-settings-modal';

<SyncSettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

Or programmatically:

```tsx
import { useSync } from '@/contexts/SyncContext';

const { updateConfig, setEnabled } = useSync();

// Enable sync
await setEnabled(true);

// Configure
await updateConfig({
  cloud_provider: 'supabase',
  cloud_url: 'https://your-project.supabase.co',
  api_key: 'your-api-key',
  sync_interval_minutes: 5
});
```

## Usage

### Tracking Changes

Changes are automatically tracked when you use the database service. However, you can manually track changes:

```javascript
// In electron/handlers/product-handlers.js
const { syncService } = require('../services/sync-service');

ipcMain.handle('create-product', async (event, productData) => {
  try {
    const product = await databaseService.createProduct(productData);
    
    // Track change for sync
    if (syncService) {
      syncService.trackChange('products', product.id, 'create', product);
    }
    
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Manual Sync

```tsx
import { useSync } from '@/contexts/SyncContext';

const { syncAll, pullChanges } = useSync();

// Push local changes to cloud
await syncAll();

// Pull remote changes
await pullChanges();
```

### Auto-Sync

Auto-sync runs automatically when enabled. It:
1. Pushes pending local changes every N minutes
2. Pulls remote changes
3. Handles conflicts based on your strategy

### Sync Status

Display sync status in your UI:

```tsx
import { SyncStatus } from '@/components/ui/sync-status';
import { SyncProvider } from '@/contexts/SyncContext';

// Wrap your app
<SyncProvider>
  <App />
</SyncProvider>

// Use component
<SyncStatus />
```

## Integration Guide

### Step 1: Add SyncProvider

Update `src/App.tsx` or your root component:

```tsx
import { SyncProvider } from '@/contexts/SyncContext';

function App() {
  return (
    <SyncProvider>
      {/* Your app */}
    </SyncProvider>
  );
}
```

### Step 2: Track Changes in Handlers

For each handler that modifies data, add sync tracking:

```javascript
// electron/handlers/customer-handlers.js
function registerCustomerHandlers(databaseService, syncService) {
  ipcMain.handle('create-customer', async (event, customerData) => {
    try {
      const customer = await databaseService.createCustomer(customerData);
      
      // Track for sync
      if (syncService) {
        syncService.trackChange('customers', customer.id, 'create', customer);
      }
      
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-customer', async (event, { id, updates }) => {
    try {
      const customer = await databaseService.updateCustomer(id, updates);
      
      // Track for sync
      if (syncService) {
        syncService.trackChange('customers', id, 'update', customer);
      }
      
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-customer', async (event, id) => {
    try {
      await databaseService.deleteCustomer(id);
      
      // Track for sync
      if (syncService) {
        syncService.trackChange('customers', id, 'delete', null);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
```

### Step 3: Pass syncService to Handlers

Update `electron/handlers/index.js`:

```javascript
function registerAllHandlers(databaseService, syncService) {
  registerCustomerHandlers(databaseService, syncService);
  registerProductHandlers(databaseService, syncService);
  // ... other handlers
}
```

## Conflict Resolution

### Server Wins (Default)

Cloud data always takes priority. Local changes are overwritten.

```tsx
await updateConfig({
  conflict_resolution_strategy: 'server_wins'
});
```

### Client Wins

Local data always takes priority. Remote changes are ignored.

```tsx
await updateConfig({
  conflict_resolution_strategy: 'client_wins'
});
```

### Manual

Conflicts are queued for manual resolution. You'll need to build a UI to handle these.

```tsx
await updateConfig({
  conflict_resolution_strategy: 'manual'
});

// Get conflicts
const { data: conflicts } = await syncService.getPending();
const conflictItems = conflicts.filter(c => c.change_type === 'conflict');
```

## API Reference

### SyncService (Backend)

```javascript
// Get sync status
const status = syncService.getSyncStatus();

// Get configuration
const config = syncService.getSyncConfig();

// Update configuration
syncService.updateSyncConfig({
  sync_enabled: 1,
  cloud_url: 'https://...',
  api_key: '...'
});

// Track a change
syncService.trackChange('products', productId, 'create', productData);

// Sync all pending
const result = await syncService.syncAll();

// Pull changes
const result = await syncService.pullChanges();
```

### useSync Hook (Frontend)

```tsx
const {
  status,           // Current sync status
  config,           // Sync configuration
  loading,          // Loading state
  error,            // Error message
  syncing,          // Currently syncing
  refreshStatus,    // Refresh status
  updateConfig,     // Update configuration
  setEnabled,       // Enable/disable sync
  syncAll,          // Push changes
  pullChanges,      // Pull changes
  clearQueue,       // Clear sync queue
  resetFailed       // Retry failed items
} = useSync();
```

## Troubleshooting

### Sync Not Working

1. **Check Configuration**
   ```tsx
   const { config } = useSync();
   console.log(config);
   ```

2. **Check Pending Items**
   ```tsx
   const { data: pending } = await syncService.getPending();
   console.log('Pending:', pending);
   ```

3. **Check Errors**
   ```tsx
   const { status } = useSync();
   if (status.errors > 0) {
     // Check sync_queue table for error_message
   }
   ```

### Common Issues

**"Client not configured"**
- Ensure `cloud_url` and `api_key` are set
- Check that cloud API client initialized successfully

**"Sync failed"**
- Check network connection
- Verify API credentials
- Check cloud provider logs

**"Conflicts detected"**
- Review conflict resolution strategy
- Manually resolve conflicts if using 'manual' strategy

## Security Considerations

1. **API Keys**: Store securely, never commit to git
2. **Row Level Security**: Enable RLS in Supabase for multi-tenant apps
3. **HTTPS Only**: Always use HTTPS for cloud URLs
4. **Rate Limiting**: Implement rate limiting on cloud API

## Performance

- **Batch Size**: Default is 50 items per sync
- **Sync Interval**: Default is 5 minutes (configurable)
- **Queue Size**: Monitor `sync_queue` table size
- **Indexes**: Automatically created for performance

## Next Steps

1. ✅ Sync engine is built
2. ⏳ Integrate sync tracking into all handlers
3. ⏳ Set up cloud database (Supabase recommended)
4. ⏳ Test sync with multiple devices
5. ⏳ Add conflict resolution UI (if using 'manual' strategy)

## Example: Complete Integration

See `electron/handlers/customer-handlers.js` for a complete example of sync integration.
