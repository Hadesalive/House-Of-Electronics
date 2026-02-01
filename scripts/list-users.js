/**
 * Script to list all users with their usernames and roles
 */

const path = require('path');
const sqlite3 = require('better-sqlite3');

function listUsers() {
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

  console.log(`📂 Using database: ${dbPath}\n`);

  const db = sqlite3(dbPath);

  try {
    const users = db.prepare(`
      SELECT username, role, full_name, is_active, employee_id
      FROM users
      ORDER BY role, username
    `).all();

    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      db.close();
      process.exit(1);
    }

    console.log('📋 Users in database:\n');
    console.log('─'.repeat(80));
    console.log(`${'Username'.padEnd(20)} ${'Role'.padEnd(10)} ${'Full Name'.padEnd(25)} ${'Status'.padEnd(10)} ${'Employee ID'}`);
    console.log('─'.repeat(80));

    users.forEach(user => {
      const status = user.is_active === 1 ? 'Active' : 'Inactive';
      const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      console.log(
        `${(user.username || '').padEnd(20)} ${role.padEnd(10)} ${(user.full_name || '').padEnd(25)} ${status.padEnd(10)} ${user.employee_id || 'N/A'}`
      );
    });

    console.log('─'.repeat(80));
    console.log(`\n✅ Total users: ${users.length}\n`);

    // Show admin users specifically
    const admins = users.filter(u => u.role === 'admin' && u.is_active === 1);
    if (admins.length > 0) {
      console.log('🔑 Active Admin Users:');
      admins.forEach(admin => {
        console.log(`   • Username: ${admin.username}`);
        console.log(`     Full Name: ${admin.full_name || 'N/A'}`);
        console.log(`     Employee ID: ${admin.employee_id || 'N/A'}\n`);
      });
    }

    db.close();
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    db.close();
    process.exit(1);
  }
}

// Run the script
listUsers();
