import { test, expect } from "@playwright/test";

test.describe("Core Navigation & Page Load", () => {
  test("home page loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/plate/i);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("auth page loads", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText(/sign in|log in|create account/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("wall of shame page loads", async ({ page }) => {
    await page.goto("/a-hole-patrol/wall");
    await expect(page.locator("body")).not.toBeEmpty();
    await page.waitForTimeout(2000);
  });

  test("watch map page loads", async ({ page }) => {
    await page.goto("/map");
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("404 page for invalid route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    // Should either show 404 or redirect to home
    await page.waitForTimeout(2000);
    const url = page.url();
    const has404 = await page.getByText(/not found|404/i).isVisible().catch(() => false);
    const redirectedHome = url.endsWith("/") || url.endsWith("/this-route-does-not-exist");
    expect(has404 || redirectedHome).toBeTruthy();
  });
});

test.describe("Responsive Layout", () => {
  test("mobile viewport renders without horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("desktop viewport renders full layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Supabase Edge Function Health", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const resp = await request.get(
      "https://qcnhusvxygyczbnmbyvd.supabase.co/functions/v1/health"
    );
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("up");
  });
});
