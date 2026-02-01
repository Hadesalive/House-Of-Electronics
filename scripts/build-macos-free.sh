#!/bin/bash

# Free macOS Build Script (No Apple Developer Account Required)
# This creates a distributable app without code signing/notarization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍎 House Of Electronics Sales Manager - Free macOS Build${NC}"
echo "=============================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

# Check for required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

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

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${BLUE}📁 Output files:${NC}"
echo "  - App: $APP_PATH"
echo "  - DMG: $DMG_PATH"

echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "1. Users will need to right-click and 'Open' the app the first time"
echo "2. They may need to go to System Preferences > Security & Privacy"
echo "3. Click 'Open Anyway' if macOS blocks the app"
echo "4. This is normal for unsigned apps"

echo -e "${GREEN}🎉 Your macOS app is ready for distribution!${NC}"
echo -e "${BLUE}💡 Distribution options:${NC}"
echo "  - Direct download from your website"
echo "  - Email the DMG file"
echo "  - USB drive distribution"
echo "  - Cloud storage (Google Drive, Dropbox, etc.)"
