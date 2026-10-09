import { expect, test } from "./fixtures";
import { register } from "./helpers";

test("an unenrolled learner is asked to enroll instead of recording progress", async ({ page }) => {
  await register(page);

  await page.goto("/subjects/devops/curriculum/1");
  await expect(page.getByText("Enroll in this subject to track your progress")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as Complete" })).toHaveCount(0);

  await page.getByRole("button", { name: "Enroll" }).click();
  await page.goto("/subjects/devops/curriculum/1");
  await expect(page.getByRole("button", { name: "Mark as Complete" })).toBeVisible();
  await expect(page.getByText("Enroll in this subject to track your progress")).toHaveCount(0);
});

test("quizzes and exams ask for enrollment before they can be submitted", async ({ page }) => {
  await register(page);

  await page.goto("/subjects/devops/curriculum/1");
  await page.getByRole("link", { name: /quiz/i }).first().click();
  await expect(page.getByText("Enroll in this subject to track your progress")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Quiz" })).toHaveCount(0);

  await page.goto("/subjects/devops/exams");
  await page.getByRole("link", { name: /start|take|exam/i }).first().click();
  await expect(page.getByText("Enroll in this subject to track your progress")).toBeVisible();
});
