# Add mini map preview for locked GPS incident location

Show a small, non-interactive Leaflet map with a pin under the "Locked" location card in both Quick mode and Detailed mode (step 4) of `ReportModal`. The map only appears when `latitude && longitude && autoDetectedLocation` are set.

## New component: `src/components/LocationMiniMap.tsx`

- Manual Leaflet v1.9.4 via `useRef` + `useEffect` (per project convention — no `react-leaflet`).
- Props: `{ latitude: number; longitude: number; label?: string; height?: number }` (default height 140px).
- On mount: import `leaflet` + `leaflet/dist/leaflet.css`, create a map centered on `[lat, lng]` at zoom 15 with all interaction disabled (`dragging`, `scrollWheelZoom`, `doubleClickZoom`, `touchZoom`, `boxZoom`, `keyboard`, `zoomControl: false`, `attributionControl: true`).
- Use CartoDB dark tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`) to match the dark glass aesthetic.
- Add a single `L.marker([lat, lng])` with a small custom `L.divIcon` styled with `bg-primary` ring + pulse dot (Tailwind classes via `className` on the divIcon).
- When lat/lng change, `map.setView([lat, lng], 15)` and reposition the marker.
- Cleanup: `map.remove()` on unmount.
- Wrapper: `rounded-lg overflow-hidden border border-primary/30` with `aria-label="Map preview of incident location"`.

## `src/components/ReportModal.tsx` edits

In both the Quick-mode location block and the Detailed-mode step-4 location block, inside the `autoDetectedLocation && latitude !== null && longitude !== null` branch, render `<LocationMiniMap latitude={latitude} longitude={longitude} label={autoDetectedLocation} />` directly under the locked location pill and above the "Locked to your GPS…" helper text.

No changes to state, geocoding, or submit guards — purely additive presentation.

## Verification
- Open Report modal → Quick mode → map renders with pin at detected spot.
- Switch to Detailed → step through to Location → same map renders.
- Deny location → map hidden, retry card still shown.
- Modal close/reopen → no Leaflet "Map container is already initialized" errors (cleanup verified).

## Files
- New: `src/components/LocationMiniMap.tsx`
- Edit: `src/components/ReportModal.tsx`
