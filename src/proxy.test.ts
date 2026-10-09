import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const nonceOf = (csp: string | null) => csp?.match(/'nonce-([^']+)'/)?.[1];

describe("proxy", () => {
  it("sets a CSP with a fresh nonce on every request", () => {
    const a = proxy(new NextRequest("http://localhost/dashboard"));
    const b = proxy(new NextRequest("http://localhost/dashboard"));
    const nonceA = nonceOf(a.headers.get("content-security-policy"));
    const nonceB = nonceOf(b.headers.get("content-security-policy"));
    expect(nonceA).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
    expect(nonceB).toBeDefined();
    expect(nonceA).not.toBe(nonceB);
  });

  it("forwards the same nonce to rendering through the request headers", () => {
    const res = proxy(new NextRequest("http://localhost/"));
    const nonce = nonceOf(res.headers.get("content-security-policy"));
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(nonceOf(res.headers.get("x-middleware-request-content-security-policy"))).toBe(nonce);
  });
});
