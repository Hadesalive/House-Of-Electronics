/**
 * Quick Test Script for Financial Calculation Fixes
 * 
 * This script helps verify that the core functionality is working
 * by testing the key components without requiring the full UI.
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Quick Test Script for Financial Calculation Fixes');
console.log('====================================================\n');

// Test 1: Check if transaction service exists
console.log('1. Testing Transaction Service...');
try {
  const transactionServicePath = path.join(__dirname, '..', 'electron', 'services', 'transaction-service.js');
  if (fs.existsSync(transactionServicePath)) {
    console.log('   ✅ Transaction service file exists');
    
    const content = fs.readFileSync(transactionServicePath, 'utf8');
    if (content.includes('executeInTransaction')) {
      console.log('   ✅ executeInTransaction function found');
    } else {
      console.log('   ❌ executeInTransaction function missing');
    }
  } else {
    console.log('   ❌ Transaction service file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking transaction service:', error.message);
}

// Test 2: Check if revenue calculator exists
console.log('\n2. Testing Revenue Calculator...');
try {
  const revenueCalculatorPath = path.join(__dirname, '..', 'src', 'lib', 'services', 'revenue-calculator.service.ts');
  if (fs.existsSync(revenueCalculatorPath)) {
    console.log('   ✅ Revenue calculator service file exists');
    
    const content = fs.readFileSync(revenueCalculatorPath, 'utf8');
    if (content.includes('calculateGrossRevenue')) {
      console.log('   ✅ calculateGrossRevenue method found');
    } else {
      console.log('   ❌ calculateGrossRevenue method missing');
    }
    
    if (content.includes('calculateReturnImpact')) {
      console.log('   ✅ calculateReturnImpact method found');
    } else {
      console.log('   ❌ calculateReturnImpact method missing');
    }
  } else {
    console.log('   ❌ Revenue calculator service file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking revenue calculator:', error.message);
}

// Test 3: Check if handlers use transactions
console.log('\n3. Testing Handler Updates...');
try {
  const salesHandlersPath = path.join(__dirname, '..', 'electron', 'handlers', 'sales-handlers.js');
  if (fs.existsSync(salesHandlersPath)) {
    const content = fs.readFileSync(salesHandlersPath, 'utf8');
    
    if (content.includes('executeInTransaction')) {
      console.log('   ✅ Sales handlers use transactions');
    } else {
      console.log('   ❌ Sales handlers not using transactions');
    }
    
    if (content.includes('stockWarnings')) {
      console.log('   ✅ Backorder support found in sales handlers');
    } else {
      console.log('   ❌ Backorder support missing in sales handlers');
    }
  } else {
    console.log('   ❌ Sales handlers file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking sales handlers:', error.message);
}

// Test 4: Check if schema has cost validation
console.log('\n4. Testing Schema Updates...');
try {
  const schemaPath = path.join(__dirname, '..', 'electron', 'schema', 'sqlite-schema.js');
  if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, 'utf8');
    
    if (content.includes('cost REAL NOT NULL DEFAULT 0')) {
      console.log('   ✅ Cost field is NOT NULL with default');
    } else {
      console.log('   ❌ Cost field not properly constrained');
    }
    
    if (content.includes('has_backorder')) {
      console.log('   ✅ Backorder columns found in schema');
    } else {
      console.log('   ❌ Backorder columns missing from schema');
    }
  } else {
    console.log('   ❌ Schema file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking schema:', error.message);
}

// Test 5: Check if UI forms require cost
console.log('\n5. Testing UI Updates...');
try {
  const productNewPagePath = path.join(__dirname, '..', 'src', 'pages', 'ProductNewPage.tsx');
  if (fs.existsSync(productNewPagePath)) {
    const content = fs.readFileSync(productNewPagePath, 'utf8');
    
    if (content.includes('required') && content.includes('cost')) {
      console.log('   ✅ ProductNewPage requires cost field');
    } else {
      console.log('   ❌ ProductNewPage cost field not required');
    }
  } else {
    console.log('   ❌ ProductNewPage file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking ProductNewPage:', error.message);
}

// Test 6: Check if tests exist
console.log('\n6. Testing Test Suite...');
try {
  const testPath = path.join(__dirname, '..', 'tests', 'financial-calculations.test.js');
  if (fs.existsSync(testPath)) {
    console.log('   ✅ Financial calculations test file exists');
    
    const content = fs.readFileSync(testPath, 'utf8');
    if (content.includes('calculateGrossRevenue')) {
      console.log('   ✅ Revenue calculation tests found');
    } else {
      console.log('   ❌ Revenue calculation tests missing');
    }
  } else {
    console.log('   ❌ Test file missing');
  }
} catch (error) {
  console.log('   ❌ Error checking tests:', error.message);
}

// Test 7: Check if audit script exists
console.log('\n7. Testing Audit Script...');
try {
  const auditPath = path.join(__dirname, 'audit-financial-data.js');
  if (fs.existsSync(auditPath)) {
    console.log('   ✅ Audit script exists');
  } else {
    console.log('   ❌ Audit script missing');
  }
} catch (error) {
  console.log('   ❌ Error checking audit script:', error.message);
}

console.log('\n🎯 Quick Test Summary');
console.log('====================');
console.log('This script checks if the key files and functions exist.');
console.log('For full testing, follow the MANUAL_TESTING_GUIDE.md');
console.log('\nNext steps:');
console.log('1. Start the app: npm run electron-dev');
console.log('2. Follow the manual testing guide');
console.log('3. Check console for any errors');
console.log('4. Verify revenue calculations match between pages');

console.log('\n✅ Quick test completed!');
