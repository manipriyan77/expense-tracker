# Expense Tracker - Logo Guide

## Available Logos

### 1. `logo.svg` (512x512)
**Full featured logo with all elements**
- Use for: Splash screens, marketing materials, large displays
- Features: Currency symbol, chart bars, trending arrows, decorative elements
- Background: Purple gradient

### 2. `logo-icon.svg` (256x256)
**App icon version**
- Use for: App icons, social media profiles, medium-sized displays
- Features: Currency symbol with mini chart bars
- Background: Purple gradient with rounded corners
- Perfect for iOS/Android app icons

### 3. `logo-simple.svg` (200x200)
**Simple wallet/document design**
- Use for: Headers, navigation bars, compact spaces
- Features: Wallet shape with transaction lines, currency badge, mini chart
- Clean and minimal design

### 4. `favicon-custom.svg` (32x32)
**Favicon version**
- Use for: Browser tabs, bookmarks, small icons
- Features: Simplified currency symbol
- Optimized for tiny sizes

## Design Elements

### Colors
- **Primary Gradient**: Indigo to Purple (#6366f1 → #a855f7)
- **Accent Colors**: 
  - Green (#10b981) - Income/Growth
  - Blue (#3b82f6) - Neutral/Info
  - Purple (#8b5cf6) - Primary
  - Orange (#f59e0b) - Warning
  - Red (#ef4444) - Expense/Decline

### Theme
The logos incorporate elements that represent:
- 💰 **Currency Symbol**: ₹ (Rupee) representing financial transactions
- 📊 **Chart Bars**: Representing analytics and tracking
- 📈 **Trending Arrows**: Showing income and expense trends
- 💳 **Wallet/Document**: Representing expense management

## Usage in App

To use these logos in your Next.js app:

```tsx
// In your layout or component
import Image from 'next/image'

// For large displays
<Image src="/logo.svg" alt="Expense Tracker" width={512} height={512} />

// For app icon
<Image src="/logo-icon.svg" alt="Expense Tracker" width={256} height={256} />

// For header/navbar
<Image src="/logo-simple.svg" alt="Expense Tracker" width={200} height={200} />

// For favicon in layout.tsx or head
<link rel="icon" href="/favicon-custom.svg" type="image/svg+xml" />
```

## Customization

All logos use inline gradients and can be easily customized by editing:
- Colors in the gradient definitions
- Sizes of elements
- Stroke widths
- Opacity values

Enjoy your new custom logos! 🎨
