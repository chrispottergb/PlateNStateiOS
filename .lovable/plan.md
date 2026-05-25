## Goal
Move the portal selection (A-Hole Patrol vs Business & Enterprise) so it only appears during sign-up. Remove it from the public marketing landing page and make the header navigation reflect the chosen mode after login.

## Current State
- `Index.tsx` (web landing) shows two large path cards: "The A-Hole Patrol" and "Business & Enterprise"
- `Auth.tsx` has no mode selection — just Sign In / Sign Up tabs with a tiny "Enterprise?" footer link
- `Header.tsx` shows all nav links regardless of user type
- `profiles` table has no `account_type` / `portal_mode` field

## Plan

### 1. Database — Add `account_type` to profiles
- Add a `portal_mode` enum column to `public.profiles` with values `'consumer'` and `'enterprise'`
- Default existing users to `'consumer'`

### 2. Sign-up flow (`Auth.tsx`)
- Add a portal-selection step that appears when the user is on the **Sign Up** tab
- Two cards: "A-Hole Patrol" (consumer/social) and "Business & Enterprise" (enterprise)
- Store the chosen `portal_mode` in the profile on sign-up
- On native: default to consumer (since native home is already HonkZone)

### 3. Marketing landing (`Index.tsx`)
- Remove the two dual-path cards entirely
- Replace with a single primary CTA: "Get Started" → links to `/auth`
- Keep stats, tagline, and hero layout

### 4. Header navigation (`Header.tsx`)
- Conditionally render nav links based on the logged-in user's `portal_mode`
- **Consumer**: A-Hole Patrol, Leaderboard, Map, Claim, Profile
- **Enterprise**: Business, Fleet, Insurance, Law Enforcement, Profile
- Unauthenticated visitors: show both paths? No — show minimal nav with Sign In + a link to `/business` as "Enterprise"

### 5. Post-auth routing
- After sign-in or sign-up, route to the appropriate home based on `portal_mode`:
  - consumer → `/a-hole-patrol` (or `/` on native)
  - enterprise → `/business`

### 6. `useAuth` hook update
- Fetch the user's `portal_mode` from `profiles` alongside session data
- Expose it in `AuthContext` so Header and routing logic can consume it

## Files to modify
- `supabase` migration (new)
- `src/hooks/useAuth.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Index.tsx`
- `src/components/Header.tsx`
- `src/App.tsx` (post-login redirect logic)

## Outcome
- First-time visitors to platenstate.com see a clean single-CTA landing page
- Only during sign-up do users explicitly choose A-Hole Patrol or Business & Enterprise
- After logging in, the entire UI (header, nav, home route) is scoped to their chosen portal