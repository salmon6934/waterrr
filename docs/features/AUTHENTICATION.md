# Authentication

## Overview

AVIEN uses **Supabase Auth** with magic link (email OTP) sign-in. No passwords are stored — users receive a one-time login link via email.

## Flow

```
┌──────────┐     ┌───────────────┐     ┌──────────┐
│  User    │────▶│  AuthScreen   │────▶│ Supabase │
│  (email) │     │  Component    │     │   Auth   │
└──────────┘     └───────────────┘     └────┬─────┘
                                            │
                                    Sends magic link
                                            │
                                            ▼
                                      ┌──────────┐
                                      │  Email   │
                                      │  Inbox   │
                                      └────┬─────┘
                                           │
                                    User clicks link
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Session      │
                                    │ Established  │
                                    └──────────────┘
```

## Implementation

### Auth Service (`lib/auth.ts`)

```typescript
sendMagicLink(email: string): Promise<void>
// Calls supabase.auth.signInWithOtp({ email })

getSession(): Promise<Session | null>
// Returns the current active session

signOut(): Promise<void>
// Clears the session

onAuthStateChange(callback): Subscription
// Listens for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events
```

### Auth Gate (`app/layout.tsx`)

The root layout implements a conditional rendering chain:

```
1. Check session → No session? → Show AuthScreen
2. Has session → Check profile exists → No profile? → Show OnboardingScreen
3. Has profile → Render app content
```

### Session Persistence

Supabase stores the session token in `localStorage`. On app restart, the session is automatically restored if the token hasn't expired.

## Onboarding

After first sign-in, the user must create a profile (choose a display name). This creates a row in the `profiles` table.

The `OnboardingScreen` component:
1. Prompts for a display name (username)
2. Validates uniqueness against the `profiles` table
3. Creates the profile row linked to `auth.uid()`
4. Transitions to the main app

## Feature Gating

`lib/friends.ts` exports a `canAccessFeature()` function that enforces access rules:

```typescript
canAccessFeature(feature: string, isAuthenticated: boolean): boolean
```

| Feature Category | Examples | Requires Auth |
|-----------------|----------|---------------|
| Local | `intake`, `reminders`, `theme` | No |
| Social | `friends`, `friend-progress` | Yes |

This allows the app to function fully offline for personal tracking while requiring authentication only for social features.

## Security Notes

- The Supabase **anon key** is a public key — it only grants access to what RLS policies allow
- All database operations require a valid session token
- RLS policies enforce per-user data isolation (see [Database docs](../DATABASE.md))
- Auth tokens are automatically refreshed before expiry by the Supabase client
