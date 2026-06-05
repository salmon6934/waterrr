# Requirements Document

## Introduction

Water Reminder is a mobile-first Android application built with Next.js 15 (App Router), Capacitor, and Supabase. The application helps users track daily water intake, set hydration reminders, and share progress with friends in real time. The app features a monochromatic black/white aesthetic with smooth animations and local notification support.

## Glossary

- **App**: The Water Reminder Android application built with Next.js 15 and Capacitor
- **Progress_Ring**: A circular SVG element that visually represents daily water intake as a percentage of the user's goal
- **Quick_Add_Button**: A tappable button that adds a predefined or custom volume of water to the daily intake log
- **Daily_Log**: A chronological list of all water intake entries recorded for the current day
- **Reminder_Schedule**: A user-configured set of time intervals and active hours during which the App sends hydration notifications
- **Active_Hours**: The time window (start and end) during which the App is permitted to send reminder notifications
- **Supabase_Backend**: The Supabase instance providing Postgres database, authentication, and real-time subscription services
- **Friend**: Another user who has established a mutual connection with the current user
- **Intake_Entry**: A single record of water consumed, including volume in milliliters and timestamp
- **Daily_Goal**: The target volume of water in milliliters that the user aims to consume each day
- **Streak**: The count of consecutive calendar days on which the user's total Intake_Entry volume met or exceeded the Daily_Goal
- **Theme**: The visual mode of the App, either light or dark
- **Local_Storage**: The browser localStorage API used for persisting user data locally on the device
- **Notification_Service**: The Capacitor LocalNotifications plugin used for scheduling and delivering hydration reminders

## Requirements

### Requirement 1: Daily Water Intake Tracking

**User Story:** As a user, I want to log my water intake throughout the day, so that I can monitor my hydration progress toward my daily goal.

#### Acceptance Criteria

1. THE App SHALL display a Progress_Ring on the home page showing the ratio of current daily intake to the Daily_Goal as a percentage from 0 to 100.
2. WHEN the user taps a Quick_Add_Button with a predefined volume (250ml, 350ml, or 500ml), THE App SHALL add an Intake_Entry with the selected volume and the current timestamp to the Daily_Log.
3. WHEN the user taps the custom Quick_Add_Button, THE App SHALL present a numeric input allowing the user to specify a volume in milliliters between 1 and 5000.
4. WHEN a new Intake_Entry is added, THE App SHALL update the Progress_Ring to reflect the new total intake percentage.
5. THE App SHALL display the Daily_Log as a chronological list of all Intake_Entry records for the current day, showing volume and timestamp for each entry.
6. WHEN the calendar date changes, THE App SHALL reset the daily intake total to zero and clear the Daily_Log for the new day.

### Requirement 2: Data Persistence

**User Story:** As a user, I want my intake data to persist across app sessions, so that I do not lose my progress if I close the app.

#### Acceptance Criteria

1. WHEN a new Intake_Entry is added, THE App SHALL save the Intake_Entry to Local_Storage.
2. WHEN the App is opened, THE App SHALL load all Intake_Entry records for the current day from Local_Storage and display them in the Daily_Log.
3. WHEN the user is authenticated, THE App SHALL sync Intake_Entry records to the Supabase_Backend.
4. IF Local_Storage is unavailable or corrupted, THEN THE App SHALL display an error message and attempt to retrieve data from the Supabase_Backend.

### Requirement 3: Daily Goal Configuration

**User Story:** As a user, I want to set my own daily water intake goal, so that the app reflects my personal hydration needs.

#### Acceptance Criteria

1. THE App SHALL provide a settings page where the user can configure the Daily_Goal in milliliters.
2. THE App SHALL default the Daily_Goal to 2000ml for new users.
3. WHEN the user updates the Daily_Goal, THE App SHALL save the new value to Local_Storage and update the Progress_Ring calculation.
4. WHEN the user is authenticated, THE App SHALL sync the Daily_Goal to the Supabase_Backend.

### Requirement 4: Reminder Scheduling

**User Story:** As a user, I want to receive periodic hydration reminders during my active hours, so that I remember to drink water throughout the day.

#### Acceptance Criteria

1. THE App SHALL provide a settings interface for the user to configure the Reminder_Schedule, including interval frequency and Active_Hours (start time and end time).
2. WHEN the user saves a Reminder_Schedule, THE App SHALL schedule local notifications via the Notification_Service at the configured interval within the Active_Hours.
3. WHILE the current time is outside the Active_Hours, THE App SHALL suppress all reminder notifications.
4. WHEN a scheduled reminder fires, THE Notification_Service SHALL deliver a local notification with a hydration prompt message.
5. WHEN the user updates the Reminder_Schedule, THE App SHALL cancel all previously scheduled notifications and reschedule based on the new configuration.
6. IF the Notification_Service fails to schedule a notification, THEN THE App SHALL display an error message informing the user that reminders could not be set.

### Requirement 5: Haptic Feedback

**User Story:** As a user, I want tactile feedback when I log water, so that interactions feel responsive and satisfying.

#### Acceptance Criteria

1. WHEN the user taps a Quick_Add_Button, THE App SHALL trigger a short haptic vibration via Capacitor Haptics.
2. WHEN the Progress_Ring reaches 100 percent, THE App SHALL trigger a success haptic pattern via Capacitor Haptics.

### Requirement 6: Theme Toggle

**User Story:** As a user, I want to switch between light and dark modes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle on the settings page to switch between light Theme and dark Theme.
2. WHEN the user toggles the Theme, THE App SHALL apply the selected Theme to all UI elements with a monochromatic black/white palette.
3. THE App SHALL persist the selected Theme in Local_Storage and restore the Theme on app launch.
4. THE App SHALL default to dark Theme for new users.

### Requirement 7: Authentication

**User Story:** As a user, I want to sign in to my account, so that I can access social features and sync my data across devices.

#### Acceptance Criteria

1. THE App SHALL provide email and magic-link authentication via Supabase_Backend.
2. WHEN the user submits a valid email address for magic-link login, THE Supabase_Backend SHALL send a magic link to the provided email address.
3. WHEN the user clicks the magic link, THE App SHALL authenticate the user and establish a session.
4. WHEN the user signs out, THE App SHALL clear the session and restrict access to social features.
5. WHILE the user is unauthenticated, THE App SHALL allow full access to local tracking features (intake logging, reminders, theme).

### Requirement 8: Friends Connection

**User Story:** As a user, I want to connect with friends, so that we can see each other's hydration progress and stay motivated together.

#### Acceptance Criteria

1. WHEN the user searches for another user by username, THE App SHALL query the Supabase_Backend and display matching results.
2. WHEN the user sends a friend request, THE Supabase_Backend SHALL create a pending connection record between the two users.
3. WHEN a friend request is accepted, THE Supabase_Backend SHALL establish a mutual Friend connection between both users.
4. THE App SHALL provide a shareable invite link for friend connections.
5. THE App SHALL provide a QR code that encodes the invite link for in-person friend connections.
6. WHEN a user opens a valid invite link or scans a valid QR code, THE App SHALL send a friend request to the inviting user.
7. IF a friend request is sent to a non-existent user, THEN THE App SHALL display an error message stating the user was not found.

### Requirement 9: Real-Time Friend Progress

**User Story:** As a user, I want to see my friends' live water intake progress, so that I can stay motivated and encourage them.

#### Acceptance Criteria

1. WHILE the user is authenticated and has at least one Friend, THE App SHALL display a friends list showing each Friend's current daily intake and Daily_Goal.
2. WHEN a Friend adds an Intake_Entry, THE App SHALL update the displayed progress for that Friend within 5 seconds via Supabase real-time subscription.
3. WHEN a Friend updates their Daily_Goal, THE App SHALL reflect the new goal in the friends list within 5 seconds via Supabase real-time subscription.
4. IF the real-time connection to the Supabase_Backend is lost, THEN THE App SHALL display a connectivity indicator and attempt to reconnect.

### Requirement 10: Visual Design and Animations

**User Story:** As a user, I want a clean, animated interface, so that the app feels polished and engaging to use.

#### Acceptance Criteria

1. THE App SHALL use a monochromatic black and white color palette with no colored accents for all UI elements.
2. THE App SHALL use a distinctive Google Font that is not Inter and not Roboto.
3. THE App SHALL render all layouts in a single-column mobile-first format with a maximum width of 390 pixels.
4. THE App SHALL use sharp corners (zero border radius) on all UI elements.
5. WHEN the Progress_Ring updates, THE App SHALL animate the ring fill transition using Framer Motion.
6. WHEN a new Intake_Entry appears in the Daily_Log, THE App SHALL animate the entry appearance using Framer Motion.
7. WHEN the user navigates between pages, THE App SHALL apply page transition animations using Framer Motion.

### Requirement 11: Application Architecture

**User Story:** As a developer, I want the app structured as a static export with client-side rendering, so that it can be bundled as an Android app via Capacitor.

#### Acceptance Criteria

1. THE App SHALL use Next.js 15 App Router with static export configuration (output: 'export').
2. THE App SHALL render all pages as client components ('use client' directive).
3. THE App SHALL contain no API routes or server-side rendering logic.
4. THE App SHALL organize source code into app/ (pages), components/ (UI components), and lib/ (utilities, types, services) directories.
5. THE App SHALL use TypeScript for all source files.
6. THE App SHALL use Tailwind CSS for styling.
7. THE App SHALL use Lucide React for iconography.

### Requirement 12: Streak Tracking

**User Story:** As a user, I want to see how many consecutive days I have met my daily hydration goal, so that I stay motivated to maintain my habit.

#### Acceptance Criteria

1. WHEN the total Intake_Entry volume for a calendar day meets or exceeds the Daily_Goal, THE App SHALL increment the Streak counter by one at the end of that day.
2. WHEN the total Intake_Entry volume for a calendar day is less than the Daily_Goal at the end of that day, THE App SHALL reset the Streak counter to zero.
3. THE App SHALL display the current Streak value on the home page alongside the Progress_Ring.
4. THE App SHALL persist the Streak value and the date of the last completed goal day in Local_Storage.
5. WHEN the user is authenticated, THE App SHALL sync the Streak value to the Supabase_Backend.
6. WHILE the user is authenticated and viewing the friends list, THE App SHALL display each Friend's current Streak value alongside their daily intake progress.
7. WHEN the App is opened, THE App SHALL load the persisted Streak data from Local_Storage and validate the Streak against the current date to determine continuity.
