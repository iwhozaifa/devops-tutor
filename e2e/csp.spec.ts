import { expect, test } from "./fixtures";
import { register } from "./helpers";

// Pages render with a per-request nonce; any inline script without it would
// be blocked and reported as a console error.
test("pages load with a nonce-based CSP and no violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });

  const res = await page.goto("/");
  const csp = res?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

  await page.goto("/login");
  await register(page);
  await page.goto("/subjects");
  await page.getByRole("button", { name: "Enroll" }).first().click();
  await page.goto("/subjects/devops/curriculum/1");
  await page.getByRole("link", { name: /quiz/i }).first().click();
  await page.goto("/subjects/devops/exams");
  await page.goto("/leaderboard");
  await page.goto("/profile");

  // Theme switching relies on next-themes' inline script running
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("class", /light|dark/);

  expect(violations).toEqual([]);
});
