## Goal
When a user is signed in, the homepage (`/`) should skip the marketing hero and take them straight to the geo-tag Neighborhood Watch map.

## Change
In `src/pages/Index.tsx`:
- Read auth state via `useAuth()`.
- While auth is loading, render nothing (or a thin loader) to avoid flashing the hero.
- If `user` is present, `<Navigate to="/watch" replace />`.
- Otherwise render the existing hero as-is for logged-out visitors.

That's the only file touched. The map page (`/watch` → `WatchMap.tsx`) already exists and has the Header, so signed-in users land directly on the live map with no marketing copy on top.

## Verification
- Logged out → still see hero at `/`.
- Logged in → `/` immediately redirects to `/watch` and shows the map.