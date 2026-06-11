# Architecture

## Overview

AVIEN is a mobile-first water intake tracker built as a **static web application** wrapped in a native Android shell. The architecture prioritizes offline-capable performance with cloud sync for social features.

```
┌─────────────────────────────────────────────────────┐
│                  Android Device                      │
│  ┌───────────────────────────────────────────────┐  │
│  │            Capacitor WebView                  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │         Next.js Static App              │  │  │
│  │  │     (React 19 + TypeScript)             │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│         │              │                │            │
│    Native APIs    localStorage     FCM Plugin        │
│  (Haptics, Notifs)  (Local-first)  (Push Notifs)    │
└─────────┼──────────────┼────────────────┼────────────┘
          │              │                │
          ▼              ▼                ▼
   ┌──────────────────────────────────────────────┐
   │            Supabase Cloud                    │
   │  ┌──────────┐  ┌────────────┐  ┌─────────┐  │
   │  │   Auth   │  │  Postgres  │  │  Edge   │  │
   │  └──────────┘  └────────────┘  │ Functions│  │
   │  ┌──────────────────────────┐  └─────────┘  │
   │  │    Realtime (WebSocket)  │       │        │
   │  └──────────────────────────┘       │        │
   └─────────────────────────────────────┼────────┘
                                         │
                                         ▼
                               ┌───────────────────┐
                               │  Firebase Cloud   │
                               │  Messaging (FCM)  │
                               └───────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | File-based routing, static export |
| UI Library | React 19 | Component-based UI with hooks |
| Language | TypeScript (strict) | Type safety across the codebase |
| Styling | Tailwind CSS 3 | Utility-first CSS with custom theme |
| Animations | Framer Motion | Page transitions, micro-interactions |
| Icons | Lucide React | Consistent icon set |
| Mobile Shell | Capacitor 8 | Native Android WebView wrapper |
| Backend | Supabase | Auth, PostgreSQL, Realtime, Edge Functions |
| Push Notifications | Firebase Cloud Messaging | Cross-device push delivery |
| FCM Plugin | @capacitor-firebase/messaging | Native FCM integration |
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
| Social | Friends, close friends, nudges, push notifications | Yes |

### Capacitor Native Bridge

The app uses Capacitor plugins to access native device APIs:

- **LocalNotifications** — scheduled hydration reminders
- **Haptics** — tactile feedback on button taps and goal completion
- **Firebase Messaging** — FCM push notification registration and delivery

These degrade gracefully to no-ops when running in a standard browser.

### Supabase Edge Functions

Server-side logic runs as Supabase Edge Functions (Deno runtime):

- **`send-push-notification`** — triggered by DB webhook on `friend_connections` INSERT
- **`send-nudge`** — invoked by client to send nudge notifications
- **`send-close-friend-intake-notification`** — triggered by DB webhook on `intake_entries` INSERT

Edge Functions interact with FCM HTTP v1 API to deliver push notifications.

## Module Boundaries

```
app/           → Page composition, layout, routing
components/    → Presentational UI (no business logic)
lib/           → Pure business logic (no UI, no side effects where possible)
__tests__/     → Integration and social enhancement tests
```

### Library Modules

| Module | Responsibility |
|--------|---------------|
| `intake.ts` | Math (totals, progress, validation) |
| `streak.ts` | Streak state machine |
| `storage.ts` | localStorage I/O |
| `auth.ts` | Authentication operations |
| `friends.ts` | Social graph operations, close friends, nudges |
| `sync.ts` | Bidirectional cloud sync |
| `notifications.ts` | Local notification scheduling algorithms |
| `haptics.ts` | Native feedback abstraction |
| `push.ts` | FCM device token management |
| `realtime.ts` | Real-time subscription management with auto-reconnect |
| `edge-function-helpers.ts` | Pure logic for Edge Functions (testable in Node) |
| `supabase.ts` | Supabase client initialization |
| `types.ts` | All TypeScript interfaces |
| `constants.ts` | Application constants |

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
                                            │
                                            ▼
                                   DB Webhook fires
                                            │
                                            ▼
                              send-close-friend-intake-notification
                                            │
                                            ▼
                              FCM push to close friend recipients
```

### Read Path (App Startup)

```
App Mount → Check auth session
              │
    ┌─────────┴──────────┐
    │ No session         │ Has session
    ▼                    ▼
Show AuthScreen    Register FCM token
                   Load from localStorage
                         │
                         ▼
                   Background: pull from Supabase
                         │
                         ▼
                   Merge & deduplicate
```

### Push Notification Flow

```
Event occurs (friend request / nudge / close friend intake)
    │
    ▼
Supabase Edge Function triggered
    │
    ▼
Query device_tokens for recipient
    │
    ▼
Send FCM HTTP v1 API message
    │
    ▼
FCM delivers to Android device
    │
    ▼
User taps notification → App navigates to Friends page
```

## Component Architecture

Pages compose components in a flat hierarchy:

```
layout.tsx
├── PushNotificationProvider (context)
├── AuthScreen (conditional)
├── OnboardingScreen (conditional)
├── NavBar (always)
└── {Page Content}
    ├── Home: ProgressRing, AnimatedNumber, QuickAddButton[], CustomAddModal, DailyLog, StreakCounter
    ├── Settings: ReminderForm, ThemeToggle
    ├── Friends: PendingRequests, FriendCard[] (expandable)
    │            ├── IntakeEntryList (close friends)
    │            ├── NudgeButton (inactive friends)
    │            └── RemoveFriendDialog (confirmation)
    │            FriendSearch, InviteShare
    └── Profile: (inline)
```
