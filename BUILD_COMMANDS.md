# 🚀 House of Electronics Sales Manager - Build Commands

This file contains all the build commands for creating distributable packages for macOS and Windows.

## 📋 Prerequisites

Before building, make sure you have:
- Node.js installed (v16 or later)
- npm installed
- All dependencies installed (`npm install`)

## 🍎 macOS Build Commands

### **Free Build (No Apple Developer Account Required)**
```bash
# Simple free build
npm run pack:mac:free

# Or use the automated script
chmod +x scripts/build-macos-free.sh
./scripts/build-macos-free.sh
```

### **Professional Build (With Code Signing)**
```bash
# Set your environment variables first
export TEAM_ID="YOUR_TEAM_ID"
export APPLE_ID="your-email@example.com"
export APPLE_PASSWORD="your-app-specific-password"

# Run the professional build script
chmod +x scripts/build-macos.sh
./scripts/build-macos.sh
```

### **Manual macOS Build**
```bash
# Build the app
npm run build

# Create macOS package
npm run pack:mac
```

## 🪟 Windows Build Commands

### **Standard Windows Build**
```bash
# Simple Windows build
npm run pack:win
```

### **Enhanced Windows Build (Recommended)**
```bash
# Enhanced installer with progress dialog
npm run pack:win:enhanced

# Or use the automated script
chmod +x scripts/build-windows-enhanced.sh
./scripts/build-windows-enhanced.sh
```

### **Manual Windows Build**
```bash
# Build the app
npm run build

# Create Windows package
npm run pack:win
```

## 🐧 Linux Build Commands

### **Linux Build**
```bash
# Build for Linux
npm run pack:linux
```

## 🌍 Universal Build Commands

### **Build All Platforms**
```bash
# Build for all platforms (macOS, Windows, Linux)
npm run pack:all
```

### **Build Specific Platforms**
```bash
# macOS only
npm run pack:mac

# Windows only
npm run pack:win

# Linux only
npm run pack:linux
```

## 📦 Build Output Locations

After building, you'll find your packages in the `release/` directory:

### **macOS Outputs:**
- `House of Electronics Sales Manager-1.0.0.dmg` - DMG installer
- `House of Electronics Sales Manager-1.0.0.zip` - ZIP archive
- `House of Electronics Sales Manager-1.0.0.app` - Application bundle

### **Windows Outputs:**
- `House of Electronics Sales Manager-1.0.0-Setup.exe` - NSIS installer
- `House of Electronics Sales Manager-1.0.0-Setup.exe.blockmap` - Block map file
- `win-ia32-unpacked/` - 32-bit portable version
- `win-unpacked/` - 64-bit portable version

### **Linux Outputs:**
- `House of Electronics Sales Manager-1.0.0.AppImage` - AppImage package
- `House of Electronics Sales Manager-1.0.0.deb` - Debian package

## 🔐 License Generation (macOS)

### **Generate License Keys**
```bash
# Interactive license generator (recommended)
chmod +x scripts/generate-license-macos.sh
./scripts/generate-license-macos.sh

# Or direct commands
node tools/license-generator-macos.js generate-keys
node tools/license-generator-macos.js create-license
node tools/license-generator-macos.js verify-license
```

### **License Generation Workflow**
1. **Generate Keys** (first time only): `node tools/license-generator-macos.js generate-keys`
2. **Create License**: `node tools/license-generator-macos.js create-license`
3. **Send to Customer**: License file saved in `tools/licenses/`

## 🔧 Development Builds

### **Development Mode**
```bash
# Start development server
npm run electron-dev

# Build and run in production mode
npm run electron-dev-prod
```

### **Quick Testing**
```bash
# Build and test locally
npm run build
npm run electron-prod
```

## 📋 Build Scripts Available

| Script | Description | Platform |
|--------|-------------|----------|
| `npm run pack:mac` | Standard macOS build | macOS |
| `npm run pack:mac:free` | Free macOS build (no signing) | macOS |
| `npm run pack:win` | Standard Windows build | Windows |
| `npm run pack:win:enhanced` | Enhanced Windows installer | Windows |
| `npm run pack:linux` | Linux build | Linux |
| `npm run pack:all` | Build all platforms | All |

## 🛠️ Custom Build Options

### **macOS Custom Build**
```bash
# Build with specific configuration
npm run build && electron-builder --mac --config.mac.hardenedRuntime=false
```

### **Windows Custom Build**
```bash
# Build with custom NSIS configuration
npm run build && electron-builder --win --config.nsis.include=build/installer.nsh
```

## 📁 Build Configuration Files

- `package.json` - Main build configuration
- `build/installer.nsh` - Windows installer customizations
- `build/entitlements.mac.plist` - macOS entitlements
- `build/license.txt` - License agreement
- `scripts/build-macos.sh` - macOS build script
- `scripts/build-macos-free.sh` - Free macOS build script
- `scripts/build-windows-enhanced.sh` - Enhanced Windows build script

## 🚀 Quick Start Guide

### **For macOS Distribution:**
1. Run `npm run pack:mac:free` (free version)
2. Distribute the DMG file
3. Include `MACOS_INSTALLATION_GUIDE.md` with instructions

### **For Windows Distribution:**
1. Run `npm run pack:win:enhanced` (recommended)
2. Distribute the EXE file
3. Include `WINDOWS_INSTALLATION_GUIDE.md` with instructions

### **For Both Platforms:**
1. Run `npm run pack:all`
2. Distribute both DMG and EXE files
3. Include both installation guides

## ⚠️ Important Notes

### **macOS:**
- Free builds require users to right-click "Open" the first time
- Professional builds require Apple Developer account ($99/year)
- Both versions work identically after installation

### **Windows:**
- Enhanced installer provides better user experience
- Standard installer is simpler but less professional
- Both include the same license system

### **License System:**
- Works identically on all platforms
- Hardware fingerprinting is platform-specific
- License files are cross-platform compatible

## 🎯 Recommended Build Strategy

1. **Development:** Use `npm run electron-dev`
2. **Testing:** Use `npm run pack:mac:free` and `npm run pack:win:enhanced`
3. **Distribution:** Use the enhanced builds for professional appearance
4. **Updates:** Rebuild and redistribute when needed

---

*For support with building or distribution, contact:*
- Phone: +232 74762243
- Email: ahmadbahofficial@gmail.com
