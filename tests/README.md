# License System Testing Guide

This directory contains comprehensive tests for the House of Electronics Sales Manager license protection system.

## Test Structure

### 1. Unit Tests (`license-system.test.js`)
Tests individual components and services:
- Hardware fingerprinting
- License encryption/decryption
- RSA signature validation
- Telemetry recording
- Database schema

### 2. Integration Tests (`license-integration.test.js`)
Tests component interactions and real-world scenarios:
- License generator tool functionality
- End-to-end activation workflow
- Error handling and edge cases
- Performance testing

### 3. Flow Simulation Tests (`license-flow-simulation.test.js`)
Simulates the complete customer activation process:
- Customer gets Machine ID
- Vendor generates license
- Customer imports license
- Application validation
- Security checks

## Running Tests

### Run All License Tests
```bash
npm run test:license
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:license:unit

# Integration tests only
npm run test:license:integration

# Flow simulation tests only
npm run test:license:flow
```

### Run Individual Test Files
```bash
# Using Node.js test runner
node --test tests/license-system.test.js
node --test tests/license-integration.test.js
node --test tests/license-flow-simulation.test.js

# Using the test runner script
node scripts/test-license-system.js license-system
node scripts/test-license-system.js integration
node scripts/test-license-system.js flow-simulation
```

## Test Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate RSA Keys (for integration tests)
```bash
node tools/license-generator.js generate-keys
```

### 3. Ensure Test Environment
- Node.js 18+ required
- Windows environment for full Registry testing
- Sufficient disk space for temporary files

## Test Coverage

### Core Functionality Tests
- ✅ Hardware fingerprinting consistency
- ✅ Machine ID generation
- ✅ License encryption/decryption
- ✅ RSA signature creation and validation
- ✅ Multi-location license storage
- ✅ License validation logic
- ✅ Hardware change detection

### Security Tests
- ✅ Tamper detection
- ✅ Invalid signature rejection
- ✅ Hardware mismatch detection
- ✅ License expiration handling
- ✅ Corrupted data handling

### Integration Tests
- ✅ License generator tool
- ✅ Activation workflow
- ✅ Telemetry recording
- ✅ Database operations
- ✅ Error handling

### Performance Tests
- ✅ Concurrent operations
- ✅ Rapid validations
- ✅ Memory usage
- ✅ Response times

## Test Scenarios

### 1. Happy Path Testing
```
1. Generate RSA keys
2. Get machine identifier
3. Create license for machine
4. Import license
5. Validate activation
6. Runtime validation
```

### 2. Security Testing
```
1. Test with different machine fingerprint
2. Test with tampered license
3. Test with expired license
4. Test with invalid signature
5. Test with corrupted data
```

### 3. Error Handling Testing
```
1. Missing license files
2. Invalid license format
3. Network failures
4. Permission issues
5. Hardware changes
```

## Test Data Management

### Temporary Files
Tests create temporary files in:
- `os.tmpdir()/license-test-*`
- `os.tmpdir()/license-integration-*`
- `os.tmpdir()/license-flow-*`

### Cleanup
All temporary files are automatically cleaned up after tests complete.

### License Files
Test license files are created in:
- `tools/licenses/` (for integration tests)
- Temporary directories (for flow simulation)

## Debugging Tests

### Enable Verbose Output
```bash
# Set debug environment variable
DEBUG=license:* npm run test:license
```

### View Test Output
```bash
# Run with detailed output
node scripts/test-license-system.js --verbose
```

### Individual Test Debugging
```bash
# Run single test with Node.js debugger
node --inspect --test tests/license-system.test.js
```

## Test Failures

### Common Issues

#### 1. "Keys not found" Error
**Solution:** Run `node tools/license-generator.js generate-keys` first

#### 2. "Permission denied" Error
**Solution:** Run tests with appropriate permissions or as administrator

#### 3. "Port already in use" Error
**Solution:** Kill any running Electron processes before testing

#### 4. "Database locked" Error
**Solution:** Ensure no other instances of the app are running

### Debugging Steps

1. **Check Dependencies**
   ```bash
   npm list node-machine-id node-rsa winreg
   ```

2. **Verify Key Generation**
   ```bash
   node tools/license-generator.js generate-keys
   ls -la tools/.keys/
   ```

3. **Test Individual Components**
   ```bash
   node -e "console.log(require('./electron/services/license-service').getLicenseService().getMachineId())"
   ```

4. **Check File Permissions**
   ```bash
   # Windows
   icacls tools\.keys\ /grant Everyone:F
   
   # Linux/Mac
   chmod 600 tools/.keys/private.pem
   ```

## Continuous Integration

### GitHub Actions Example
```yaml
name: License System Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:license
```

### Test Environment Variables
```bash
# Set for CI environment
NODE_ENV=test
CI=true
```

## Performance Benchmarks

### Expected Performance
- Hardware fingerprinting: < 100ms
- License validation: < 50ms
- Encryption/decryption: < 10ms
- 100 concurrent validations: < 5 seconds
- 50 concurrent operations: < 3 seconds

### Memory Usage
- Base memory: ~50MB
- Peak memory during tests: ~200MB
- Memory leaks: None detected

## Test Reports

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage
```

### Test Results
Test results are displayed in the console with:
- ✅ Passed tests (green)
- ❌ Failed tests (red)
- ⚠️ Warnings (yellow)
- 📊 Summary statistics

### Custom Reports
```bash
# Generate detailed report
node scripts/test-license-system.js > test-results.txt 2>&1
```

## Troubleshooting

### Test Hangs
If tests hang, check for:
1. Running Electron processes
2. Database locks
3. File system permissions
4. Network connectivity

### Memory Issues
If tests fail due to memory:
1. Reduce concurrent test count
2. Increase Node.js memory limit: `node --max-old-space-size=4096`
3. Run tests individually

### Platform-Specific Issues
- **Windows:** Registry access requires appropriate permissions
- **Linux:** May need additional packages for hardware detection
- **macOS:** Gatekeeper may interfere with file operations

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use descriptive test names
3. Include cleanup in `afterAll`
4. Add performance benchmarks for critical paths
5. Document any new test requirements

### Test Guidelines
- Tests should be independent
- Use realistic test data
- Clean up after tests
- Handle platform differences
- Include error scenarios

## Support

For test-related issues:
1. Check this documentation
2. Review test output carefully
3. Verify environment setup
4. Check for known issues in GitHub
5. Contact development team

---

**Note:** These tests are critical for ensuring the license protection system works correctly. Always run the full test suite before deploying changes to the license system.
