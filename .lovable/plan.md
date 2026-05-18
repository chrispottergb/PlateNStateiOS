
# Plate N' State — Feature Batch

12 changes across frontend, one new edge function, and a DB migration. Grouped by area for review.

## 1. Plate length & state-on-step-1

- `formatPlate` in `ReportModal.tsx` → allow 10 chars; bump `maxLength={8}` → `10` everywhere: `ReportModal` (quick + detailed), `ClaimPlate.tsx`, `QuickCapture.tsx`, `PlateScanner.tsx`.
- Move the existing `<Select stateCode>` from the Location step into **Step 1 (Plate)** of detailed mode, and add it next to the plate input in quick mode. State stays paired with location pickers too (state drives city list).

## 2. Infraction tab: Bad / Good behavior

- New `POSITIVE_BEHAVIORS` array in `data.ts` with 9 items (courteous_merge, yielded_pedestrian, let_me_in, used_turn_signal, stopped_for_school_bus, great_parking, safe_following_distance, hazard_warning, roadside_assist), each with **negative** points (e.g. -2 to -4).
- Extend `InfractionType` union in `types.ts` to include positive types. Add `kind: 'bad' | 'good'` to `InfractionDef`.
- In `ReportModal`, render Tabs ("Bad Behavior" / "Good Behavior") on the infraction step in **both quick and detailed** modes. Selecting a good behavior is valid for submission.
- **Infraction is now optional**: drop `infraction !== null` from `canSubmitQuick` / `canProceed`. Server-side `spend_credit_on_report` already allows arbitrary `p_infraction` strings; pass `null`/empty when missing — confirm RPC accepts null (it does, column is `text NOT NULL` though — set a sentinel `'unspecified'` to keep schema safe).

## 3. AI auto-tag (new edge function)

- New edge function `supabase/functions/auto-tag-behavior/index.ts` using Lovable AI Gateway (`google/gemini-3-flash-preview`, structured output via AI SDK `Output.object`). Input: `{ comment: string }`. Output: `{ type: InfractionType | null, confidence: number }`. `verify_jwt=true` (default). CORS + zod validation.
- `config.toml`: no special config needed.
- In `ReportModal` comment Textarea, add `onBlur` → if comment length ≥ 10 and no infraction selected, invoke function, show "AI is reading your note…" spinner inline, and auto-select returned type if confidence ≥ 0.6.

## 4. Scoring window + good-behavior scoring

- DB migration (`supabase--migration`):
  - Recreate `wall_of_shame_mv` with `WHERE created_at >= NOW() - INTERVAL '6 months'` and a `CASE` that **subtracts** points for good-behavior infraction types.
  - Update `batch_plate_screening`, `insurance_plate_lookup`, `scan_uploaded_plates` score `CASE` blocks to recognize the 9 positive types as negative weights and to gate on the 6-month window.
- `data.ts` `getScoreColor`/`getScoreBg`: green for `score <= 0` (good standing), muted 1-14, warning 15-29, destructive 30+.

## 5. Landing page CTA

- `Index.tsx`: add a prominent `<ReportModal trigger={...} />` button (gradient pill, "Report a Plate", `Megaphone` icon) above the two path cards.

## 6. Kansas county field

- In `ReportModal` quick + detailed location section, when `stateCode === "KS"` render an optional `<Input>` for county with helper text: *"Kansas vanity plates are issued per county. Including it improves report accuracy."*
- Append ` — <County> County` into the `location` string on submit (no schema change).

## 7. Driver description dropdown

- Replace the `driverGenderFemale` checkbox with a `<Select>` for: Male, Female, Elderly Male, Elderly Female, Young Male, Young Female, Unknown / Not Sure. Map labels to existing `p_driver_gender` text param.

## 8. Plate claim — 4 pricing tiers

- `ClaimPlate.tsx`: render a 2×2 grid of duration cards (1yr $4.99, 2yr $8.99, 5yr $14.99, Lifetime $29.99 with "Best Value" ribbon). Selecting a tier sets it; "Claim" passes the corresponding `priceId`: `plate_claim_1yr | plate_claim_2yr | plate_claim_5yr | plate_claim_lifetime`.
- Update `CheckoutTarget` priceId union.
- **Backend follow-up (not in this batch)**: user creates the 4 Stripe prices and updates `mock-checkout` edge function to recognize them. We'll set up the frontend to send them; mock function can default to success.

## 9. Flagging / strikes / appeals

- Migration:
  - `reports.flag_count int default 0`, `reports.is_flagged boolean default false`, `reports.excluded_from_score boolean default false`.
  - New `report_flags` table (`report_id`, `user_id`, `reason text`, unique pair) with RLS: authenticated can insert own, anyone can read counts via view.
  - New `appeals` table (`plate_number`, `user_id`, `report_id nullable`, `reason text`, `status text default 'pending'`, timestamps) + RLS: owner can insert/select own; admins can select/update all.
  - Trigger on `report_flags` insert: bump `reports.flag_count`; at `>=3` set `is_flagged=true, excluded_from_score=true`. Wall-of-shame view also gets `AND NOT excluded_from_score`.
- Frontend:
  - Add "Flag as false report" button + dialog on `SocialReportCard` / report cards.
  - "Under Review" badge when `is_flagged`.
  - On `PlateDetail.tsx`, add "Appeal" button (visible to verified plate owner — check `claimed_plates`).
  - `AdminPanel.tsx`: new "Appeals" tab with pending list and Uphold/Dismiss actions (writes status).

## 10. Username on signup

- `Auth.tsx` already has a `displayName` input on sign-up — currently optional with `"Driver"` fallback. Make it **required** when `isSignUp`, min 2 chars, and surface on the profile via the existing `handle_new_user` trigger (already reads `display_name` from `raw_user_meta_data`). Just enforce the requirement client-side and remove the silent fallback.

## Technical notes

- New edge function deploys automatically; no `config.toml` change needed.
- `wall_of_shame_mv` rebuild requires `DROP MATERIALIZED VIEW ... CASCADE` then `CREATE`; reschedule the `refresh_wall_of_shame` job is unchanged.
- All RLS policies on new tables use `auth.uid()` patterns matching existing tables.
- Stripe price IDs are sent as strings to the mock-checkout function — actual Stripe product creation is on the user's side (or via `payments--batch_create_product` if they want me to do it in a follow-up).

## Out of scope (deliberately)

- Building a new Android AAB (separate request).
- Real Stripe product creation (user owns this per their notes).
- Migrating existing reports' state field.
