

# Scaling Plate N' State for High Traffic

## Overview
Optimize the application across database, backend, and frontend layers to handle traffic surges — more concurrent users filing reports, viewing plates, and hitting the API simultaneously.

## What Changes

### 1. Database: Add Missing Indexes
Create a migration adding indexes on the most-queried columns to prevent full table scans under load:
- `reports(plate_number)` — used by plate lookups, risk scoring, fleet scans
- `reports(reporter_id)` — used by profile pages, leaderboard
- `reports(created_at DESC)` — used by recent reports, trending
- `reports(infraction)` — used by filtering and aggregation
- `profiles(user_id)` — used by every authenticated action
- `claimed_plates(plate_number)` — used by notification triggers
- `uploaded_plates(list_id)` — used by batch scan queries
- `notifications(user_id, read)` — used by notification bell polling

### 2. Frontend: Fix Expensive Homepage Query
The Index page currently fetches ALL report locations just to count unique cities (`select("location")`). At scale this pulls thousands of rows. Replace with a single `COUNT(DISTINCT ...)` via a database function, or use a simpler `count` query with head-only.

### 3. Frontend: Add React Query for Caching and Deduplication
Wrap key data fetches (homepage stats, plate details, leaderboard) in React Query (`@tanstack/react-query`) to:
- Cache responses and avoid redundant re-fetches on navigation
- Deduplicate simultaneous identical requests
- Provide stale-while-revalidate behavior for instant page loads

### 4. Backend: Rate Limiting on Report Submission
Add a simple rate check in the `spend_credit_on_report` function — prevent more than 10 reports per user per minute to protect against spam during high traffic.

### 5. Upgrade Cloud Instance
For sustained high traffic, the Cloud compute instance can be upgraded. This is done via **Cloud → Overview → Advanced settings → Upgrade instance** in the Lovable editor.

## Technical Details

**Migration SQL** (indexes):
```sql
CREATE INDEX IF NOT EXISTS idx_reports_plate_number ON reports(plate_number);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_plates_plate ON claimed_plates(plate_number);
CREATE INDEX IF NOT EXISTS idx_uploaded_plates_list ON uploaded_plates(list_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
```

**Homepage fix**: Create a DB function `get_homepage_stats()` that returns report count, active reporter count, and unique city count in a single efficient query, replacing 3 separate client calls.

**React Query**: Install `@tanstack/react-query`, add `QueryClientProvider` in `main.tsx`, convert key fetches to `useQuery` hooks.

**Rate limit**: Add a check in `spend_credit_on_report` that counts reports from the user in the last 60 seconds and raises an exception if > 10.

