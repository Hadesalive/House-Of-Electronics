#!/bin/bash

# macOS Build and Distribution Script
# This script handles code signing, notarization, and distribution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍎 House Of Electronics Sales Manager - macOS Build Script${NC}"
echo "=================================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

# Check for required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check for Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    echo -e "${RED}❌ Xcode Command Line Tools not found${NC}"
    echo "Install with: xcode-select --install"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Environment variables (you'll need to set these)
TEAM_ID=${TEAM_ID:-"YOUR_TEAM_ID"}
APPLE_ID=${APPLE_ID:-"your-email@example.com"}
APPLE_PASSWORD=${APPLE_PASSWORD:-"your-app-specific-password"}

if [ "$TEAM_ID" = "YOUR_TEAM_ID" ]; then
    echo -e "${RED}❌ Please set your TEAM_ID environment variable${NC}"
    echo "export TEAM_ID=\"YOUR_ACTUAL_TEAM_ID\""
    exit 1
fi

if [ "$APPLE_ID" = "your-email@example.com" ]; then
    echo -e "${RED}❌ Please set your APPLE_ID environment variable${NC}"
    echo "export APPLE_ID=\"your-apple-id@example.com\""
    exit 1
fi

# Update package.json with your actual team ID
echo -e "${YELLOW}🔧 Updating package.json with your Team ID...${NC}"
sed -i '' "s/YOUR_TEAM_ID/$TEAM_ID/g" package.json

# Build the application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# Build for macOS
echo -e "${YELLOW}📦 Building macOS package...${NC}"
npm run pack:mac

# Get the built app path
APP_PATH="release/House Of Electronics-1.0.0.app"
DMG_PATH="release/House Of Electronics-1.0.0.dmg"

if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ App not found at $APP_PATH${NC}"
    exit 1
fi

# Code signing
echo -e "${YELLOW}🔐 Code signing application...${NC}"

# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name ($TEAM_ID)" "$APP_PATH"

# Verify the signature
echo -e "${YELLOW}🔍 Verifying code signature...${NC}"
codesign --verify --verbose "$APP_PATH"
spctl --assess --verbose "$APP_PATH"

# Notarization
echo -e "${YELLOW}📋 Notarizing application...${NC}"

# Create zip for notarization
ZIP_PATH="release/House Of Electronics-1.0.0.zip"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

# Submit for notarization
echo "Submitting to Apple for notarization..."
xcrun notarytool submit "$ZIP_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$TEAM_ID" \
    --wait

# Staple the notarization
echo -e "${YELLOW}📌 Stapling notarization...${NC}"
xcrun stapler staple "$APP_PATH"

# Create final DMG
echo -e "${YELLOW}💿 Creating final DMG...${NC}"
npm run pack:mac

# Sign the DMG
codesign --force --sign "Developer ID Application: Your Name ($TEAM_ID)" "$DMG_PATH"

# Verify final package
echo -e "${YELLOW}🔍 Final verification...${NC}"
codesign --verify --verbose "$DMG_PATH"
spctl --assess --verbose "$DMG_PATH"

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${BLUE}📁 Output files:${NC}"
echo "  - App: $APP_PATH"
echo "  - DMG: $DMG_PATH"
echo "  - ZIP: $ZIP_PATH"

echo -e "${GREEN}🎉 Your macOS app is ready for distribution!${NC}"
