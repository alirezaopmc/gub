import { expect, test } from "@playwright/test";

test.describe("Sea Salt & Paper Flow", () => {
  test("loads sea salt & paper hub and shows companion tools", async ({
    page,
  }) => {
    await page.goto("/games/sea-salt-paper");

    await expect(
      page.getByRole("heading", { name: "Sea Salt & Paper", level: 1 }),
    ).toBeVisible();

    await expect(page.getByText("Round Companion")).toBeVisible();
    await expect(page.getByText("Hand Calculator")).toBeVisible();
    await expect(page.getByText("Rules & Card Reference")).toBeVisible();
  });

  test("calculates hand score interactively with duos, sets, and multipliers", async ({
    page,
  }) => {
    await page.goto("/games/sea-salt-paper/calculator");

    await expect(
      page.getByRole("heading", { name: "Sea Salt & Paper Calculator" }),
    ).toBeVisible();

    // Initial score is 0
    await expect(page.getByText("Hand Score")).toBeVisible();

    // Add Crab Pairs: click plus on Crab Pairs
    await page.getByRole("button", { name: "Increase Crab Pairs" }).click();

    // Add Boat Pairs: click plus on Boat Pairs
    await page.getByRole("button", { name: "Increase Boat Pairs" }).click();

    // Add Shells: click plus 3 times for 4 points
    const shellPlus = page.getByRole("button", { name: "Increase Shells" });
    await shellPlus.click(); // 1 shell (0 pts)
    await shellPlus.click(); // 2 shells (2 pts)
    await shellPlus.click(); // 3 shells (4 pts)

    // Current: Crab (1) + Boat (1) + Shells (4) = 6 points
    await expect(
      page.getByText("Need 1 more points to declare Stop"),
    ).toBeVisible();

    // Add another Duo (Fish) to reach 7 points
    await page.getByRole("button", { name: "Increase Fish Pairs" }).click();

    // 7 points banner should now appear!
    await expect(
      page.getByText("≥ 7 Points: Can declare STOP or LAST CHANCE!"),
    ).toBeVisible();
  });

  test("loads round companion and tracks declarations and leaderboard", async ({
    page,
  }) => {
    await page.goto("/games/sea-salt-paper/round");

    await expect(
      page.getByRole("heading", { name: "Sea Salt & Paper Companion" }),
    ).toBeVisible();

    // 2 players default, target 40 points
    await expect(page.getByText("Target to Win:")).toBeVisible();
    await expect(page.getByText("40 Points")).toBeVisible();

    // Player 1 declares STOP and has 8 points
    await page.getByRole("button", { name: "STOP" }).first().click();

    // Complete round 1
    await page.getByRole("button", { name: /Complete Round 1/i }).click();

    // Standings should show Round 2 now
    await expect(page.getByText("Standings (Round 2)")).toBeVisible();
    await expect(page.getByText("Round 1")).toBeVisible();
  });

  test("loads sea salt & paper rules docs", async ({ page }) => {
    await page.goto("/games/sea-salt-paper/docs");

    await expect(
      page.getByRole("heading", { name: "How to Play Sea Salt & Paper" }),
    ).toBeVisible();
    await expect(page.getByText("Turn Structure")).toBeVisible();
    await expect(page.getByText("Duo Pairs (1 pt each + power)")).toBeVisible();
    await expect(
      page.getByText("Set Collections (Kept in hand)"),
    ).toBeVisible();
  });
});
