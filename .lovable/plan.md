

# Auto-Detect City from GPS (Reverse Geocoding)

Replace the manual city dropdown with automatic location detection. When the report modal opens, the user's GPS coordinates are already captured — we'll use those to reverse-geocode a human-readable address and auto-fill the location field.

## Approach

Use the free **Nominatim OpenStreetMap** reverse geocoding API (no API key needed) to convert lat/lng into a city name.

## Changes

### 1. `src/components/ReportModal.tsx`
- After GPS coordinates are successfully captured in `detectLocation()`, call Nominatim: `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
- Parse the response for `address.city` or `address.town` or `address.village` + state abbreviation
- Auto-populate the `location` state with the result (e.g. "Madison, WI")
- Keep the city dropdown as a fallback — if GPS is denied or reverse geocoding fails, the user can still pick manually
- Show a loading spinner on the location field while geocoding
- Add a small "Edit" button so users can override the auto-detected location

### 2. UX Flow (Step 3 of report modal)
- If GPS succeeded: show the detected location with a green checkmark and an "Edit" button to switch to manual dropdown
- If GPS failed/denied: show the existing city dropdown as-is
- No external API keys required — Nominatim is free with a usage policy of max 1 req/sec (fine for individual reports)

## Files
- **Edit**: `src/components/ReportModal.tsx`

