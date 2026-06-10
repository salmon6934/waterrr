# Setup & Local Development

## Prerequisites

- **Node.js** ≥ 18
- **npm** (bundled with Node.js)
- **Android Studio** (for mobile builds only)
- A [Supabase](https://supabase.com) project (free tier works)

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

## Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`. The app is designed for mobile viewports (390px width) — use browser DevTools device emulation for the best experience.

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

The app requires three tables in Supabase. See [Database documentation](./DATABASE.md) for the full schema and RLS policies.

## Project Structure

```
AVIEN/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout (auth gate, onboarding, theme)
│   ├── page.tsx          # Home page
│   ├── settings/         # Settings page
│   ├── friends/          # Friends page
│   └── profile/          # Profile page
├── components/           # Reusable React components (16)
├── lib/                  # Business logic modules (12 files)
├── android/              # Capacitor Android project
├── public/               # Static assets
├── docs/                 # Documentation (you are here)
└── out/                  # Build output (gitignored)
```
