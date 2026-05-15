## Goal

Add a Twitter-style "compose box" at the top of the plate feed on **/a-hole-patrol** that any signed-in user can click to instantly open the existing **Report a Plate** modal. It makes reporting feel one-tap, without removing the existing hero "Report a Plate" button.

## Where it goes

In `src/pages/HonkZone.tsx`, inside `<div className="flex-1 space-y-4">` (line ~216), as the **first child of the main feed column** — above the Hot/New/Top controls bar. This places it directly above the feed on both mobile and desktop, just like Twitter's composer sits above the timeline.

It does **not** appear on `/a-hole-patrol/wall` (that page is a curated wall, not a feed).

## What it looks like

A glass-card row, full width of the feed column:

```text
┌────────────────────────────────────────────────────┐
│ (avatar)  See an a-hole on the road?      [Report] │
└────────────────────────────────────────────────────┘
```

- **Avatar** on the left: signed-in user's avatar from `useAuth()` if available, otherwise a generic siren/car emoji circle styled like the existing avatar bubbles.
- **Faux input** in the middle: muted placeholder text like *"See an a-hole on the road? Tap to report…"* (rotating from a small set of cheeky variants for personality, matching the page's tone). Not a real `<input>` — just a styled `div` so the whole card is one click target.
- **Pill button** on the right: small primary "Report" button with the `AlertTriangle` icon, hidden on very small screens (the whole card is already clickable).
- The entire card is a single button-like element — clicking anywhere triggers the same `ReportModal` flow already used by the hero CTA.

Styling uses existing tokens: `glass-card`, `rounded-2xl`, `border-foreground/5`, `text-muted-foreground`, `hover:border-primary/30`, subtle `hover:bg-primary/5` transition. Mobile-first, no horizontal overflow at 760px viewport.

## Behavior

- **Signed in** → clicking the card opens `ReportModal` (same component already imported on the page; we just wrap a new trigger in it).
- **Signed out** → mirrors current behavior of the hero "Report a Plate" button: `ReportModal` already shows the "Sign in required" toast and redirects to `/auth`. No extra logic needed.
- No new state, no new API calls, no new routes.
- Composer is hidden while `loading` is true (skeletons already shown), to avoid layout jank.

## Files to change

- **`src/pages/HonkZone.tsx`** — add a new `<ReportComposer />` (inline component or local block) as the first item in the main feed column.

That's the only file touched. No backend, schema, or new components required unless we want to extract `ReportComposer` into its own file for reuse later (optional, not in scope).

## Out of scope

- Inline plate entry inside the composer (keeping the modal flow preserves photo scan, location capture, captcha, rate limiting — all already handled there).
- Adding the composer to other pages (Wall of Shame, Community, Plate Detail).
- Persisting drafts.
