# Push Notifications (FCM)

## Overview

AVIEN uses **Firebase Cloud Messaging (FCM)** to deliver push notifications for social events. Notifications are sent server-side via Supabase Edge Functions and delivered to Android devices through the FCM HTTP v1 API.

## Infrastructure

```
┌────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Client App    │────▶│  Edge Function  │────▶│  FCM API    │
│  (invoke)      │     │  (Deno runtime) │     │  (HTTP v1)  │
└────────────────┘     └─────────────────┘     └──────┬──────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │  Android    │
                                               │  Device     │
                                               └─────────────┘
```

## Notification Types

| Type | Trigger | Edge Function | Title | Body |
|------|---------|---------------|-------|------|
| Friend Request | Client invocation after sending request | `send-push-notification` | "New Friend Request" | "{username} sent you a friend request" |
| Nudge | Client invocation (tap bell) | `send-nudge` | "Hydrate now!" | "{username} wants you to drink water!" |
| Close Friend Intake | Client invocation after logging water | `send-close-friend-intake-notification` | "Close Friend Activity" | "{username} just drank {volume}ml" |
| Close Friend Added | Client invocation after marking close friend | `send-close-friend-added-notification` | "Close Friend" | "{username} added you as a close friend 💧" |

## Device Token Management (`lib/push.ts`)

### `isFCMAvailable(): boolean`

Checks if the app is running on a native Capacitor platform (not in browser or SSR).

### `registerDeviceToken(userId: string): Promise<void>`

1. Requests push notification permissions (required on Android 13+)
2. Gets FCM token from Capacitor Firebase Messaging plugin
3. Upserts token into `device_tokens` table (conflict on `token` column)

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

All edge functions use the FCM HTTP v1 API with OAuth2 service account authentication. They are invoked directly from the client via `supabase.functions.invoke()` (fire-and-forget, no database webhooks).

### `send-push-notification`

- **Trigger:** Client invocation via `supabase.functions.invoke()` after sending a friend request
- **Logic:**
  1. Verify auth (senderId matches JWT)
  2. Confirm pending friend_connection exists in database
  3. Query `device_tokens` for recipient
  4. Query `profiles` for sender username
  5. Get OAuth2 access token from FCM service account
  6. Send FCM v1 API message

### `send-nudge`

- **Trigger:** Client invocation via `supabase.functions.invoke()`
- **Logic:**
  1. Verify auth (senderId matches JWT)
  2. Query `nudges` table for cooldown check (2h)
  3. If cooldown active → return error
  4. Query `device_tokens` for receiver
  5. Query `profiles` for sender username
  6. Insert `nudges` row
  7. Get OAuth2 access token from FCM service account (Web Crypto API)
  8. Send FCM v1 API message
  9. Return `{ success: true, sentAt }`

### `send-close-friend-intake-notification`

- **Trigger:** Client invocation via `supabase.functions.invoke()` after logging water
- **Logic:**
  1. Verify auth (userId matches JWT)
  2. Query `close_friends` in both directions to find mutual close friends
  3. For each mutual close friend:
     - Query `device_tokens` — skip if none
     - Query `close_friend_notifications` for rate limit check (5-min window)
     - If rate limited → skip
     - Otherwise: INSERT notification record, send FCM v1 message
  4. FCM body: `"{username} just drank {volume}ml"`
  5. Data payload: `{ type: 'close_friend_intake', friendId: userId }`

### `send-close-friend-added-notification`

- **Trigger:** Client invocation via `supabase.functions.invoke()` after marking someone as close friend
- **Logic:**
  1. Verify auth (userId matches JWT)
  2. Confirm close_friends row exists
  3. Query `device_tokens` for the friend
  4. Query `profiles` for username
  5. Get OAuth2 access token from FCM service account
  6. Send FCM v1 message: "{username} added you as a close friend 💧"

## Firebase Configuration

### Android Setup

- `android/app/google-services.json` — Firebase project configuration
- `@capacitor-firebase/messaging` package handles native FCM integration
- No additional env vars needed (Firebase config lives in `google-services.json`)

### Edge Function FCM Credentials

All edge functions use a Firebase service account key (`FCM_SERVICE_ACCOUNT` Supabase secret) to authenticate with the FCM HTTP v1 API. Each function generates an OAuth2 access token from the service account JSON using the Web Crypto API at runtime — no external JWT libraries required.

### Android Notification Channel

The app creates a `fcm_default_channel` notification channel at startup in `MainActivity.java` with `IMPORTANCE_HIGH`. This is required for Android 8+ (API 26+) to display push notifications. The channel is referenced in:
- `AndroidManifest.xml` — `com.google.firebase.messaging.default_notification_channel_id` meta-data
- `res/values/strings.xml` — `default_notification_channel_id` string resource

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
