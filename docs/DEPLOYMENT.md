# Deployment

## Build Pipeline

AVIEN produces a **static export** — the entire app compiles to plain HTML, CSS, and JavaScript files with no server runtime.

```
Source Code → Next.js Build → Static Files (out/) → Capacitor Sync → Android APK
```

## Web Build

```bash
npm run build
```

This runs `next build` with `output: 'export'` configured in `next.config.js`. Output goes to the `out/` directory.

### Build Configuration

```javascript
// next.config.js
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,  // Required for static export (no image optimization server)
  },
};
```

## Android Build

### Development Build

```bash
# 1. Build the static site
npm run build

# 2. Copy web assets into the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

From Android Studio:
- Select a device/emulator
- Click **Run** (▶)

### Release Build

From Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Select APK
3. Create or select a keystore
4. Choose `release` build variant
5. APK output: `android/app/build/outputs/apk/release/`

### Capacitor Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.avien.waterreminder',
  appName: 'Waterrr',
  webDir: 'out',                    // Points to Next.js static export
  server: {
    androidScheme: 'https',         // Required for Supabase auth redirects
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#000000',
    },
  },
};
```

## Environment Considerations

### Supabase Keys

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is embedded in the client bundle at build time. This is safe because:

- It's an **anon** key (public by design)
- RLS policies enforce all data access rules server-side
- The key only grants the permissions defined by your RLS policies

### Firebase Configuration

`google-services.json` is bundled in the Android APK. This is standard practice — the file contains project identifiers but no secrets.

### Edge Function Secrets

FCM service account credentials are stored as Supabase secrets and never exposed to the client.

### Android Permissions

The Android manifest requests:

- `RECEIVE_BOOT_COMPLETED` — reschedule notifications after device restart
- `SCHEDULE_EXACT_ALARM` — precise notification timing
- `VIBRATE` — haptic feedback
- `INTERNET` — Supabase and FCM communication

## Supabase Edge Functions

Deploy Edge Functions before the first release:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref <your-project-ref>

# Deploy all functions
supabase functions deploy send-push-notification
supabase functions deploy send-nudge
supabase functions deploy send-close-friend-intake-notification
supabase functions deploy send-close-friend-added-notification

# Set FCM secret
supabase secrets set FCM_SERVICE_ACCOUNT='<json-key-contents>'
```

All Edge Functions are invoked directly from the client via `supabase.functions.invoke()`. No database webhooks are required.

## Pre-Deployment Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured for target Supabase project
- [ ] Supabase database tables created with RLS policies (7 tables)
- [ ] Edge Functions deployed (4 functions)
- [ ] FCM service account key set as Supabase secret (`FCM_SERVICE_ACCOUNT`)
- [ ] Firebase project configured with `google-services.json`
- [ ] Capacitor sync completed (`npx cap sync android`)
- [ ] APK tested on physical device
