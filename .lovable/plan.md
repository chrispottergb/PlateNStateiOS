# Lock incident location to user's GPS

To prevent fraudulent and malicious reports, the incident city/state must come from the user's real GPS location. Users can no longer manually pick a different city/state for where the incident happened.

Note: the **Plate state** dropdown (where the plate is registered) stays user-selectable — that's the state on the license plate, not where the incident occurred.

## Changes

### `src/components/ReportModal.tsx`

**Quick mode location block (lines ~425–489)**
- Remove the manual override pencil button.
- Remove the incident-state `<Select>` and city `<Select>`.
- Replace the "manual" fallback with one of three locked, read-only states:
  - `geocoding`: "Detecting your location…" spinner.
  - `done` + reverse-geocoded: locked badge showing `📍 {city, ST}` with a small "Locked to your GPS for verification" helper line.
  - `denied` or geocode failed: red warning card "Location required to submit. Enable location and retry." with a **Retry** button calling `detectLocation()`. Submit stays disabled.

**Detailed mode location block (lines ~709–740)**
- Identical treatment: remove both selects + pencil override; show locked GPS-derived value or the same retry card.

**State**
- Remove `manualOverride` state and the `setManualOverride` calls in `reset()`.
- Remove the `onValueChange` city/state setters that wrote to `location` / `incidentState` from user clicks. `incidentState` and `location` are written only by `reverseGeocode()`.

**Submit guard**
- Add to `canSubmitQuick` (and the equivalent detailed-mode gate): require `latitude && longitude && incidentState && location` and `geoStatus === "done"`. If any are missing, disable submit and show inline reason.
- Keep the existing `p_latitude` / `p_longitude` / `p_incident_state` payload — already wired.

**KS county field**: keep (it's about the plate's issuing county, not the incident location).

### Server-side enforcement (`spend_credit_on_report` RPC)

Add a hard server check so a malicious client can't bypass the UI:
- Require `p_latitude IS NOT NULL AND p_longitude IS NOT NULL`.
- Require `p_incident_state IS NOT NULL`.
- Reject with `RAISE EXCEPTION 'LOCATION_REQUIRED: GPS location is required to submit a report.'` otherwise.
- Client already maps known error prefixes to toasts — add a `LOCATION_REQUIRED` branch with a friendly message.

This is a migration that re-creates `public.spend_credit_on_report(...)` with the same signature plus the new guards at the top.

## Files
- Edit: `src/components/ReportModal.tsx`
- New migration: add GPS-required guards to `spend_credit_on_report`

## Verification
- Open Report modal with location allowed → see locked `📍 City, ST`, submit works.
- Open with location blocked → see retry card, submit disabled.
- Manually call the RPC without lat/lng (e.g. via console) → backend rejects with `LOCATION_REQUIRED`.
