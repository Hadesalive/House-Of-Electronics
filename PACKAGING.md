# Packaging Guide - House of Electronics Sales Manager

## 🚀 Quick Build Commands

### Build for Your Current Platform (macOS):
```bash
npm run pack:mac
```

### Build for Other Platforms:
```bash
npm run pack:win    # Windows
npm run pack:linux  # Linux
npm run pack:all    # All platforms
```

---

## 📋 Before You Build

### 1. Test Everything
```bash
npm run electron-prod
```
Verify all features work:
- ✅ CRUD operations
- ✅ Invoice generation
- ✅ PDF export
- ✅ Database persistence
- ✅ Theme switching
- ✅ Navigation

### 2. Clean Previous Builds
```bash
rm -rf dist/ release/
```

### 3. Build Frontend
```bash
npm run build
```

---

## 📦 Build Outputs

### macOS:
```
release/
├── House of Electronics Sales Manager-1.0.0.dmg     (Installer)
└── House of Electronics Sales Manager-1.0.0-mac.zip (Portable)
```

### Windows:
```
release/
├── House of Electronics Sales Manager-1.0.0-Setup.exe  (Installer)
└── House of Electronics Sales Manager-1.0.0.exe        (Portable)
```

### Linux:
```
release/
├── House of Electronics Sales Manager-1.0.0.AppImage  (Portable)
└── House of Electronics Sales Manager-1.0.0.deb       (Debian)
```

---

## 🔄 Safe Updates for Users

### When You Add New Features:

#### 1. Add Database Migration (if needed)
```javascript
// electron/schema/sqlite-schema.js
function migrateDatabase(db) {
  // Add new column
  try {
    db.exec(`ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0`);
    console.log('✅ Added loyalty_points column');
  } catch (error) {
    // Column already exists, ignore
  }
}
```

#### 2. Update Version
```json
// package.json
"version": "1.1.0"  // Increment
```

#### 3. Build & Distribute
```bash
npm run pack:mac
```

#### 4. Users Install
- Their database is preserved
- Migration runs automatically
- New features work immediately
- No data loss!

---

## 🛠️ Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
npx electron-rebuild
npm run pack:mac
```

### Build Hangs or Fails
```bash
# Clear everything
rm -rf dist/ release/ node_modules/
npm install
npm run build
npm run pack:mac
```

### App Won't Start After Packaging
- Check that `dist/` folder exists and has content
- Verify all assets are included
- Check electron logs in Console.app (macOS)

---

## 📊 What's Included in Build

✅ **Included:**
- Frontend build (dist/)
- Electron main process
- Database schema & migrations
- All IPC handlers
- SQLite native module
- Assets (logos, images)
- Required dependencies

❌ **Excluded:**
- Source code (src/)
- Development tools
- Source maps
- Node modules cache
- Git files

---

## 🎯 Distribution

### For Team/Clients:
1. Build the app: `npm run pack:mac`
2. Find installer in `release/` folder
3. Upload to shared drive or send directly
4. Users double-click to install

### For Updates:
1. Users download new version
2. Install over old version
3. Data is preserved automatically
4. Migrations run on first launch

---

## ✅ Ready to Ship!

Your configuration is complete. To build:

```bash
npm run pack:mac
```

The installer will be ready in 2-5 minutes! 🎉


