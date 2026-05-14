## CSAE Policy Implementation

### 1. New page: `src/pages/CsaePolicy.tsx`
- Route: `/csae-policy`
- Same layout/styling as Terms.tsx and Privacy.tsx (Header, container, prose-invert dark theme)
- Full content from the user's pasted policy text, organized into the 9 sections + contact
- Fix typo in pasted text: contact email shows `safety@platesnstate.com` — will use `support@platenstate.com` for consistency with Terms/Privacy (confirm if you'd prefer a separate `safety@` address)
- Back-to-home link at bottom

### 2. Routing: `src/App.tsx`
- Lazy-load `CsaePolicy` and add `<Route path="/csae-policy" element={<CsaePolicy />} />`

### 3. TermsGate update: `src/components/TermsGate.tsx`
- Bump `TERMS_VERSION` to `2026-05-14` so existing users re-accept (covers the new policy)
- Update dialog copy to reference Terms, Privacy, **and** the new CSAE Policy with a link to `/csae-policy`
- Checkbox label updated to "I have read and agree to the Terms of Service, Privacy Policy, and CSAE Policy"
- No schema change — reuses existing `terms_accepted_at` / `terms_version` columns

### 4. Footer/navigation links
You mentioned "i pasted the text" for the link location. Since Terms and Privacy are currently only linked from the TermsGate dialog (no global footer), the new TermsGate link will be the primary entry point. The page is also reachable directly via `/csae-policy`. If you want it added to a specific footer or settings menu, let me know which one.

### Verification
- After implementation, load `/csae-policy` in the preview to confirm rendering
- Trigger TermsGate (clear `terms_accepted_at` for a test user) to confirm new copy + link work
