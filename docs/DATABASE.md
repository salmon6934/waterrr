# Database

## Provider

[Supabase](https://supabase.com) — managed PostgreSQL with built-in Auth, Realtime, Row Level Security, and Edge Functions.

## Schema

### `profiles`

Stores user identity and hydration metadata. One row per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, references `auth.users` | User's auth ID |
| `username` | `text` | UNIQUE, NOT NULL | Display name chosen during onboarding |
| `email` | `text` | NOT NULL | User's email address |
| `daily_goal` | `integer` | DEFAULT 2000 | Daily water intake goal (ml) |
| `current_streak` | `integer` | DEFAULT 0 | Consecutive goal-meeting days |
| `last_completed_date` | `date` | NULLABLE | Last date user met their goal |
| `created_at` | `timestamptz` | DEFAULT now() | Account creation timestamp |

### `intake_entries`

Individual water intake logs. Many rows per user per day.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Entry ID (generated client-side) |
| `user_id` | `uuid` | FK → profiles.id, NOT NULL | Owner of this entry |
| `volume` | `integer` | CHECK (1 ≤ volume ≤ 5000) | Amount of water in ml |
| `timestamp` | `text` | NOT NULL | ISO 8601 datetime string |

### `friend_connections`

Directional friend request records. Status transitions from `pending` → `accepted`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Connection ID |
| `user_id` | `uuid` | FK → profiles.id, NOT NULL | Request sender |
| `friend_id` | `uuid` | FK → profiles.id, NOT NULL | Request receiver |
| `status` | `text` | CHECK (status IN ('pending', 'accepted')) | Connection state |
| `created_at` | `timestamptz` | DEFAULT now() | Request timestamp |
| — | — | UNIQUE(user_id, friend_id) | Prevent duplicate requests |

### `close_friends`

Close friend designations. Allows viewing detailed intake entries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `uuid` | FK → auth.users, PK part 1 | User who designated the close friend |
| `friend_id` | `uuid` | FK → auth.users, PK part 2 | The friend designated as close |
| `created_at` | `timestamptz` | DEFAULT now() | When designation was made |

**Primary Key:** (`user_id`, `friend_id`)

### `device_tokens`

FCM device registrations for push notification delivery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Token record ID |
| `user_id` | `uuid` | FK → auth.users, NOT NULL | Token owner |
| `token` | `text` | NOT NULL, UNIQUE | FCM registration token |
| `created_at` | `timestamptz` | DEFAULT now() | Registration timestamp |

### `nudges`

Nudge notification records with cooldown tracking (2h between nudges per pair).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Nudge record ID |
| `sender_id` | `uuid` | FK → auth.users, NOT NULL | User who sent the nudge |
| `receiver_id` | `uuid` | FK → auth.users, NOT NULL | User who received the nudge |
| `sent_at` | `timestamptz` | DEFAULT now(), NOT NULL | When the nudge was sent |

### `close_friend_notifications`

Rate-limiting records for close friend intake notifications (5-min window per pair).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Notification record ID |
| `logger_id` | `uuid` | FK → auth.users, NOT NULL | User who logged water |
| `recipient_id` | `uuid` | FK → auth.users, NOT NULL | User who received notification |
| `sent_at` | `timestamptz` | DEFAULT now(), NOT NULL | When notification was sent |

## Row Level Security (RLS)

All tables have RLS enabled. Policies enforce data isolation at the database level.

### profiles

| Operation | Policy |
|-----------|--------|
| SELECT | Anyone can read any profile (needed for friend search) |
| INSERT | Only the owner (`auth.uid() = id`) |
| UPDATE | Only the owner (`auth.uid() = id`) |

### intake_entries

| Operation | Policy |
|-----------|--------|
| SELECT | Owner OR accepted friends |
| INSERT | Only the owner (`auth.uid() = user_id`) |
| UPDATE | Only the owner |
| DELETE | Only the owner |

### friend_connections

| Operation | Policy |
|-----------|--------|
| SELECT | Participants (`auth.uid() IN (user_id, friend_id)`) |
| INSERT | Sender (`auth.uid() = user_id`) |
| UPDATE | Receiver can accept (`auth.uid() = friend_id`) |
| DELETE | Participants can delete |

### close_friends

| Operation | Policy |
|-----------|--------|
| SELECT | Owner (`auth.uid() = user_id`) |
| INSERT | Owner (`auth.uid() = user_id`) |
| DELETE | Owner (`auth.uid() = user_id`) |

### device_tokens

| Operation | Policy |
|-----------|--------|
| SELECT | Owner (`auth.uid() = user_id`) |
| INSERT | Owner (`auth.uid() = user_id`) |
| UPDATE | Owner (`auth.uid() = user_id`) |
| DELETE | Owner (`auth.uid() = user_id`) |
| Service role | Full read access (Edge Functions) |

### nudges

| Operation | Policy |
|-----------|--------|
| SELECT | Participants (`auth.uid() IN (sender_id, receiver_id)`) |
| INSERT | Service role only (via Edge Function) |

### close_friend_notifications

| Operation | Policy |
|-----------|--------|
| SELECT | Recipient (`auth.uid() = recipient_id`) |
| INSERT | Service role only (via Edge Function) |

## Database Webhooks

No database webhooks are used. All push notification triggers are client-side — the app invokes Edge Functions directly via `supabase.functions.invoke()` after relevant actions (fire-and-forget pattern).

## Realtime

Realtime subscriptions are enabled on:

- `intake_entries` — powers live friend activity updates
- `profiles` — powers live streak/goal updates for friends

Clients subscribe via Supabase channels with PostgreSQL CDC (Change Data Capture). The `lib/realtime.ts` module manages subscriptions with auto-reconnect and connectivity status tracking.

## Indexes

```sql
CREATE INDEX idx_intake_entries_user_id ON intake_entries(user_id);
CREATE INDEX idx_intake_entries_timestamp ON intake_entries(timestamp);
CREATE INDEX idx_friend_connections_user_id ON friend_connections(user_id);
CREATE INDEX idx_friend_connections_friend_id ON friend_connections(friend_id);
CREATE INDEX idx_friend_connections_status ON friend_connections(status);
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_nudges_sender_receiver ON nudges(sender_id, receiver_id, sent_at DESC);
CREATE INDEX idx_cf_notifications_pair ON close_friend_notifications(logger_id, recipient_id, sent_at DESC);
```

## Migrations

Database setup is currently manual via the Supabase dashboard SQL editor. For production, consider using [Supabase CLI migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations).
