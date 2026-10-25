import { expect, test } from "@playwright/test";

test.describe("Skull King Flow", () => {
  test("loads skull king hub and navigates to calculator", async ({ page }) => {
    await page.goto("/games/skull-king");
    await expect(
      page.getByRole("heading", { name: "Skull King", level: 1 }),
    ).toBeVisible();

    // Verify presence of Play, Calculator, and Rules cards
    await expect(page.getByText("Score Calculator")).toBeVisible();
    await expect(page.getByText("Rules & Docs")).toBeVisible();

    // Click Open on Calculator
    await page.locator('a[href="/games/skull-king/calculator"]').click();
    await expect(page).toHaveURL(/\/games\/skull-king\/calculator/);
  });
});
