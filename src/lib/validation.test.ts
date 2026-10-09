import { describe, expect, it } from "vitest";
import {
  dayProgressSchema,
  examSubmitSchema,
  quizSubmitSchema,
  registerSchema,
  taskSubmitSchema,
} from "./validation";

describe("request schemas", () => {
  it("rejects non-array selectedOptionIds (previously crashed with 500)", () => {
    const r = quizSubmitSchema.safeParse({
      answers: [{ questionId: "q1", selectedOptionIds: "a" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric and negative timeSpent", () => {
    expect(examSubmitSchema.safeParse({ answers: [], timeSpent: "x" }).success).toBe(false);
    expect(examSubmitSchema.safeParse({ answers: [], timeSpent: -5 }).success).toBe(false);
    expect(examSubmitSchema.parse({ answers: [] }).timeSpent).toBe(0);
  });

  it("rejects unknown day status", () => {
    expect(dayProgressSchema.safeParse({ dayId: "d", status: "DONE" }).success).toBe(false);
  });

  it("limits task notes length", () => {
    expect(
      taskSubmitSchema.safeParse({ status: "COMPLETED", notes: "x".repeat(5001) }).success
    ).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = { name: "Ada", email: "Ada@Example.com ", password: "longenough" };

  it("normalizes email to lowercase", () => {
    expect(registerSchema.parse(valid).email).toBe("ada@example.com");
  });

  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("requires at least 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects passwords over bcrypt's 72-byte limit", () => {
    expect(registerSchema.safeParse({ ...valid, password: "é".repeat(37) }).success).toBe(false);
  });
});
