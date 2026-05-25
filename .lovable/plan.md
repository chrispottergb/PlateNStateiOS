## Goal
On the native mobile app (iOS/Android via Capacitor), the home screen ("/") should open directly to the social feed page (A-Hole Patrol / HonkZone). Web visitors at platenstate.com continue to see the marketing landing.

## Why this works with what's already built
- `HonkZone` (`/a-hole-patrol`) already contains: the live feed of reports, a prominent blue "Report a Plate" button, and feed items that navigate to `/plate/:plateNumber` (Plate Detail) on tap — which shows the geotag, full report history, points, and offenses.
- `src/lib/native.ts` already exports `isNative` (Capacitor platform detection).

## Change
Single edit in `src/App.tsx`:

```tsx
import { isNative } from "@/lib/native";
...
<Route path="/" element={isNative ? <HonkZone /> : <Index />} />
```

`isNative` is evaluated once at module load (Capacitor's check is synchronous), so there's no flash or hydration issue.

## Scope
- Web (platenstate.com, previews in browser) — unchanged, still shows marketing landing.
- Native iOS/Android — "/" renders the social feed; the existing marketing landing remains reachable at `/community` or any other route if needed (no other routes change).
- No new components, no layout changes inside HonkZone (user confirmed the existing feed-first + Report-a-Plate button + tap-to-detail flow is what they want).

## Files
- `src/App.tsx` — add `isNative` import and update the `/` route element.