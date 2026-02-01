#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * License System Test Runner
 * 
 * This script runs comprehensive tests for the license protection system
 * including unit tests, integration tests, and flow simulation tests.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_FILES = [
  'tests/license-system.test.js',
  'tests/license-integration.test.js',
  'tests/license-flow-simulation.test.js'
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    log(`\n🧪 Running ${path.basename(testFile)}...`, 'cyan');
    
    const process = spawn('node', ['--test', testFile], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${path.basename(testFile)} passed`, 'green');
        resolve({ file: testFile, success: true, output, errorOutput });
      } else {
        log(`❌ ${path.basename(testFile)} failed`, 'red');
        resolve({ file: testFile, success: false, output, errorOutput, code });
      }
    });

    process.on('error', (error) => {
      log(`💥 ${path.basename(testFile)} error: ${error.message}`, 'red');
      reject({ file: testFile, error });
    });
  });
}

async function runAllTests() {
  log('🚀 Starting License System Test Suite', 'bright');
  log('=' * 50, 'blue');
  
  const results = [];
  const startTime = Date.now();
  
  for (const testFile of TEST_FILES) {
    if (!fs.existsSync(path.join(__dirname, '..', testFile))) {
      log(`⚠️  Test file not found: ${testFile}`, 'yellow');
      continue;
    }
    
    try {
      const result = await runTest(testFile);
      results.push(result);
    } catch (error) {
      log(`💥 Failed to run ${testFile}: ${error.message}`, 'red');
      results.push({ file: testFile, success: false, error: error.message });
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Summary
  log('\n📊 Test Results Summary', 'bright');
  log('=' * 30, 'blue');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Duration: ${duration}ms`, 'blue');
  
  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.filter(r => !r.success).forEach(result => {
      log(`  - ${path.basename(result.file)}`, 'red');
      if (result.error) {
        log(`    Error: ${result.error}`, 'red');
      }
      if (result.code) {
        log(`    Exit Code: ${result.code}`, 'red');
      }
    });
  }
  
  if (passed === total) {
    log('\n🎉 All tests passed! License system is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n💥 Some tests failed. Please check the output above.', 'red');
    process.exit(1);
  }
}

async function runSpecificTest(testName) {
  const testFile = TEST_FILES.find(f => f.includes(testName));
  
  if (!testFile) {
    log(`❌ Test not found: ${testName}`, 'red');
    log(`Available tests: ${TEST_FILES.map(f => path.basename(f)).join(', ')}`, 'blue');
    process.exit(1);
  }
  
  if (!fs.existsSync(path.join(__dirname, '..', testFile))) {
    log(`❌ Test file not found: ${testFile}`, 'red');
    process.exit(1);
  }
  
  log(`🧪 Running specific test: ${testName}`, 'cyan');
  
  try {
    const result = await runTest(testFile);
    
    if (result.success) {
      log(`✅ ${testName} passed`, 'green');
      process.exit(0);
    } else {
      log(`❌ ${testName} failed`, 'red');
      if (result.output) {
        log('\nOutput:', 'yellow');
        console.log(result.output);
      }
      if (result.errorOutput) {
        log('\nError Output:', 'red');
        console.log(result.errorOutput);
      }
      process.exit(1);
    }
  } catch (error) {
    log(`💥 Error running ${testName}: ${error.message}`, 'red');
    process.exit(1);
  }
}

function showHelp() {
  log('License System Test Runner', 'bright');
  log('========================', 'blue');
  log('');
  log('Usage:');
  log('  node scripts/test-license-system.js [test-name]', 'cyan');
  log('');
  log('Available tests:');
  TEST_FILES.forEach((testFile, index) => {
    const name = path.basename(testFile, '.test.js');
    log(`  ${index + 1}. ${name}`, 'yellow');
  });
  log('');
  log('Examples:');
  log('  node scripts/test-license-system.js                    # Run all tests', 'cyan');
  log('  node scripts/test-license-system.js license-system     # Run specific test', 'cyan');
  log('  node scripts/test-license-system.js integration       # Run integration tests', 'cyan');
  log('  node scripts/test-license-system.js flow-simulation    # Run flow simulation', 'cyan');
  log('');
  log('Test Categories:');
  log('  - license-system: Core license functionality tests', 'green');
  log('  - integration: Integration and end-to-end tests', 'green');
  log('  - flow-simulation: Complete customer activation flow', 'green');
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.length === 0) {
  // Run all tests
  runAllTests().catch(error => {
    log(`💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  // Run specific test
  const testName = args[0];
  runSpecificTest(testName).catch(error => {
    log(`💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  });
}
