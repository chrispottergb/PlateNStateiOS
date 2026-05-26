# Fix: Plates Display the Wrong State

## The bug

When you report a plate and pick a state (e.g. Virginia), the database **does** store it correctly. Confirmed for `BNMVHJBMN`:

```
plate_number | state | incident_state | location
BNMVHJBMN    | VA    | WI             | Oconto Falls, WI
```

But every plate visual in the app renders `<WisconsinPlate />`, which hardcodes `state="WI"`. So no matter what state you select, the UI always shows a Wisconsin plate. The data is right — the display is wrong.

## What to change

### 1. Carry `state` through the data layer

`src/hooks/usePlateRecords.tsx`:
- Add `state` to `RawReport` and to the `PlateRecord` shape (`src/lib/types.ts`).
- Select `state` in both `usePlateRecords` and `usePlateDetail` queries.
- Populate `rec.state` in `buildRecords` (use the most recent report's state if multiple).
- Include `state` in the per-report rows returned by `usePlateDetail`.

### 2. Replace hardcoded `WisconsinPlate` with state-aware `LicensePlate`

Swap `WisconsinPlate` for `LicensePlate` and pass the actual state in:

- `src/pages/PlateDetail.tsx` — hero plate uses `plate.state`; "not found" fallback can stay `WisconsinPlate` (no data) or be neutral.
- `src/components/RecentReports.tsx`, `FreshCatches.tsx`, `SocialReportCard.tsx`, `PlateCard.tsx`, `DriverOfTheWeek.tsx` — pass `report.state` / `plate.state`.
- `src/pages/WallOfShame.tsx`, `Profile.tsx`, `Fleet.tsx`, `LawEnforcement.tsx` — same pattern; confirm the underlying query returns `state` and forward it.

### 3. Leave `WisconsinPlate.tsx` alone

Keep it as a thin convenience wrapper (still useful for true Wisconsin-only contexts and for empty/unknown-state fallback).

## Out of scope

- No DB or RPC changes — the backend already stores the right value.
- No design changes to the plate components themselves; `LicensePlate` already handles per-state styling via `getStateByCode`.
- `incident_state` (where the incident happened) stays separate from `state` (where the plate is registered). The plate visual uses the registration state.

## Verification

- Load `/plate/BNMVHJBMN` — should render a **Virginia** plate, not Wisconsin.
- Submit a fresh report picking a non-WI state — feed cards, Wall of Shame, and the plate detail page should all show the chosen state's plate.
- Existing WI reports continue to render as Wisconsin (default).
