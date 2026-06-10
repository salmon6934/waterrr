# Friends & Social

## Overview

AVIEN's social layer allows users to connect with friends and view each other's hydration progress in real-time. All social features require authentication.

## Features

- **Search users** by username
- **Send friend requests** to other users
- **Accept/decline** incoming requests
- **View friend activity** (today's intake, goal, streak)
- **Share invite links** for adding friends outside the app
- **Real-time updates** via Supabase WebSocket subscriptions

## Friend Connection Flow

```
User A searches "bob"
    │
    ▼
searchUsers("bob") → Supabase query (ilike on username)
    │
    ▼
Results displayed (excluding self)
    │
    ▼
User A taps "Add" on Bob's profile
    │
    ▼
sendFriendRequest(bobId)
    │
    ▼
Creates row: { user_id: A, friend_id: B, status: 'pending' }
    │
    ▼
Bob opens Friends page → sees pending request
    │
    ▼
Bob taps "Accept"
    │
    ▼
acceptFriendRequest(connectionId) → status = 'accepted'
    │
    ▼
Both A and B now see each other in their friends list
```

## API (`lib/friends.ts`)

### `searchUsers(query: string): Promise<Profile[]>`

- Queries `profiles` table with `ilike` (case-insensitive substring)
- Excludes the current user from results
- Returns empty array for blank/whitespace-only queries

### `sendFriendRequest(targetUserId: string): Promise<void>`

- Verifies target user exists
- Creates `friend_connections` row with `status: 'pending'`
- Throws if target not found

### `acceptFriendRequest(connectionId: string): Promise<void>`

- Updates connection status from `'pending'` to `'accepted'`

### `getFriendsForUser(connections: FriendConnection[], userId: string): string[]`

- Pure function (no DB calls)
- Filters accepted connections
- Returns friend IDs (treats connections as symmetric: A→B means both are friends)

### `generateInviteLink(userId: string): string`

- Encodes userId as a URL query parameter
- Returns a shareable link

### `parseInviteLink(link: string): string | null`

- Extracts userId from invite URL
- Returns `null` for invalid/malformed links

## Invite Links

Users can share invite links externally (via messaging apps, QR codes, etc.):

```
https://app-url.com?invite=<userId>
```

When someone opens the link:
1. `parseInviteLink()` extracts the userId
2. App calls `sendFriendRequest()` with the extracted ID
3. A pending request is created for the target user

## Real-Time Updates

The Friends page subscribes to Supabase channels for live updates:

```typescript
// Subscribe to friend activity changes
const channel = supabase
  .channel('friends-activity')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'intake_entries' }, handleChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handleChange)
  .subscribe();
```

When any friend logs water or their profile updates, the friends list refreshes automatically.

## UI Components

| Component | Purpose |
|-----------|---------|
| `FriendSearch` | Username search input + results list with "Add" buttons |
| `FriendCard` | Displays one friend's progress (name, intake bar, streak) |
| `PendingRequests` | Lists incoming requests with accept/decline buttons |
| `InviteShare` | Generates and displays shareable invite link |

## Security

- All social features are gated behind authentication (`canAccessFeature()`)
- RLS ensures users can only see their own connections and friends' intake data
- Friend search exposes only usernames (not emails or private data)
- Connection uniqueness constraint prevents duplicate requests
