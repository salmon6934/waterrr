# Mobile Native (Android)

## Overview

AVIEN is packaged as a native Android app using [Capacitor](https://capacitorjs.com/). The web application runs inside a WebView with access to native device APIs.

## Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.avien.waterreminder',
  appName: 'Waterrr',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#000000',
    },
  },
};
```

## Native Plugins

| Plugin | Package | Purpose |
|--------|---------|---------|
| Local Notifications | `@capacitor/local-notifications` | Hydration reminder scheduling |
| Haptics | `@capacitor/haptics` | Tactile feedback on interactions |

## Haptic Feedback (`lib/haptics.ts`)

### `triggerQuickAddHaptic()`

Light impact vibration on every water-add button tap. Provides satisfying tactile confirmation.

### `triggerGoalCompletionHaptic()`

Success notification pattern when daily goal is reached for the first time that day.

### Fallback Behavior

Both functions catch and swallow errors — if Capacitor is unavailable (browser dev mode), they silently no-op.

## Android-Specific Customizations

### MainActivity Overrides

The `MainActivity.java` disables standard WebView behaviors that feel wrong in a native app:

- **Zoom disabled** — removes pinch-to-zoom controls
- **Text selection disabled** — prevents long-press text selection
- **Long-press haptic disabled** — app controls its own haptics

### Permissions (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### App Identity

- **Package ID:** `com.avien.waterreminder`
- **Display Name:** Waterrr
- **URL Scheme:** HTTPS (required for Supabase OAuth redirects)

## Development Workflow

```bash
# 1. Make changes to web code
# 2. Build static export
npm run build

# 3. Copy assets to Android project
npx cap sync android

# 4. Open in Android Studio for testing
npx cap open android
```

For rapid iteration during development, use the browser (`npm run dev`) with DevTools mobile emulation. Only sync to Android for testing native features (notifications, haptics).

## Build Output

The Android project lives in `android/` and is a standard Gradle project:

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── assets/public/          ← Static web assets (synced from out/)
│   │   ├── java/.../MainActivity.java
│   │   └── res/                    ← Icons, splash screen, colors
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## Known Constraints

- **No server-side rendering** — all pages are static (required for WebView)
- **No image optimization** — Next.js Image component uses `unoptimized: true`
- **Single platform** — currently Android only (iOS requires Xcode + macOS)
- **No hot reload on device** — must rebuild + sync for web changes
