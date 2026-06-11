# Push Notifications (FCM)

## Overview

AVIEN uses **Firebase Cloud Messaging (FCM)** to deliver push notifications for social events. Notifications are sent server-side via Supabase Edge Functions and delivered to Android devices through the FCM HTTP v1 API.

## Infrastructure

```
┌────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Supabase DB   │────▶│  Edge Function  │────▶│  FCM API    │
│  (webhook)     │     │  (Deno runtime) │     │  (HTTP v1)  │
└────────────────┘     └─────────────────┘     └──────┬──────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │  Android    │
                                               │  Device     │
                                               └─────────────┘
```

## Notification Types

| Type | Trigger | Edge Function | Body Format |
|------|---------|---------------|-------------|
| Friend Request | `friend_connections` INSERT (status=pending) | `send-push-notification` | "{username} sent you a friend request" |
| Nudge | Client invocation | `send-nudge` | "{username} reminds you to drink water! 💧" |
| Close Friend Intake | `intake_entries` INSERT | `send-close-friend-intake-notification` | "{username} just drank {volume}ml" |

## Device Token Management (`lib/push.ts`)

### `isFCMAvailable(): boolean`

Checks if the app is running on a native Capacitor platform (not in browser or SSR).

### `registerDeviceToken(userId: string): Promise<void>`

1. Gets FCM token from Capacitor Firebase Messaging plugin
2. Upserts token into `device_tokens` table (conflict on `token` column)

### `unregisterDeviceToken(userId: string): Promise<void>`

Deletes all device tokens for the user. Called on logout.

### `handleTokenRefresh(userId: string, newToken: string): Promise<void>`

1. Deletes all existing tokens for the user
2. Inserts the new token

## PushNotificationProvider Component

A React context provider (`components/PushNotificationProvider.tsx`) that:

1. **On auth (login):** Registers FCM device token
2. **On logout:** Unregisters device tokens
3. **Token refresh:** Listens for FCM token refresh events and updates Supabase
4. **Notification tap:** Navigates to `/friends` if authenticated, `/` (auth screen) if not
5. **Error handling:** Shows inline "Push notifications unavailable" if registration fails

## Edge Functions

### `send-push-notification`

- **Trigger:** Database webhook on `friend_connections` INSERT
- **Logic:**
  1. Check `record.status === 'pending'` (skip otherwise)
  2. Query `device_tokens` for `record.friend_id` (recipient)
  3. Query `profiles` for `record.user_id` to get sender username
  4. Send FCM message to all recipient tokens
  5. Skip silently if no tokens found

### `send-nudge`

- **Trigger:** Client invocation via `supabase.functions.invoke()`
- **Logic:**
  1. Verify auth (senderId matches JWT)
  2. Query `nudges` table for cooldown check (24h)
  3. If cooldown active → return error
  4. Query `device_tokens` for receiver
  5. Insert `nudges` row
  6. Send FCM message with encouragement text (max 100 chars)
  7. Return `{ success: true, sentAt }`

### `send-close-friend-intake-notification`

- **Trigger:** Database webhook on `intake_entries` INSERT
- **Logic:**
  1. Extract `user_id` and `volume` from record
  2. Query `close_friends WHERE friend_id = user_id` (who marked this user as close)
  3. For each recipient:
     - Query `device_tokens` — skip if none
     - Query `close_friend_notifications` for rate limit check (60-min window)
     - If rate limited → skip
     - Otherwise: INSERT notification record, send FCM message
  4. FCM body: `"{username} just drank {volume}ml"`
  5. Data payload: `{ type: 'close_friend_intake', friendId: user_id }`

## Firebase Configuration

### Android Setup

- `android/app/google-services.json` — Firebase project configuration
- `@capacitor-firebase/messaging` package handles native FCM integration
- No additional env vars needed (Firebase config lives in `google-services.json`)

### Edge Function FCM Credentials

Edge Functions use a Firebase service account key to send FCM messages via the HTTP v1 API. This is stored as a Supabase secret (not in the client bundle).

## Platform Behavior

| Platform | Behavior |
|----------|----------|
| Android (Capacitor) | Full push notification support |
| Browser (dev) | `isFCMAvailable()` returns false; no registration, no crashes |

## Tap Navigation

| User State | Tap Destination |
|------------|----------------|
| Authenticated | `/friends` page |
| Not authenticated | `/` (auth screen) → after login → `/friends` |
