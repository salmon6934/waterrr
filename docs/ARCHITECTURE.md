# Architecture

## Overview

AVIEN is a mobile-first water intake tracker built as a **static web application** wrapped in a native Android shell. The architecture prioritizes offline-capable performance with cloud sync for social features.

```
┌─────────────────────────────────────────────┐
│              Android Device                  │
│  ┌───────────────────────────────────────┐  │
│  │         Capacitor WebView             │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │      Next.js Static App         │  │  │
│  │  │  (React 19 + TypeScript)        │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│         │                    │               │
│    Native APIs          localStorage         │
│  (Haptics, Notifs)     (Local-first)         │
└─────────┼────────────────────┼───────────────┘
          │                    │
          ▼                    ▼
   ┌─────────────────────────────────┐
   │         Supabase Cloud          │
   │  ┌──────────┐  ┌────────────┐  │
   │  │   Auth   │  │  Postgres  │  │
   │  └──────────┘  └────────────┘  │
   │  ┌──────────────────────────┐  │
   │  │    Realtime (WebSocket)  │  │
   │  └──────────────────────────┘  │
   └─────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | File-based routing, React Server Components |
| UI Library | React 19 | Component-based UI with hooks |
| Language | TypeScript (strict) | Type safety across the codebase |
| Styling | Tailwind CSS 3 | Utility-first CSS with custom theme |
| Animations | Framer Motion | Page transitions, micro-interactions |
| Icons | Lucide React | Consistent icon set |
| Mobile Shell | Capacitor 8 | Native Android WebView wrapper |
| Backend | Supabase | Auth, PostgreSQL, Realtime |
| Testing | Vitest + fast-check | Unit + property-based tests |

## Key Architectural Decisions

### Static Export

Next.js is configured with `output: 'export'`, generating plain HTML/CSS/JS files with no server runtime. This is required because:

1. The app runs inside an Android WebView — there's no Node.js server on the device
2. All pages must be pre-rendered at build time
3. API calls go directly to Supabase from the client

### Local-First Data

All user interactions are saved to `localStorage` immediately before syncing to Supabase. This ensures:

- **Instant feedback** — no loading spinners on core interactions
- **Offline capability** — personal tracking works without internet
- **Resilience** — network failures don't block the user

### Feature Gating

Features are split into two tiers:

| Tier | Features | Auth Required |
|------|----------|---------------|
| Local | Water logging, goals, streaks, reminders, theme | No |
| Social | Friends, friend activity, invite links | Yes |

### Capacitor Native Bridge

The app uses Capacitor plugins to access native device APIs:

- **LocalNotifications** — scheduled hydration reminders
- **Haptics** — tactile feedback on button taps and goal completion

These degrade gracefully to no-ops when running in a standard browser.

## Module Boundaries

```
app/           → Page composition, layout, routing
components/    → Presentational UI (no business logic)
lib/           → Pure business logic (no UI, no side effects where possible)
```

Each `lib/` module is single-responsibility:

- `intake.ts` — math (totals, progress, validation)
- `streak.ts` — streak state machine
- `storage.ts` — localStorage I/O
- `auth.ts` — authentication operations
- `friends.ts` — social graph operations
- `sync.ts` — bidirectional cloud sync
- `notifications.ts` — scheduling algorithms
- `haptics.ts` — native feedback abstraction

## Data Flow

### Write Path (Adding Water)

```
User Tap → QuickAddButton → page.tsx state update
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
              localStorage.save()     supabase.upsert()
                     │                       │
                     ▼                       ▼
              Instant UI update      Cloud persistence
```

### Read Path (App Startup)

```
App Mount → Check auth session
              │
    ┌─────────┴──────────┐
    │ No session         │ Has session
    ▼                    ▼
Show AuthScreen    Load from localStorage
                         │
                         ▼
                   Background: pull from Supabase
                         │
                         ▼
                   Merge & deduplicate
```

## Component Architecture

Pages compose components in a flat hierarchy:

```
layout.tsx
├── AuthScreen (conditional)
├── OnboardingScreen (conditional)
├── NavBar (always)
└── {Page Content}
    ├── Home: ProgressRing, QuickAddButton[], CustomAddModal, DailyLog, StreakCounter
    ├── Settings: ReminderForm, ThemeToggle
    ├── Friends: PendingRequests, FriendCard[], FriendSearch, InviteShare
    └── Profile: (inline)
```
