# SkyBird Forecasting - Vercel Deployment Script (PowerShell)
# This script helps deploy the application to Vercel

Write-Host "🚀 SkyBird Forecasting - Vercel Deployment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if vercel CLI is installed
try {
    $vercelVersion = vercel --version 2>$null
    Write-Host "✅ Vercel CLI is installed: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Check if user is logged in to Vercel
try {
    $whoami = vercel whoami 2>$null
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please log in to Vercel:" -ForegroundColor Yellow
    vercel login
}

Write-Host ""
Write-Host "📋 Current deployment configuration:" -ForegroundColor Cyan
Write-Host "- Build Command: npm run build" -ForegroundColor White
Write-Host "- Output Directory: dist/spa" -ForegroundColor White
Write-Host "- Framework: Vite (React SPA)" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Environment Variables Required:" -ForegroundColor Cyan
Write-Host "- VITE_MAPBOX_API_KEY: pk.eyJ1IjoiYWJkZWxyaGFtYW4xMjMiLCJhIjoiY21nOTBmbW5rMGI1NTJqc2E2N2pkNjRyMCJ9.fovjQp9aLuOxb4V4ruCWsw" -ForegroundColor White
Write-Host "- VITE_GOOGLE_MAPS_API_KEY: (optional)" -ForegroundColor White

Write-Host ""
$response = Read-Host "🤔 Do you want to deploy now? (y/N)"
Write-Host ""

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🚀 Starting deployment..." -ForegroundColor Green
    vercel --prod
    
    Write-Host ""
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host "🌐 Your app should now be live on Vercel" -ForegroundColor Green
    Write-Host "📊 Check the Vercel dashboard for deployment details" -ForegroundColor Cyan
} else {
    Write-Host "⏸️  Deployment cancelled." -ForegroundColor Yellow
    Write-Host "💡 Run 'vercel' manually when ready to deploy" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📚 For more information, see DEPLOYMENT.md" -ForegroundColor Cyan
