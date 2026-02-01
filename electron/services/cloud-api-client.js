/**
 * Cloud API Client
 * 
 * Abstract interface for cloud storage providers (Supabase, Firebase, etc.)
 * Handles authentication, data sync, and conflict detection.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Node.js fetch replacement using built-in https/http modules
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

    // Handle timeout
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

/**
 * Create Cloud API Client
 * Supports multiple providers: supabase, firebase, custom
 */
function createCloudApiClient(provider = 'supabase', config = {}) {
  let client = null;
  let isConfigured = false;

  /**
   * Initialize client based on provider
   */
  function initialize() {
    if (!config.url || !config.apiKey) {
      isConfigured = false;
      return { success: false, error: 'Missing cloud configuration' };
    }

    try {
      switch (provider.toLowerCase()) {
        case 'supabase':
          client = createSupabaseClient(config);
          break;
        case 'firebase':
          client = createFirebaseClient(config);
          break;
        case 'custom':
          client = createCustomClient(config);
          break;
        default:
          return { success: false, error: `Unknown provider: ${provider}` };
      }

      isConfigured = true;
      return { success: true };
    } catch (error) {
      isConfigured = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Supabase Client Implementation
   * Uses Supabase REST API (PostgREST)
   */
  function createSupabaseClient(config) {
    const baseUrl = config.url.replace(/\/$/, '');
    const apiKey = config.apiKey;
    const tablePrefix = config.tablePrefix || '';

    // Helper to build table URL
    const getTableUrl = (tableName) => {
      return `${baseUrl}/rest/v1/${tablePrefix}${tableName}`;
    };

    // Helper to get standard headers
    const getHeaders = () => ({
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation' // Return the inserted/updated row
    });

    /**
     * Convert camelCase field names to snake_case for Supabase
     */
    function convertToSnakeCase(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(convertToSnakeCase);
      
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        // Handle special cases first
        if (key === 'minStock') converted['min_stock'] = value;
        else if (key === 'isActive') converted['is_active'] = value !== undefined ? (value ? 1 : 0) : 1;
        else if (key === 'createdAt') converted['created_at'] = value;
        else if (key === 'updatedAt') converted['updated_at'] = value;
        else if (key === 'customerId') converted['customer_id'] = value;
        else if (key === 'customerName') converted['customer_name'] = value;
        else if (key === 'customerEmail') converted['customer_email'] = value;
        else if (key === 'customerAddress') converted['customer_address'] = value;
        else if (key === 'customerPhone') converted['customer_phone'] = value;
        else if (key === 'invoiceId') converted['invoice_id'] = value;
        else if (key === 'invoiceNumber') converted['invoice_number'] = value;
        else if (key === 'invoiceType') converted['invoice_type'] = value;
        else if (key === 'paidAmount') converted['paid_amount'] = value;
        else if (key === 'dueDate') converted['due_date'] = value;
        else if (key === 'bankDetails') converted['bank_details'] = value;
        else if (key === 'saleId') converted['sale_id'] = value;
        else if (key === 'userId') converted['user_id'] = value;
        else if (key === 'salesRepName') converted['sales_rep_name'] = value || null;
        else if (key === 'salesRepId') converted['sales_rep_id'] = value || null;
        else if (key === 'salesRep') converted['sales_rep_name'] = value || null; // Handle 'salesRep' alias (from getInvoiceById)
        else if (key === 'cashierName') converted['cashier_name'] = value;
        else if (key === 'cashierEmployeeId') converted['cashier_employee_id'] = value;
        else if (key === 'hasBackorder') converted['has_backorder'] = value !== undefined ? (value ? 1 : 0) : 0;
        else if (key === 'backorderDetails') converted['backorder_details'] = value;
        else if (key === 'storeCredit') converted['store_credit'] = value;
        else if (key === 'debtPayments') converted['debt_payments'] = value;
        else if (key === 'paymentMethod') converted['payment_method'] = value;
        else if (key === 'refundMethod') converted['refund_method'] = value;
        else if (key === 'paymentStatus') converted['payment_status'] = value;
        else if (key === 'expectedDeliveryDate') converted['expected_delivery_date'] = value;
        else if (key === 'actualDeliveryDate') converted['actual_delivery_date'] = value;
        else if (key === 'returnNumber') converted['return_number'] = value;
        else if (key === 'orderNumber') converted['order_number'] = value;
        else if (key === 'supplierId') converted['supplier_id'] = value;
        else if (key === 'supplierName') converted['supplier_name'] = value;
        else if (key === 'processedBy') converted['processed_by'] = value;
        else if (key === 'fullName') converted['full_name'] = value;
        else if (key === 'passwordHash') converted['password_hash'] = value;
        else if (key === 'employeeId') converted['employee_id'] = value;
        else if (key === 'lastLogin') converted['last_login'] = value;
        else {
          // Convert camelCase to snake_case for other fields
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          converted[snakeKey] = convertToSnakeCase(value);
        }
      }
      return converted;
    }

    return {
      async upsertRecord(tableName, recordId, data, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            // Define valid columns for each table (matching SQLite/Supabase schema exactly)
            const tableColumns = {
              'customers': ['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at', 'avatar', 'city', 'state', 'zip', 'country', 'company', 'notes', 'is_active', 'store_credit'],
              'products': ['id', 'name', 'description', 'price', 'cost', 'sku', 'category', 'stock', 'min_stock', 'created_at', 'updated_at', 'image', 'is_active'],
              'sales': ['id', 'customer_id', 'customer_name', 'items', 'subtotal', 'tax', 'taxes', 'discount', 'total', 'status', 'payment_method', 'notes', 'has_backorder', 'backorder_details', 'created_at', 'updated_at', 'invoice_id', 'invoice_number', 'user_id', 'cashier_name', 'cashier_employee_id'],
              'invoices': ['id', 'number', 'customer_id', 'customer_name', 'customer_email', 'customer_address', 'customer_phone', 'items', 'subtotal', 'tax', 'taxes', 'discount', 'total', 'paid_amount', 'status', 'invoice_type', 'currency', 'due_date', 'notes', 'terms', 'bank_details', 'created_at', 'updated_at', 'sale_id', 'user_id', 'sales_rep_name', 'sales_rep_id'],
              'orders': ['id', 'order_number', 'supplier_id', 'supplier_name', 'items', 'subtotal', 'tax', 'taxes', 'discount', 'total', 'status', 'payment_status', 'payment_method', 'expected_delivery_date', 'actual_delivery_date', 'notes', 'created_at', 'updated_at'],
              'returns': ['id', 'return_number', 'sale_id', 'customer_id', 'customer_name', 'items', 'subtotal', 'tax', 'total', 'refund_amount', 'refund_method', 'status', 'processed_by', 'notes', 'created_at', 'updated_at'],
              'deals': ['id', 'title', 'customer_id', 'customer_name', 'value', 'probability', 'stage', 'expected_close_date', 'actual_close_date', 'source', 'priority', 'tags', 'notes', 'negotiation_history', 'stakeholders', 'competitor_info', 'created_at', 'updated_at'],
              'debts': ['id', 'customer_id', 'amount', 'paid', 'created_at', 'status', 'description', 'items', 'sale_id'], // NO customer_name, customer_phone, payments
              'debt_payments': ['id', 'debt_id', 'amount', 'date', 'method'], // NO updated_at
              'users': ['id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'role', 'employee_id', 'is_active', 'created_at', 'updated_at', 'last_login'],
              'boqs': ['id', 'boq_number', 'date', 'project_title', 'company_name', 'company_address', 'company_phone', 'client_name', 'client_address', 'items', 'notes', 'manager_signature', 'total_le', 'total_usd', 'created_at', 'updated_at']
            };
            
            // Prepare data with updated_at timestamp and ensure id is included
            // Remove id from data spread to avoid duplication
            // Also remove nested relationships (arrays/objects that aren't columns)
            const { id, payments, ...dataWithoutId } = data;
            
            // Convert camelCase to snake_case for Supabase
            const convertedData = convertToSnakeCase(dataWithoutId);
            
            // Get valid columns for this table
            const validColumns = tableColumns[tableName] || [];
            
            // Filter to only include valid columns for this table (removes JOIN fields, nested objects, etc.)
            const cleanedData = {};
            for (const [key, value] of Object.entries(convertedData)) {
              // Only include if it's a valid column for this table
              if (validColumns.includes(key)) {
                // Handle special cases for arrays (items field in sales, orders, returns, etc.)
                if ((key === 'items' || key === 'notes') && Array.isArray(value)) {
                  // Convert items array to JSON string (as stored in database)
                  cleanedData[key] = JSON.stringify(value);
                } else if (!Array.isArray(value) && (typeof value !== 'object' || value === null || value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
                  // Ensure null/undefined values are preserved as null (not filtered out)
                  cleanedData[key] = value !== undefined ? value : null;
                }
              }
            }
            
            // Debug logging for invoices and users to see what's being sent
            if (tableName === 'invoices') {
              console.log(`[Sync Debug] Invoice ${recordId} - sales_rep_name:`, cleanedData.sales_rep_name, 'user_id:', cleanedData.user_id);
            }
            if (tableName === 'users') {
              console.log(`[Sync Debug] User ${recordId} - username:`, cleanedData.username, 'full_name:', cleanedData.full_name, 'has password_hash:', !!cleanedData.password_hash);
            }
            
            // Ensure required NOT NULL fields have default values for sales table
            if (tableName === 'sales') {
              if (!cleanedData.items || cleanedData.items === '') {
                cleanedData.items = '[]'; // Default empty array as JSON string
              }
              if (cleanedData.subtotal === undefined || cleanedData.subtotal === null) {
                cleanedData.subtotal = 0;
              }
              if (cleanedData.tax === undefined || cleanedData.tax === null) {
                cleanedData.tax = 0;
              }
              if (cleanedData.discount === undefined || cleanedData.discount === null) {
                cleanedData.discount = 0;
              }
              if (cleanedData.total === undefined || cleanedData.total === null) {
                cleanedData.total = 0;
              }
              if (!cleanedData.status || cleanedData.status === '') {
                cleanedData.status = 'completed'; // Default status
              }
              if (!cleanedData.payment_method || cleanedData.payment_method === '') {
                cleanedData.payment_method = 'cash'; // Default payment method
              }
            }
            
            // Ensure required NOT NULL fields for users table
            if (tableName === 'users') {
              // If any required field is missing, skip this record (don't sync incomplete users)
              if (!cleanedData.username || !cleanedData.password_hash || !cleanedData.full_name) {
                console.error(`[Sync Error] User ${recordId} missing required fields - username: ${!!cleanedData.username}, password_hash: ${!!cleanedData.password_hash}, full_name: ${!!cleanedData.full_name}`);
                throw new Error(`Cannot sync user ${recordId}: missing required fields (username, password_hash, or full_name)`);
              }
              // Ensure role has default value
              if (!cleanedData.role || cleanedData.role === '') {
                cleanedData.role = 'cashier'; // Default role
              }
              // Ensure is_active has default value
              if (cleanedData.is_active === undefined || cleanedData.is_active === null) {
                cleanedData.is_active = 1; // Default to active
              }
            }
            
            const recordData = {
              id: recordId,
              ...cleanedData
            };
            
            // Only add updated_at if the table supports it (not debts or debt_payments)
            const tablesWithoutUpdatedAt = ['debts', 'debt_payments'];
            if (!tablesWithoutUpdatedAt.includes(tableName)) {
              recordData.updated_at = new Date().toISOString();
            }

            // PostgREST upsert strategy: Try PATCH first (update if exists)
            // If no rows affected, then POST (insert new)
            const patchUrl = `${getTableUrl(tableName)}?id=eq.${encodeURIComponent(recordId)}`;
            
            // Try PATCH first (update existing record)
            const patchResponse = await nodeFetch(patchUrl, {
              method: 'PATCH',
              headers: {
                ...getHeaders(),
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(recordData),
              timeout: 10000
            });

            // Check if PATCH updated any rows
            if (patchResponse.ok) {
              try {
                // PATCH succeeded - check if any rows were actually updated
                const responseText = await patchResponse.text();
                if (responseText) {
                  const updatedRows = JSON.parse(responseText);
                  // If rows were updated, we're done
                  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
                    return { success: true };
                  }
                }
                // If no rows updated or empty response, record doesn't exist - fall through to POST
              } catch (parseError) {
                // If parsing fails, check status code
                // 204 means success with no content (update succeeded)
                if (patchResponse.status === 204) {
                  return { success: true };
                }
                // Otherwise, fall through to POST
              }
            } else if (patchResponse.status === 400 || patchResponse.status === 404) {
              // Check if it's PGRST204/PGRST205 (no rows found) - this means record doesn't exist, not an error
              const patchErrorText = await patchResponse.text().catch(() => '');
              let patchErrorJson = null;
              try {
                patchErrorJson = JSON.parse(patchErrorText);
              } catch (e) {
                // Not JSON, check as text
              }
              
              // PGRST204/PGRST205 can appear in:
              // 1. Response body JSON: {"code":"PGRST204","details":...}
              // 2. proxy-status header: "PostgREST; error=PGRST204" or "PostgREST; error=PGRST205"
              // 3. 404 status code itself indicates record not found
              const isRecordNotFound = 
                patchResponse.status === 404 || // 404 always means not found
                (patchErrorJson && (patchErrorJson.code === 'PGRST204' || patchErrorJson.code === 'PGRST205')) ||
                patchErrorText.includes('PGRST204') ||
                patchErrorText.includes('PGRST205') ||
                (patchResponse.headers && 
                 (patchResponse.headers['proxy-status']?.includes('PGRST204') ||
                  patchResponse.headers['proxy-status']?.includes('PGRST205') ||
                  patchResponse.headers['proxy_status']?.includes('PGRST204') ||
                  patchResponse.headers['proxy_status']?.includes('PGRST205')));
              
              if (isRecordNotFound) {
                // PGRST204/PGRST205 or 404 means no rows matched - record doesn't exist, fall through to POST
                // This is expected behavior, not an error
                console.log(`PATCH: Record ${recordId} not found in ${tableName} (${patchResponse.status}), will insert via POST`);
              } else {
                // Other 400 errors are real errors (validation, etc.)
                throw new Error(`Supabase error (${patchResponse.status}): ${patchErrorText}`);
              }
            } else if (patchResponse.status >= 401 && patchResponse.status < 500) {
              // Other client errors (401-403, 405-499) - don't try POST, return error
              const patchErrorText = await patchResponse.text().catch(() => patchResponse.statusText);
              throw new Error(`Supabase error (${patchResponse.status}): ${patchErrorText}`);
            }
            // For 5xx errors or PGRST204 (400), try POST to insert

            // Record doesn't exist - use POST to insert
            const postUrl = getTableUrl(tableName);
            console.log(`POST: Attempting to insert ${tableName}:${recordId}`);
            const postResponse = await nodeFetch(postUrl, {
              method: 'POST',
              headers: {
                ...getHeaders(),
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(recordData),
              timeout: 10000
            });

            if (!postResponse.ok) {
              const postErrorText = await postResponse.text().catch(() => postResponse.statusText);
              console.error(`POST: Failed to insert ${tableName}:${recordId} - Status: ${postResponse.status}, Error: ${postErrorText}`);
              
              // Check if POST also returns PGRST204 (unusual but possible)
              let postErrorJson = null;
              try {
                postErrorJson = JSON.parse(postErrorText);
              } catch (e) {
                // Not JSON
              }
              
              const isPostPGRST204 = 
                (postErrorJson && postErrorJson.code === 'PGRST204') ||
                postErrorText.includes('PGRST204') ||
                (postResponse.headers && 
                 (postResponse.headers['proxy-status']?.includes('PGRST204') ||
                  postResponse.headers['proxy_status']?.includes('PGRST204')));
              
              // Check for specific error codes
              const errorCode = postErrorJson?.code || (postErrorText.includes('23502') ? '23502' : null);
              
              if (errorCode === '23502' || postErrorText.includes('23502')) {
                // NOT NULL constraint violation
                console.error(`NOT NULL constraint violation for ${tableName}:${recordId}`);
                console.error('Data being sent:', JSON.stringify(recordData, null, 2));
                console.error('Missing required fields - check schema for NOT NULL columns');
                throw new Error(`Supabase error: Missing required field (NOT NULL constraint) for ${tableName}. Error: ${postErrorText}`);
              } else if (isPostPGRST204 && postResponse.status === 400) {
                // PGRST204 on POST usually means constraint violation or data format issue
                console.error(`POST PGRST204 error for ${tableName}:${recordId}`);
                console.error('Data being sent:', JSON.stringify(recordData, null, 2));
                throw new Error(`Supabase error: Failed to insert ${tableName} record. PGRST204 usually indicates a constraint violation or missing required field. Error: ${postErrorText}`);
              }
              
              throw new Error(`Supabase error (${postResponse.status}): ${postErrorText}`);
            }

            console.log(`POST: Successfully inserted ${tableName}:${recordId}`);
            return { success: true };
          } catch (error) {
            if (attempt === retries - 1) {
              return { success: false, error: error.message };
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
        return { success: false, error: 'Max retries exceeded' };
      },

      async deleteRecord(tableName, recordId, retries = 3) {
        // Use soft delete: set deleted_at instead of actually deleting
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const url = `${getTableUrl(tableName)}?id=eq.${encodeURIComponent(recordId)}`;
            const now = new Date().toISOString();
            
            // PATCH to set deleted_at instead of DELETE
            const response = await nodeFetch(url, {
              method: 'PATCH',
              headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({ deleted_at: now }),
              timeout: 10000
            });

            if (response.ok) {
              try {
                const responseText = await response.text();
                if (responseText) {
                  const updatedRows = JSON.parse(responseText);
                  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
                    // Successfully soft deleted
                    return { success: true };
                  } else if (Array.isArray(updatedRows) && updatedRows.length === 0) {
                    // Record doesn't exist - but that's okay for delete, consider it success
                    console.log(`Delete: Record ${recordId} not found in ${tableName} (already deleted or doesn't exist)`);
                    return { success: true };
                  }
                }
                // Empty response but 200 - consider success
                return { success: true };
              } catch (parseError) {
                // If parsing fails but status is 200, consider it success
                return { success: true };
              }
            } else {
              // Error response
              const errorText = await response.text().catch(() => response.statusText);
              throw new Error(`Supabase error (${response.status}): ${errorText}`);
            }
          } catch (error) {
            if (attempt === retries - 1) {
              return { success: false, error: error.message };
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
        return { success: false, error: 'Max retries exceeded' };
      },

      async getChanges(lastSyncAt) {
        try {
          // Get all tables that have changes (full schema coverage)
          // Tables without updated_at use created_at instead
          const tablesWithoutUpdatedAt = ['debts', 'debt_payments'];
          
          const tables = [
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
          ];
          const allChanges = [];

          // Format timestamp for Supabase query
          const syncTimestamp = lastSyncAt 
            ? new Date(lastSyncAt).toISOString() 
            : '1970-01-01T00:00:00.000Z';

          for (const table of tables) {
            try {
              // Determine timestamp column based on table schema
              let timestampColumn;
              if (table === 'debt_payments') {
                // debt_payments uses 'date' column instead of 'created_at'
                timestampColumn = 'date';
              } else if (tablesWithoutUpdatedAt.includes(table)) {
                // Tables without updated_at use created_at
                timestampColumn = 'created_at';
              } else {
                // Most tables use updated_at
                timestampColumn = 'updated_at';
              }
              
              // Query 1: Get records that were updated/created (not deleted)
              // (updated_at > timestamp OR created_at > timestamp) AND deleted_at IS NULL
              const activeUrl = `${getTableUrl(table)}?or=(${timestampColumn}.gt.${encodeURIComponent(syncTimestamp)},created_at.gt.${encodeURIComponent(syncTimestamp)})&deleted_at.is.null&order=${timestampColumn}.asc&select=*`;
              
              const activeResponse = await nodeFetch(activeUrl, {
                headers: getHeaders(),
                timeout: 15000
              });

              if (activeResponse.ok) {
                const activeRecords = await activeResponse.json();
                for (const record of activeRecords) {
                  allChanges.push({
                    table_name: table,
                    record_id: record.id,
                    change_type: 'update', // Supabase doesn't track create/update separately
                    data: record,
                    server_updated_at: record.updated_at || record.created_at || record.date
                  });
                }
              } else if (activeResponse.status !== 404) {
                const errorText = await activeResponse.text().catch(() => activeResponse.statusText);
                console.error(`Error fetching active records from ${table}: ${errorText}`);
              }
              
              // Query 2: Get records that were deleted (soft delete)
              // deleted_at > timestamp
              const deletedUrl = `${getTableUrl(table)}?deleted_at=gt.${encodeURIComponent(syncTimestamp)}&order=deleted_at.asc&select=*`;
              
              const deletedResponse = await nodeFetch(deletedUrl, {
                headers: getHeaders(),
                timeout: 15000
              });

              if (deletedResponse.ok) {
                const deletedRecords = await deletedResponse.json();
                for (const record of deletedRecords) {
                  allChanges.push({
                    table_name: table,
                    record_id: record.id,
                    change_type: 'delete', // Mark as delete
                    data: record, // Include record data for reference
                    server_updated_at: record.deleted_at // Use deleted_at as the timestamp
                  });
                }
              } else if (deletedResponse.status === 404) {
                // Table doesn't exist yet - skip it
                console.warn(`Table ${table} not found in Supabase - skipping`);
              } else if (deletedResponse.status !== 400) {
                // 400 might mean deleted_at column doesn't exist yet (old schema)
                const errorText = await deletedResponse.text().catch(() => deletedResponse.statusText);
                console.warn(`Error fetching deleted records from ${table} (may need schema update): ${errorText}`);
              }
            } catch (tableError) {
              console.error(`Error fetching changes from ${table}:`, tableError.message);
              // Continue with other tables
            }
          }

          return { success: true, data: allChanges };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      /**
       * Test connection to Supabase
       */
      async testConnection() {
        try {
          // Test by querying a table (customers is most likely to exist)
          // Use limit=0 to just test connection without fetching data
          const url = `${getTableUrl('customers')}?limit=0`;
          
          const response = await nodeFetch(url, {
            headers: getHeaders(),
            timeout: 5000
          });

          if (response.ok) {
            return { success: true, message: 'Connection successful' };
          } else if (response.status === 401 || response.status === 403) {
            return { success: false, error: 'Invalid API key or insufficient permissions' };
          } else if (response.status === 404) {
            return { success: false, error: 'Table not found. Please create tables in Supabase first.' };
          } else {
            const errorText = await response.text().catch(() => response.statusText);
            return { success: false, error: `Connection failed: ${errorText}` };
          }
        } catch (error) {
          if (error.message.includes('timeout')) {
            return { success: false, error: 'Connection timeout - check your internet connection' };
          }
          if (error.message.includes('fetch') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return { success: false, error: 'Network error - check your internet connection and Supabase URL' };
          }
          return { success: false, error: error.message };
        }
      }
    };
  }

  /**
   * Firebase Client Implementation
   */
  function createFirebaseClient(config) {
    // Placeholder for Firebase implementation
    // Would use Firebase Admin SDK or REST API
    return {
      async upsertRecord(tableName, recordId, data) {
        return { success: false, error: 'Firebase not yet implemented' };
      },
      async deleteRecord(tableName, recordId) {
        return { success: false, error: 'Firebase not yet implemented' };
      },
      async getChanges(lastSyncAt) {
        return { success: false, error: 'Firebase not yet implemented' };
      }
    };
  }

  /**
   * Custom REST API Client
   */
  function createCustomClient(config) {
    const baseUrl = config.url.replace(/\/$/, '');

    return {
      async upsertRecord(tableName, recordId, data) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/${tableName}/${recordId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: 10000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      async deleteRecord(tableName, recordId) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/${tableName}/${recordId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            },
            timeout: 10000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      async getChanges(lastSyncAt) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/changes?since=${lastSyncAt || ''}`, {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            },
            timeout: 15000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const data = await response.json();
          return { success: true, data: data.changes || [] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    };
  }

  // Initialize on creation
  if (config.url && config.apiKey) {
    initialize();
  }

  return {
    isConfigured: () => isConfigured,
    initialize,
    upsertRecord: async (tableName, recordId, data) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.upsertRecord(tableName, recordId, data);
    },
    deleteRecord: async (tableName, recordId) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.deleteRecord(tableName, recordId);
    },
    getChanges: async (lastSyncAt) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.getChanges(lastSyncAt);
    },
    testConnection: async () => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      if (client.testConnection) {
        return client.testConnection();
      }
      return { success: false, error: 'Connection test not supported' };
    }
  };
}

module.exports = {
  createCloudApiClient
};
