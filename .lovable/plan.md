## Persist login + remember home state

**Login persistence**: Already enabled — `src/integrations/supabase/client.ts` uses `persistSession: true`, `autoRefreshToken: true`, and `storage: localStorage`. Sessions survive browser closes / reopens automatically. No change needed.

**Home-state memory**: New hook + Wall of Shame default.

### 1. Create `src/hooks/useHomeState.tsx`
Returns the user's saved 2-letter state code:
- Reads `profiles.home_state` from Supabase
- Caches in `localStorage` for instant load on next visit
- Auto-fills from the first paid claimed plate's `state` if `profiles.home_state` is empty (writes it back to profile so it sticks)
- Exposes `setHomeState(code)` for manual change (e.g. from a future state switcher)

### 2. Update `src/pages/WallOfShame.tsx`
- Call `useHomeState()`
- Default `useWallOfShame(homeState ?? null, 20)` so the user lands on their state's leaderboard automatically
- Show small "Showing: WI · View All States" toggle pill at top so they can opt out of the filter

### 3. Update `src/pages/ClaimPlate.tsx`
- After a successful claim (`?checkout=success` effect), call `setHomeState(plate.state)` once for the most recently claimed plate so the home state is set immediately without waiting for a profile re-read.

No DB migration needed — `profiles.home_state` already exists.