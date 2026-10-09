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

describe("parseEnv mail settings", () => {
  it("defaults to the log transport outside production", () => {
    expect(parseEnv(valid).MAIL_TRANSPORT).toBe("log");
  });

  it("requires MAIL_FROM and AWS_REGION for SES", () => {
    expect(() => parseEnv({ ...valid, MAIL_TRANSPORT: "ses" })).toThrow(/MAIL_FROM/);
    expect(() => parseEnv({ ...valid, MAIL_TRANSPORT: "ses", MAIL_FROM: "no-reply@example.test" })).toThrow(/AWS_REGION/);
    expect(
      parseEnv({ ...valid, MAIL_TRANSPORT: "ses", MAIL_FROM: "no-reply@example.test", AWS_REGION: "eu-west-1" }).MAIL_TRANSPORT
    ).toBe("ses");
  });

  it("refuses the log transport in production, where it would log account links", () => {
    const prod = { ...valid, NODE_ENV: "production", AUTH_URL: "https://example.com" };
    expect(() => parseEnv(prod)).toThrow(/MAIL_TRANSPORT/);
  });
});
