# -*- coding: utf-8 -*-
"""
Red team security scan for Plate N State
Tests: auth bypass, IDOR, RLS bypass, injection, rate limiting, input validation
Run: python red-team.py
"""

import requests
import json
import time
import sys
import uuid

BASE = "https://qcnhusvxygyczbnmbyvd.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmh1c3Z4eWd5Y3pibm1ieXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg0NTAsImV4cCI6MjA5Nzc1NDQ1MH0"
    ".sQJL5eJkI706OwjtUcmr3R1yaT_VaOyEkV7b-Ljrqyk"
)
SCAN_API = "https://platenstate-scan-api.vercel.app"
EDGE = f"{BASE}/functions/v1"

ANON_HDR = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}", "Content-Type": "application/json"}
NO_AUTH_HDR = {"Content-Type": "application/json"}  # no API key at all
FAKE_JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.fake"

import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
INFO = "[INFO]"

results = []

def check(label, passed, detail="", severity="HIGH"):
    icon = PASS if passed else FAIL
    tag = f"[{severity}]" if not passed else ""
    line = f"  {icon} {tag} {label}"
    if detail:
        line += f"\n       > {detail}"
    print(line)
    results.append({"label": label, "passed": passed, "severity": severity, "detail": detail})

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def rest(method, path, **kwargs):
    url = f"{BASE}/rest/v1/{path}"
    return requests.request(method, url, headers=ANON_HDR, timeout=10, **kwargs)

def rest_noauth(method, path, **kwargs):
    url = f"{BASE}/rest/v1/{path}"
    return requests.request(method, url, headers=NO_AUTH_HDR, timeout=10, **kwargs)

# ──────────────────────────────────────────────────────────────
section("1. UNAUTHENTICATED ACCESS — No API key at all")
# ──────────────────────────────────────────────────────────────

r = rest_noauth("GET", "reports?limit=1")
check("No-key request blocked", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:120]}", "HIGH")

r = rest_noauth("GET", "profiles?limit=1")
check("Profiles blocked without key", r.status_code in (401, 403),
      f"Got {r.status_code}", "HIGH")

# ──────────────────────────────────────────────────────────────
section("2. ANON WRITE — Should be blocked by RLS")
# ──────────────────────────────────────────────────────────────

fake_uid = str(uuid.uuid4())

# Try inserting a report as anon
r = rest("POST", "reports", json={
    "user_id": fake_uid,
    "plate_number": "REDTEAM1",
    "state": "CA",
    "infraction": "reckless_driving",
    "location": "Hacker Ave"
})
check("Anon cannot INSERT reports", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

# Try inserting a community post as anon
r = rest("POST", "community_posts", json={
    "user_id": fake_uid,
    "body": "Red team test post — should not appear"
})
check("Anon cannot INSERT community_posts", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

# Try inserting a profile as anon
r = rest("POST", "profiles", json={
    "id": fake_uid,
    "display_name": "hacker"
})
check("Anon cannot INSERT profiles", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "HIGH")

# Try upvoting a report as anon
r = rest("POST", "report_upvotes", json={
    "report_id": str(uuid.uuid4()),
    "user_id": fake_uid
})
check("Anon cannot INSERT report_upvotes", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "HIGH")

# ──────────────────────────────────────────────────────────────
section("3. ANON DELETE / UPDATE — Should be blocked by RLS")
# ──────────────────────────────────────────────────────────────

# Fetch a real report id first
r = rest("GET", "reports?select=id&limit=1")
real_report_id = None
if r.status_code == 200 and r.json():
    real_report_id = r.json()[0]["id"]

if real_report_id:
    r = rest("DELETE", f"reports?id=eq.{real_report_id}")
    check("Anon cannot DELETE reports", r.status_code in (401, 403) or (r.status_code == 200 and r.text == "[]"),
          f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

    r = rest("PATCH", f"reports?id=eq.{real_report_id}", json={"plate_number": "HACKED"})
    check("Anon cannot UPDATE reports", r.status_code in (401, 403) or (r.status_code == 200 and r.text == "[]"),
          f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")
else:
    print(f"  {WARN} No reports in DB — skipping delete/update tests")

# ──────────────────────────────────────────────────────────────
section("4. AUTH USERS TABLE — Must never be exposed via REST")
# ──────────────────────────────────────────────────────────────

# auth.users is not exposed via PostgREST by default, but double-check
r = rest("GET", "users?limit=1")
check("auth.users not exposed via REST", r.status_code in (401, 404),
      f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

# Try via profiles — should only see own row if auth'd, or public fields if policy allows
r = rest("GET", "profiles?select=id,display_name&limit=5")
if r.status_code == 200:
    rows = r.json()
    # Check that no sensitive fields leak
    for row in rows:
        has_email = "email" in row
        has_password = "password" in row or "encrypted_password" in row
    check("Profiles don't leak email/password fields",
          not any("email" in row or "password" in row for row in rows),
          f"Returned {len(rows)} rows, sample keys: {list(rows[0].keys()) if rows else []}", "HIGH")
else:
    check("Profiles readable by anon (expected)", r.status_code == 200,
          f"Got {r.status_code}", "INFO")

# ──────────────────────────────────────────────────────────────
section("5. SQL INJECTION via PostgREST filters")
# ──────────────────────────────────────────────────────────────

# PostgREST uses parameterized queries, but test anyway
sqli_payloads = [
    "'; DROP TABLE reports; --",
    "' OR '1'='1",
    "1; SELECT * FROM auth.users--",
    "' UNION SELECT id,email,encrypted_password FROM auth.users--",
]

for payload in sqli_payloads:
    r = rest("GET", f"reports?plate_number=eq.{requests.utils.quote(payload)}&limit=1")
    # Should return 200 with empty array (parameterized) or 400 (rejected)
    # A 500 with DB error text would indicate injection
    leaked = r.status_code == 500 or "auth.users" in r.text or "encrypted_password" in r.text
    check(f"SQLi blocked: {payload[:40]}",
          not leaked and r.status_code in (200, 400),
          f"Got {r.status_code}: {r.text[:150]}", "CRITICAL")

# ──────────────────────────────────────────────────────────────
section("6. OVERSIZED PAYLOAD — Input length enforcement")
# ──────────────────────────────────────────────────────────────

# Try to insert oversized body into community_posts (DB CHECK constraint limits to 1000)
# Use authenticated header — we're testing DB-level enforcement, not RLS
big_body = "A" * 5000
r = rest("POST", "community_posts", json={
    "user_id": fake_uid,
    "body": big_body
})
check("5000-char community post rejected", r.status_code in (401, 403, 400, 422),
      f"Got {r.status_code}: {r.text[:200]}", "MEDIUM")

big_plate = "X" * 500
r = rest("GET", f"reports?plate_number=eq.{big_plate}&limit=1")
check("500-char plate filter handled safely", r.status_code in (200, 400),
      f"Got {r.status_code}", "LOW")

# ──────────────────────────────────────────────────────────────
section("7. FAKE JWT — Tampered / unsigned token")
# ──────────────────────────────────────────────────────────────

hdr_fake = {**ANON_HDR, "Authorization": FAKE_JWT}
r = requests.get(f"{BASE}/rest/v1/community_posts?limit=1", headers=hdr_fake, timeout=10)
check("Fake JWT rejected", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

# Try with no Authorization header but valid apikey (anon only)
hdr_no_bearer = {"apikey": ANON_KEY, "Content-Type": "application/json"}
r = requests.post(f"{BASE}/rest/v1/community_posts",
                  headers=hdr_no_bearer,
                  json={"user_id": fake_uid, "body": "test"},
                  timeout=10)
check("No bearer token: anon cannot write", r.status_code in (401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "HIGH")

# ──────────────────────────────────────────────────────────────
section("8. EDGE FUNCTIONS — Auth enforcement")
# ──────────────────────────────────────────────────────────────

# Functions with verify_jwt=true should reject anon calls
protected_fns = ["process-email-queue", "send-transactional-email"]
for fn in protected_fns:
    r = requests.post(f"{EDGE}/{fn}", headers=ANON_HDR, json={}, timeout=10)
    check(f"Edge fn {fn} rejects anon", r.status_code in (401, 403),
          f"Got {r.status_code}: {r.text[:200]}", "HIGH")

# Functions with verify_jwt=false should still not expose sensitive data without proper body
public_fns = ["health"]
for fn in public_fns:
    r = requests.get(f"{EDGE}/{fn}", headers=ANON_HDR, timeout=10)
    check(f"Edge fn {fn} responds OK", r.status_code < 500,
          f"Got {r.status_code}: {r.text[:200]}", "INFO")

# ──────────────────────────────────────────────────────────────
section("9. STRIPE WEBHOOK — Signature validation")
# ──────────────────────────────────────────────────────────────

r = requests.post(
    f"{SCAN_API}/api/stripe-webhook",
    headers={"Content-Type": "application/json"},
    json={"type": "checkout.session.completed", "data": {"object": {"id": "cs_fake"}}},
    timeout=10
)
check("Stripe webhook rejects unsigned payload", r.status_code in (400, 401, 403),
      f"Got {r.status_code}: {r.text[:200]}", "CRITICAL")

# ──────────────────────────────────────────────────────────────
section("10. MASS ENUMERATION / RATE LIMITING")
# ──────────────────────────────────────────────────────────────

# Fire 50 rapid requests and check if any rate limiting kicks in
errors_429 = 0
t0 = time.time()
for i in range(50):
    r = rest("GET", "reports?limit=1&offset={i}")
    if r.status_code == 429:
        errors_429 += 1

elapsed = time.time() - t0
check("Rate limiting active at 50 rapid req/s",
      errors_429 > 0,
      f"0/50 requests rate-limited in {elapsed:.1f}s — Supabase Pro has no built-in rate limiter; use Cloudflare or a custom Edge Function for this",
      "MEDIUM")

# ──────────────────────────────────────────────────────────────
section("11. IDOR — Can anon read other users' private data?")
# ──────────────────────────────────────────────────────────────

# Check if subscriptions / private tables are exposed
private_tables = ["subscriptions", "user_subscriptions", "stripe_customers", "payments"]
for tbl in private_tables:
    r = rest("GET", f"{tbl}?limit=1")
    exposed = r.status_code == 200 and r.json() != []
    check(f"Table '{tbl}' not exposed to anon",
          r.status_code in (404, 401, 403) or (r.status_code == 200 and r.json() == []),
          f"Got {r.status_code}: {r.text[:150]}", "HIGH")

# ──────────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────────
section("SUMMARY")

passed = [x for x in results if x["passed"]]
failed = [x for x in results if not x["passed"]]
critical = [x for x in failed if x["severity"] == "CRITICAL"]
high = [x for x in failed if x["severity"] == "HIGH"]
medium = [x for x in failed if x["severity"] in ("MEDIUM", "LOW")]

print(f"\n  Total checks: {len(results)}")
print(f"  {PASS} Passed: {len(passed)}")
print(f"  {FAIL} Failed: {len(failed)}")

if critical:
    print(f"\n  CRITICAL ({len(critical)}):")
    for x in critical:
        print(f"    x {x['label']}")
        if x["detail"]:
            print(f"      {x['detail']}")

if high:
    print(f"\n  HIGH ({len(high)}):")
    for x in high:
        print(f"    x {x['label']}")
        if x["detail"]:
            print(f"      {x['detail']}")

if medium:
    print(f"\n  MEDIUM/LOW ({len(medium)}):")
    for x in medium:
        print(f"    ~ {x['label']}")
        if x["detail"]:
            print(f"      {x['detail']}")

if not failed:
    print(f"\n  All checks passed. App is reasonably hardened.")
else:
    print(f"\n  Fix CRITICAL and HIGH findings before production traffic scales.")

sys.exit(0 if not critical else 1)
