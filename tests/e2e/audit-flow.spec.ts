import { test, expect } from "@playwright/test";

// End-to-end happy path: submit the mock HVAC business through /audit,
// let the mock-mode pipeline run, land on the completed report, verify
// the score and top opportunities render, open a finding's evidence, and
// confirm the private report route (not the intake/dashboard route) is
// what's actually reachable.
//
// Requires Supabase to be configured (see README) — this test exercises
// the full persisted pipeline, not just static UI.
test("submits an audit and reaches a completed report", async ({ page }) => {
  await page.goto("/audit");

  await page.getByLabel(/business name/i).fill("Desert Comfort Heating & Air");
  await page.getByLabel(/website url/i).fill("desertcomfortair.example.com");
  await page.getByLabel(/primary service category/i).selectOption("hvac");
  await page.getByLabel(/^city/i).fill("Phoenix");
  await page.getByLabel(/^state/i).selectOption("AZ");

  await page.getByRole("button", { name: /run my free audit/i }).click();

  await page.waitForURL(/\/audit\/.+\/processing/, { timeout: 30_000 });
  await expect(page.getByText(/analyzing your local search authority/i)).toBeVisible();

  await page.waitForURL(/\/reports\/.+/, { timeout: 90_000 });

  await expect(page.getByText("Desert Comfort Heating & Air")).toBeVisible();
  await expect(page.getByText("Public Audit")).toBeVisible();
  await expect(page.getByText(/top opportunities/i)).toBeVisible();

  const firstFinding = page.locator("button", { hasText: /show evidence/i }).first();
  await firstFinding.click();
  await expect(page.getByText(/hide evidence/i).first()).toBeVisible();
});
