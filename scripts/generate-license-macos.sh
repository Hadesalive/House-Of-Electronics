#!/bin/bash

# macOS License Generation Script
# This script helps generate licenses on macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍎 House Of Electronics Sales Manager - License Generator (macOS)${NC}"
echo "======================================================"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is designed for macOS${NC}"
    exit 1
fi

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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Check if node-rsa is installed
if ! npm list node-rsa &> /dev/null; then
    echo -e "${YELLOW}📦 Installing node-rsa...${NC}"
    npm install node-rsa
fi

echo -e "${BLUE}🔐 License Generator Commands:${NC}"
echo ""
echo "1. Generate RSA keys (first time only):"
echo "   node tools/license-generator-macos.js generate-keys"
echo ""
echo "2. Create a license for a customer:"
echo "   node tools/license-generator-macos.js create-license"
echo ""
echo "3. Verify a license file:"
echo "   node tools/license-generator-macos.js verify-license"
echo ""
echo "4. Show help:"
echo "   node tools/license-generator-macos.js help"
echo ""

# Ask what the user wants to do
echo -e "${YELLOW}What would you like to do?${NC}"
echo "1) Generate keys (first time setup)"
echo "2) Create a license"
echo "3) Verify a license"
echo "4) Show help"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}🔐 Generating RSA keys...${NC}"
        node tools/license-generator-macos.js generate-keys
        ;;
    2)
        echo -e "${YELLOW}📝 Creating license...${NC}"
        node tools/license-generator-macos.js create-license
        ;;
    3)
        echo -e "${YELLOW}🔍 Verifying license...${NC}"
        node tools/license-generator-macos.js verify-license
        ;;
    4)
        node tools/license-generator-macos.js help
        ;;
    5)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Operation completed!${NC}"
