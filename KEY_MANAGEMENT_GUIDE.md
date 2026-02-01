# Key Management Guide

## 🔐 **Safe Key Management for License System**

This guide explains how to safely manage license keys without breaking existing licenses.

## ⚠️ **CRITICAL: Never Generate New Keys Without Planning**

### **What Happens When You Generate New Keys:**
1. **All existing licenses become invalid** ❌
2. **Customers can't use their software** ❌
3. **No way to recover without re-issuing all licenses** ❌

## 🛡️ **Safe Key Management Strategy**

### **1. Key Backup System**
```bash
# Always backup your keys before making changes
cp -r tools/.keys tools/.keys-backup-$(date +%Y%m%d)
```

### **2. Key Rotation Process**
Instead of generating new keys, use the **Key Manager** system:

#### **Step 1: Add New Key (Keep Old Keys)**
```bash
# Generate new key pair
node tools/license-generator.js generate-keys

# Rename the new key with date
mv tools/.keys/public.pem tools/.keys/public-$(date +%Y-%m-%d).pem
mv tools/.keys/private.pem tools/.keys/private-$(date +%Y-%m-%d).pem
```

#### **Step 2: Update Application**
The application will automatically:
- ✅ **Load all public keys** from the keys directory
- ✅ **Try all keys** when verifying licenses
- ✅ **Maintain backward compatibility** with old licenses

#### **Step 3: Gradual Migration**
1. **New licenses** use the new key pair
2. **Old licenses** continue to work with old keys
3. **No customer disruption**

## 🔧 **Key Manager Features**

### **Automatic Key Loading**
- Loads all public keys from `tools/.keys/`
- Supports multiple key formats
- Sorts keys by date (newest first)

### **Multi-Key Verification**
- Tries primary key first
- Falls back to all other keys
- Ensures maximum compatibility

### **Key Information**
```javascript
// Each key includes:
{
  id: "key-2025-01-01",
  date: "2025-01-01", 
  content: "-----BEGIN PUBLIC KEY-----...",
  path: "/path/to/key.pem"
}
```

## 📋 **Best Practices**

### **✅ DO:**
- **Backup keys** before any changes
- **Use date-stamped filenames** (e.g., `public-2025-01-01.pem`)
- **Test with old licenses** before deploying
- **Keep old keys** for backward compatibility

### **❌ DON'T:**
- **Overwrite existing keys** without backup
- **Delete old public keys** (customers need them)
- **Generate new keys** without planning
- **Deploy without testing** old license compatibility

## 🚨 **Emergency Recovery**

### **If You Accidentally Generated New Keys:**

#### **Option 1: Restore from Backup**
```bash
# Restore your backup
cp -r tools/.keys-backup-YYYYMMDD/* tools/.keys/
```

#### **Option 2: Re-issue All Licenses**
```bash
# Generate new licenses for all customers
# (This is the nuclear option - not recommended)
```

## 🔄 **Key Rotation Workflow**

### **1. Planning Phase**
- [ ] Identify why you need new keys
- [ ] Plan the migration timeline
- [ ] Backup existing keys
- [ ] Test the key manager system

### **2. Implementation Phase**
- [ ] Generate new key pair
- [ ] Rename with date stamp
- [ ] Update license generator to use new keys
- [ ] Test with both old and new licenses

### **3. Deployment Phase**
- [ ] Deploy updated application
- [ ] Verify old licenses still work
- [ ] Start issuing new licenses with new keys
- [ ] Monitor for any issues

### **4. Cleanup Phase (Optional)**
- [ ] After sufficient time, consider removing very old keys
- [ ] Archive old keys securely
- [ ] Update documentation

## 📁 **Key File Organization**

```
tools/.keys/
├── public-2024-01-01.pem      # Old key (keep for compatibility)
├── private-2024-01-01.pem    # Old private key (archive)
├── public-2025-01-01.pem     # New key (current)
├── private-2025-01-01.pem    # New private key (current)
└── public.pem                # Default key (if exists)
```

## 🧪 **Testing Your Setup**

### **Test Script**
```bash
# Test that old licenses still work
node tools/license-generator.js verify-license path/to/old-license.lic

# Test that new licenses work
node tools/license-generator.js verify-license path/to/new-license.lic
```

## 📞 **Customer Communication**

### **If You Must Re-issue Licenses:**
1. **Explain the situation** honestly
2. **Provide new license files** immediately
3. **Offer support** for the transition
4. **Consider compensation** for inconvenience

### **Template Communication:**
```
Subject: License Update Required

Dear Customer,

We've updated our license system for improved security. 
Your new license file is attached.

Please replace your old license file with this new one.
Your software will continue to work normally.

If you have any issues, please contact support.

Best regards,
[Your Company]
```

## 🎯 **Summary**

- **Never generate new keys** without a plan
- **Always backup** before changes
- **Use the Key Manager** for safe key rotation
- **Test thoroughly** before deploying
- **Keep old keys** for compatibility
- **Communicate clearly** with customers

This system ensures your license system is robust and customer-friendly! 🚀
