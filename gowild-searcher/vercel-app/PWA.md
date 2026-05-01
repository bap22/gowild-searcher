# GoWild Fare Finder - PWA Features

The GoWild Fare Finder is now a Progressive Web App (PWA) with native app-like features!

## ✨ Features Added

### 1. **Web App Manifest** (`public/manifest.json`)
- App name: "GoWild Fare Finder"
- Short name: "GoWild"
- Purple gradient theme color (#667eea)
- Portrait orientation
- Custom icons for home screen

### 2. **Service Worker** (`public/sw.js`)
- Caches app shell (HTML, CSS, JS) for instant loading
- Stale-while-revalidate strategy for API responses
- Offline fallback page
- Automatic cache updates

### 3. **Install Prompts**
- **Android**: Native install prompt via `beforeinstallprompt` event
- **iOS**: Instructions for Safari "Add to Home Screen"
- Smart prompting (only once per 7 days)
- Dismissible banner

### 4. **Offline Support** (`pages/offline.js`)
- Beautiful offline page with purple gradient theme
- Retry button when connection restored
- Helpful hints about available features

### 5. **Mobile Optimizations**
- Touch-friendly buttons (minimum 44px)
- Larger text and inputs on mobile
- Prevents accidental zoom on double-tap
- Responsive viewport settings

### 6. **Apple-Specific Features**
- Apple touch icon (180x180)
- `apple-mobile-web-app-capable: yes`
- Black translucent status bar
- Custom web app title

## 📱 How to Install

### Android (Chrome)
1. Visit the site
2. Tap the "Install" button in the banner, OR
3. Use Chrome menu → "Install app"

### iOS (Safari)
1. Visit the site in Safari
2. Tap the Share button (⎋)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right

## 🎨 Icons

Located in `public/icons/`:
- `icon-192x192.svg` - Main app icon (192x192)
- `icon-512x512.svg` - Large app icon (512x512)
- `apple-touch-icon.png` - iOS home screen icon (180x180)

All icons feature the purple gradient background with ✈️ airplane emoji.

## 🔧 Technical Details

### Service Worker Strategy
- **App Shell**: Cached immediately on install
- **API Responses**: Stale-while-revalidate (show cached, update in background)
- **Navigation**: Falls back to offline page when no network

### Cache Management
- Versioned cache names (`gowild-v1`)
- Old caches cleaned up on activation
- Hourly update checks

### Meta Tags
```html
<meta name="theme-color" content="#667eea">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
```

## 🚀 Testing

### Test Offline Mode
1. Open DevTools → Application tab
2. Check "Offline" checkbox
3. Refresh the page
4. You should see the offline page

### Test Installation
- Android: Chrome will show install prompt
- iOS: Follow Safari instructions above

### Audit PWA
Run Lighthouse in Chrome DevTools:
1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Analyze page load"

## 📝 Files Modified/Created

### Created:
- `public/manifest.json` - Web app manifest
- `public/sw.js` - Service worker
- `public/icons/icon-192x192.svg` - App icon
- `public/icons/icon-512x512.svg` - Large app icon
- `public/icons/apple-touch-icon.png` - iOS icon
- `pages/_app.js` - App wrapper with SW registration
- `pages/offline.js` - Offline fallback page

### Updated:
- `pages/index.js` - Added PWA meta tags, install banner, mobile optimizations

---

Enjoy your native app-like GoWild Fare Finder experience! ✈️
