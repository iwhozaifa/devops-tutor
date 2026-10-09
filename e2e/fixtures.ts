import { test as base } from "@playwright/test";
import { randomInt } from "node:crypto";

// Every test behaves like a different visitor: the server trusts the last
// X-Forwarded-For hop, so each context gets its own address and the per-IP
// registration and login limits apply per test, as they would per visitor.
export const test = base.extend({
  context: async ({ context }, use) => {
    const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await use(context);
  },
});

export { expect } from "@playwright/test";
