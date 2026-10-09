import { expect, test } from "./fixtures";
import { latestMail, linkIn, login, PASSWORD, register, uniqueEmail } from "./helpers";

test("forgot password: the emailed link sets a new password and the old one stops working", async ({ page, context }) => {
  const email = await register(page, uniqueEmail("forgot"));
  await context.clearCookies();

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  // Client-side navigation: wait for the new page before filling its form
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account exists for that email")).toBeVisible();

  await page.goto(linkIn(await latestMail(email)));
  await page.getByLabel("New password").fill("a-whole-new-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/login\?reset=1/);
  await expect(page.getByText("Password updated")).toBeVisible();

  await login(page, email, PASSWORD);
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await login(page, email, "a-whole-new-password");
  await expect(page).toHaveURL(/\/dashboard/);
});
