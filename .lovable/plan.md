## Goal

Replace the existing inline "I am a passenger or parked" checkbox with a blocking confirmation modal that appears whenever the user taps **Live Scan** or **Upload Photo**, requiring an explicit "I'm not driving" button click before the camera/picker opens. This strengthens the liability waiver and makes acknowledgment unmistakable.

## Behavior

1. User taps **Live Scan** or **Upload Photo** in `PlateScanner`.
2. A modal (`AlertDialog`) appears with:
   - Title: "Confirm you're not driving"
   - Body: short liability disclaimer — confirming they are a passenger or parked, that they will not use the app while operating a vehicle, and that Plate'n State is not liable for misuse.
   - Two buttons: **Cancel** and **I'm not driving — continue**
3. On confirm, proceed with the originally intended action (native camera, web camera, or file picker).
4. On cancel, close the modal and do nothing.
5. Remember acknowledgment for the current session only (sessionStorage) so the modal doesn't reappear on every scan within the same session — but always re-prompts on a fresh app launch.

## Files to change

- **`src/components/PlateScanner.tsx`**
  - Remove the inline checkbox + warning UI (lines ~242–263) and the `acknowledgedPassenger` / `showWarning` state.
  - Add `liabilityOpen` state and a `pendingAction` ref/state to remember which entry point was clicked (`'native-camera' | 'web-camera' | 'upload'`).
  - Wrap the three entry buttons (Live Scan native, Live Scan web, Upload Photo) so each first checks sessionStorage flag `plate_scan_liability_ack`. If absent, open the modal and stash the pending action; if present, run the action immediately.
  - Add an `AlertDialog` at the bottom of the component with the disclaimer copy and a confirm handler that sets the sessionStorage flag and dispatches the pending action.

- **No backend, schema, or edge-function changes.**

## Technical notes

- Use existing shadcn `AlertDialog` from `@/components/ui/alert-dialog` (already used elsewhere).
- Keep all styling on semantic tokens (`text-muted-foreground`, `bg-background`, etc.).
- Disclaimer copy (draft, easy to tweak):
  > By continuing, you confirm that you are a passenger or your vehicle is parked, and that you will not use Plate'n State while driving. You agree that Plate'n State and its operators are not liable for any misuse, accidents, or damages resulting from use of this feature.

## Out of scope

- No changes to scan logic, edge functions, auth, or email.
- No persistent (cross-session) acknowledgment — that would be a separate Terms acceptance feature.
