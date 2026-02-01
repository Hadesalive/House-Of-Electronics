# Supabase Setup Guide

Complete guide to setting up Supabase for your House of Electronics sync engine.

## 📋 Prerequisites

1. A Supabase account (free tier works) - [Sign up here](https://supabase.com)
2. A Supabase project created
3. Your project URL and API key

---

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `house-of-electronics` (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

---

## 🔑 Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: This is your API key (starts with `eyJ...`)

⚠️ **Important**: Use the **anon/public** key, NOT the service_role key for security.

---

## 🗄️ Step 3: Create Database Tables

**⚠️ IMPORTANT**: Use the complete SQL file `SUPABASE_SCHEMA.sql` which includes ALL columns and matches your exact schema.

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**
3. Copy and paste the **ENTIRE contents** of `SUPABASE_SCHEMA.sql` file
4. Click **"Run"** (or press Ctrl+Enter)

**The SQL file includes:**
- ✅ All 10 syncable tables with complete column definitions
- ✅ All migration columns (user_id, taxes, items, etc.)
- ✅ Proper indexes for performance
- ✅ Triggers ONLY for tables with `updated_at` column
- ✅ RLS disabled for testing

**Key Notes:**
- `debts` and `debt_payments` tables do NOT have `updated_at` columns (matches your SQLite schema)
- `sales` table includes: `user_id`, `cashier_name`, `cashier_employee_id`
- `invoices` table includes: `user_id`, `sales_rep_name`, `sales_rep_id`, `taxes`
- `debts` table includes: `items` column

---

## 🔒 Step 4: Configure Row Level Security (RLS)

For production, enable RLS. For now, you can disable it for testing:

```sql
-- Disable RLS for all tables (testing only)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates DISABLE ROW LEVEL SECURITY;
```

**⚠️ For Production**: Set up proper RLS policies based on your security requirements.

---

## ⚙️ Step 5: Configure Sync in Your App

1. **Open your app**
2. **Go to Settings** → **Sync Settings** (or use the sync settings modal)
3. **Enter your credentials**:
   - **Cloud Provider**: `supabase`
   - **Cloud URL**: `https://xxxxx.supabase.co` (your project URL)
   - **API Key**: `eyJ...` (your anon/public key)
4. **Click "Save"**
5. **Toggle "Enable Sync"** to ON

---

## 🧪 Step 6: Test Connection

The sync service will automatically test the connection when you save. You can also test manually:

```typescript
// In your app, test connection
const { syncService } = useSync();
const result = await syncService.testConnection();
console.log(result);
```

---

## 📊 Step 7: Verify Tables in Supabase

1. Go to **Table Editor** in Supabase dashboard
2. You should see all 10 tables:
   - customers
   - products
   - sales
   - invoices
   - orders
   - returns
   - deals
   - debts
   - debt_payments
   - invoice_templates

---

## 🚀 Step 8: Start Syncing

1. **Create a test record** in your app (e.g., a customer)
2. **Wait for auto-sync** (default: 5 minutes) or **click "Sync Now"**
3. **Check Supabase** → Table Editor → customers table
4. **You should see your record!**

---

## 🔍 Troubleshooting

### Connection Failed
- ✅ Check your Project URL (must include `https://`)
- ✅ Check your API key (use anon/public key, not service_role)
- ✅ Check internet connection
- ✅ Check Supabase project is active

### Tables Not Found
- ✅ Run the SQL script above to create tables
- ✅ Check table names match exactly (case-sensitive)
- ✅ Verify tables exist in Supabase Table Editor

### Sync Not Working
- ✅ Check sync is enabled in settings
- ✅ Check sync status in UI (should show "Synced" or pending count)
- ✅ Check browser console for errors
- ✅ Check Supabase logs (Settings → Logs)

### Data Not Appearing
- ✅ Check RLS is disabled (for testing)
- ✅ Check table names match
- ✅ Check data format matches schema
- ✅ Check sync queue for errors

---

## 🔐 Security Best Practices

1. **Use anon/public key** (not service_role) in the app
2. **Enable RLS** in production with proper policies
3. **Use environment variables** for API keys (don't hardcode)
4. **Monitor Supabase logs** for suspicious activity
5. **Set up backup** in Supabase dashboard

---

## 📈 Monitoring

### View Sync Status
- Check sync status in your app UI
- View pending items count
- Check error messages

### View Supabase Data
- Go to **Table Editor** in Supabase
- Browse your synced data
- Use **SQL Editor** for queries

### View Sync Logs
- Check browser console for sync logs
- Check Supabase logs (Settings → Logs)

---

## 🎯 Next Steps

1. ✅ Tables created
2. ✅ Sync configured
3. ✅ Test sync working
4. ⏳ Set up RLS policies (production)
5. ⏳ Set up backups
6. ⏳ Monitor sync performance

---

## 💡 Tips

- **Start with one table** (e.g., customers) to test
- **Use Supabase dashboard** to verify data
- **Check sync queue** if items aren't syncing
- **Enable auto-sync** for hands-off operation
- **Monitor sync status** regularly

---

## 📞 Support

If you encounter issues:
1. Check this guide
2. Check `SYNC_ENGINE.md` for technical details
3. Check Supabase documentation
4. Review error messages in sync status

---

**You're all set!** 🎉 Your sync engine is now connected to Supabase.
