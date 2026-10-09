import { expect, test } from "./fixtures";
import { latestMail, linkIn, register, uniqueEmail } from "./helpers";

test("a new account confirms its email from the link it was sent", async ({ page }) => {
  const email = await register(page, uniqueEmail("verify"));
  await expect(page.getByText("Confirm your email address")).toBeVisible();

  const mail = await latestMail(email);
  expect(mail.subject).toBe("Confirm your email for DevOps Tutor");
  await page.goto(linkIn(mail));
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Confirm your email address")).toHaveCount(0);
});

test("the banner can resend the confirmation email", async ({ page }) => {
  const email = await register(page, uniqueEmail("resend"));
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByText("Sent. Check your inbox.")).toBeVisible();
  expect((await latestMail(email)).subject).toBe("Confirm your email for DevOps Tutor");
});
