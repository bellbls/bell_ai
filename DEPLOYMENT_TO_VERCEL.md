# Deployment Guide: GitHub + Vercel with Convex

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `bell_ai`
3. Description: "BellAi - Tiered Rewards Staking Platform"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 2: Push to GitHub

After creating the repository, run:

```bash
git push -u origin main
```

If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys

## Step 3: Deploy to Vercel

### Option A: Using Vercel Marketplace (Recommended)

1. Go to https://vercel.com/marketplace
2. Search for "Convex"
3. Click **Add Integration**
4. Follow the setup wizard
5. Connect your GitHub repository: `bellbls/bell_ai`
6. Vercel will automatically configure Convex

### Option B: Manual Setup

1. **Create Vercel Account**
   - Go to https://vercel.com/signup
   - Sign up with GitHub (recommended)

2. **Import Project**
   - Go to https://vercel.com/new
   - Click **Import Git Repository**
   - Select `bellbls/bell_ai`
   - Click **Import**

3. **Configure Build Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `app` (since your Next.js app is in the `app` folder)
   - **Build Command**: `npx convex deploy --cmd 'npm run build'`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Set Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Add the following:
     - `CONVEX_DEPLOY_KEY` (from Convex Dashboard - Production Deploy Key)
     - Any other environment variables your app needs

5. **Get Convex Deploy Key**
   - Go to your Convex Dashboard: https://dashboard.convex.dev
   - Select your project
   - Go to **Settings** → **Deploy Keys**
   - Click **Generate Production Deploy Key**
   - Copy the key
   - Paste it into Vercel as `CONVEX_DEPLOY_KEY`
   - **Important**: Only enable for **Production** environment

6. **Deploy**
   - Click **Deploy**
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

## Step 4: Configure Custom Domain (Optional)

If you want a custom domain:

1. In Vercel, go to **Settings** → **Domains**
2. Add your domain
3. Follow DNS configuration instructions
4. Update Convex authentication settings to accept your custom domain

## Step 5: Preview Deployments (Optional)

To enable preview deployments for pull requests:

1. In Convex Dashboard, generate a **Preview Deploy Key**
2. In Vercel, add `CONVEX_DEPLOY_KEY` for **Preview** environment
3. Use the preview deploy key
4. Preview deployments will automatically create separate Convex deployments for each branch

## Important Notes

- **Root Directory**: Since your Next.js app is in the `app` folder, make sure to set Root Directory to `app` in Vercel
- **Build Command**: Must be `npx convex deploy --cmd 'npm run build'` to deploy Convex functions
- **Environment Variables**: Never commit `.env` files - use Vercel's environment variables
- **Convex URL**: Will be automatically set by `npx convex deploy` during build

## Troubleshooting

### Build Fails
- Check that Root Directory is set to `app`
- Verify `CONVEX_DEPLOY_KEY` is set correctly
- Check build logs in Vercel dashboard

### Convex Functions Not Deploying
- Ensure `CONVEX_DEPLOY_KEY` is set for Production environment
- Check that build command includes `npx convex deploy`

### Authentication Issues
- Make sure your authentication provider (if using Clerk/Auth0) accepts your Vercel domain
- For custom domains, update authentication redirect URLs

## Next Steps

After deployment:
1. Test all features on production
2. Set up monitoring and error tracking
3. Configure custom domain if needed
4. Set up preview deployments for testing

