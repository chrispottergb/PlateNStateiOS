# Fix: state dropdown needs two clicks inside Report modal

## Symptom
On the Report tab, clicking the State dropdown (next to the plate input) flickers and does nothing on the first click — the user has to click a second time to actually open it.

## Root cause
This is the well-known Radix Select-inside-Dialog interaction bug. The `DialogContent` uses `overflow-y-auto` (line 371 of `src/components/ReportModal.tsx`) and the `<Select>` trigger sits inside it. When the user clicks the trigger:

1. Radix Dialog's focus trap / scroll-lock toggles `pointer-events: none` on the body.
2. The Select's pointer-down handler fires before the Dialog releases focus, so the open state flips on and immediately back off.
3. The second click hits a stable state and opens normally.

The same Select pattern appears for both Quick mode and Detailed mode (plate state + incident state pickers).

## Fix
Two small, well-established fixes — apply both:

1. Force `SelectContent` to use popper positioning and prevent the trigger's mousedown from being swallowed by the dialog. Add `position="popper"` and `onCloseAutoFocus={(e) => e.preventDefault()}` to every `SelectContent` inside `ReportModal.tsx`.
2. On each `SelectTrigger`, add `onPointerDown={(e) => e.stopPropagation()}` so the dialog's scrollable container doesn't intercept the first pointer event.

If after this it still requires a double-click in some browsers, fall back to wrapping the trigger in a `<div onPointerDownCapture={(e) => e.stopPropagation()}>`.

## Files
- Edit: `src/components/ReportModal.tsx` (state selects in Quick mode and Detailed mode)

## Verification
- Open Report modal → click State dropdown once → it should open on the first click.
- Repeat in Detailed mode for both plate state and incident state.
- Re-test after switching between Quick/Detailed to make sure no regressions.
