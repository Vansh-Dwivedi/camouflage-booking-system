# Linux Deployment Fix - SQLite3 Native Module Error

## The Problem

When deploying to Linux servers (Vercel, Railway, Render, AWS, etc.), you encounter:

```
Error: /root/camouflage-booking-system/node_modules/sqlite3/build/Release/node_sqlite3.node: invalid ELF header
code: 'ERR_DLOPEN_FAILED'
```

**Why?** The `sqlite3` npm package includes pre-built Windows binaries. On Linux, it needs to compile the native module for that specific OS, but:
- Your Windows machine can't compile for Linux
- The Linux server tries to use Windows binaries → crashes

## Solutions (Ranked by Preference)

### ✅ Solution 1: Deploy to Vercel (Easiest - Recommended)

Vercel handles Node.js deployment perfectly and compiles native modules correctly:

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Deploy with one click
4. Vercel automatically builds `sqlite3` for Linux

**Setup Instructions:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel
```

**Create `vercel.json`:**
```json
{
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### ✅ Solution 2: Use Docker

Docker ensures Windows binaries don't get deployed:

**Create `Dockerfile`:**
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies (this builds sqlite3 for Linux)
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . .

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

**Deploy with Docker:**
```bash
docker build -t camouflage-booking .
docker run -p 3000:3000 camouflage-booking
```

### ✅ Solution 3: Switch to PostgreSQL (Best for Production)

Use PostgreSQL instead of SQLite - No compilation needed:

**Install PostgreSQL adapter:**
```bash
npm install pg pg-hstore
```

**Update `config/database.js`:**
```javascript
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/camouflage',
  {
    logging: false,
    define: { timestamps: true }
  }
);
```

**Deployment platforms with free PostgreSQL:**
- Railway (with free tier)
- Render (with free tier)
- Heroku (legacy, may require payment)

### ✅ Solution 4: Use .gitignore for node_modules

Ensure node_modules isn't committed, let the server build it:

**Update `.gitignore`:**
```
node_modules/
*.sqlite
*.sqlite3
.env
.env.local
```

**Why?** The Linux server will run `npm install` during deployment, building sqlite3 correctly for its environment.

### ⚠️ Solution 5: Copy only source, not node_modules

When deploying, ignore `node_modules`:

**In your deployment script:**
```bash
# Don't include node_modules in deployment
git rm --cached -r node_modules
echo "node_modules" >> .gitignore
git commit -m "Remove node_modules from tracking"

# Linux server runs: npm install (builds for Linux)
```

## Recommended Approach for Your Setup

### For Development (Windows)
```bash
npm install  # Works fine on Windows
npm start    # Runs locally
```

### For Production (Linux)

**Option A: Vercel (Simplest)**
```bash
# Just push to GitHub
git push origin main
# Vercel auto-deploys and builds sqlite3 for Linux
```

**Option B: Docker (Most Control)**
```bash
docker build -t camouflage .
docker push your-registry/camouflage
# Deploy to any container platform
```

**Option C: Railway/Render (Easy + Free)**
```bash
# Connect GitHub repo
# Platform auto-builds for Linux
# Ready in minutes
```

## Why the Error Occurs

```
Local (Windows)
├── npm install
├── Finds prebuilt Windows binaries ✓
├── Compiles for Windows ✓
└── Works locally ✓

Linux Server (AWS/Vercel/Railway)
├── Gets Windows node_modules ✗
├── Tries to use Windows .node files ✗
├── Invalid ELF header ✗
└── CRASH ✗
```

## Prevention Checklist

✅ **Do:**
- Let deployment server run `npm install`
- Use `.gitignore` to exclude `node_modules`
- Commit `package.json` and `package-lock.json`
- Test with Docker locally before deploying

❌ **Don't:**
- Commit `node_modules` folder to Git
- Use prebuilt binaries across platforms
- Assume Windows build works on Linux

## Deployment Platforms Tested ✅

| Platform | Native Build | Support | Free Tier |
|----------|-------------|---------|-----------|
| **Vercel** | ✅ Yes | ✅ Great | ✅ Yes |
| **Railway** | ✅ Yes | ✅ Great | ✅ Yes |
| **Render** | ✅ Yes | ✅ Great | ✅ Yes |
| **Docker** | ✅ Yes | ✅ Any | ✅ Yes |
| **AWS EC2** | ⚠️ Manual | ⚠️ Complex | ❌ Paid |

## Quick Start - Vercel Deployment

1. **Ensure `.gitignore` has:**
```
node_modules/
.env
*.sqlite
```

2. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

3. **Deploy on Vercel:**
- Go to vercel.com
- Click "New Project"
- Select your GitHub repo
- Click "Deploy"
- Done! ✅

## Troubleshooting

### Still getting ELF header error?
```bash
# 1. Check .gitignore
cat .gitignore  # Should include node_modules

# 2. Remove node_modules from Git
git rm -r --cached node_modules
echo "node_modules" >> .gitignore

# 3. Commit and redeploy
git commit -m "Remove node_modules"
git push origin main
```

### Server not rebuilding SQLite3?
```bash
# Force rebuild on deployment
# Add to package.json:
"scripts": {
  "postinstall": "npm rebuild sqlite3"
}
```

### Using older Node version?
```bash
# Check package.json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

## Files to Commit to Git

```
✅ package.json         (dependencies listed)
✅ package-lock.json    (exact versions)
✅ .gitignore          (excludes node_modules)
✅ src/                (all source code)
✅ public/             (frontend files)
✅ views/              (HTML templates)
❌ node_modules/       (excluded)
❌ *.sqlite            (excluded)
❌ .env                (excluded)
```

## Environment Variables

Set these on your deployment platform:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./database.sqlite  # Vercel uses ephemeral storage
```

⚠️ **Note:** SQLite stores data locally. On Vercel/Render, data resets on redeploy. Use PostgreSQL for persistent data.

## Summary

| Situation | Solution |
|-----------|----------|
| Local dev on Windows | ✅ Works as-is |
| Deploy to Vercel | ✅ Works automatically |
| Deploy to Railway | ✅ Works automatically |
| Deploy to Docker | ✅ Works with Dockerfile |
| Deploy to AWS EC2 | ⚠️ Needs setup |
| Persistent data needed | ✅ Use PostgreSQL |

**TLDR:** Just push to GitHub, deploy to Vercel, enjoy! 🚀

