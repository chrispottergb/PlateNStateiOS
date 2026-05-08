## Add "Claim Plate" pill button next to plate search

**File:** `src/pages/HonkZone.tsx`

1. Add `ShieldCheck` to the existing `lucide-react` import on line 3.
2. Inside the search row at line 184, immediately after the `<Button type="submit">` (line 194) and still inside the `<form>`, add a `<Link to="/claim">` rendering a pill `<Button>`:
   - `variant="outline"`, `size="sm"`, classes `rounded-full shrink-0 gap-1.5`
   - `<ShieldCheck className="h-4 w-4" />` plus a label `<span className="hidden sm:inline">Claim Plate</span>` so the label hides on narrow screens and the button stays compact next to the search input.

No other files change.