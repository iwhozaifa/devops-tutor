import { afterAll, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { resetAuth } from "../helpers/auth";
import { resetDatabase } from "../helpers/db";

// Route handlers and server actions call auth(), signIn() and headers();
// tests control them through tests/helpers/auth.ts and tests/helpers/request.ts.
vi.mock("@/lib/auth", async () => (await import("../helpers/auth")).authModuleMock);
vi.mock("next/headers", async () => (await import("../helpers/request")).nextHeadersMock);

beforeEach(async () => {
  resetAuth();
  await resetDatabase();
});

afterAll(async () => {
  await db.$disconnect();
});
