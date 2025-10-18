# URGENT: Linux Server Deployment Instructions

## What to Do NOW on Your Linux Server

### SSH into your server and run:

```bash
# 1. Navigate to project
cd /root/camouflage-booking-system

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Remove old Windows-compiled node_modules
rm -rf node_modules
rm -f package-lock.json

# 4. Install fresh packages for Linux
npm install

# 5. Restart PM2
pm2 stop server
pm2 start server

# 6. Check if it's working
pm2 logs server
```

## Expected Output After Fix

You should see:
```
🔄 Initializing database...
✅ SQLite database connection established successfully.
✅ Database synchronized successfully
🔄 Starting server...
🚀 Camouflage Booking System running on port 3000
```

**NOT:**
```
Error: invalid ELF header
code: 'ERR_DLOPEN_FAILED'
```

## If You Don't Have SSH Access

Contact your hosting provider and:
1. Ask them to delete `/root/camouflage-booking-system/node_modules`
2. Ask them to run `npm install` in that directory
3. Restart the application

## What Changed in GitHub

✅ **Pushed:** Fresh .gitignore + source code only (5.86 KB)
❌ **Removed:** All old node_modules files from history
✅ **Result:** Linux server gets clean, small repository

## Timeline

| Time | Action |
|------|--------|
| Now | Force push to GitHub ✅ DONE |
| Now | You run commands on Linux server ← DO THIS |
| 1 min | npm install (compiles for Linux) |
| 2 min | Server starts |
| 3 min | Working! ✅ |

## Troubleshooting

**If still getting ELF header error:**
```bash
# Make sure you're really deleting it
ls -la node_modules  # Should not exist

# Check it's actually deleted
find /root/camouflage-booking-system -name "*.node" -type f
# Should return nothing

# Force remove if needed
rm -rf /root/camouflage-booking-system/node_modules

# Then try again
npm install
```

**If npm install fails:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

**If still not working:**
- Check Node.js version: `node --version` (should be v18+)
- Check npm version: `npm --version` (should be v9+)
- Try: `npm install --verbose` to see what's happening

## Success Verification

Run this on Linux server:
```bash
# This should work without errors
node -e "require('sqlite3')"

# Should start without "invalid ELF header"
npm start
```

✅ All done! Your app is now ready for Linux!
