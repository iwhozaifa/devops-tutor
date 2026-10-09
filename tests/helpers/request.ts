import { NextRequest } from "next/server";

let requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.10" });

// Stand-in for "next/headers" used by server actions (clientIp()).
export const nextHeadersMock = {
  headers: async () => requestHeaders,
  cookies: async () => new Map(),
};

export function setClientIp(ip: string) {
  requestHeaders = new Headers({ "x-forwarded-for": ip });
}

export function jsonRequest(path: string, body: unknown, method = "POST"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function getRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

export function params<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) };
}
