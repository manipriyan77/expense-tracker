# Expense Tracker - Branding & Design System

## 🎨 Logo Suite

Your expense tracker now has a complete set of custom SVG logos optimized for different use cases!

### Logo Files

| File | Size | Use Case |
|------|------|----------|
| `logo.svg` | 512×512 | Marketing, splash screens, large displays |
| `logo-icon.svg` | 256×256 | App icons, social media, medium displays |
| `logo-simple.svg` | 200×200 | Headers, navigation, compact spaces |
| `favicon-custom.svg` | 32×32 | Browser tabs, bookmarks, tiny icons |

## 🎯 Design Philosophy

The logos are designed to represent:

- **💰 Currency**: Rupee symbol (₹) as the central element
- **📊 Analytics**: Chart bars showing data tracking
- **📈 Growth/Trends**: Arrows indicating financial movement
- **💳 Management**: Wallet/document shapes for expense tracking

## 🌈 Color Palette

### Primary Colors
```css
--primary-gradient-start: #6366f1;  /* Indigo */
--primary-gradient-end: #a855f7;    /* Purple */
```

### Accent Colors
```css
--success-green: #10b981;  /* Income, Growth */
--info-blue: #3b82f6;      /* Neutral, Information */
--accent-purple: #8b5cf6;  /* Primary Accent */
--warning-orange: #f59e0b; /* Warnings, Alerts */
--danger-red: #ef4444;     /* Expenses, Decline */
```

## 📱 Usage Examples

### In React/Next.js Components

```tsx
import Image from 'next/image';

// Hero section with large logo
export function Hero() {
  return (
    <div className="flex items-center justify-center">
      <Image 
        src="/logo.svg" 
        alt="Expense Tracker" 
        width={200} 
        height={200}
        priority
      />
    </div>
  );
}

// Navigation bar with simple logo
export function Navbar() {
  return (
    <nav className="flex items-center gap-2">
      <Image 
        src="/logo-simple.svg" 
        alt="ET" 
        width={40} 
        height={40}
      />
      <span className="font-bold">Expense Tracker</span>
    </nav>
  );
}

// Profile or settings page
export function AppIcon() {
  return (
    <div className="rounded-2xl overflow-hidden">
      <Image 
        src="/logo-icon.svg" 
        alt="App Icon" 
        width={128} 
        height={128}
      />
    </div>
  );
}
```

### In HTML

```html
<!-- Favicon in head -->
<link rel="icon" href="/favicon-custom.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/logo-icon.svg">

<!-- Open Graph / Social Media -->
<meta property="og:image" content="/logo.svg">

<!-- Logo in page -->
<img src="/logo-simple.svg" alt="Expense Tracker" class="h-12 w-12">
```

### In CSS

```css
.logo-background {
  background-image: url('/logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
```

## 🔧 Customization

All logos use SVG format and can be easily customized:

1. **Colors**: Edit gradient definitions in the `<defs>` section
2. **Size**: SVGs scale perfectly - just change width/height
3. **Elements**: Add or remove elements as needed
4. **Export**: Convert to PNG/ICO if needed using online tools

### Example: Changing Colors

```svg
<linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#YOUR_COLOR_1;stop-opacity:1" />
  <stop offset="100%" style="stop-color:#YOUR_COLOR_2;stop-opacity:1" />
</linearGradient>
```

## 📐 Logo Spacing Guidelines

- **Minimum clear space**: 10% of logo width/height
- **Minimum size**: 
  - Desktop: 32px
  - Mobile: 24px
  - Favicon: 16px minimum
- **Maximum size**: No limit (SVG scales perfectly)

## 🎭 Logo Variations

### Dark Background
All logos have white/light elements that work perfectly on dark backgrounds (your app's gradient background).

### Light Background
If you need logos for light backgrounds, consider:
- Adding a subtle shadow
- Using the filled versions
- Adding a colored background circle

## 🚀 Next Steps

1. ✅ Logos created and saved in `/public`
2. ✅ Favicon configured in `app/layout.tsx`
3. ✅ Metadata updated with app info
4. 📱 Consider creating PWA icons (various sizes)
5. 🎨 Export PNG versions for non-SVG contexts
6. 📝 Update README with logo showcase

---

**Need help?** Refer to `/public/LOGO_GUIDE.md` for detailed specifications.
