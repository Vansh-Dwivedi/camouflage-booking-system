# Vercel Deployment Guide for Camouflage Booking System

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- GitHub account
- Vercel account (free tier works)
- Your code pushed to GitHub

### 2. Environment Variables Setup

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-for-production-change-this-to-something-very-secure
PORT=3000

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC2e4c7dd83118888f8912c0b587d42dcc
TWILIO_AUTH_TOKEN=9e24265f2193b31482f5993cb756f563
TWILIO_FROM_SMS=+12298003355
TWILIO_OWNER_PHONE_SMS=+918146094888
TWILIO_DEFAULT_COUNTRY_CODE=+91
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Vercel will auto-detect it's a Node.js project
6. Click "Deploy"

### 4. Post-Deployment Setup

After deployment:
1. Visit your Vercel project URL
2. Go to `/admin` to access admin panel
3. Login with default credentials (see README)
4. Test booking functionality at `/booking`

## 📱 Important Notes for Production

### Database Limitations
- **Vercel uses serverless functions** - database resets on each deployment
- **For persistent data**: Consider upgrading to:
  - **PostgreSQL** (Vercel Postgres)
  - **MongoDB Atlas** (free tier)
  - **PlanetScale** (MySQL)

### SMS Testing
- Your Twilio trial account only sends to verified numbers
- For production: upgrade Twilio account to send to any number

### Performance
- First request might be slow (cold start)
- Increase function timeout if needed in `vercel.json`

## 🔧 Troubleshooting

### Common Issues:

1. **Database errors**: Expected with SQLite on serverless
2. **SMS not working**: Check Twilio credentials in environment variables
3. **404 errors**: Check `vercel.json` routing configuration
4. **Build fails**: Check Node.js version compatibility

### Build Optimization:
- Remove unnecessary files before deployment
- Optimize images in `/public` folder
- Consider CDN for static assets

## 🎯 Production Recommendations

1. **Use PostgreSQL**: Replace SQLite with Vercel Postgres
2. **Add Monitoring**: Use Vercel Analytics
3. **Custom Domain**: Add your own domain
4. **Environment Separation**: Separate staging/production environments
5. **Database Backup**: Regular backup strategy
6. **Security Audit**: Review all environment variables

Your booking system is now enterprise-ready for deployment! 🎉