# Project Progress

> Tracks completed features, ongoing work, and planned improvements for AVIEN.

## Completed Features

### Core Features
- [x] Water intake tracking with daily goals
- [x] Streak system with continuity validation
- [x] Local notification reminders (configurable schedule)
- [x] Dark/light theme toggle
- [x] Haptic feedback on interactions
- [x] Offline-first with localStorage persistence
- [x] Cloud sync via Supabase

### Authentication
- [x] Magic link authentication
- [x] Session management
- [x] Feature gating (local vs social features)

### Social Features
- [x] Friend search by username
- [x] Friend requests (send/accept/decline)
- [x] Real-time friend activity updates
- [x] Invite link sharing
- [x] Friend removal with confirmation (cascades close friend designations)
- [x] Pending requests refresh on page reload
- [x] Friends list refreshes after accepting a request

### Close Friends & Nudges
- [x] Close friend designation (💧 icon)
- [x] Close friend intake entries visibility (all friends can view)
- [x] Nudge notifications for inactive friends (24h threshold)
- [x] 2-hour nudge cooldown with timer display
- [x] Close friend intake notifications (mutual close friends only, 5-min rate limit)
- [x] Close friend added notification ("{username} added you as a close friend")
- [x] Friend removal cascades close friend designations in both directions

### Push Notifications (FCM)
- [x] FCM device token registration/refresh/unregister
- [x] Friend request push notifications (FCM v1 API, client-invoked)
- [x] Nudge push notifications (FCM v1 API, client-invoked)
- [x] Close friend intake push notifications (FCM v1 API, client-invoked, mutual only)
- [x] Close friend added push notifications (FCM v1 API, client-invoked)
- [x] Notification tap navigation (Friends page or Auth screen)
- [x] PushNotificationProvider context component
- [x] Removed broken database webhook triggers (pg_net dependency eliminated)

### Mobile (Android)
- [x] Capacitor 8 native shell
- [x] Android notification channel setup
- [x] google-services.json configuration
- [x] @capacitor-firebase/messaging integration

### UI Design Changes
- [x] NavBar restructured: 4 tabs → 3 (Home, Friends, Profile); Settings tab removed
- [x] NavBar styling: removed top border, bold active tab labels
- [x] NudgeButton redesigned: icon-only (Bell) compact mode with 32×32 tap target
- [x] NudgeButton repositioned: moved from expanded FriendCard to collapsed view, next to progress bar
- [x] FriendCard expanded view: side-by-side button layout (close friend toggle + remove friend)
- [x] Profile page: settings gear icon (top-right) navigates to /settings
- [x] Profile page: pencil icon next to username navigates to /profile/edit
- [x] Settings page: section headings restyled (text-base font-semibold text-foreground)
- [x] ReminderForm: custom dropdown arrows aligned with ChevronDown icons
- [x] Streak display: replaced 🔥 emoji with lucide-react Flame icon (theme-aware)
- [x] DailyLog: entries sorted descending (latest first)
- [x] Unit tests: 21 tests across 3 test files covering all changes

## In Progress

_No active feature work. Project released as v1.0.0._

## Planned / Backlog

- [ ] iOS support (Capacitor iOS shell)
- [ ] Notification history / inbox UI
- [ ] Weekly/monthly intake statistics
- [ ] Custom drink types (coffee, tea, etc.)
- [ ] Group challenges

## Architecture Milestones

| Milestone | Date | Description |
|-----------|------|-------------|
| Initial release | — | Core intake tracking + local notifications |
| Auth & social | — | Supabase auth, friend connections, real-time updates |
| Social enhancements | — | Close friends, nudges, intake notifications, friend removal |
| UI design changes | ✅ | Nav restructuring, NudgeButton redesign, FriendCard layout, settings/profile improvements |
| FCM v1 migration | ✅ | All push notifications migrated to FCM v1 API with client-side invocation |
| Notification fixes | ✅ | Removed broken webhooks, added close friend added notif, fixed friend removal cascade |
| v1.0.0 release | ✅ | Published APK on GitHub Releases |

## Testing Coverage

| Area | Unit Tests | Property Tests | Integration Tests |
|------|-----------|---------------|-------------------|
| Core logic (intake, streaks, storage) | ✅ | ✅ (14 properties) | — |
| Social enhancements | ✅ | ✅ (11 properties) | ✅ |
| FCM v1 migration | Planned | Planned (8 properties) | Planned |
| UI components | ✅ | ✅ (4 properties) | — |
| UI design changes | ✅ (21 tests) | N/A | — |
