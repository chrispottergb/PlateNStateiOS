## Goal

When you report a plate from another state (e.g. you're in WI and see a MN plate), the modal should keep your GPS location and pre-fill the city + state of the incident — including in the edit/fallback view.

## Current behavior

- GPS detect already runs on modal open and fills `incidentState` + `location` + an "auto-detected" pill.
- Changing the plate state correctly no longer clears the location (recent fix).
- Bugs that still break the experience for out-of-state reports:
  1. If you tap the Edit pencil on the auto-detected pill, the city dropdown is filtered to a curated list per state. If Nominatim returned a city that isn't in that list (very common — e.g. small towns, "Town of X" formats), the city Select shows **blank** even though `location` is set.
  2. In that same fallback view, changing `incidentState` always wipes `location` to `""`, so even just confirming the state nukes the auto-fill.
  3. There's no visible "📍 currently set to …" hint in the fallback, so users think detection failed.

## Plan

Single file: `src/components/ReportModal.tsx`. No DB / no backend changes. Applies to both Quick mode (Step 1) and Detailed mode (Step 4).

1. **Inject the auto-detected city as a Select option** so it's always selectable, even when it isn't in `getStateByCode(...).cities`. Build the city list as:
   ```
   const detectedCity = autoDetectedLocation; // e.g. "Eau Claire, WI"
   const curatedCities = getStateByCode(incidentState).cities.map(c => `${c}, ${incidentState}`);
   const cityOptions = detectedCity && !curatedCities.includes(detectedCity)
     ? [detectedCity, ...curatedCities]
     : curatedCities;
   ```
   Render an "📍 Detected" badge next to the detected option.

2. **Stop nuking `location` when `incidentState` changes** if the new state matches the detected state. Only clear when the user genuinely switches to a different state than what GPS returned. Concretely:
   ```
   onValueChange={(v) => {
     setIncidentState(v);
     if (autoDetectedLocation && v === detectedStateCode) {
       setLocation(autoDetectedLocation); // restore
     } else {
       setLocation("");
     }
   }}
   ```
   Track the GPS-resolved state code in a new `detectedStateCode` state set inside `reverseGeocode`.

3. **Pre-select the detected city in the dropdown** by ensuring `location` is set to the same string used as the SelectItem `value` (already true — just need step 1 to make the item exist).

4. **Decouple plate state from incident state visually:** add a small caption under the plate-state selector — `"Plate state — incident location stays on your GPS"` — so users know that picking a different state for the plate won't move them. (UI-only, no logic change.)

5. **Don't auto-flip to the manual fallback when plate state changes.** Currently `manualOverride` is only set by the Edit button, so this should already hold — verify by inspection during implementation.

## Acceptance check (manual)

- Allow location → see "Eau Claire, WI" pill auto-filled.
- Change plate state from WI → MN → pill still shows "Eau Claire, WI".
- Tap Edit → state dropdown shows WI, city dropdown shows "Eau Claire, WI" pre-selected (with 📍 badge).
- Switch incident state dropdown WI → MN → city clears (expected). Switch back to WI → "Eau Claire, WI" repopulates automatically.
- Submit → report saves with `state = MN` (plate), `incident_state = WI`, `location = "Eau Claire, WI"`.
