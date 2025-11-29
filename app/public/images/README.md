# Images Directory

This folder contains all static images for the BellAi platform.

## 📁 Folder Structure

### `/logos`
- Main logo files (SVG preferred for scalability)
- Logo variations (light/dark mode, different sizes)
- Example: `logo.svg`, `logo-dark.svg`, `logo-white.svg`

### `/icons`
- Custom icons and graphics
- Feature icons, UI elements
- Example: `wallet-icon.svg`, `staking-icon.svg`, `network-icon.svg`

### `/backgrounds`
- Background images and patterns
- Hero section backgrounds, gradients
- Example: `hero-bg.jpg`, `gradient-mesh.png`

### `/illustrations`
- Decorative illustrations
- Empty states, error pages, onboarding graphics
- Example: `empty-state.svg`, `404-illustration.svg`

### `/avatars`
- Default avatar images
- Placeholder user images
- Example: `default-avatar.png`, `placeholder-user.svg`

## 🎨 Image Guidelines

### File Formats
- **SVG**: Logos, icons, simple graphics (scalable, small file size)
- **PNG**: Images with transparency, screenshots
- **JPG/WebP**: Photos, complex images (compress before uploading)

### Naming Convention
- Use kebab-case: `user-avatar.png`
- Be descriptive: `dashboard-hero-background.jpg`
- Include size if needed: `logo-512x512.png`

### Optimization
- Compress images before adding them
- Use tools like TinyPNG, Squoosh, or ImageOptim
- Target file sizes: <100KB for icons, <500KB for backgrounds

## 📝 Usage in Code

```tsx
import Image from 'next/image'

// Logo
<Image src="/images/logos/logo.svg" alt="BellAi" width={200} height={50} />

// Icon
<Image src="/images/icons/wallet.svg" alt="Wallet" width={24} height={24} />

// Background
<div style={{ backgroundImage: 'url(/images/backgrounds/hero.jpg)' }} />
```

## ✅ Checklist for Adding Images

- [ ] Image is optimized/compressed
- [ ] File name is descriptive and uses kebab-case
- [ ] Image is in the correct subfolder
- [ ] Alt text is planned for accessibility
- [ ] Image dimensions are appropriate for use case

---

**Ready to add your images!** Just drop them into the appropriate folders above.
