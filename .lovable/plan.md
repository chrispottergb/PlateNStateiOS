I found the mock-checkout endpoint is now reachable and CORS is working, but the real app still needs a cleaner invocation path and better diagnostics so the request does not fail as a generic edge-function error.

Plan:
1. Update `CheckoutDialog` to send the current session access token explicitly when invoking `mock-checkout`, instead of relying on implicit auth behavior.
2. Include the selected plate state in the mock checkout request so the function receives the full expected payload.
3. Harden `mock-checkout` auth parsing so missing/invalid tokens return a clear checkout error with CORS headers, not a generic “Failed to send request” failure.
4. Add lightweight server logs around auth and validation failures, then redeploy `mock-checkout`.
5. Verify with an endpoint test that OPTIONS succeeds and POST reaches the function with the expected response path.