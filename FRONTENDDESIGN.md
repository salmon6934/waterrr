# Frontend Design Experiments

Each task is an independent visual tweak. Apply one at a time, verify on device, then keep or revert before moving to the next.

---

## Task 1: One Accent Color

Add a single accent color (cyan/blue — `#00D4FF`) used only for:
- Progress ring stroke
- Active nav tab indicator
- "Save" / "Get Started" button fills
- Streak fire icon highlight

Everything else stays black & white. The accent draws the eye to key interactive elements.

**Files to modify:** `tailwind.config.ts`, `globals.css`, `ProgressRing.tsx`, `NavBar.tsx`, `StreakCounter.tsx`

---

## Task 2: Rounded Corners

Replace `borderRadius: 0px` with soft rounding:
- Cards/containers: 12px
- Buttons: 8px
- Input fields: 8px
- Progress ring container: fully round (already circular)
- Nav bar: top corners 16px

**Files to modify:** `tailwind.config.ts` (remove `borderRadius: 0`), potentially individual components

---

## Task 3: Glassmorphism Cards

Add semi-transparent backgrounds with backdrop blur to card elements:
- Friend cards
- Daily log entries
- Settings sections
- Profile card

Style: `bg-white/5 backdrop-blur-md border border-white/10` (dark mode)

**Files to modify:** `FriendCard.tsx`, `DailyLog.tsx`, `settings/page.tsx`, `profile/page.tsx`

---

## Task 4: Gradient Progress Ring

Replace the solid-stroke progress ring with a gradient stroke:
- Gradient from accent color to a lighter shade (e.g., `#00D4FF` → `#80EAFF`)
- Add a subtle glow/shadow behind the ring
- Animate the gradient on progress change

**Files to modify:** `ProgressRing.tsx`

---

## Task 5: Larger Typography Hierarchy

Increase contrast between text sizes:
- Page titles: 28px bold
- Section headers: 14px uppercase tracked
- Body/values: 16px
- Captions/timestamps: 11px
- Progress number (ml counter): 32px bold

**Files to modify:** All page files, component files with text

---

## Task 6: Subtle Shadows / Glow

Add depth with:
- White/accent glow on the progress ring (`box-shadow: 0 0 30px rgba(0,212,255,0.2)`)
- Subtle elevation shadows on cards (`shadow-lg` with low opacity white)
- Button hover glow effect
- Nav bar top shadow

**Files to modify:** `ProgressRing.tsx`, `FriendCard.tsx`, `DailyLog.tsx`, `NavBar.tsx`, buttons

---

## Task 7: Animated Water Fill

Replace the circular progress ring with a liquid fill animation:
- Container shape (circle or rounded square)
- SVG wave animation at the water level
- Level rises/drops smoothly as intake changes
- ml text overlaid on the fill

**Files to modify:** `ProgressRing.tsx` (major rewrite to water fill component)

---

## Execution Order

1 → 2 → 3 → 4 → 5 → 6 → 7

Each builds on the previous visually, but they're independent code-wise. If you reject one, I revert it before trying the next.
