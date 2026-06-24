import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = path.join(__dirname, "../fixtures/test-plate.jpg");

test.describe("Scan Plate API Integration", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(["geolocation"], {
      origin: "http://localhost:8080",
    });
    await context.setGeolocation({
      latitude: 43.0389,
      longitude: -87.9065,
      accuracy: 10,
    });
    await page.goto("/");
  });

  test("CAM-005/API-001: scan returns valid plate and shows success toast", async ({
    page,
  }) => {
    await page.route(
      "**/platenstate-scan-api.vercel.app/api/scan-plate",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            plate_number: "ABC1234",
            state: "WI",
            confidence: "high",
          }),
        })
    );

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
      await expect(page.getByText("Plate detected: ABC1234")).toBeVisible({
        timeout: 10000,
      });
    } else {
      test.skip(true, "File input not visible — native camera path only");
    }
  });

  test("AI-006: scan handles null plate (unreadable image)", async ({
    page,
  }) => {
    await page.route(
      "**/platenstate-scan-api.vercel.app/api/scan-plate",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            plate_number: null,
            state: null,
            confidence: "low",
          }),
        })
    );

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
      await expect(page.getByText("Could not read plate")).toBeVisible({
        timeout: 10000,
      });
    } else {
      test.skip(true, "File input not visible");
    }
  });

  test("API-011: scan shows rate limit message on 429", async ({ page }) => {
    await page.route(
      "**/platenstate-scan-api.vercel.app/api/scan-plate",
      (route) =>
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Rate limit exceeded, try again later",
          }),
        })
    );

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
      await expect(
        page.getByText(/rate limit|scan failed/i)
      ).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, "File input not visible");
    }
  });

  test("API-013: scan handles gateway timeout", async ({ page }) => {
    await page.route(
      "**/platenstate-scan-api.vercel.app/api/scan-plate",
      (route) =>
        route.fulfill({
          status: 504,
          contentType: "application/json",
          body: JSON.stringify({ error: "Gateway Timeout" }),
        })
    );

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(FIXTURE_IMAGE);
      await expect(
        page.getByText(/scan failed|error/i)
      ).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, "File input not visible");
    }
  });
});

test.describe("API Direct Tests (no browser)", () => {
  test("API-007: smoke test endpoint", async ({ request }) => {
    const resp = await request.post(
      "https://platenstate-scan-api.vercel.app/api/scan-plate",
      {
        data: { smoke_test: true },
      }
    );
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.smoke_test).toBe(true);
  });

  test("API-002: missing image returns 400", async ({ request }) => {
    const resp = await request.post(
      "https://platenstate-scan-api.vercel.app/api/scan-plate",
      {
        data: {},
      }
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain("Missing image data");
  });

  test("API-003: non-string image returns 400", async ({ request }) => {
    const resp = await request.post(
      "https://platenstate-scan-api.vercel.app/api/scan-plate",
      {
        data: { image: 12345 },
      }
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain("Missing image data");
  });

  test("API-004: GET method returns 405", async ({ request }) => {
    const resp = await request.get(
      "https://platenstate-scan-api.vercel.app/api/scan-plate"
    );
    expect(resp.status()).toBe(405);
  });

  test("API-005: OPTIONS returns CORS headers", async ({ request }) => {
    const resp = await request.fetch(
      "https://platenstate-scan-api.vercel.app/api/scan-plate",
      { method: "OPTIONS" }
    );
    expect(resp.status()).toBe(200);
    expect(resp.headers()["access-control-allow-origin"]).toBe("*");
  });
});

test.describe("Checkout API Direct Tests", () => {
  test("CHK-004: invalid priceId returns 400", async ({ request }) => {
    const resp = await request.post(
      "https://platenstate-scan-api.vercel.app/api/create-checkout",
      {
        data: {
          priceId: "fake_invalid_price",
          returnUrl: "https://platenstate.com",
        },
      }
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toContain("Invalid priceId");
  });

  test("CHK: valid priceId creates checkout session", async ({ request }) => {
    const resp = await request.post(
      "https://platenstate-scan-api.vercel.app/api/create-checkout",
      {
        data: {
          priceId: "plate_claim_1yr",
          plateNumber: "TEST999",
          userId: "test-user",
          email: "test@example.com",
          returnUrl: "https://platenstate.com/checkout-complete",
        },
      }
    );
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.url).toContain("checkout.stripe.com");
    expect(body.sessionId).toBeTruthy();
  });
});
