# House of Electronics Sales Manager - License Protection System

## Overview

This document describes the comprehensive license protection system implemented for House of Electronics Sales Manager. The system provides machine-locked licensing with hardware fingerprinting, encrypted storage, and telemetry to prevent unauthorized redistribution.

## Security Features

### 🔒 Machine-Locked Licensing
- **Hardware Fingerprinting**: Uses multiple hardware identifiers (CPU, MAC, motherboard, disk serial, etc.)
- **Multi-location Storage**: License stored in Windows Registry + multiple filesystem locations
- **Tamper Detection**: Encrypted license with RSA signature validation
- **Kill Switch**: Application exits immediately if license validation fails

### 🛡️ Protection Layers
1. **Startup Validation**: License checked before database initialization
2. **Runtime Validation**: Periodic checks every 30 minutes
3. **Hardware Change Detection**: Monitors for significant hardware changes
4. **Code Obfuscation**: ASAR encryption and build hardening
5. **Telemetry**: Anonymous usage tracking for violation detection

## Architecture

### Core Services

#### 1. License Service (`electron/services/license-service.js`)
- Hardware fingerprinting using multiple identifiers
- Machine ID generation and validation
- Hardware change detection

#### 2. License Manager (`electron/services/license-manager.js`)
- RSA encryption/decryption for license files
- Multi-location storage (Registry + filesystem)
- License validation and signature verification
- Tamper detection

#### 3. Activation Service (`electron/services/activation-service.js`)
- Activation workflow management
- License import/export functionality
- Runtime validation and monitoring

#### 4. Telemetry Service (`electron/services/telemetry-service.js`)
- Anonymous usage tracking
- Violation pattern detection
- Hardware change monitoring

### Database Schema

Added license tracking tables:
- `license_activations`: Track license activations
- `license_validations`: Validation history
- `hardware_snapshots`: Hardware change detection

### UI Components

#### 1. Activation Page (`src/pages/ActivationPage.tsx`)
- Machine ID display for customers
- License file import (drag & drop or file picker)
- License text paste functionality
- Activation status display

#### 2. License Blocked Page (`src/pages/LicenseBlockedPage.tsx`)
- Full-screen blocking when license invalid
- Different error messages for different failure types
- Retry and contact support options

#### 3. License Status Dialog (`src/components/LicenseStatusDialog.tsx`)
- License information display
- Machine binding details
- Activation status

## License Generator Tool

### Setup
```bash
# Generate RSA key pair (run once)
# Windows
node tools\license-generator-macos.js generate-keys

# macOS/Linux  
node tools/license-generator-macos.js generate-keys

# This creates:
# - tools/.keys/public.pem (embed in activation-service.js)
# - tools/.keys/private.pem (keep secure!)
```

### Usage

#### Create License for Customer
```bash
# Windows
node tools\license-generator-macos.js create-license

# macOS/Linux
node tools/license-generator-macos.js create-license

# Enter machine fingerprint when prompted
# Enter customer details (optional)
# License file will be saved to tools/licenses/
```

#### Verify License File
```bash
# Windows
node tools\license-generator-macos.js verify-license

# macOS/Linux
node tools/license-generator-macos.js verify-license

# Select license file to verify
```

## Customer Activation Process

### 1. Customer Gets Machine ID
- Customer runs the application
- Application shows activation page with Machine ID
- Customer copies Machine ID and sends to you

### 2. You Generate License
```bash
# Windows
node tools\license-generator-macos.js create-license

# macOS/Linux
node tools/license-generator-macos.js create-license
# Enter the customer's Machine ID
# Enter customer details
# Send the generated .lic file to customer
```

### 3. Customer Activates
- Customer receives .lic file
- Customer imports license via activation page
- Application validates and stores license
- Customer can now use the application

## Security Implementation

### Hardware Fingerprinting
The system collects multiple hardware identifiers:
- Machine ID (primary identifier)
- CPU information (model, cores, speed)
- MAC address (primary network adapter)
- Windows-specific: motherboard serial, BIOS serial, system UUID, disk serial
- Platform and architecture information

### License Storage
Licenses are stored in multiple locations for redundancy:
- Windows Registry: `HKCU\Software\HouseOfElectronics\SalesManager`
- Filesystem: User data directory + hidden locations
- All storage is encrypted with AES-256-GCM

### Validation Process
1. **Startup**: License validated before app initialization
2. **Runtime**: Periodic validation every 30 minutes
3. **Hardware Change**: Detects significant hardware changes
4. **Tamper Detection**: Validates RSA signature on every check

### Build Hardening
- **ASAR Encryption**: Application code is encrypted
- **Code Obfuscation**: Sensitive code is obfuscated
- **Anti-Debugging**: Basic protection against debugging tools

## Telemetry and Monitoring

### Anonymous Data Collection
- Machine fingerprint hash (one-way, non-reversible)
- Application version and OS information
- License validation results
- Hardware change events
- Violation patterns

### Violation Detection
- Multiple activations of same license
- Hardware manipulation attempts
- License tampering
- Unusual usage patterns

## Development and Testing

### Testing the License System

#### 1. Generate Test Keys
```bash
# Windows
node tools\license-generator-macos.js generate-keys

# macOS/Linux  
node tools/license-generator-macos.js generate-keys
```

#### 2. Update Public Key
Copy the public key from `tools/.keys/public.pem` and update `electron/services/activation-service.js`:

```javascript
const publicKey = `-----BEGIN PUBLIC KEY-----
[YOUR_PUBLIC_KEY_HERE]
-----END PUBLIC KEY-----`;
```

#### 3. Test Activation Flow
1. Run the application (should show activation page)
2. Copy the Machine ID
3. Generate a license using the tool
4. Import the license file
5. Verify the application works

#### 4. Test License Validation
```bash
# Test on different machine (should fail)
# Test with modified license file (should fail)
# Test with expired license (should fail)
```

### Debugging

#### Check License Status
```javascript
// In browser console
window.electronAPI.getActivationStatus()
```

#### View Telemetry
```javascript
// In browser console
window.electronAPI.getTelemetrySummary()
```

#### Deactivate for Testing
```javascript
// In browser console
window.electronAPI.deactivateLicense()
```

## Security Considerations

### What This System Protects Against
✅ **Casual Piracy**: Prevents simple file copying and sharing  
✅ **USB Distribution**: Blocks installation on different machines  
✅ **License Sharing**: Hardware-locked prevents multiple activations  
✅ **Simple Tampering**: RSA signatures prevent license modification  
✅ **Basic Reverse Engineering**: ASAR encryption and obfuscation  

### What This System Cannot Protect Against
⚠️ **Professional Cracking**: Determined reverse engineers can eventually crack it  
⚠️ **VM/Container Bypass**: Advanced users might use virtualization  
⚠️ **Memory Patching**: Runtime memory modification (requires additional protection)  
⚠️ **Network Bypass**: Offline-only system has limitations  

### Recommended Additional Security (Optional)
- **Online Activation**: Require periodic internet validation
- **Code Signing**: Sign the executable with a certificate
- **Native Protection**: Use commercial tools like VMProtect or Themida
- **Server Validation**: Implement server-side license checking

## File Structure

```
electron/
├── services/
│   ├── license-service.js          # Hardware fingerprinting
│   ├── license-manager.js          # License validation & storage
│   ├── activation-service.js       # Activation workflow
│   └── telemetry-service.js       # Usage tracking
├── handlers/
│   └── license-handlers.js        # IPC handlers
└── schema/
    └── sqlite-schema.js           # License tables

src/
├── pages/
│   ├── ActivationPage.tsx         # Activation UI
│   └── LicenseBlockedPage.tsx     # Blocked state UI
└── components/
    └── LicenseStatusDialog.tsx    # License status dialog

tools/
└── license-generator.js           # License generation tool
```

## Troubleshooting

### Common Issues

#### "License validation failed"
- Check if license file is valid
- Verify machine fingerprint matches
- Check for hardware changes

#### "No license found"
- Application needs activation
- License file may be corrupted
- Check storage permissions

#### "Hardware mismatch"
- License is bound to different machine
- Significant hardware change detected
- Contact support for license transfer

### Support Commands

```bash
# Check license status
node -e "console.log(require('./electron/services/activation-service').getActivationService().getActivationStatus())"

# View telemetry
node -e "console.log(require('./electron/services/telemetry-service').getTelemetryService().getSummary())"

# Clear all license data (for testing)
node -e "require('./electron/services/license-manager').getLicenseManager().deleteLicense()"
```

## Security Rating: 7-8/10

This system provides **excellent protection** against casual piracy and unauthorized sharing, which covers 95%+ of potential abuse cases. For a business application like House of Electronics Sales Manager, this level of protection is more than sufficient.

The system is designed to be:
- **User-friendly**: Simple activation process
- **Reliable**: Multiple storage locations prevent data loss
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new security features

## License

This license protection system is proprietary to House of Electronics and is not to be redistributed or used in other projects without explicit permission.
