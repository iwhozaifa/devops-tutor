import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.TRUSTED_PROXY_HOPS).toBe(1);
    expect(env.DB_POOL_MAX).toBe(10);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects the example secret and a short secret", () => {
    expect(() =>
      parseEnv({ ...valid, AUTH_SECRET: "generate-a-secret-with-openssl-rand-base64-32" })
    ).toThrow(/placeholder/);
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("requires AUTH_URL in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(/AUTH_URL/);
    expect(
      parseEnv({ ...valid, NODE_ENV: "production", AUTH_URL: "https://example.com" }).AUTH_URL
    ).toBe("https://example.com");
  });

  it("requires both GitHub credentials or neither", () => {
    expect(() => parseEnv({ ...valid, AUTH_GITHUB_ID: "id" })).toThrow(/together/);
  });

  it("treats empty values as unset", () => {
    expect(parseEnv({ ...valid, AUTH_GITHUB_ID: "", LOG_LEVEL: "" }).LOG_LEVEL).toBe("info");
  });
});
