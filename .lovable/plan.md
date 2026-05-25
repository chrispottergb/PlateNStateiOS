## Scope
Rewrite the inline Kansas duplicate-vanity-plate warning in `ClaimPlate.tsx` to read as a formal legal disclaimer rather than an informal alert.

## Current text (lines 275–285)
> "Identical KS plate detected. Kansas issues vanity plates by county, so this exact plate number already exists elsewhere in the state. After claiming, you may get notifications for reports filed against the same plate in a different Kansas county — check the location on each report before reacting."

## Proposed replacement
A block-level disclaimer using legal register:
- Header: "DISCLAIMER OF UNIQUE IDENTIFICATION"
- Body explains that Kansas vanity plates are issued on a non-exclusive, county-specific basis
- States the plate number is not unique statewide and may be concurrently issued to multiple registrants in other Kansas counties
- Has the user acknowledge that (i) third parties may hold identical registrations in other counties, (ii) reports filed against this plate number are not attributable to their specific vehicle absent corroborating location data, and (iii) Plate State and its affiliates disclaim all liability for erroneous associations arising from duplicate registrations
- Ends with: "You assume sole responsibility for verifying the location of any reported incident before taking action."

## Technical detail
- Single file edit: `src/pages/ClaimPlate.tsx` (lines 275–285)
- Keeps existing amber alert styling (`border-amber-400/40 bg-amber-500/10 text-amber-200`)
- Only the paragraph content changes; no logic or layout changes