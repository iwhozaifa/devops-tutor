import { expect, test } from "./fixtures";
import { makeAdmin, register, uniqueEmail } from "./helpers";

test("an admin's view of the user list shows up in the audit log", async ({ page }) => {
  const email = await register(page, uniqueEmail("admin"));
  await makeAdmin(email);

  await page.goto("/admin/users?q=example");
  await expect(page).toHaveURL(/\/admin\/users/);

  await page.goto("/admin/audit");
  const row = page.getByRole("row").filter({ hasText: "User list viewed" }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText(email);
  await expect(row).toContainText("example");
});
