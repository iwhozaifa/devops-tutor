import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const id = z.string().min(1).max(64);

const answers = z
  .array(
    z.object({
      questionId: id,
      selectedOptionIds: z.array(id).max(20),
    })
  )
  .max(500);

export const quizSubmitSchema = z.object({ answers });

export const examSubmitSchema = z.object({
  answers,
  timeSpent: z.number().int().min(0).max(24 * 60 * 60).default(0),
});

export const dayProgressSchema = z.object({
  dayId: id,
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
});

export const enrollmentSchema = z.object({ subjectId: id });

export const taskSubmitSchema = z.object({
  status: z.enum(["COMPLETED", "ATTEMPTED", "SKIPPED"]),
  notes: z.string().max(5000).optional(),
});

export const projectProgressSchema = z.object({
  stepCompleted: z.number().int().min(0),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // bcrypt only uses the first 72 bytes
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((p) => Buffer.byteLength(p) <= 72, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(200),
});

type ParseResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: NextResponse };

export async function parseBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<ParseResult<z.infer<T>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }
  return { data: result.data };
}
