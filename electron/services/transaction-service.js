/**
 * Transaction Service
 * 
 * Provides centralized transaction management for better-sqlite3 database operations.
 * Ensures data consistency by wrapping multi-step operations in atomic transactions.
 */

/**
 * Execute a callback function within a database transaction.
 * If any operation fails, all changes are automatically rolled back.
 * 
 * @param {Database} db - The better-sqlite3 database instance
 * @param {Function} callback - The function to execute within the transaction
 * @returns {*} The result of the callback function
 * @throws {Error} If the transaction fails, the original error is re-thrown
 */
function executeInTransaction(db, callback) {
  if (!db || typeof callback !== 'function') {
    throw new Error('Invalid parameters: db and callback are required');
  }

  // Create a transaction wrapper
  const transaction = db.transaction(callback);
  
  try {
    console.log('Starting database transaction...');
    const result = transaction();
    console.log('Transaction completed successfully');
    return result;
  } catch (error) {
    // better-sqlite3 automatically rolls back on error
    console.error('Transaction failed and was rolled back:', error.message);
    throw error;
  }
}

/**
 * Execute a callback function within a savepoint (nested transaction).
 * Useful for operations that might be called within other transactions.
 * 
 * @param {Database} db - The better-sqlite3 database instance
 * @param {string} savepointName - Unique name for the savepoint
 * @param {Function} callback - The function to execute within the savepoint
 * @returns {*} The result of the callback function
 * @throws {Error} If the savepoint fails, the original error is re-thrown
 */
function executeInSavepoint(db, savepointName, callback) {
  if (!db || !savepointName || typeof callback !== 'function') {
    throw new Error('Invalid parameters: db, savepointName, and callback are required');
  }

  try {
    console.log(`Starting savepoint: ${savepointName}`);
    
    // Create savepoint
    db.exec(`SAVEPOINT ${savepointName}`);
    
    const result = callback();
    
    // Release savepoint (commit)
    db.exec(`RELEASE SAVEPOINT ${savepointName}`);
    console.log(`Savepoint ${savepointName} completed successfully`);
    
    return result;
  } catch (error) {
    // Rollback to savepoint
    try {
      db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      console.log(`Savepoint ${savepointName} rolled back due to error`);
    } catch (rollbackError) {
      console.error(`Failed to rollback savepoint ${savepointName}:`, rollbackError.message);
    }
    
    console.error(`Savepoint ${savepointName} failed:`, error.message);
    throw error;
  }
}

/**
 * Validate that all required operations in a transaction are valid before execution.
 * This is a helper function to catch validation errors before starting the transaction.
 * 
 * @param {Array} validations - Array of validation functions that return boolean or throw errors
 * @throws {Error} If any validation fails
 */
function validateTransaction(validations) {
  if (!Array.isArray(validations)) {
    throw new Error('Validations must be an array of functions');
  }

  for (let i = 0; i < validations.length; i++) {
    const validation = validations[i];
    if (typeof validation !== 'function') {
      throw new Error(`Validation at index ${i} must be a function`);
    }
    
    try {
      const result = validation();
      if (result === false) {
        throw new Error(`Validation at index ${i} failed`);
      }
    } catch (error) {
      throw new Error(`Validation at index ${i} failed: ${error.message}`);
    }
  }
}

/**
 * Log transaction details for debugging and auditing.
 * 
 * @param {string} operation - The operation being performed
 * @param {Object} details - Additional details about the transaction
 */
function logTransaction(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Transaction: ${operation}`, details);
}

module.exports = {
  executeInTransaction,
  executeInSavepoint,
  validateTransaction,
  logTransaction
};
