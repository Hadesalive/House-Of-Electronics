/**
 * Script to create a new admin user or reset password
 * 
 * Create new admin user:
 *   node scripts/create-admin-user.js [username] [password] [fullName]
 *   Example: node scripts/create-admin-user.js admin admin123 Administrator
 * 
 * Reset password for existing user:
 *   node scripts/create-admin-user.js reset <username> [new-password]
 *   Example: node scripts/create-admin-user.js reset admin newpassword123
 */

const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('better-sqlite3');

// Simple password hashing (same as in user-handlers.js)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate employee ID
function generateEmployeeId(db, role) {
  const roleCodes = {
    admin: 'ADM',
    manager: 'MGR',
    cashier: 'CSH'
  };

  const roleCode = roleCodes[role] || 'EMP';
  const prefix = `HOE-${roleCode}`;

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

function createAdminUser() {
  // Get database path (same logic as database-service.js)
  const os = require('os');
  const possiblePaths = [
    path.join(os.homedir(), 'house-of-electronics-sales.db'),
    path.join(__dirname, '..', 'house-of-electronics-sales.db'),
    path.join(os.homedir(), 'Library', 'Application Support', 'House Of Electronics', 'house-of-electronics-sales.db'),
    path.join(os.homedir(), 'House Of Electronics', 'house-of-electronics-sales.db'),
    path.join(os.homedir(), '.house-of-electronics-sales-manager', 'house-of-electronics-sales.db')
  ];

  let dbPath = null;
  for (const testPath of possiblePaths) {
    if (require('fs').existsSync(testPath)) {
      dbPath = testPath;
      break;
    }
  }

  if (!dbPath) {
    // Try to use the one in the project directory
    dbPath = path.join(__dirname, '..', 'house-of-electronics-sales.db');
    if (!require('fs').existsSync(dbPath)) {
      console.error('❌ Database file not found. Please make sure the app has been run at least once.');
      process.exit(1);
    }
  }

  console.log(`📂 Using database: ${dbPath}`);

  const db = sqlite3(dbPath);

  // Check if we're resetting a password or creating a new user
  const mode = process.argv[2];
  
  if (mode === 'reset' || mode === '--reset') {
    // Reset password mode
    const username = process.argv[3];
    const newPassword = process.argv[4] || 'admin123';
    
    if (!username) {
      console.error('❌ Please provide a username to reset password');
      console.log('\nUsage: node scripts/create-admin-user.js reset <username> [new-password]');
      process.exit(1);
    }
    
    console.log(`\n🔐 Resetting password for user: ${username}`);
    console.log(`   New Password: ${newPassword}\n`);
    
    try {
      const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
      if (!user) {
        console.error(`❌ User "${username}" not found!`);
        process.exit(1);
      }
      
      const passwordHash = hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
        .run(passwordHash, username);
      
      console.log('✅ Password reset successfully!');
      console.log(`\n💡 You can now login with:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${newPassword}\n`);
      
      db.close();
    } catch (error) {
      console.error('❌ Error resetting password:', error.message);
      db.close();
      process.exit(1);
    }
  } else {
    // Create new user mode
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const fullName = process.argv[4] || 'Administrator';

    console.log('\n🔐 Creating admin user...');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Full Name: ${fullName}`);
    console.log(`   Role: admin\n`);

    try {
      // Check if username already exists
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        console.error(`❌ Username "${username}" already exists!`);
        console.log('   Use "reset" mode to change password:');
        console.log(`   node scripts/create-admin-user.js reset ${username} <new-password>`);
        process.exit(1);
      }

      // Generate ID same way as database service
      const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const passwordHash = hashPassword(password);
      const employeeId = generateEmployeeId(db, 'admin');

      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, phone, role, employee_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(id, username, passwordHash, fullName, null, null, 'admin', employeeId);

      console.log('✅ Admin user created successfully!');
      console.log(`\n📋 User Details:`);
      console.log(`   ID: ${id}`);
      console.log(`   Username: ${username}`);
      console.log(`   Employee ID: ${employeeId}`);
      console.log(`   Role: admin`);
      console.log(`\n💡 You can now login with:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}\n`);

      db.close();
    } catch (error) {
      console.error('❌ Error creating admin user:', error.message);
      db.close();
      process.exit(1);
    }
  }
}

// Run the script
createAdminUser();
