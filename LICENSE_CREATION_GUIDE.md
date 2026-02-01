# License Creation Guide

## 📝 **Creating Licenses for House of Electronics Sales Manager**

This guide shows how to create licenses for your customers using the existing key system.

## 🚀 **Quick Start**

### **1. Get Machine ID from Customer**
Ask your customer to run this command and send you the result:

```bash
# On customer's machine
node -e "const { getLicenseService } = require('./electron/services/license-service'); const service = getLicenseService(); service.generateHardwareFingerprint().then(fp => console.log(fp.hash)).catch(console.error);"
```

### **2. Create License**
Run the license generator with the customer's machine ID:

```bash
# Create a new license
node tools/license-generator.js create-license
```

**Follow the prompts:**
- Enter the **machine fingerprint** (64-character hash from step 1)
- Enter **customer name** (optional)
- Enter **customer email** (optional) 
- Enter **customer company** (optional)

### **3. Send License to Customer**
The license file will be created in `tools/licenses/` directory. Send this file to your customer.

## 📋 **Step-by-Step Example**

### **Customer Side:**
```bash
# Customer runs this to get their machine ID
node -e "const { getLicenseService } = require('./electron/services/license-service'); const service = getLicenseService(); service.generateHardwareFingerprint().then(fp => console.log(fp.hash)).catch(console.error);"

# Output: 38086be1440ff3ac289863d6e7bf3a38b321eee80e15ffb7fa71b9664846be85
```

### **Your Side:**
```bash
# You run this to create the license
node tools/license-generator.js create-license

# Follow prompts:
# Enter machine fingerprint (hash): 38086be1440ff3ac289863d6e7bf3a38b321eee80e15ffb7fa71b9664846be85
# Customer name: John Smith
# Customer email: john@company.com
# Customer company: Acme Corp

# License created: tools/licenses/license-AcmeCorp-2025-01-01T10-30-00-000Z.lic
```

## 📁 **License File Structure**

The generated license file contains:
```json
{
  "license": {
    "version": "1.0",
    "machineFingerprint": "38086be1440ff3ac289863d6e7bf3a38b321eee80e15ffb7fa71b9664846be85",
    "activatedAt": "2025-01-01T10:30:00.000Z",
    "customer": {
      "name": "John Smith",
      "email": "john@company.com",
      "company": "Acme Corp"
    },
    "product": {
      "name": "House of Electronics Sales Manager",
      "version": "1.0.0"
    },
    "expiresAt": null
  },
  "signature": "VR7ztrUoIy3qLQ1M8tdD9ztDBnfwubhLrCfzXQ8mgzNUewU6zJpmkEnTROm4n0FnICeVgk6uWiFQlErjp9zs8ZJcjJy4Xan/E1SC4TqwEdmwpzbdvjhXukvE/im75TSsIfzX0pa5QoclzltLJ2rYOB6KvxQtBrIgSPNUcd6rLboLbv4F2sONl3kpvOj6dVPc/0sK/Z0IZqZSNRd+HLc21VxTtC5RpFxI5tBTpD6euQZgtAYvh05yNvAzUOxg7Q6DlG5hixT9lXktf8V45DyJlzoKPXwtQCoRSm086VIslpjlUAaXEtsu1ADn6E4y4+3d8phqoGKeTHgXkz+KrqRanw=="
}
```

## 🔧 **Customer Installation**

### **Method 1: License File Import**
1. Customer receives the `.lic` file
2. Opens House of Electronics Sales Manager
3. Goes to **Settings > License**
4. Clicks **Import License**
5. Selects the `.lic` file
6. License is activated automatically

### **Method 2: Drag and Drop**
1. Customer drags the `.lic` file onto the application window
2. License is imported automatically

## ✅ **Verification**

### **Test License Creation:**
```bash
# Verify a license file works
node tools/license-generator.js verify-license
# Enter path to license file when prompted
```

### **Check License Details:**
The verification will show:
- ✅ **Signature: Valid**
- 👤 **Customer: John Smith**
- 🏢 **Company: Acme Corp**
- 📧 **Email: john@company.com**
- 🖥️ **Machine: 38086be1440ff3ac...**
- 📅 **Activated: 2025-01-01T10:30:00.000Z**
- ⏰ **Expires: Never (Perpetual)**

## 🎯 **Best Practices**

### **For You (License Creator):**
- ✅ **Keep private keys secure** (never share)
- ✅ **Backup keys safely** (encrypted storage)
- ✅ **Use descriptive filenames** for licenses
- ✅ **Keep license records** for customer support

### **For Customers:**
- ✅ **Keep license file safe** (backup recommended)
- ✅ **Don't share license files** (machine-locked)
- ✅ **Contact support** if license issues occur

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **"License has been tampered with"**
- License file was modified
- **Solution:** Send new license file

#### **"License is locked to different hardware"**
- Customer changed hardware significantly
- **Solution:** Generate new license with new machine ID

#### **"License has expired"**
- License has expiration date and expired
- **Solution:** Generate new license or extend existing one

### **Getting Help:**
- Check the **LICENSE_SYSTEM_README.md** for detailed technical information
- Review the **KEY_MANAGEMENT_GUIDE.md** for key rotation procedures

## 📞 **Support**

If you need help with license creation:
1. Check this guide first
2. Review the troubleshooting section
3. Contact technical support with specific error messages

---

**🎉 That's it! You're ready to create licenses for your customers!**
