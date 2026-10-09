import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

export const PASSWORD = "e2e-password-123";

export function uniqueEmail(prefix = "learner") {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

export async function register(page: Page, email = uniqueEmail(), name = "E2E Learner") {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

/** Grants the admin role directly in the E2E database. */
export async function makeAdmin(email: string) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.E2E_DATABASE_URL });
  await client.connect();
  await client.query(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [email]);
  await client.end();
/** Newest email sent to `to` by the file mail transport (see start-server.sh). */
export async function latestMail(to: string): Promise<{ subject: string; text: string }> {
  const { readdirSync, readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const dir = process.env.E2E_MAIL_DIR ?? path.resolve(".mail-outbox");
  for (let attempt = 0; attempt < 20; attempt++) {
    let files: string[] = [];
    try {
      files = readdirSync(dir).sort().reverse();
    } catch {}
    for (const f of files) {
      const mail = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      if (mail.to === to) return mail;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} in ${dir}`);
}

export function linkIn(mail: { text: string }): string {
  const url = new URL(mail.text.match(/https?:\/\/\S+/)![0]);
  return url.pathname + url.search;
}
