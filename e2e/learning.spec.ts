import { expect, test } from "./fixtures";
import { register } from "./helpers";

test("enroll, complete day 1 and take its quiz", async ({ page }) => {
  await register(page);

  await page.goto("/subjects");
  await page.getByRole("button", { name: "Enroll" }).first().click();
  await expect(page).toHaveURL(/\/subjects\/devops/);

  await page.goto("/subjects/devops/curriculum/1");
  await page.getByRole("button", { name: "Mark as Complete" }).click();
  await expect(page.getByText("Day Completed")).toBeVisible();

  // Answer every question with its first option and submit
  const quizLink = page.getByRole("link", { name: /quiz/i }).first();
  await quizLink.click();
  await expect(page).toHaveURL(/\/quizzes\//);
  for (;;) {
    await page.getByRole("radio").first().or(page.getByRole("checkbox").first()).click();
    const next = page.getByRole("button", { name: "Next" });
    if (await next.isVisible()) await next.click();
    else break;
  }
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText(/%/).first()).toBeVisible();

  await page.goto("/leaderboard");
  await expect(page.getByText("E2E Learner").first()).toBeVisible();
});
