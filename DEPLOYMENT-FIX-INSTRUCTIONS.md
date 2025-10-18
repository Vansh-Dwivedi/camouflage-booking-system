# Linux Deployment - SQLite3 ELF Header Error - COMPLETE FIX

## Current Problem
```
Error: /root/camouflage-booking-system/node_modules/sqlite3/build/Release/node_sqlite3.node: invalid ELF header
code: 'ERR_DLOPEN_FAILED'
```

**Why?** Windows-compiled `node_modules` was pushed to GitHub and deployed on Linux server.

## ROOT CAUSE
Git history still contains old commits with `node_modules` included. Even though we removed it from current commit, GitHub still has the large binary files in history.

## SOLUTION: Force Fresh Deployment

### Step 1: Force Push to GitHub
```bash
git push origin main --force
```

This tells GitHub: "Replace everything with what I have locally right now"

### Step 2: On Linux Server (Vercel/Railway/PM2)

**Delete the cached node_modules:**
```bash
cd /root/camouflage-booking-system
rm -rf node_modules
rm -rf package-lock.json
```

**Trigger fresh deployment:**
```bash
npm install
npm start
```

Or if using PM2:
```bash
pm2 stop server
rm -rf node_modules
npm install
pm2 start server
```

### Step 3: Verify
```bash
pm2 logs server
# Should show: ✅ SQLite database connection established successfully
```

## What Happens During `npm install` on Linux

1. ✅ Detects your OS is Linux
2. ✅ Downloads sqlite3 source code
3. ✅ Compiles for Linux using `node-gyp`
4. ✅ Creates `.node` binary files for Linux
5. ✅ Server starts successfully

## Files to Push

```bash
git push origin main --force
```

This will push:
- ✅ Updated .gitignore
- ✅ package.json
- ✅ package-lock.json
- ✅ All source code
- ❌ NOT node_modules (ignored now)

## Complete Deployment Command Sequence

### LOCAL (Your Windows Machine)
```bash
git push origin main --force
```

### LINUX SERVER
```bash
cd /root/camouflage-booking-system

# Remove old Windows node_modules
rm -rf node_modules
rm -rf package-lock.json

# Fresh install for Linux
npm install

# Restart with PM2
pm2 restart server
# OR
pm2 start server

# Check logs
pm2 logs server
```

## Prevention for Future

Always remember:
- ✅ Commit: `package.json` + `package-lock.json`
- ✅ Ignore: `node_modules/`
- ✅ Let deployment server build: `npm install` during CI/CD

## If Using Vercel/Railway

These platforms automatically:
1. ✅ Detect Node.js project
2. ✅ Run `npm install`
3. ✅ Compile for their Linux environment
4. ✅ Deploy

**Just push and wait 2-3 minutes!**

## Verify Your Current Setup

```bash
# Check what's in your repo
git ls-files | grep node_modules | wc -l
# Should show: 0

# Check .gitignore
git check-ignore -v node_modules
# Should show: node_modules/  -> from .gitignore
```

## Summary

| Step | Command | Location |
|------|---------|----------|
| 1 | `git push origin main --force` | Windows |
| 2 | `rm -rf node_modules` | Linux |
| 3 | `npm install` | Linux |
| 4 | `pm2 restart server` | Linux |
| 5 | `pm2 logs server` | Linux |

✅ Done! Server should be running now.
