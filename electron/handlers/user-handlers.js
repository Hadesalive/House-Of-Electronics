/**
 * User Handlers - RBAC & User Management
 * House of Electronics Sales Manager
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const crypto = require('crypto');

// Simple password hashing (for production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Generate employee ID based on role, with a branded prefix
// Format: HOE-<ROLECODE>-NNNN (e.g., HOE-ADM-0001)
function generateEmployeeId(db, role) {
  const roleCodes = {
    admin: 'ADM',
    manager: 'MGR',
    cashier: 'CSH'
  };

  const roleCode = roleCodes[role] || 'EMP';
  const prefix = `HOE-${roleCode}`;

  // Get the highest number for this prefix
  const result = db.prepare(`
    SELECT employee_id FROM users 
    WHERE employee_id LIKE ? 
    ORDER BY employee_id DESC 
    LIMIT 1
  `).get(`${prefix}-%`);

  if (result) {
    const num = parseInt(result.employee_id.split('-')[2]) + 1;
    return `${prefix}-${String(num).padStart(4, '0')}`;
  }

  return `${prefix}-0001`;
}

function registerUserHandlers(databaseService, syncService) {
  if (!databaseService || !databaseService.db) {
    console.error('User handlers: databaseService not available');
    return;
  }
  const db = databaseService.db;

  // Login
  ipcMain.handle('user-login', async (event, { username, password }) => {
    try {
      const user = db.prepare(`
        SELECT * FROM users WHERE username = ? AND is_active = 1
      `).get(username);
      
      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      if (!verifyPassword(password, user.password_hash)) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Update last login
      db.prepare(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `).run(user.id);
      
      // Return user without password hash
      const { password_hash, ...safeUser } = user;
      
      return {
        success: true,
        data: {
          id: safeUser.id,
          username: safeUser.username,
          fullName: safeUser.full_name,
          email: safeUser.email,
          phone: safeUser.phone,
          role: safeUser.role,
          employeeId: safeUser.employee_id,
          isActive: safeUser.is_active === 1,
          createdAt: safeUser.created_at,
          updatedAt: safeUser.updated_at,
          lastLogin: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all users
  ipcMain.handle('get-users', async () => {
    try {
      const users = db.prepare(`
        SELECT id, username, full_name, email, phone, role, employee_id, 
               is_active, created_at, updated_at, last_login
        FROM users
        ORDER BY created_at DESC
      `).all();
      
      return {
        success: true,
        data: users.map(user => ({
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employee_id,
          isActive: user.is_active === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }))
      };
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get single user by ID
  ipcMain.handle('get-user', async (event, id) => {
    try {
      const user = db.prepare(`
        SELECT id, username, full_name, email, phone, role, employee_id, 
               is_active, created_at, updated_at, last_login
        FROM users WHERE id = ?
      `).get(id);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employee_id,
          isActive: user.is_active === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }
      };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get user by username (for forgot password lookup)
  ipcMain.handle('get-user-by-username', async (event, username) => {
    try {
      if (!username || username.trim() === '') {
        return { success: false, error: 'Username is required' };
      }

      const user = db.prepare(`
        SELECT id, username, full_name, email, phone, role, employee_id, 
               is_active, created_at, updated_at, last_login
        FROM users WHERE username = ?
      `).get(username.trim());
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employee_id,
          isActive: user.is_active === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }
      };
    } catch (error) {
      console.error('Get user by username error:', error);
      return { success: false, error: error.message };
    }
  });

  // Create user
  ipcMain.handle('create-user', async (event, userData) => {
    try {
      const { username, password, fullName, email, phone, role } = userData;
      
      // Check if username already exists
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return { success: false, error: 'Username already exists' };
      }
      
      const id = crypto.randomUUID();
      const passwordHash = hashPassword(password);
      const employeeId = userData.employeeId || generateEmployeeId(db, role);
      
      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, phone, role, employee_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(id, username, passwordHash, fullName, email || null, phone || null, role, employeeId);
      
      // Get the created user for sync tracking
      const createdUser = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(id);
      
      // Track change for sync (include password_hash for internal system)
      if (syncService && createdUser) {
        syncService.trackChange('users', id, 'create', createdUser);
      }
      
      return {
        success: true,
        data: {
          id,
          username,
          fullName,
          email,
          phone,
          role,
          employeeId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: error.message };
    }
  });

  // Update user
  ipcMain.handle('update-user', async (event, { id, ...updates }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      const fields = [];
      const values = [];
      
      if (updates.username !== undefined) {
        // Check if new username already exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(updates.username, id);
        if (existing) {
          return { success: false, error: 'Username already exists' };
        }
        fields.push('username = ?');
        values.push(updates.username);
      }
      
      if (updates.fullName !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
      }
      
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      
      if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
      }
      
      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      
      if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
      }
      
      if (updates.password) {
        fields.push('password_hash = ?');
        values.push(hashPassword(updates.password));
      }
      
      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      values.push(id);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      
      // Get full updated user for sync tracking
      const updatedUserFull = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      
      // Track change for sync (include password_hash for internal system)
      if (syncService && updatedUserFull) {
        syncService.trackChange('users', id, 'update', updatedUserFull);
      }
      
      // Return updated user (without password_hash)
      const updatedUser = db.prepare(`
        SELECT id, username, full_name, email, phone, role, employee_id, 
               is_active, created_at, updated_at, last_login
        FROM users WHERE id = ?
      `).get(id);
      
      return {
        success: true,
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          employeeId: updatedUser.employee_id,
          isActive: updatedUser.is_active === 1,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
          lastLogin: updatedUser.last_login
        }
      };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete user (soft delete - deactivate)
  ipcMain.handle('delete-user', async (event, id) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Don't allow deleting the last admin
      if (user.role === 'admin') {
        const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1').get('admin');
        if (adminCount.count <= 1) {
          return { success: false, error: 'Cannot delete the last admin user' };
        }
      }
      
      // Get user data before deactivation for sync tracking
      const userForSync = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      
      // Soft delete - just deactivate
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
      
      // Track change for sync (include password_hash for internal system)
      if (syncService && userForSync) {
        // Track as update (not delete) since we're just deactivating
        syncService.trackChange('users', id, 'update', { ...userForSync, is_active: 0 });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: error.message };
    }
  });

  // Change password
  ipcMain.handle('change-password', async (event, { userId, currentPassword, newPassword }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      if (!verifyPassword(currentPassword, user.password_hash)) {
        return { success: false, error: 'Current password is incorrect' };
      }
      
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
      
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset password (admin only - by userId)
  ipcMain.handle('reset-password', async (event, { userId, newPassword }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
      
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset user password (for forgot password feature - by username)
  ipcMain.handle('reset-user-password', async (event, { username, newPassword }) => {
    try {
      if (!username || !newPassword) {
        return { success: false, error: 'Username and new password are required' };
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Check if user exists
      const user = db.prepare('SELECT id, username, is_active FROM users WHERE username = ?').get(username);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.is_active !== 1) {
        return { success: false, error: 'User account is inactive' };
      }

      // Hash the new password
      const passwordHash = hashPassword(newPassword);

      // Update password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
        .run(passwordHash, username);

      // Track change for sync
      if (syncService) {
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        if (updatedUser) {
          syncService.trackChange('users', user.id, 'update', updatedUser);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Reset user password error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current session user
  ipcMain.handle('get-current-user', async (event, userId) => {
    try {
      if (!userId) {
        return { success: false, error: 'No user ID provided' };
      }
      
      const user = db.prepare(`
        SELECT id, username, full_name, email, phone, role, employee_id, 
               is_active, created_at, updated_at, last_login
        FROM users WHERE id = ? AND is_active = 1
      `).get(userId);
      
      if (!user) {
        return { success: false, error: 'User not found or inactive' };
      }
      
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employee_id,
          isActive: user.is_active === 1,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ User handlers registered');
}

module.exports = { registerUserHandlers };

