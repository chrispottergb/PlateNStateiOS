## Goal

Maintain an admin-managed list of blocked email addresses and email domains. Anyone matching the list is prevented from signing up, and existing matching users are signed out and shown a "blocked" screen if they try to use the app.

## What gets built

### 1. Database (migration)

New table `public.blocked_emails`:
- `value` text (lowercased) — either a full email (`foo@bar.com`) or a domain (`bar.com`)
- `kind` text check in (`email`, `domain`)
- `reason` text nullable
- `created_by` uuid, `created_at` timestamptz
- Unique on (`kind`, `value`)

GRANTs + RLS:
- Only admins (`has_role(auth.uid(), 'admin')`) can SELECT / INSERT / DELETE
- `service_role` full access

Security definer function `public.is_email_blocked(_email text) returns boolean` — checks both the exact email and the domain portion against the table. Used by both the signup trigger and the client gate.

Update `public.handle_new_user()` trigger: if `is_email_blocked(NEW.email)`, `RAISE EXCEPTION 'EMAIL_BLOCKED'` so signup fails atomically.

### 2. Client gate

New hook `useIsBlocked()`:
- Reads `user.email` from `useAuth`
- Calls `supabase.rpc('is_email_blocked', { _email })`
- Returns `{ blocked, loading }`

Wire it into `App.tsx` (or a thin wrapper around routes): if `blocked === true`, render a fullscreen "Your access has been revoked" screen with a sign-out button and skip all normal routes. Calls `supabase.auth.signOut()` on mount so the session is cleared.

### 3. Admin Panel UI

New "Blocklist" tab in `src/pages/AdminPanel.tsx`:
- Input + "Block email" / "Block domain" buttons (with optional reason)
- Table of current entries with kind, value, reason, added date, remove button
- Toasts on success/error

## Technical notes

- Blocklist values stored lowercased; comparisons lowercase both sides.
- Domain entry `bar.com` matches anything ending in `@bar.com`.
- We rely on the signup trigger + client gate. We do not delete the underlying `auth.users` row when blocking — admins can unblock later by removing the entry.
- No edge function needed; everything goes through RLS + the security-definer RPC.

## Files

- New migration (table, grants, RLS, `is_email_blocked`, updated `handle_new_user`)
- New `src/hooks/useIsBlocked.tsx`
- Edit `src/App.tsx` to render a `<BlockedScreen />` when blocked
- New `src/components/BlockedScreen.tsx`
- Edit `src/pages/AdminPanel.tsx` to add the Blocklist tab
