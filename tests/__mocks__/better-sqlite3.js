/**
 * Mock for better-sqlite3
 * 
 * Provides in-memory database functionality for testing
 * without requiring native module compilation.
 */

class MockDatabase {
  constructor(path) {
    this.path = path;
    this.data = new Map();
    this.tables = new Map();
    this.inTransaction = false;
  }

  exec(sql) {
    // Simple SQL parser for basic operations
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      const trimmed = statement.trim().toUpperCase();
      
      if (trimmed.startsWith('CREATE TABLE')) {
        this._createTable(statement);
      } else if (trimmed.startsWith('INSERT INTO')) {
        this._insert(statement);
      } else if (trimmed.startsWith('UPDATE')) {
        this._update(statement);
      } else if (trimmed.startsWith('DELETE FROM')) {
        this._delete(statement);
      } else if (trimmed.startsWith('SELECT')) {
        // SELECT is handled by prepare().all()
        continue;
      } else if (trimmed.startsWith('BEGIN TRANSACTION')) {
        this.inTransaction = true;
      } else if (trimmed.startsWith('COMMIT')) {
        this.inTransaction = false;
      } else if (trimmed.startsWith('ROLLBACK')) {
        this.inTransaction = false;
      }
    }
  }

  prepare(sql) {
    return {
      run: (...params) => this._runQuery(sql, params),
      get: (...params) => this._getQuery(sql, params),
      all: (...params) => this._allQuery(sql, params)
    };
  }

  _createTable(sql) {
    // Extract table name and columns
    const match = sql.match(/CREATE TABLE\s+(\w+)\s*\((.*)\)/i);
    if (!match) return;
    
    const tableName = match[1];
    const columns = match[2].split(',').map(col => {
      const parts = col.trim().split(/\s+/);
      return {
        name: parts[0],
        type: parts[1] || 'TEXT',
        constraints: parts.slice(2).join(' ')
      };
    });
    
    this.tables.set(tableName, {
      columns,
      data: []
    });
  }

  _insert(sql) {
    const match = sql.match(/INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*)\)/i);
    if (!match) return;
    
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const values = this._parseValues(match[3]);
    
    const table = this.tables.get(tableName);
    if (!table) return;
    
    const row = {};
    columns.forEach((col, index) => {
      row[col] = values[index];
    });
    
    table.data.push(row);
  }

  _update(sql) {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?/i);
    if (!match) return;
    
    const tableName = match[1];
    const setClause = match[2];
    const whereClause = match[3];
    
    const table = this.tables.get(tableName);
    if (!table) return;
    
    // Parse SET clause
    const updates = {};
    setClause.split(',').forEach(update => {
      const [col, value] = update.split('=').map(s => s.trim());
      updates[col] = this._parseValue(value);
    });
    
    // Apply updates
    table.data.forEach(row => {
      if (!whereClause || this._evaluateWhere(row, whereClause)) {
        Object.assign(row, updates);
      }
    });
  }

  _delete(sql) {
    const match = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/i);
    if (!match) return;
    
    const tableName = match[1];
    const whereClause = match[2];
    
    const table = this.tables.get(tableName);
    if (!table) return;
    
    if (whereClause) {
      table.data = table.data.filter(row => !this._evaluateWhere(row, whereClause));
    } else {
      table.data = [];
    }
  }

  _runQuery(sql, params) {
    // For INSERT, UPDATE, DELETE operations
    this.exec(sql);
    return { changes: 1, lastInsertRowid: 1 };
  }

  transaction(callback) {
    return () => {
      this.inTransaction = true;
      try {
        const result = callback();
        this.inTransaction = false;
        return result;
      } catch (error) {
        this.inTransaction = false;
        throw error;
      }
    };
  }

  _getQuery(sql, params) {
    // For SELECT operations that return single row
    const results = this._allQuery(sql, params);
    return results[0] || null;
  }

  _allQuery(sql, params) {
    // For SELECT operations that return multiple rows
    const match = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?(?:\s+ORDER BY\s+(.*))?/i);
    if (!match) return [];
    
    const selectClause = match[1];
    const tableName = match[2];
    const whereClause = match[3];
    const orderClause = match[4];
    
    const table = this.tables.get(tableName);
    if (!table) return [];
    
    let results = [...table.data];
    
    // Apply WHERE clause
    if (whereClause) {
      results = results.filter(row => this._evaluateWhere(row, whereClause));
    }
    
    // Apply ORDER BY clause
    if (orderClause) {
      const [orderCol, direction] = orderClause.split(/\s+/);
      results.sort((a, b) => {
        const aVal = a[orderCol];
        const bVal = b[orderCol];
        if (direction && direction.toUpperCase() === 'DESC') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    // Apply SELECT clause
    if (selectClause === '*') {
      return results;
    } else if (selectClause.includes('COUNT(*)')) {
      return [{ count: results.length }];
    } else {
      const columns = selectClause.split(',').map(c => c.trim());
      return results.map(row => {
        const selected = {};
        columns.forEach(col => {
          selected[col] = row[col];
        });
        return selected;
      });
    }
  }

  _parseValues(valuesStr) {
    // Simple value parser - handles strings, numbers, null
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      
      if (!inQuotes && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ',') {
        values.push(this._parseValue(current.trim()));
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      values.push(this._parseValue(current.trim()));
    }
    
    return values;
  }

  _parseValue(value) {
    value = value.trim();
    
    if (value === 'NULL' || value === 'null') {
      return null;
    } else if (value === 'true' || value === 'TRUE') {
      return true;
    } else if (value === 'false' || value === 'FALSE') {
      return false;
    } else if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    } else if (!isNaN(value)) {
      return parseFloat(value);
    } else {
      return value;
    }
  }

  _evaluateWhere(row, whereClause) {
    // Simple WHERE clause evaluator
    // Handles basic comparisons: column = value, column > value, etc.
    const operators = ['>=', '<=', '!=', '=', '>', '<'];
    
    for (const op of operators) {
      if (whereClause.includes(op)) {
        const [left, right] = whereClause.split(op).map(s => s.trim());
        const leftVal = row[left];
        const rightVal = this._parseValue(right);
        
        switch (op) {
          case '=':
            return leftVal === rightVal;
          case '!=':
            return leftVal !== rightVal;
          case '>':
            return leftVal > rightVal;
          case '<':
            return leftVal < rightVal;
          case '>=':
            return leftVal >= rightVal;
          case '<=':
            return leftVal <= rightVal;
          default:
            return false;
        }
      }
    }
    
    return true;
  }

  close() {
    this.data.clear();
    this.tables.clear();
  }
}

module.exports = MockDatabase;
