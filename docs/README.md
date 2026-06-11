# AVIEN Documentation

> Comprehensive technical documentation for the AVIEN water reminder application.

## Documentation Index

### Core

| Document | Description |
|----------|-------------|
| [Setup & Local Development](./SETUP.md) | Environment variables, dependencies, and local development workflow |
| [Architecture](./ARCHITECTURE.md) | High-level system design, data flow, and platform strategy |
| [State Management](./STATE_MANAGEMENT.md) | Local-first data strategy, sync logic, and React state patterns |
| [Testing](./TESTING.md) | Unit tests, property-based tests, and testing methodology |
| [Database](./DATABASE.md) | Supabase schema, RLS policies, and real-time subscriptions |
| [Deployment](./DEPLOYMENT.md) | Build process, static export, and Android APK generation |

### Features

| Document | Description |
|----------|-------------|
| [Authentication](./features/AUTHENTICATION.md) | Magic link auth, session management, and feature gating |
| [Water Intake Tracking](./features/INTAKE_TRACKING.md) | Core intake logging, progress calculation, and daily goals |
| [Streaks](./features/STREAKS.md) | Streak logic, continuity validation, and persistence |
| [Friends & Social](./features/FRIENDS.md) | Friend connections, real-time activity, and invite links |
| [Push Notifications](./features/PUSH_NOTIFICATIONS.md) | Firebase Cloud Messaging, device tokens, and notification delivery |
| [Close Friends & Nudges](./features/CLOSE_FRIENDS.md) | Close friend designation, intake visibility, nudge system |
| [Local Notifications](./features/NOTIFICATIONS.md) | Local notification scheduling and Capacitor integration |
| [Mobile Native](./features/MOBILE.md) | Capacitor setup, native plugins, and Android-specific behavior |

---

## Quick Reference

```
docs/
├── README.md                 ← You are here
├── SETUP.md                  ← Getting started
├── ARCHITECTURE.md           ← System design
├── STATE_MANAGEMENT.md       ← Data flow & sync
├── TESTING.md                ← Test strategy
├── DATABASE.md               ← Schema & policies
├── DEPLOYMENT.md             ← Build & release
└── features/
    ├── AUTHENTICATION.md     ← Auth system
    ├── INTAKE_TRACKING.md    ← Core feature
    ├── STREAKS.md            ← Streak logic
    ├── FRIENDS.md            ← Social features
    ├── PUSH_NOTIFICATIONS.md ← FCM push system
    ├── CLOSE_FRIENDS.md      ← Close friends & nudges
    ├── NOTIFICATIONS.md      ← Local reminders
    └── MOBILE.md             ← Native mobile
```
