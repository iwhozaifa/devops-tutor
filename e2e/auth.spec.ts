import { expect, test } from "@playwright/test";
import { login, PASSWORD, register, uniqueEmail } from "./helpers";

test("register lands on the dashboard and the session survives a reload", async ({ page }) => {
  await register(page);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("log in with a mixed-case email; a wrong password shows an error", async ({ page, context }) => {
  const email = await register(page);
  await context.clearCookies();

  await login(page, email, "definitely-wrong");
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await login(page, email.toUpperCase(), PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("signed-out users are sent to login; learners cannot open the admin panel", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await register(page, uniqueEmail("not-admin"));
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("unknown pages show the custom 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
