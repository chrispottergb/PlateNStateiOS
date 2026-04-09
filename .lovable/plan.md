

# Quick Report Mode

## Overview
Add a "Quick Report" option that reduces the 6-step flow to a single screen with just the 3 required fields (plate, infraction, location), letting users file a report in seconds. The full 6-step flow remains available as "Detailed Report" for users who want to add vehicle/driver info.

## What Changes

### ReportModal.tsx
- Add a `mode` state: `"quick"` (default) | `"detailed"`
- **Quick mode**: Single screen showing:
  - Plate number input (top, large, auto-focused)
  - Top 8 most common infractions as tap-friendly chips (tailgating, speeding, ran red light, no turn signal, distracted driving, road rage, bad parking, suspicious vehicle) plus a "More..." button that shows all 30
  - Auto-detected location displayed inline (already fires on modal open) with small edit link
  - Big "Submit Quick Report (1 coin)" button at the bottom
- **Toggle link** at top: "Need to add details? Switch to Detailed Report" which activates the existing 6-step flow
- When in detailed mode, show "Just need the basics? Quick Report" link to switch back
- Quick mode submit calls the same `spend_credit_on_report` RPC with optional fields as null

### No database changes needed
The existing RPC already accepts nullable vehicle/driver fields.

### No new files needed
All changes are within `ReportModal.tsx`.

## Technical Details
- The quick mode renders a single `div` instead of the step-based conditional blocks
- `canSubmitQuick` validates: plate >= 4 chars, infraction selected, location non-empty
- Location auto-detection already runs on modal open, so most users will have it pre-filled
- The "More..." button for infractions toggles showing the full grid vs the top 8 subset

