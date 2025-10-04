#!/bin/bash

# SkyBird Forecasting - Vercel Deployment Script
# This script helps deploy the application to Vercel

echo "🚀 SkyBird Forecasting - Vercel Deployment"
echo "=========================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

echo "📋 Current deployment configuration:"
echo "- Build Command: pnpm build"
echo "- Output Directory: dist/spa"
echo "- Framework: Vite (React SPA)"

echo ""
echo "🔧 Environment Variables Required:"
echo "- VITE_MAPBOX_API_KEY: pk.eyJ1IjoiYWJkZWxyaGFtYW4xMjMiLCJhIjoiY21nOTBmbW5rMGI1NTJqc2E2N2pkNjRyMCJ9.fovjQp9aLuOxb4V4ruCWsw"
echo "- VITE_GOOGLE_MAPS_API_KEY: (optional)"

echo ""
read -p "🤔 Do you want to deploy now? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting deployment..."
    vercel --prod
    
    echo ""
    echo "✅ Deployment complete!"
    echo "🌐 Your app should now be live on Vercel"
    echo "📊 Check the Vercel dashboard for deployment details"
else
    echo "⏸️  Deployment cancelled."
    echo "💡 Run 'vercel' manually when ready to deploy"
fi

echo ""
echo "📚 For more information, see DEPLOYMENT.md"
