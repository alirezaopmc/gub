import { expect, test } from "@playwright/test";

test.describe("Scout Flow", () => {
  test("loads scout hub and shows tools", async ({ page }) => {
    await page.goto("/games/scout");
    await expect(
      page.getByRole("heading", { name: "Scout", level: 1 }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /Open Companion/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Calculate Score/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Read Rules/i })).toBeVisible();
  });

  test("calculates instant score with interactive controls", async ({
    page,
  }) => {
    await page.goto("/games/scout/calculator");
    await expect(
      page.getByRole("heading", { name: "Scout Calculator", level: 1 }),
    ).toBeVisible();

    // Initial score should be 0
    await expect(
      page.locator("text=Total Round Score").locator("..").locator(".text-5xl"),
    ).toHaveText("0");

    // Click + for cards collected twice
    const cardsSection = page.locator("text=Cards Collected").locator("../..");
    await cardsSection.getByRole("button").nth(1).click();
    await cardsSection.getByRole("button").nth(1).click();

    // Score should now be +2
    await expect(
      page.locator("text=Total Round Score").locator("..").locator(".text-5xl"),
    ).toHaveText("+2");

    // Click + for chips once
    const chipsSection = page.locator("text=Scout Chips").locator("../..");
    await chipsSection.getByRole("button").nth(1).click();

    // Score should now be +3
    await expect(
      page.locator("text=Total Round Score").locator("..").locator(".text-5xl"),
    ).toHaveText("+3");

    // Click + for cards in hand 4 times
    const handSection = page
      .locator("text=Cards Left in Hand")
      .locator("../..");
    await handSection.getByRole("button").nth(1).click();
    await handSection.getByRole("button").nth(1).click();
    await handSection.getByRole("button").nth(1).click();
    await handSection.getByRole("button").nth(1).click();

    // 2 cards + 1 chip - 4 penalty = -1
    await expect(
      page.locator("text=Total Round Score").locator("..").locator(".text-5xl"),
    ).toHaveText("-1");

    // Toggle table cleared exemption (penalty waived -> 2 + 1 = +3)
    await page.locator("text=Table Cleared (Set Owner)").click();
    await expect(
      page.locator("text=Total Round Score").locator("..").locator(".text-5xl"),
    ).toHaveText("+3");
  });

  test("loads round companion and updates scores", async ({ page }) => {
    await page.goto("/games/scout/round");
    await expect(
      page.getByRole("heading", { name: "Scout Round Companion", level: 1 }),
    ).toBeVisible();

    // Complete Round 1
    const completeButton = page.getByRole("button", {
      name: /Complete Round 1/i,
    });
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // Should now show Cumulative Leaderboard and advance to Round 2
    await expect(page.locator("text=Cumulative Leaderboard")).toBeVisible();
    await expect(page.locator("text=Round 2 of 3")).toBeVisible();
  });

  test("loads scout rules docs", async ({ page }) => {
    await page.goto("/games/scout/docs");
    await expect(
      page.getByRole("heading", { name: "How to Play Scout", level: 1 }),
    ).toBeVisible();
    await expect(page.locator("text=The Fixed Hand Rule")).toBeVisible();
    await expect(
      page.locator("text=Combination Strength Rankings"),
    ).toBeVisible();
  });
});
