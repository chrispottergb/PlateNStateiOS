## The disconnect

`stateCode` in `ReportModal` is doing double duty — it's used as both the **plate's home state** and the **incident state** (drives the city dropdown and the KS county prompt). That breaks the "out-of-state plate seen locally" case:

1. GPS opens the modal → `reverseGeocode` sets `stateCode = "WI"` (your state).
2. You pick **KS** from the state dropdown next to the plate (because the plate is Kansas) → `onValueChange` calls `setLocation("")` and now the location city list switches to Kansas cities, even though the incident happened in Wisconsin.
3. The "Kansas vanity county" field only appears when `stateCode === "KS"`, so the moment you correct the location back to WI, the county field disappears. There's no way to capture *Kansas plate + Wisconsin incident + KS county of issue*.
4. `p_state` sent to `spend_credit_on_report` ends up being whichever one you set last, so reports get mis-bucketed (Wall of Shame / state filters).

The Kansas vanity-plate hint is also worded around location instead of plate registration, which adds to the confusion.

## Fix

Split the single `stateCode` into two independent concepts in `ReportModal` (Quick + Detailed) and persist both:

- `plateState` — where the plate is registered. Lives next to the plate input on Step 1. Default = user's `home_state` (from `useHomeState`) so the common case is one tap. Auto-filled by `PlateScanner` when ALPR returns a state.
- `incidentState` — where the report happened. Set by `reverseGeocode` from GPS, used to drive the city dropdown on the Location step. Editable via a small state selector right above the city select (so reporting an incident outside your home state still works).

Behavior changes that fall out of the split:

- City list uses `getStateByCode(incidentState).cities`, not the plate state.
- Changing `plateState` no longer clears `location`.
- KS vanity county field appears when **`plateState === "KS"`** (plate is Kansas), regardless of where the incident happened. Reword helper to: *"Kansas vanity plates are issued per county — include the county the plate was issued in."*
- `finalLocation` only appends `— <County> County` when `plateState === "KS"` and `ksCounty` is set.
- Review step shows both: `Plate: ABC123 (KS)` and `Seen in: Milwaukee, WI — Dane County` style.

Submit payload:

- Keep `p_state` = `plateState` (this is what Wall of Shame / state leaderboards group by today — `reports.state` already represents the plate's state).
- Add `p_incident_state` = `incidentState` so the location context isn't lost. Requires a migration adding `reports.incident_state text` (nullable, 2-letter code, validated by the existing `validate_state_code`-style check) and a new overload of `spend_credit_on_report` that accepts `p_incident_state` and writes it. Existing overloads stay intact for backwards compat.

QuickCapture and ClaimPlate don't currently track a separate incident state, so no changes needed there — they only deal with the plate itself.

## Technical details

Files:

- `src/components/ReportModal.tsx`
  - Rename existing `stateCode` → `plateState`. Add `incidentState` state, default `"WI"`, seeded from `useHomeState()` on open.
  - `reverseGeocode` sets `incidentState` (not plate state) and only auto-fills `location` when `incidentState` matches.
  - Plate-state `<Select>` (Quick + Step 1 Detailed): remove `setLocation("")` side effect.
  - Location step (Quick + Step 4 Detailed): add a compact `incidentState` `<Select>` above the city `<Select>`; city list keyed off `incidentState`.
  - KS county block: gate on `plateState === "KS"`, update helper copy.
  - `handleSubmit`: pass `p_state: plateState`, `p_incident_state: incidentState`.
  - Review step: render both plate state and incident location.

- `supabase/migrations/<new>.sql`
  - `alter table public.reports add column if not exists incident_state text;`
  - Add trigger or check that mirrors `validate_state_code` for `incident_state`.
  - New `spend_credit_on_report(... , p_state text, p_incident_state text, p_ip text)` overload that writes `incident_state`. Keep the existing function so older clients keep working.

- `src/integrations/supabase/types.ts` regenerates automatically.

No UI changes needed in WatchMap / WallOfShame — they continue to group by `reports.state` (plate state), which is the correct dimension for those views.
