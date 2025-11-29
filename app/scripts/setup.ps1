# Professional Setup Script for Windows
Write-Host "🚀 Setting up BellAi Application..." -ForegroundColor Cyan

# Check Node.js
Write-Host "`n📦 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check for .env.local
Write-Host "`n🔐 Checking environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found. You'll need to create it with:" -ForegroundColor Yellow
    Write-Host "   NEXT_PUBLIC_CONVEX_URL=your-convex-url" -ForegroundColor Gray
} else {
    Write-Host "✅ .env.local found" -ForegroundColor Green
}

# Check Convex
Write-Host "`n🔧 Checking Convex setup..." -ForegroundColor Yellow
if (-not (Test-Path ".convex")) {
    Write-Host "⚠️  Convex not initialized. Run 'npx convex dev' to set up" -ForegroundColor Yellow
} else {
    Write-Host "✅ Convex initialized" -ForegroundColor Green
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run 'npx convex dev' in one terminal" -ForegroundColor White
Write-Host "   2. Run 'npm run dev' in another terminal" -ForegroundColor White
Write-Host "   3. Open http://localhost:3000" -ForegroundColor White

