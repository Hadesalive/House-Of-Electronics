# Build Instructions for Production

## Supabase Configuration for Packaged App

When building the Electron app for production, the Supabase credentials need to be included in the build. There are two methods:

### Method 1: Using config.json (Recommended)

1. **Create `config.json` in the project root** (copy from `config.json.example`):
   ```json
   {
     "SUPABASE_URL": "https://your-project.supabase.co",
     "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
   }
   ```

2. **Fill in your actual Supabase credentials** from your `.env` file or Supabase dashboard.

3. **Build the app** - the `config.json` file will be automatically included:
   ```bash
   npm run pack:win
   ```

The app will read from `config.json` in production builds.

### Method 2: Using Environment Variables During Build

You can also set environment variables during the build process:

**Windows (PowerShell):**
```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run pack:win
```

**Windows (CMD):**
```cmd
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npm run pack:win
```

**macOS/Linux:**
```bash
SUPABASE_URL="https://your-project.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" npm run pack:win
```

## Important Notes

- ⚠️ **Never commit `config.json`** - it's already in `.gitignore`
- ✅ The `config.json.example` file is safe to commit (it has placeholder values)
- 🔒 Keep your Supabase Service Role Key secure - it has full database access
- 📦 The `config.json` file will be included in the packaged app, so keep it secure

## Verifying the Build

After building, you can verify the configuration is included by:
1. Installing the built app
2. Running the app
3. Checking the console logs - you should see:
   - `✅ Loaded SUPABASE_URL from config.json`
   - `✅ Loaded SUPABASE_SERVICE_ROLE_KEY from config.json`

If you see warnings about Supabase not being configured, check that:
- `config.json` exists in the project root before building
- The values in `config.json` are correct
- The file was included in the build (check `release/win-unpacked/resources/app.asar` contents)
