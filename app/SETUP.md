# Professional Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Convex account (free tier works)

### Installation

```bash
# 1. Install dependencies
cd app
npm install

# 2. Set up Convex (if not already done)
npx convex dev

# This will:
# - Create a Convex project (if needed)
# - Generate types
# - Start the Convex dev server
# - Provide you with CONVEX_URL

# 3. Create .env.local file
# Copy CONVEX_URL from Convex dashboard or terminal output
echo "NEXT_PUBLIC_CONVEX_URL=your-convex-url" > .env.local

# 4. Start development servers
# Terminal 1: Convex
npx convex dev

# Terminal 2: Next.js
npm run dev
```

## Common Issues & Solutions

### TypeScript Errors
If you see TypeScript errors:
1. Run `npx convex dev` to regenerate types
2. Wait for type generation to complete
3. Restart your IDE/editor

### Module Not Found
If you see "module not found" errors:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Convex Types Not Updating
```bash
# Force regenerate types
npx convex dev --once
# Or delete .convex folder and restart
rm -rf .convex
npx convex dev
```

## Production Deployment

### Vercel Deployment
1. Push code to GitHub
2. Import to Vercel
3. Set Root Directory: `app`
4. Set Build Command: `npx convex deploy --cmd 'npm run build'`
5. Add `CONVEX_DEPLOY_KEY` environment variable (from Convex Dashboard)

### Environment Variables
- `NEXT_PUBLIC_CONVEX_URL` - Auto-set by Convex deploy
- `CONVEX_DEPLOY_KEY` - For production deployments

## Professional Best Practices

✅ **Always commit working code**
✅ **Run `npm run build` before deploying**
✅ **Test locally before pushing**
✅ **Keep dependencies updated**
✅ **Use TypeScript strict mode**

