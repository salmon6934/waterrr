# Setup & Local Development

## Prerequisites

- **Node.js** ≥ 18
- **npm** (bundled with Node.js)
- **Android Studio** (for mobile builds only)
- A [Supabase](https://supabase.com) project (free tier works)
- A [Firebase](https://console.firebase.google.com) project (for push notifications)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd AVIEN

# Install dependencies
npm install
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are available from your Supabase project dashboard under **Settings → API**.

See `.env.example` for a template.

## Firebase Configuration

For push notifications on Android:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with package name `com.avien.waterreminder`
3. Download `google-services.json` and place it in `android/app/`
4. The FCM service account key is configured as a Supabase secret for Edge Functions

## Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`. The app is designed for mobile viewports (390px width) — use browser DevTools device emulation for the best experience.

> Note: Push notifications (FCM) only work on native Android. In browser dev mode, `isFCMAvailable()` returns false and all push features gracefully degrade.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production static export to `out/` |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests (Vitest, single run) |

## Android Development

```bash
# Build the static export
npm run build

# Sync web assets to the Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

From Android Studio, run the app on an emulator or connected device.

## Database Setup

The app requires seven tables in Supabase. See [Database documentation](./DATABASE.md) for the full schema and RLS policies.

**Core tables:** `profiles`, `intake_entries`, `friend_connections`  
**Social tables:** `close_friends`, `device_tokens`, `nudges`, `close_friend_notifications`

## Supabase Edge Functions

Four Edge Functions must be deployed:

1. `send-push-notification` — friend request notifications
2. `send-nudge` — nudge inactive friends
3. `send-close-friend-intake-notification` — close friend intake alerts
4. `send-close-friend-added-notification` — close friend added alerts

Deploy via Supabase CLI:

```bash
supabase functions deploy send-push-notification
supabase functions deploy send-nudge
supabase functions deploy send-close-friend-intake-notification
supabase functions deploy send-close-friend-added-notification
```

All functions are invoked directly from the client — no database webhooks required.

## Project Structure

```
AVIEN/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout (auth gate, onboarding, push provider)
│   ├── page.tsx          # Home page
│   ├── settings/         # Settings page
│   ├── friends/          # Friends page (enhanced with social features)
│   └── profile/          # Profile page
├── components/           # Reusable React components (21)
├── lib/                  # Business logic modules (15 files)
├── __tests__/            # Integration & social enhancement tests
├── android/              # Capacitor Android project
├── public/               # Static assets
├── docs/                 # Documentation (you are here)
└── out/                  # Build output (gitignored)
```
