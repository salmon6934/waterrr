# Waterrr

A water intake tracking app built with Next.js and Capacitor for Android.

## What it does

- Track daily water intake with quick-add buttons (250ml, 350ml, 500ml) or custom amounts
- Set a daily hydration goal (default 2000ml)
- Get periodic push notifications reminding you to drink water
- Maintain a streak counter for consecutive days meeting your goal
- Add friends and see their hydration progress in real-time
- Dark/light theme support

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (auth, database, real-time subscriptions)
- **Native**: Capacitor (Android APK, local notifications, haptics)
- **Animations**: Framer Motion
- **Font**: Space Mono (monospace)

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Sync to Android
npx cap sync

# Open in Android Studio
npx cap open android
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Building the APK

1. `npm run build`
2. `npx cap sync`
3. Open Android Studio: `npx cap open android`
4. Build → Build APK(s)
5. APK is at `android/app/build/outputs/apk/debug/app-debug.apk`

## Project Structure

```
app/              → Next.js pages (home, settings, friends, profile)
components/       → React components
lib/              → Business logic, types, storage, API clients
android/          → Capacitor Android project
```

## Design

Monochromatic (black/white), no border-radius, Space Mono font. Minimal and clean.
