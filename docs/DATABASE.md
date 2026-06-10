# Database

## Provider

[Supabase](https://supabase.com) — managed PostgreSQL with built-in Auth, Realtime, and Row Level Security.

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
| `timestamp` | `bigint` | NOT NULL | Unix timestamp (ms) when logged |

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

## Realtime

Realtime subscriptions are enabled on:

- `intake_entries` — powers live friend activity updates
- `profiles` — powers live streak/goal updates for friends

Clients subscribe via Supabase channels with PostgreSQL CDC (Change Data Capture).

## Indexes

Recommended indexes for production performance:

```sql
CREATE INDEX idx_intake_entries_user_id ON intake_entries(user_id);
CREATE INDEX idx_intake_entries_timestamp ON intake_entries(timestamp);
CREATE INDEX idx_friend_connections_user_id ON friend_connections(user_id);
CREATE INDEX idx_friend_connections_friend_id ON friend_connections(friend_id);
CREATE INDEX idx_friend_connections_status ON friend_connections(status);
```

## Migrations

Database setup is currently manual via the Supabase dashboard SQL editor. For production, consider using [Supabase CLI migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations).
