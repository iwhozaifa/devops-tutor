import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { login, PASSWORD, register, uniqueEmail } from "./helpers";

test("a learner can download their data and then delete their account", async ({ page }) => {
  const email = await register(page, uniqueEmail("leaving"));

  await page.goto("/profile");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download my data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^devops-tutor-export-.*\.json$/);
  const data = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(data.profile.email).toBe(email);

  await page.getByLabel("Confirm with your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1/);
  await expect(page.getByText("Your account and its data have been deleted.")).toBeVisible();

  await login(page, email, PASSWORD);
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("privacy and terms pages are public and linked from registration", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of use", level: 1 })).toBeVisible();
});
