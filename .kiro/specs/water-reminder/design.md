# Design Document

## Overview

Water Reminder is a mobile-first Android application for daily hydration tracking with social features. Built as a statically exported Next.js 15 app wrapped in Capacitor, it operates entirely client-side with Supabase providing backend services for authenticated users.

## Architecture

Water Reminder is a statically exported Next.js 15 application wrapped in Capacitor for Android deployment. All rendering happens client-side. Supabase provides authentication, database, and real-time capabilities for social features. Local features work fully offline via localStorage.

```
┌────────────────────────────────────────────────┐
│              Android Device (Capacitor)         │
│  ┌──────────────────────────────────────────┐  │
│  │         Next.js 15 Static Export          │  │
│  │  ┌─────────┐  ┌────────────┐  ┌──────┐  │  │
│  │  │  Pages  │  │ Components │  │  Lib  │  │  │
│  │  │ (app/)  │  │            │  │       │  │  │
│  │  └────┬────┘  └─────┬──────┘  └───┬───┘  │  │
│  │       └──────────────┼─────────────┘      │  │
│  │                      │                    │  │
│  │  ┌───────────────────┼──────────────────┐ │  │
│  │  │            Service Layer             │ │  │
│  │  │  ┌─────────┐ ┌──────────┐ ┌───────┐ │ │  │
│  │  │  │ Storage │ │ Notif.   │ │ Auth  │ │ │  │
│  │  │  │ Service │ │ Service  │ │Service│ │ │  │
│  │  │  └────┬────┘ └────┬─────┘ └───┬───┘ │ │  │
│  │  └───────┼────────────┼───────────┼─────┘ │  │
│  └──────────┼────────────┼───────────┼───────┘  │
│             │            │           │           │
│  ┌──────────┼────────────┼───────────┼────────┐ │
│  │  Capacitor Plugins    │           │        │ │
│  │  ┌──────────────┐  ┌─┴────┐  ┌───┴─────┐  │ │
│  │  │LocalNotif.   │  │Haptic│  │         │  │ │
│  │  └──────────────┘  └──────┘  │         │  │ │
│  └───────────────────────────────┼─────────┘  │ │
└──────────────────────────────────┼────────────┘ │
                                   │              
                    ┌──────────────┴──────────────┐
                    │     Supabase Backend        │
                    │  ┌──────┐ ┌─────┐ ┌──────┐ │
                    │  │ Auth │ │ DB  │ │ Real │ │
                    │  │      │ │     │ │ time │ │
                    │  └──────┘ └─────┘ └──────┘ │
                    └────────────────────────────-┘
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Native | Capacitor (Android) |
| Notifications | @capacitor/local-notifications |
| Haptics | @capacitor/haptics |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Local Storage | Web localStorage API |
| Font | Space Mono (Google Fonts) |

## Directory Structure

```
water-reminder/
├── app/
│   ├── layout.tsx          # Root layout with font, theme provider
│   ├── page.tsx            # Home page (progress ring, quick-add, log)
│   ├── settings/
│   │   └── page.tsx        # Goal, reminders, theme settings
│   ├── friends/
│   │   └── page.tsx        # Friends list, search, invites
│   └── auth/
│       └── page.tsx        # Magic-link sign in
├── components/
│   ├── ProgressRing.tsx    # SVG circular progress indicator
│   ├── QuickAddButton.tsx  # Predefined volume button
│   ├── CustomAddModal.tsx  # Custom volume input modal
│   ├── DailyLog.tsx        # Chronological intake entry list
│   ├── StreakCounter.tsx    # Consecutive days streak display
│   ├── ReminderForm.tsx    # Reminder schedule configuration
│   ├── ThemeToggle.tsx     # Light/dark mode toggle
│   ├── FriendCard.tsx      # Friend progress display card
│   ├── FriendSearch.tsx    # Username search component
│   ├── InviteShare.tsx     # Invite link + QR code
│   ├── PageTransition.tsx  # Framer Motion page wrapper
│   └── NavBar.tsx          # Bottom navigation bar
├── lib/
│   ├── types.ts            # TypeScript interfaces and types
│   ├── storage.ts          # localStorage read/write utilities
│   ├── supabase.ts         # Supabase client initialization
│   ├── auth.ts             # Authentication helpers
│   ├── notifications.ts    # Notification scheduling logic
│   ├── haptics.ts          # Haptic feedback helpers
│   ├── intake.ts           # Intake calculation logic
│   ├── streak.ts           # Streak calculation and validation logic
│   ├── friends.ts          # Friend connection utilities
│   └── constants.ts        # App constants (default goal, volumes)
├── next.config.js          # Static export configuration
├── tailwind.config.ts      # Tailwind theme (monochromatic)
├── capacitor.config.ts     # Capacitor Android configuration
└── package.json
```

## Data Models

```typescript
// lib/types.ts

interface IntakeEntry {
  id: string;              // UUID
  volume: number;          // milliliters (1-5000)
  timestamp: string;       // ISO 8601 datetime
  userId?: string;         // Supabase user ID (when authenticated)
}

interface DailyGoal {
  value: number;           // milliliters (default: 2000)
  updatedAt: string;       // ISO 8601 datetime
}

interface ReminderSchedule {
  enabled: boolean;
  intervalMinutes: number; // e.g., 30, 60, 90, 120
  activeHoursStart: string; // HH:MM format (e.g., "08:00")
  activeHoursEnd: string;   // HH:MM format (e.g., "22:00")
}

interface UserProfile {
  id: string;              // Supabase user ID
  username: string;        // Unique display name
  email: string;
  dailyGoal: number;       // milliliters
  createdAt: string;
}

interface FriendConnection {
  id: string;
  userId: string;          // Requesting user
  friendId: string;        // Target user
  status: 'pending' | 'accepted';
  createdAt: string;
}

interface FriendProgress {
  userId: string;
  username: string;
  currentIntake: number;   // total ml for today
  dailyGoal: number;
  currentStreak: number;   // consecutive days meeting goal
}

interface StreakData {
  currentStreak: number;       // consecutive days meeting Daily_Goal
  lastCompletedDate: string;   // ISO 8601 date (YYYY-MM-DD) of last day goal was met
}

interface ThemePreference {
  mode: 'light' | 'dark';
}
```

## LocalStorage Schema

```typescript
// Storage keys
const STORAGE_KEYS = {
  INTAKE_ENTRIES: 'water_reminder_intake_entries',  // IntakeEntry[]
  DAILY_GOAL: 'water_reminder_daily_goal',          // DailyGoal
  REMINDER_SCHEDULE: 'water_reminder_reminders',    // ReminderSchedule
  THEME: 'water_reminder_theme',                    // ThemePreference
  AUTH_SESSION: 'water_reminder_session',           // Session metadata
  STREAK: 'water_reminder_streak',                  // StreakData
} as const;
```

## Supabase Database Schema

```sql
-- Users table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  daily_goal INTEGER NOT NULL DEFAULT 2000,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intake entries
CREATE TABLE intake_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  volume INTEGER NOT NULL CHECK (volume BETWEEN 1 AND 5000),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Friend connections
CREATE TABLE friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  friend_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable realtime on intake_entries and profiles
ALTER PUBLICATION supabase_realtime ADD TABLE intake_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

## Components and Interfaces

### ProgressRing

SVG-based circular progress indicator. Accepts `current` (total intake in ml) and `goal` (daily goal in ml). Computes stroke-dashoffset based on percentage. Animated via Framer Motion's `motion.circle`.

```typescript
interface ProgressRingProps {
  current: number;  // current total intake in ml
  goal: number;     // daily goal in ml
}

// Percentage calculation (pure function, exported for testing)
function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max((current / goal) * 100, 0), 100);
}
```

### QuickAddButton

Tappable button that triggers haptic feedback and adds a predefined volume. Accepts `volume` and `onAdd` callback.

```typescript
interface QuickAddButtonProps {
  volume: number;     // ml to add (250, 350, 500)
  onAdd: (volume: number) => void;
}
```

### Notification Scheduling Logic

Pure function that computes notification times from schedule configuration.

```typescript
// lib/notifications.ts

function computeNotificationTimes(
  schedule: ReminderSchedule,
  referenceDate: Date
): Date[] {
  // Returns array of notification times for the day
  // All times fall within activeHoursStart..activeHoursEnd
  // Spaced at intervalMinutes apart
}

function isWithinActiveHours(
  time: Date,
  start: string,  // "HH:MM"
  end: string     // "HH:MM"
): boolean {
  // Returns true if time falls within [start, end]
}
```

### Storage Service

Abstraction over localStorage with JSON serialization, error handling, and date-based filtering.

```typescript
// lib/storage.ts

function saveIntakeEntry(entry: IntakeEntry): void;
function loadTodayEntries(): IntakeEntry[];
function saveDailyGoal(goal: DailyGoal): void;
function loadDailyGoal(): DailyGoal;
function saveTheme(theme: ThemePreference): void;
function loadTheme(): ThemePreference;
function saveReminderSchedule(schedule: ReminderSchedule): void;
function loadReminderSchedule(): ReminderSchedule;
function saveStreakData(streak: StreakData): void;
function loadStreakData(): StreakData;

// Date filtering utility (pure, exported for testing)
function filterEntriesByDate(entries: IntakeEntry[], date: Date): IntakeEntry[];
```

### Auth Service

Wraps Supabase auth for magic-link flow.

```typescript
// lib/auth.ts

function sendMagicLink(email: string): Promise<void>;
function getSession(): Session | null;
function signOut(): Promise<void>;
function onAuthStateChange(callback: (session: Session | null) => void): void;
```

### Friends Service

Handles friend search, requests, and invite link generation.

```typescript
// lib/friends.ts

function searchUsers(query: string): Promise<UserProfile[]>;
function sendFriendRequest(targetUserId: string): Promise<void>;
function acceptFriendRequest(connectionId: string): Promise<void>;
function generateInviteLink(userId: string): string;
function parseInviteLink(link: string): string | null; // returns userId or null

// Feature access check (pure, exported for testing)
function canAccessFeature(
  feature: 'intake' | 'reminders' | 'theme' | 'friends' | 'friend-progress',
  isAuthenticated: boolean
): boolean {
  const socialFeatures = ['friends', 'friend-progress'];
  if (socialFeatures.includes(feature)) return isAuthenticated;
  return true; // local features always accessible
}
```

### Intake Logic

Pure calculation functions for intake tracking.

```typescript
// lib/intake.ts

function calculateTotalIntake(entries: IntakeEntry[]): number;
function isValidVolume(volume: number): boolean; // 1 <= volume <= 5000
function sortEntriesChronologically(entries: IntakeEntry[]): IntakeEntry[];
function isToday(timestamp: string): boolean;
```

### Streak Logic

Pure calculation functions for streak tracking and validation.

```typescript
// lib/streak.ts

/**
 * Determines whether the daily goal was met for a given set of entries.
 */
function isDailyGoalMet(entries: IntakeEntry[], goal: number): boolean {
  return calculateTotalIntake(entries) >= goal;
}

/**
 * Calculates the updated streak value based on whether today's goal was met.
 * Returns the new streak: currentStreak + 1 if goal met, 0 otherwise.
 */
function updateStreak(currentStreak: number, goalMet: boolean): number {
  return goalMet ? currentStreak + 1 : 0;
}

/**
 * Validates streak continuity based on the last completed date and the current date.
 * - If lastCompletedDate is yesterday or today, streak is preserved.
 * - If lastCompletedDate is more than 1 day ago, streak resets to 0.
 * - If lastCompletedDate is null/undefined, streak is 0.
 */
function validateStreakContinuity(
  streakData: StreakData,
  currentDate: Date
): number {
  // Returns validated streak value
}

/**
 * Formats the date portion of a Date object as YYYY-MM-DD.
 */
function toDateString(date: Date): string;
```

### StreakCounter Component

Displays the current streak count with a label, positioned alongside the ProgressRing on the home page.

```typescript
interface StreakCounterProps {
  streak: number;  // current consecutive days
}
```

## Page Flow

1. **Home (/)** — Progress ring, quick-add buttons (250/350/500/custom), daily log
2. **Settings (/settings)** — Daily goal input, reminder schedule form, theme toggle
3. **Friends (/friends)** — Friend list with real-time progress, search, invite share
4. **Auth (/auth)** — Email input for magic-link, sign-out button

Navigation via bottom NavBar with Framer Motion page transitions.

## Theme System

Tailwind CSS with CSS custom properties for monochromatic theming:

```typescript
// tailwind.config.ts
{
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px', // sharp corners everywhere
      },
    },
  },
}
```

Light theme: `--foreground: #000; --background: #fff; --muted: #666; --border: #000`  
Dark theme: `--foreground: #fff; --background: #000; --muted: #999; --border: #fff`

## Error Handling

| Scenario | Behavior |
|----------|----------|
| localStorage unavailable | Show error toast, attempt Supabase fallback if authenticated |
| Notification permission denied | Show informative message, disable reminder toggle |
| Notification scheduling failure | Show error toast with retry option |
| Supabase real-time disconnect | Show connectivity indicator, auto-reconnect |
| Friend request to non-existent user | Show "User not found" error message |
| Invalid custom volume input | Disable add button, show validation hint |

## Sync Strategy

- **Write-local-first**: All intake entries and settings save to localStorage immediately
- **Background sync**: When authenticated, changes are pushed to Supabase asynchronously
- **Conflict resolution**: Server timestamp wins for remote conflicts; local data is authoritative until synced
- **Offline capability**: Full local feature set works without network; sync queues for later

## Testing Strategy

### Unit Tests
- **Storage module**: Verify localStorage read/write with specific examples (empty state, single entry, multiple entries)
- **Component rendering**: Verify ProgressRing renders correct SVG paths, QuickAddButtons trigger correct callbacks
- **Auth gating**: Verify social features are hidden when unauthenticated
- **Edge cases**: Corrupted localStorage, notification scheduling failures, invalid invite links
- **Defaults**: Verify 2000ml goal default, dark theme default

### Property-Based Tests
- Pure computation functions (percentage calculation, schedule generation, invite link round-trip)
- Data persistence round-trips (localStorage save/load for entries, goal, theme)
- Input validation (custom volume boundaries)
- Invariants (log ordering, active hours bounds)

### Integration Tests
- Supabase auth flow (magic link send, session establishment)
- Data sync (entries and goal sync to Supabase)
- Real-time subscriptions (friend progress updates)
- Friend connection workflow (search, request, accept)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Progress percentage is bounded and proportional

*For any* current intake value ≥ 0 and any daily goal > 0, the calculated progress percentage SHALL equal `(current / goal) * 100` clamped to the range [0, 100].

**Validates: Requirements 1.1, 1.4**

### Property 2: Custom volume validation accepts valid range

*For any* numeric input value, the volume validation function SHALL return true if and only if the value is an integer between 1 and 5000 inclusive.

**Validates: Requirements 1.3**

### Property 3: Daily log is chronologically ordered

*For any* set of intake entries with distinct timestamps, sorting them chronologically SHALL produce a list where each entry's timestamp is less than or equal to the next entry's timestamp.

**Validates: Requirements 1.5**

### Property 4: Date filtering returns only matching entries

*For any* set of intake entries spanning multiple calendar dates and any target date, filtering by that date SHALL return exactly those entries whose timestamp falls within that calendar date, and no others.

**Validates: Requirements 1.6, 2.2**

### Property 5: Intake entry persistence round-trip

*For any* valid IntakeEntry, saving it to storage and then loading today's entries SHALL include an entry with the same id, volume, and timestamp.

**Validates: Requirements 2.1**

### Property 6: Daily goal persistence round-trip

*For any* valid daily goal value (positive integer), saving it to storage and then loading the goal SHALL return the same value.

**Validates: Requirements 3.3**

### Property 7: Notification times fall within active hours

*For any* valid ReminderSchedule with active hours [start, end] and interval > 0, all computed notification times SHALL have their time-of-day component within the [start, end] range, and consecutive notifications SHALL be spaced exactly intervalMinutes apart.

**Validates: Requirements 4.2, 4.3**

### Property 8: Schedule update produces fresh notification set

*For any* two distinct ReminderSchedule configurations applied in sequence, the resulting set of scheduled notifications SHALL exactly match those computed from the second configuration only, with no remnants of the first.

**Validates: Requirements 4.5**

### Property 9: Feature access respects authentication boundary

*For any* feature identifier, `canAccessFeature` SHALL return true for local features (intake, reminders, theme) regardless of authentication state, and SHALL return true for social features (friends, friend-progress) only when the user is authenticated.

**Validates: Requirements 7.4, 7.5**

### Property 10: Username search returns only matching users

*For any* search query string and any dataset of user profiles, the search results SHALL contain only profiles whose username contains the query as a substring (case-insensitive).

**Validates: Requirements 8.1**

### Property 11: Friend connection is symmetric

*For any* accepted friend connection between user A and user B, user A SHALL appear in user B's friend list AND user B SHALL appear in user A's friend list.

**Validates: Requirements 8.3**

### Property 12: QR code invite link round-trip

*For any* valid user ID, generating an invite link and then parsing that invite link SHALL return the original user ID.

**Validates: Requirements 8.4, 8.5**

### Property 13: Streak continuity validation

*For any* StreakData with lastCompletedDate equal to yesterday, `validateStreakContinuity` SHALL return the current streak value unchanged. *For any* StreakData with lastCompletedDate older than yesterday (more than 1 day gap), `validateStreakContinuity` SHALL return 0. *For any* StreakData with lastCompletedDate equal to today, `validateStreakContinuity` SHALL return the current streak value unchanged.

**Validates: Requirements 12.1, 12.2, 12.7**

### Property 14: Streak increment is monotonic per day

*For any* day where `isDailyGoalMet` returns true, `updateStreak(currentStreak, true)` SHALL return `currentStreak + 1`. *For any* day where `isDailyGoalMet` returns false, `updateStreak(currentStreak, false)` SHALL return 0.

**Validates: Requirements 12.1, 12.2**
