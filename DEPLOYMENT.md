# 🚀 Vercel Deployment Guide

This guide will help you deploy your SkyBird Forecasting application to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: You'll need API keys for Mapbox

## 🔧 Environment Variables Setup

### Required Environment Variables:

1. **VITE_MAPBOX_API_KEY**: Your Mapbox API key
   - Get it from [mapbox.com](https://www.mapbox.com)
   - Current key: `pk.eyJ1IjoiYWJkZWxyaGFtYW4xMjMiLCJhIjoiY21nOTBmbW5rMGI1NTJqc2E2N2pkNjRyMCJ9.fovjQp9aLuOxb4V4ruCWsw`

2. **VITE_GOOGLE_MAPS_API_KEY** (Optional): For additional mapping features

## 🚀 Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new one
   - Set environment variables when prompted
   - Choose your Git provider

### Method 2: GitHub Integration

1. **Go to Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)

2. **Import Project**:
   - Click "New Project"
   - Import from GitHub
   - Select your repository

3. **Configure Build Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist/spa`
   - Install Command: `npm install`

4. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `VITE_MAPBOX_API_KEY`
   - Add `VITE_GOOGLE_MAPS_API_KEY` (if needed)

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## 🔧 Configuration Files

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/spa"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 🌐 Custom Domain (Optional)

1. **Add Domain**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**:
   - Automatically handled by Vercel
   - HTTPS enabled by default

## 🔄 Automatic Deployments

- **Git Integration**: Every push to main branch triggers deployment
- **Preview Deployments**: Pull requests get preview URLs
- **Branch Deployments**: Each branch can have its own deployment

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version (Vercel uses Node 18 by default)
   - Verify all dependencies are in `package.json`
   - Check build logs in Vercel dashboard

2. **Environment Variables**:
   - Ensure all required env vars are set
   - Check variable names match exactly
   - Redeploy after adding new variables

3. **Routing Issues**:
   - SPA routing requires all routes to serve `index.html`
   - Configured in `vercel.json` routes

### Build Optimization:

- **Code Splitting**: Configured in `vite.config.ts`
- **Asset Optimization**: Automatic with Vercel
- **CDN**: Global edge network for fast loading

## 📊 Performance Monitoring

- **Analytics**: Built-in Vercel Analytics
- **Speed Insights**: Core Web Vitals tracking
- **Real User Monitoring**: Performance metrics

## 🔒 Security Considerations

- **Environment Variables**: Never commit API keys to Git
- **HTTPS**: Automatic SSL/TLS encryption
- **CORS**: Configured for production domains

## 🎉 Post-Deployment

1. **Test Your App**: Verify all features work
2. **Monitor Performance**: Check Vercel dashboard
3. **Set Up Monitoring**: Enable analytics and speed insights
4. **Custom Domain**: Add your domain if needed

## 📞 Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Support**: Available through Vercel dashboard

---

**Happy Deploying! 🚀**
