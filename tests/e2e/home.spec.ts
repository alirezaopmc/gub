import { expect, test } from "@playwright/test";

test.describe("GUB Home Page", () => {
  test("loads game hub with Skull King and Scout cards", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GUB/);

    const heading = page.getByRole("heading", { name: "Game hub", level: 1 });
    await expect(heading).toBeVisible();

    // Verify Skull King card
    const skullKingCard = page.getByRole("link", { name: /Skull King/i });
    await expect(skullKingCard).toBeVisible();
    await expect(skullKingCard).toHaveAttribute("href", "/games/skull-king");

    // Verify Scout card
    const scoutCard = page.getByRole("link", { name: /Scout/i });
    await expect(scoutCard).toBeVisible();
    await expect(scoutCard).toHaveAttribute("href", "/games/scout");
  });
});
