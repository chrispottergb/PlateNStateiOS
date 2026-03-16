

# Wisconsin License Plate Visual Component

Create a realistic CSS-rendered Wisconsin license plate component that displays plate numbers in the authentic style — white background, dark navy/black text, "WISCONSIN" header, "AMERICA'S DAIRYLAND" footer, with the characteristic barn/farm silhouette graphic.

## Design Reference

The standard Wisconsin plate has:
- White/cream background
- "WISCONSIN" in dark navy across the top
- Large dark navy plate number in the center (embossed look)
- "AMERICA'S DAIRYLAND" in small red text at the bottom
- A subtle red barn/farm scene watermark in the background
- Rounded corners with a thin dark border
- Standard US plate aspect ratio (~2:1)

## Implementation

### 1. Create `src/components/WisconsinPlate.tsx`
A pure CSS/SVG component that renders a realistic Wisconsin plate:
- White/cream `bg-gradient` background
- Top text "WISCONSIN" in navy, slightly curved or tracked out
- Center: the plate number in large bold navy mono font
- Bottom: "AMERICA'S DAIRYLAND" in small red caps
- Subtle barn silhouette SVG as a watermark behind the number
- Rounded corners, drop shadow, thin border
- Two sizes: `sm` (for cards/lists) and `lg` (for detail page)

### 2. Update `src/components/PlateCard.tsx`
- Replace the plain text plate number with the `<WisconsinPlate>` component (sm size)
- Keep the score badge and metadata below/beside it

### 3. Update `src/pages/PlateDetail.tsx`
- Replace the plain text plate number header with a large `<WisconsinPlate>` component
- Center it prominently at the top of the detail card

### 4. Update `src/components/RecentReports.tsx`
- Replace the plain text plate number link with a mini `<WisconsinPlate>` component

### 5. Update `src/pages/Leaderboard.tsx`
- No direct changes needed — it uses `PlateCard` which will inherit the plate visual

## Files to Create/Modify
- **Create**: `src/components/WisconsinPlate.tsx`
- **Edit**: `src/components/PlateCard.tsx`
- **Edit**: `src/pages/PlateDetail.tsx`
- **Edit**: `src/components/RecentReports.tsx`

