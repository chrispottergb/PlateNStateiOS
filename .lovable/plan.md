## Privacy Principles (enforced everywhere)

- Claiming a plate links a `user_id` to a plate **only** so notifications and disputes can be routed. It never publishes the owner's identity.
- Reports are attached to the **plate string**, not to the claimant. No "violation history per person" is ever computed or stored.
- Disputes store **only** the fields needed to action a post: `report_id`, `plate_number`, `reason` (enum), optional short note, status, timestamps. **No** owner name, address, license, VIN, insurance, or any PII.
- Resolved/denied disputes are kept as moderation audit only (status + timestamps). The dispute row never exposes the claimant publicly — RLS limits visibility to the disputer and admins.
- Posts (reports) are kept regardless of dispute outcome history. If a dispute is **upheld**, the post is removed; the dispute row stays for moderation accounting but contains no personal data.

## Pricing & Eligibility

- Each **claimed plate** gets **1 free dispute lifetime** (tracked per `claimed_plates` row).
- After the free one is used, every additional dispute = **$5.99 one-time** (Stripe Embedded Checkout).
- Only the user who currently owns the active claim on that plate can dispute reports against it.
- A given report can only be disputed once per claimant (no resubmissions on denial — admin decision is final per post).

## Dispute Reasons (enum, no free-form PII)

- `not_my_vehicle` — wrong plate / different vehicle
- `inaccurate_details` — wrong infraction, location, or time
- `duplicate` — same incident already reported
- `harassment_or_abuse` — targeted/abusive content
- `other` — short note (max 280 chars, sanitized; user warned not to share personal info)

## Database Changes (migration)

New table `report_disputes`:
```
id uuid pk
report_id uuid not null
plate_number text not null
disputer_id uuid not null         -- the claimant, never shown publicly
reason text not null              -- enum above
note text                         -- optional, 280 char cap, no PII guidance
status text not null default 'pending'   -- pending | upheld | denied
paid boolean not null default false
stripe_session_id text
created_at timestamptz default now()
resolved_at timestamptz
resolved_by uuid                  -- admin user_id
unique (report_id, disputer_id)
```

Add to `claimed_plates`:
```
free_dispute_used boolean not null default false
```

RLS:
- SELECT: disputer (own rows) OR admin. **Public cannot read disputes.**
- INSERT: only via SECURITY DEFINER RPC `submit_dispute(report_id, reason, note)` which:
  1. Verifies caller owns the active claim on that plate.
  2. Checks `free_dispute_used`. If free → insert dispute (paid=true since no charge), flip flag, return `{paid:false, dispute_id}`.
  3. If not free → insert pending dispute (paid=false), return `{requires_payment:true, dispute_id}`. Frontend then opens Stripe Embedded Checkout with `dispute_id` in metadata.
- UPDATE: admin only, via RPC `resolve_dispute(dispute_id, decision)` which sets status, `resolved_at`, `resolved_by`, and **if upheld**, deletes the underlying report.
- DELETE: none.

Indexes: `(report_id)`, `(plate_number, status)`, `(disputer_id, created_at desc)`.

## Stripe

- Create one-time product `report_dispute` priced at `$5.99` (price_id `report_dispute_fee`) via `payments--create_product`.
- Reuse `create-checkout` edge function — pass `priceId: "report_dispute_fee"` plus `metadata: { dispute_id, type: "dispute" }`.
- Extend `payments-webhook` `checkout.session.completed` handler: if `metadata.type === "dispute"`, mark `report_disputes.paid = true, stripe_session_id = ...` for that `dispute_id`.
- `verify_jwt = false` already set on these functions.

## Frontend Changes

**New component `DisputeDialog.tsx`** (opened from a report card on a plate the viewer has claimed):
- Reason dropdown + optional note (with inline warning: "Do not include personal information").
- Shows whether this dispute is free or $5.99, with a clear "Pay & Submit" vs "Submit Free Dispute" button.
- On paid path, mounts `<StripeEmbeddedCheckout>` after RPC returns `requires_payment`.

**`PlateDetail.tsx`**: when the viewer is the active claimant, render a small "Dispute" button on each report card (hidden otherwise). Show a subtle "Free dispute available" or "$5.99 per dispute" hint.

**`Profile.tsx`**: new "My Disputes" section — list of own disputes (status badges only, no owner data shown for anyone), filterable by status.

**`AdminPanel.tsx`**: new "Disputes" tab — pending queue with report preview, reason, optional note, and Uphold / Deny buttons. Uphold deletes the report; deny keeps it. Both record `resolved_at`/`resolved_by`.

**`NotificationBell.tsx`**: render dispute outcome notifications (`"Your dispute was upheld — the post has been removed"` / `"Your dispute was denied"`). Notifications carry **no** identifying info about the original reporter.

## Files

**New**
- `supabase/migrations/<ts>_report_disputes.sql` — table, RPCs, RLS, indexes, `claimed_plates.free_dispute_used`.
- `src/components/DisputeDialog.tsx`
- `src/hooks/useDisputeEligibility.ts`

**Edited**
- `supabase/functions/create-checkout/index.ts` — accept dispute metadata.
- `supabase/functions/payments-webhook/index.ts` — handle `type=dispute` completions.
- `src/pages/PlateDetail.tsx` — owner-only dispute buttons.
- `src/pages/Profile.tsx` — My Disputes section.
- `src/pages/AdminPanel.tsx` — Disputes tab.
- `src/components/NotificationBell.tsx` — dispute notification rendering.

## Order of Implementation

1. Create Stripe product + price (`report_dispute_fee`, $5.99 one-time).
2. Migration: table, RLS, RPCs, `claimed_plates.free_dispute_used`.
3. Webhook + checkout edge function updates.
4. `DisputeDialog` + eligibility hook.
5. Wire into `PlateDetail` (owner-only buttons).
6. Admin Disputes tab.
7. Profile "My Disputes" section.
8. Notification rendering.

Approve to proceed?