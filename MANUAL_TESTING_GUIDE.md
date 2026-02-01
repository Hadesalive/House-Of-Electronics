# Manual Testing Guide for Financial Calculation Fixes

## 🎯 **Testing Overview**

This guide helps you manually test all the financial calculation fixes we've implemented. Follow these steps to verify everything works correctly.

## 📋 **Pre-Test Setup**

1. **Start the application:**
   ```bash
   npm run electron-dev
   ```

2. **Clear existing data (optional):**
   - Delete `house-of-electronics-sales.db` to start fresh
   - Or keep existing data to test migrations

## 🧪 **Test Scenarios**

### **Test 1: Product Cost Validation**

**Goal:** Verify products require cost before creation

**Steps:**
1. Go to **Products** → **New Product**
2. Fill in:
   - Name: "Test Product"
   - Price: $20.00
   - **Leave Cost empty**
3. Click **Create Product**
4. **Expected Result:** Should show error "Product cost is required"
5. **Fix:** Add Cost: $10.00
6. **Expected Result:** Product should create successfully

**✅ Success Criteria:**
- Cannot create products without cost
- Error message is clear and helpful
- Products with cost create successfully

---

### **Test 2: Revenue Calculation Consistency**

**Goal:** Verify Dashboard and Sales pages show same revenue numbers

**Steps:**
1. Create some test data:
   - **Product A:** Cost $10, Price $20, Stock 5
   - **Product B:** Cost $15, Price $30, Stock 3
   - **Customer:** "Test Customer"

2. Create a **Sale:**
   - Customer: Test Customer
   - Items: 2x Product A, 1x Product B
   - Status: Completed
   - Total should be: $70 (2×$20 + 1×$30)

3. Create an **Independent Invoice:**
   - Amount: $50
   - Status: Paid
   - (No linked sale)

4. Create a **Return:**
   - Return 1x Product A
   - Refund Method: Cash
   - Amount: $20

5. **Check Revenue Consistency:**
   - Go to **Dashboard** → Note the revenue numbers
   - Go to **Sales** → Note the revenue numbers
   - **Expected:** Both should show same numbers

**✅ Success Criteria:**
- Dashboard and Sales show identical revenue
- Gross Revenue: $120 ($70 sale + $50 invoice)
- Net Revenue: $100 ($120 - $20 return)
- No double-counting of revenue

---

### **Test 3: Stock Management & Backorders**

**Goal:** Test stock updates and backorder warnings

**Steps:**
1. **Check Initial Stock:**
   - Product A: 5 units
   - Product B: 3 units

2. **Create Sale with Normal Stock:**
   - Items: 2x Product A, 1x Product B
   - **Expected:** Sale creates successfully
   - **Check Stock:** A=3, B=2

3. **Create Sale with Insufficient Stock:**
   - Items: 5x Product A (only 3 available)
   - **Expected:** Sale creates with backorder warning
   - **Check Stock:** A=-2 (negative allowed)
   - **Check Warning:** Should show backorder message

4. **Create Return:**
   - Return 1x Product A
   - **Expected:** Stock restored to -1
   - **Check:** Backorder details updated

**✅ Success Criteria:**
- Stock updates correctly with sales
- Backorder warnings appear for insufficient stock
- Negative stock is allowed (backorder support)
- Returns restore stock properly

---

### **Test 4: Transaction Safety**

**Goal:** Test that partial failures don't leave inconsistent data

**Steps:**
1. **Create a Sale with Invalid Data:**
   - Try to create sale with non-existent product
   - **Expected:** Sale should fail completely
   - **Check:** No stock changes, no sale record

2. **Test Stock Consistency:**
   - Create sale: 2x Product A
   - Check stock: Should be 3 (5-2)
   - Create return: 1x Product A  
   - Check stock: Should be 4 (3+1)
   - Create order: Add 5x Product A
   - Check stock: Should be 9 (4+5)

**✅ Success Criteria:**
- Failed operations don't change stock
- Successful operations update stock correctly
- Stock levels match transaction history

---

### **Test 5: Profit Margin Calculations**

**Goal:** Verify accurate profit calculations

**Steps:**
1. **Create Test Sales:**
   - Sale 1: 2x Product A (Cost $10, Price $20) = $40 revenue, $20 cost
   - Sale 2: 1x Product B (Cost $15, Price $30) = $30 revenue, $15 cost
   - Total: $70 revenue, $35 cost

2. **Check Profit Calculation:**
   - **Expected Profit:** $35 ($70 - $35)
   - **Expected Margin:** 50% ($35/$70)

3. **Verify on Dashboard:**
   - Check profit margin percentage
   - Check total revenue vs total cost

**✅ Success Criteria:**
- Profit calculations are accurate
- Cost data is properly included
- Margin percentages are correct

---

### **Test 6: Data Migration**

**Goal:** Test that existing data works with new schema

**Steps:**
1. **If you have existing data:**
   - Check that products without cost get default cost = 0
   - Check that sales without backorder flag work
   - Check that revenue calculations still work

2. **Test New Features:**
   - Create product with cost
   - Create sale with backorder
   - Check that new columns are populated

**✅ Success Criteria:**
- Existing data still works
- New features function correctly
- No data loss during migration

---

## 🔍 **Advanced Testing**

### **Test 7: Edge Cases**

**Goal:** Test unusual scenarios

**Steps:**
1. **Empty Data:**
   - Create sale with no items
   - **Expected:** Should fail with clear error

2. **Zero Values:**
   - Create product with $0 cost
   - Create sale with $0 total
   - **Expected:** Should work but show warnings

3. **Large Numbers:**
   - Create sale with 1000x Product A
   - **Expected:** Should create backorder
   - **Check:** Stock goes to -995

### **Test 8: Performance Testing**

**Goal:** Test with larger datasets

**Steps:**
1. Create 100+ products
2. Create 50+ sales
3. Check that calculations are still fast
4. Check that UI remains responsive

---

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **"Product cost is required" error:**
   - **Cause:** Trying to create product without cost
   - **Fix:** Add cost value before creating

2. **Revenue numbers don't match:**
   - **Cause:** Different calculation logic
   - **Fix:** Check that both pages use RevenueCalculator service

3. **Stock inconsistencies:**
   - **Cause:** Transaction failures
   - **Fix:** Check transaction logs, restart app

4. **Backorder warnings not showing:**
   - **Cause:** UI not updated
   - **Fix:** Check SaleNewPage for warning display

### **Debug Information:**

1. **Check Console Logs:**
   - Open DevTools (F12)
   - Look for transaction logs
   - Check for error messages

2. **Check Database:**
   - Look at `house-of-electronics-sales.db`
   - Verify stock levels
   - Check for new columns

3. **Check Network Tab:**
   - Look for failed IPC calls
   - Check response data

---

## ✅ **Success Checklist**

- [ ] Products require cost before creation
- [ ] Dashboard and Sales show same revenue
- [ ] Stock updates correctly with sales/returns/orders
- [ ] Backorder warnings appear for low stock
- [ ] Negative stock is allowed (backorder support)
- [ ] Failed operations don't change data
- [ ] Profit calculations are accurate
- [ ] Existing data still works
- [ ] New features function correctly
- [ ] No data loss during migration

---

## 📊 **Expected Results**

After completing all tests, you should see:

1. **Consistent Revenue:** Dashboard and Sales show identical numbers
2. **Accurate Stock:** Stock levels match transaction history
3. **Proper Warnings:** Backorder alerts for insufficient stock
4. **Transaction Safety:** Failed operations don't corrupt data
5. **Cost Validation:** All products have cost data
6. **Profit Accuracy:** Margins calculated correctly

---

## 🚨 **If Tests Fail**

1. **Check the console** for error messages
2. **Verify database** has correct schema
3. **Restart the application** to reload changes
4. **Check that all files** were updated correctly
5. **Run the audit script** to check data consistency

---

## 📝 **Test Report Template**

```
Date: ___________
Tester: ___________

Test Results:
□ Product Cost Validation: PASS/FAIL
□ Revenue Consistency: PASS/FAIL  
□ Stock Management: PASS/FAIL
□ Transaction Safety: PASS/FAIL
□ Profit Calculations: PASS/FAIL
□ Data Migration: PASS/FAIL

Issues Found:
- Issue 1: Description
- Issue 2: Description

Overall Status: PASS/FAIL
```

This comprehensive testing guide will help you verify that all the financial calculation fixes are working correctly!
