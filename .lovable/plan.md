

# Fleet Management — "How's My Driving?" for Companies

## Overview
Add a company/fleet path where businesses can register, add their fleet vehicles, and get a dashboard showing all reports against their drivers. This enables the classic "How's My Driving?" program digitally.

## Database Changes

### New tables

**`companies`** — registered fleet companies
- `id` uuid PK
- `owner_id` uuid (references profiles.user_id)
- `name` text
- `contact_email` text
- `created_at` timestamptz

**`fleet_vehicles`** — plates belonging to a company fleet
- `id` uuid PK
- `company_id` uuid FK → companies
- `plate_number` text (unique across fleet_vehicles)
- `vehicle_label` text nullable (e.g. "Truck #12")
- `added_at` timestamptz

RLS: Company owners can CRUD their own company and vehicles. Reports on fleet plates are publicly viewable (already the case).

### Migration
- Create both tables with RLS policies
- Add a database function `is_company_owner(company_id uuid)` to simplify RLS checks

## New Pages

### `/fleet` — Fleet Dashboard (authenticated, company owner)
- If user has no company: show a "Register Your Company" form (company name + contact email)
- If user has a company: show fleet dashboard with:
  - Company name and stats summary (total vehicles, total reports against fleet, average score)
  - **Vehicle list** — each vehicle shows plate number, label, report count, score, last reported
  - **Add Vehicle** form at the top (plate number + optional label)
  - **Recent Reports** feed filtered to fleet plates only

### `/fleet/vehicle/:plateNumber` — links to existing `/plate/:plateNumber`
No new page needed — reuse the existing plate detail page.

## UI Changes

### Header
- Add a "Fleet" nav link (with `Truck` icon) visible to all authenticated users
- Position it between "My Plates" and "Profile"

### Homepage
- Add a small CTA banner below the hero: "Manage a fleet? Track your drivers' reports →" linking to `/fleet`

## Component Structure

**`src/pages/Fleet.tsx`** — main fleet page
- Company registration form (if no company exists)
- Fleet dashboard with vehicle grid and report feed
- Add/remove vehicle controls

**`src/components/FleetVehicleCard.tsx`** — card for each fleet vehicle showing plate, label, report count, score

## Data Flow
- On mount, query `companies` for current user's company
- If found, query `fleet_vehicles` joined with report counts from `reports` table
- Adding a vehicle inserts into `fleet_vehicles`
- Report data comes from existing `reports` table, filtered by fleet plate numbers

## Technical Details

### SQL for fleet report aggregation
```sql
SELECT fv.plate_number, fv.vehicle_label, 
  COUNT(r.id) as report_count
FROM fleet_vehicles fv
LEFT JOIN reports r ON r.plate_number = fv.plate_number
WHERE fv.company_id = ?
GROUP BY fv.id
```

### Route addition
- Add `/fleet` route in `App.tsx`

