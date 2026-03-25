

# Add Vehicle & Driver Description to Report Modal

Add two new steps to the report flow: a **Vehicle Description** step (right after the plate number) and a **Driver Description** step, plus a comment/notes field. These details get stored in the database and displayed on report cards.

## New Report Flow (6 steps instead of 4)

```text
Step 1: License Plate Number (existing)
Step 2: Vehicle Description (NEW)
Step 3: What did they do? / Infraction (existing, was step 2)
Step 4: Location & GPS (existing, was step 3)
Step 5: Driver Description (NEW)
Step 6: Review & Submit (existing, was step 4)
```

## Step 2 — Vehicle Description

Directly under the plate entry:
- **Vehicle Type** dropdown: Sedan, SUV, Truck, Van, Minivan, Coupe, Convertible, Hatchback, Wagon, Motorcycle, Semi/Commercial
- **Vehicle Color** dropdown: Black, White, Silver/Gray, Red, Blue, Green, Yellow, Orange, Brown, Gold, Other
- **Make** text input (e.g. Toyota, Ford, BMW)
- **Model** text input (e.g. Camry, F-150, 3 Series)
- **Noticeable Features** multi-select checkboxes: Visible Damage, Aftermarket Rims, Lifted/Lowered, Custom Paint/Wrap, Tinted Windows, Loud Exhaust, Bumper Stickers

## Step 5 — Driver Description

- **Gender** checkbox: Female (unchecked = male/unknown)
- **Additional Comment** textarea (optional free-text notes, max 280 chars)

## Database Migration

Add columns to `reports` table:
- `vehicle_type` text (nullable)
- `vehicle_color` text (nullable)
- `vehicle_make` text (nullable)
- `vehicle_model` text (nullable)
- `vehicle_features` text[] (nullable, default '{}')
- `driver_gender` text (nullable)
- `comment` text (nullable)

## Code Changes

### 1. `src/components/ReportModal.tsx`
- Add state for all new fields
- Insert Step 2 (vehicle) and Step 5 (driver) into the flow
- Update progress bar from 4 to 6 steps
- Update `canProceed()` — new steps are optional (always proceed)
- Include new fields in `handleSubmit` call
- Show new fields in the Review step
- Reset new fields in `reset()`

### 2. `src/components/SocialReportCard.tsx`
- Display vehicle info (type, color, make/model) below the plate
- Show vehicle features as small badges

### 3. Database migration
- ALTER TABLE to add the 7 new nullable columns

## Files
- **Edit**: `src/components/ReportModal.tsx`, `src/components/SocialReportCard.tsx`
- **Migration**: New columns on `reports` table

