# 🍎 macOS License Generation Guide

This guide shows you how to generate license keys on macOS for House of Electronics Sales Manager.

## 🚀 Quick Start

### **Option 1: Interactive Script (Recommended)**

```bash
# Make the script executable
chmod +x scripts/generate-license-macos.sh

# Run the interactive script
./scripts/generate-license-macos.sh
```

### **Option 2: Direct Commands**

```bash
# Generate RSA keys (first time only)
node tools/license-generator-macos.js generate-keys

# Create a license for a customer
node tools/license-generator-macos.js create-license

# Verify a license file
node tools/license-generator-macos.js verify-license
```

## 📋 Step-by-Step Process

### **Step 1: First-Time Setup**

```bash
# Generate your RSA key pair (do this once)
node tools/license-generator-macos.js generate-keys
```

This creates:

- `tools/.keys/private.pem` - Your private key (KEEP SECURE!)
- `tools/.keys/public.pem` - Public key (embedded in your app)

### **Step 2: Create License for Customer**

```bash
`# Create a license
node tools/license-generator-macos.js create-license
```

You'll be prompted for:

- Customer name
- Customer email
- Customer company
- Machine ID (64-character hash from customer)

### **Step 3: Send License to Customer**

The license file will be saved in `tools/licenses/` with a timestamp.

## 🔐 Security Notes

### **Private Key Security:**

- **NEVER** share your private key
- **NEVER** commit it to version control
- **BACKUP** your private key securely
- **ONLY** the public key goes in your app

### **License Files:**

- Each license is unique to one machine
- Licenses cannot be transferred between machines
- License files contain customer information

## 📁 File Structure

```
tools/
├── .keys/
│   ├── private.pem    # Your private key (SECURE!)
│   └── public.pem     # Public key (goes in app)
├── licenses/
│   ├── license-CompanyName-2025-01-15T10-30-00-000Z.lic
│   └── license-AnotherCompany-2025-01-15T11-45-00-000Z.lic
└── license-generator-macos.js
```

## 🎯 Typical Workflow

### **1. Customer Requests License:**

- Customer installs your app
- App shows Machine ID (64-character hash)
- Customer sends you the Machine ID

### **2. You Generate License:**

```bash
# Run the license generator
node tools/license-generator-macos.js create-license

# Enter customer details:
# Customer name: John Smith
# Customer email: john@company.com
# Customer company: ABC Electronics
# Machine ID: a1b2c3d4e5f6... (64 characters)
```

### **3. Send License to Customer:**

- License file is created in `tools/licenses/`
- Send the `.lic` file to customer
- Customer imports it into the app

## 🔧 Troubleshooting

### **"node-rsa not found"**

```bash
npm install node-rsa
```

### **"Permission denied"**

```bash
chmod +x scripts/generate-license-macos.sh
```

### **"Invalid machine ID"**

- Machine ID must be exactly 64 characters
- Should be a SHA-256 hash
- Get it from the customer's activation page

### **"Private key not found"**

```bash
# Generate keys first
node tools/license-generator-macos.js generate-keys
```

## 📊 License Information

### **What's in a License:**

- Machine fingerprint (64-character hash)
- Customer information (name, email, company)
- Product information (name, version)
- Issue date and expiration
- Digital signature (prevents tampering)

### **License Validation:**

- App verifies signature using embedded public key
- Machine fingerprint must match current hardware
- License cannot be transferred to different machine

## 🚀 Advanced Usage

### **Batch License Generation:**

```bash
# Create multiple licenses
for i in {1..5}; do
    node tools/license-generator-macos.js create-license
done
```

### **License Verification:**

```bash
# Verify a license file
node tools/license-generator-macos.js verify-license
# Enter path: tools/licenses/license-Company-2025-01-15T10-30-00-000Z.lic
```

### **Key Management:**

```bash
# Backup your keys
cp tools/.keys/private.pem ~/backup-private-key.pem
cp tools/.keys/public.pem ~/backup-public-key.pem
```

## 📞 Support

If you encounter issues:

- Phone: +232 74762243
- Email: ahmadbahofficial@gmail.com

---

*This license generator is specifically designed for macOS and includes all necessary dependencies inline.*
