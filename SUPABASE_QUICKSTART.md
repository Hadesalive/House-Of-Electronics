# Supabase Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Click **"New Project"**
3. Enter project name, password, region
4. Wait 2 minutes for setup

### Step 2: Get Credentials
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (long JWT token)

### Step 3: Create Tables
1. Go to **SQL Editor** in Supabase
2. Copy the SQL from `SUPABASE_SETUP.md` (Step 3)
3. Click **Run**

### Step 4: Configure in App
1. Open your app
2. Go to **Sync Settings**
3. Enter:
   - **Cloud URL**: Your project URL
   - **API Key**: Your anon key
4. Click **"Test"** button
5. If successful, click **"Save"**
6. Toggle **"Enable Sync"** ON

### Step 5: Test Sync
1. Create a customer in your app
2. Click **"Sync Now"** or wait for auto-sync
3. Check Supabase **Table Editor** → `customers` table
4. You should see your customer! 🎉

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] Credentials copied (URL + API key)
- [ ] Tables created (10 tables)
- [ ] Connection test successful
- [ ] Sync enabled
- [ ] Test record synced

---

## 🔧 Troubleshooting

**"Connection failed"**
- Check URL includes `https://`
- Check API key is correct (anon/public key)
- Check internet connection

**"Table not found"**
- Run the SQL script to create tables
- Check table names match exactly

**"Sync not working"**
- Check sync is enabled
- Check sync status shows pending items
- Check browser console for errors

---

**That's it!** Your sync is now connected to Supabase. 🎉
