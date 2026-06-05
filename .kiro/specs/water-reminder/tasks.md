# Implementation Plan: Water Reminder

## Overview

Implement a mobile-first hydration tracking Android app using Next.js 15 static export with Capacitor. The build progresses from project scaffolding and core types, through local-first intake and streak tracking, to settings/reminders, theme system, authentication, social features, and final integration with animations and page transitions.

## Tasks

- [ ] 1. Set up project structure and configuration
  - [x] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and static export
    - Create Next.js 15 app with App Router
    - Configure `next.config.js` with `output: 'export'`
    - Install dependencies: framer-motion, lucide-react, @supabase/supabase-js
    - Install Capacitor: @capacitor/core, @capacitor/cli, @capacitor/local-notifications, @capacitor/haptics
    - Configure `capacitor.config.ts` for Android
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_

  - [x] 1.2 Configure Tailwind CSS with monochromatic theme and Space Mono font
    - Set up `tailwind.config.ts` with CSS custom properties for foreground/background/muted/border
    - Configure `darkMode: 'class'` and `borderRadius: { DEFAULT: '0px' }`
    - Add Space Mono from Google Fonts in root layout
    - Define light/dark theme CSS variables
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.6_

  - [x] 1.3 Create core type definitions and constants
    - Define all interfaces in `lib/types.ts`: IntakeEntry, DailyGoal, ReminderSchedule, UserProfile, FriendConnection, FriendProgress, StreakData, ThemePreference
    - Define constants in `lib/constants.ts`: default goal (2000ml), preset volumes (250, 350, 500), storage keys (including STREAK key)
    - _Requirements: 1.2, 3.2, 11.4, 11.5, 12.4_

- [x] 2. Implement storage service, intake logic, and streak logic
  - [x] 2.1 Implement localStorage service (`lib/storage.ts`)
    - Implement `saveIntakeEntry`, `loadTodayEntries`, `saveDailyGoal`, `loadDailyGoal`
    - Implement `saveTheme`, `loadTheme`, `saveReminderSchedule`, `loadReminderSchedule`
    - Implement `saveStreakData`, `loadStreakData`
    - Implement `filterEntriesByDate` utility for date-based filtering
    - Add JSON serialization/deserialization with error handling
    - _Requirements: 2.1, 2.2, 2.4, 3.3, 6.3, 12.4, 12.7_

  - [x] 2.2 Write property test for intake entry persistence round-trip
    - **Property 5: Intake entry persistence round-trip**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Write property test for daily goal persistence round-trip
    - **Property 6: Daily goal persistence round-trip**
    - **Validates: Requirements 3.3**

  - [x] 2.4 Implement intake calculation logic (`lib/intake.ts`)
    - Implement `calculateTotalIntake` (sum of all entry volumes)
    - Implement `isValidVolume` (1 <= volume <= 5000)
    - Implement `sortEntriesChronologically` (sort by timestamp)
    - Implement `isToday` (check if timestamp is current calendar date)
    - Implement `calculateProgress` (percentage clamped 0–100)
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [x] 2.5 Implement streak calculation logic (`lib/streak.ts`)
    - Implement `isDailyGoalMet` (check if total entries volume >= goal)
    - Implement `updateStreak` (increment streak if goal met, reset to 0 otherwise)
    - Implement `validateStreakContinuity` (check lastCompletedDate against current date; preserve streak if yesterday or today, reset if gap > 1 day)
    - Implement `toDateString` (format Date as YYYY-MM-DD)
    - _Requirements: 12.1, 12.2, 12.7_

  - [x] 2.6 Write property test for progress percentage calculation
    - **Property 1: Progress percentage is bounded and proportional**
    - **Validates: Requirements 1.1, 1.4**

  - [x] 2.7 Write property test for custom volume validation
    - **Property 2: Custom volume validation accepts valid range**
    - **Validates: Requirements 1.3**

  - [x] 2.8 Write property test for chronological ordering
    - **Property 3: Daily log is chronologically ordered**
    - **Validates: Requirements 1.5**

  - [x] 2.9 Write property test for date filtering
    - **Property 4: Date filtering returns only matching entries**
    - **Validates: Requirements 1.6, 2.2**

  - [x] 2.10 Write property test for streak continuity validation
    - **Property 13: Streak continuity validation**
    - **Validates: Requirements 12.1, 12.2, 12.7**

  - [x] 2.11 Write property test for streak increment
    - **Property 14: Streak increment is monotonic per day**
    - **Validates: Requirements 12.1, 12.2**

- [~] 3. Checkpoint - Core logic verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement notification and haptics services
  - [x] 4.1 Implement notification scheduling logic (`lib/notifications.ts`)
    - Implement `computeNotificationTimes` to generate notification times within active hours at configured intervals
    - Implement `isWithinActiveHours` to check if a time falls within [start, end]
    - Integrate Capacitor LocalNotifications for scheduling/cancelling
    - Handle notification permission requests and failure cases
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Write property test for notification times within active hours
    - **Property 7: Notification times fall within active hours**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 4.3 Write property test for schedule update producing fresh notifications
    - **Property 8: Schedule update produces fresh notification set**
    - **Validates: Requirements 4.5**

  - [x] 4.4 Implement haptic feedback helpers (`lib/haptics.ts`)
    - Implement short vibration for quick-add taps
    - Implement success haptic pattern for 100% goal completion
    - Wrap Capacitor Haptics with fallback for web environment
    - _Requirements: 5.1, 5.2_

- [x] 5. Implement Supabase and authentication services
  - [x] 5.1 Initialize Supabase client (`lib/supabase.ts`)
    - Create and export Supabase client with environment variables
    - Configure auth settings for magic-link flow
    - _Requirements: 11.1, 7.1_

  - [x] 5.2 Implement authentication service (`lib/auth.ts`)
    - Implement `sendMagicLink` for email-based auth
    - Implement `getSession` to retrieve current session
    - Implement `signOut` to clear session
    - Implement `onAuthStateChange` listener
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Implement feature access gating (`lib/friends.ts` — `canAccessFeature`)
    - Implement `canAccessFeature` that allows local features always and social features only when authenticated
    - _Requirements: 7.4, 7.5_

  - [x] 5.4 Write property test for feature access boundary
    - **Property 9: Feature access respects authentication boundary**
    - **Validates: Requirements 7.4, 7.5**

- [x] 6. Implement friends service
  - [x] 6.1 Implement friend search and connection logic (`lib/friends.ts`)
    - Implement `searchUsers` to query Supabase profiles by username substring
    - Implement `sendFriendRequest` to create pending connection
    - Implement `acceptFriendRequest` to update status to accepted
    - Implement `generateInviteLink` and `parseInviteLink` for invite URLs
    - Handle error case for non-existent users
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 6.2 Write property test for invite link round-trip
    - **Property 12: QR code invite link round-trip**
    - **Validates: Requirements 8.4, 8.5**

  - [x] 6.3 Write property test for username search filtering
    - **Property 10: Username search returns only matching users**
    - **Validates: Requirements 8.1**

  - [x] 6.4 Write property test for friend connection symmetry
    - **Property 11: Friend connection is symmetric**
    - **Validates: Requirements 8.3**

- [x] 7. Checkpoint - Services layer verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Create ProgressRing component
    - Build SVG circular progress with stroke-dashoffset based on `calculateProgress`
    - Animate fill with Framer Motion `motion.circle`
    - Display percentage text in center
    - _Requirements: 1.1, 1.4, 10.5_

  - [x] 8.2 Create QuickAddButton and CustomAddModal components
    - Build QuickAddButton with volume label and haptic trigger on tap
    - Build CustomAddModal with numeric input, validation (1–5000), and submit
    - _Requirements: 1.2, 1.3, 5.1_

  - [x] 8.3 Create DailyLog component
    - Render chronological list of IntakeEntry items with volume and formatted timestamp
    - Animate entry appearance with Framer Motion
    - _Requirements: 1.5, 10.6_

  - [x] 8.4 Create StreakCounter component
    - Display current streak count with a label (e.g., "🔥 5 days")
    - Accept `streak` prop (number of consecutive days)
    - Style with monochromatic theme, positioned alongside ProgressRing
    - _Requirements: 12.3_

  - [x] 8.5 Create ReminderForm component
    - Build form with interval selector, active hours start/end time pickers
    - Add enable/disable toggle
    - Wire to notification scheduling service
    - _Requirements: 4.1_

  - [x] 8.6 Create ThemeToggle component
    - Build toggle switch for light/dark mode
    - Apply `dark` class to document and persist selection
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.7 Create FriendCard and FriendSearch components
    - Build FriendCard showing username, current intake progress bar, daily goal, and current streak
    - Build FriendSearch with text input and search results list
    - _Requirements: 9.1, 8.1, 12.6_

  - [x] 8.8 Create InviteShare component
    - Build shareable invite link display with copy button
    - Generate and display QR code encoding the invite link
    - _Requirements: 8.4, 8.5_

  - [x] 8.9 Create PageTransition and NavBar components
    - Build PageTransition wrapper using Framer Motion AnimatePresence
    - Build bottom NavBar with navigation links to Home, Settings, Friends, Auth pages
    - _Requirements: 10.7, 11.4_

- [x] 9. Assemble pages and wire components
  - [x] 9.1 Implement Home page (`app/page.tsx`)
    - Integrate ProgressRing, StreakCounter, QuickAddButtons (250/350/500/custom), CustomAddModal, DailyLog
    - Wire intake state: load from storage on mount, save on add, update progress ring
    - Wire streak state: load streak from storage on mount, validate continuity, update streak when goal is met
    - Trigger success haptic when reaching 100%
    - Reset daily log on date change
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.2, 12.1, 12.2, 12.3, 12.7_

  - [x] 9.2 Implement Settings page (`app/settings/page.tsx`)
    - Integrate daily goal input with save to storage
    - Integrate ReminderForm with notification scheduling
    - Integrate ThemeToggle
    - _Requirements: 3.1, 3.3, 4.1, 6.1_

  - [x] 9.3 Implement Friends page (`app/friends/page.tsx`)
    - Integrate FriendCard list with real-time Supabase subscriptions (including streak display)
    - Integrate FriendSearch with request sending
    - Integrate InviteShare component
    - Show connectivity indicator on real-time disconnect
    - Gate access behind authentication check
    - _Requirements: 8.1, 8.2, 8.4, 9.1, 9.2, 9.3, 9.4, 12.6_

  - [x] 9.4 Implement Auth page (`app/auth/page.tsx`)
    - Build magic-link email input form
    - Handle auth state change and redirect
    - Show sign-out button when authenticated
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.5 Implement root layout (`app/layout.tsx`)
    - Set up Space Mono font via next/font/google
    - Add theme provider with dark class on html element
    - Wrap pages in PageTransition
    - Include NavBar
    - Add `'use client'` directive
    - _Requirements: 10.2, 10.3, 10.7, 11.2_

- [x] 10. Implement data sync with Supabase
  - [x] 10.1 Implement background sync for intake entries, daily goal, and streak
    - On auth state change, sync local intake entries to Supabase
    - Sync daily goal changes to Supabase when authenticated
    - Sync streak data (currentStreak, lastCompletedDate) to Supabase profiles table when authenticated
    - Implement fallback: load from Supabase if localStorage is unavailable
    - _Requirements: 2.3, 2.4, 3.4, 12.5_

  - [x] 10.2 Implement real-time friend progress subscriptions
    - Subscribe to intake_entries and profiles tables for friends
    - Update FriendCard data (including streak) within 5 seconds of remote change
    - Handle disconnect/reconnect with connectivity indicator
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.6_

- [~] 11. Final checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All components use `'use client'` directive for static export compatibility
- Capacitor plugins (haptics, notifications) should gracefully degrade in web/dev environment
- Streak logic (lib/streak.ts) is placed in the same wave as intake logic (lib/intake.ts) since they are closely related

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.4", "2.5", "4.4", "5.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "4.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 8, "tasks": ["10.1", "10.2"] }
  ]
}
```
