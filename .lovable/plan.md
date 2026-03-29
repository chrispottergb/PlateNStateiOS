

# Bulk Database Upload for Law Enforcement & Insurance Portals

## Overview
Allow approved LE and insurance accounts to upload CSV/Excel files containing their vehicle/plate databases. These get stored, cross-referenced against existing reports, and produce risk summaries — essentially a bulk version of the existing single-plate lookup.

## What's Needed

### 1. Database Changes

**New table: `uploaded_plate_lists`**
- `id` (uuid, PK)
- `account_type` (text — 'law_enforcement' or 'insurance')
- `account_id` (uuid — references the LE or insurance account)
- `user_id` (uuid — uploader)
- `name` (text — e.g. "Q1 Fleet Roster")
- `file_name` (text)
- `plate_count` (integer)
- `status` (text — 'processing', 'complete', 'error')
- `created_at` (timestamptz)

**New table: `uploaded_plates`**
- `id` (uuid, PK)
- `list_id` (uuid — FK to uploaded_plate_lists)
- `plate_number` (text)
- `label` (text, nullable — e.g. vehicle ID, policy number)
- `total_reports` (integer, default 0)
- `verified_reports` (integer, default 0)
- `risk_score` (integer, default 0)
- `last_scanned_at` (timestamptz)

RLS policies: users can only read/insert their own lists; select on uploaded_plates scoped to list ownership.

### 2. Storage Bucket
Create a private `plate-uploads` storage bucket for the raw CSV/Excel files, with RLS so only the uploader can access their files.

### 3. Edge Function: `process-plate-upload`
- Triggered after file upload
- Parses CSV (columns: plate_number, label/optional)
- Validates plate format, deduplicates
- Inserts rows into `uploaded_plates`
- Cross-references each plate against `reports` table using the same risk scoring logic from `batch_plate_screening`
- Updates `uploaded_plate_lists.status` to 'complete'
- Enforces upload limits by tier (e.g. Department: 500 plates, Precinct: 2500, Agency: unlimited)

### 4. Frontend — Upload UI (both portals)
Add an "Upload Database" tab/section to both the Law Enforcement and Insurance portal pages (only visible when approved):
- **Drag-and-drop file zone** accepting .csv and .xlsx
- Upload naming field ("Q1 Policy Holders")
- Progress indicator during processing
- **Results dashboard** showing:
  - Total plates scanned
  - Flagged plates (risk > 0) with sortable table
  - Risk distribution chart (clean / low / moderate / high / severe)
  - Export results as CSV
- **Upload history** — list of past uploads with date, plate count, and flagged count

### 5. DB Function: `scan_uploaded_plates`
A server-side function that re-scans an existing upload against current report data (so agencies can refresh results without re-uploading).

## Technical Details

- File parsing happens in the edge function (using `csv-parse` for CSV, `xlsx` for Excel)
- Max file size: 5MB (enforced client-side and in storage policy)
- Plate format validation: uppercase alphanumeric, 2-8 characters
- Processing is async — UI polls `uploaded_plate_lists.status` until complete
- Tier-based upload limits enforced in the edge function by checking the account's tier

## Files to Create/Modify
- **Migration**: new tables + storage bucket + RLS + `scan_uploaded_plates` function
- **Edge function**: `supabase/functions/process-plate-upload/index.ts`
- **New component**: `src/components/PlateUploadSection.tsx` (shared between both portals)
- **Modified**: `src/pages/LawEnforcement.tsx` — add upload tab
- **Modified**: `src/pages/InsurancePortal.tsx` — add upload tab

