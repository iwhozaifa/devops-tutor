import { z } from "zod";

const PLACEHOLDER_SECRET = "generate-a-secret-with-openssl-rand-base64-32";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, "must be a postgresql:// connection string"),
    AUTH_SECRET: z
      .string()
      .min(32, "must be at least 32 characters (openssl rand -base64 32)")
      .refine((s) => s !== PLACEHOLDER_SECRET, "is still the .env.example placeholder"),
    AUTH_URL: z.url().optional(),
    AUTH_GITHUB_ID: z.string().min(1).optional(),
    AUTH_GITHUB_SECRET: z.string().min(1).optional(),
    // Number of reverse proxies (e.g. the ALB) that append to X-Forwarded-For
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(1).max(5).default(1),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    APP_VERSION: z.string().default("dev"),
    // ses in production; file for E2E tests; log (development only) prints links
    MAIL_TRANSPORT: z.enum(["ses", "file", "log"]).optional(),
    MAIL_FROM: z.string().min(3).optional(),
    MAIL_FILE_DIR: z.string().default(".mail-outbox"),
    AWS_REGION: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.AUTH_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "is required in production (the public https:// origin)",
      });
    }
    if (env.NODE_ENV === "production" && (env.MAIL_TRANSPORT ?? "log") === "log") {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_TRANSPORT"],
        message: "must be ses in production (log would write account links to the logs)",
      });
    }
    if (env.MAIL_TRANSPORT === "ses") {
      if (!env.MAIL_FROM) ctx.addIssue({ code: "custom", path: ["MAIL_FROM"], message: "is required for SES" });
      if (!env.AWS_REGION) ctx.addIssue({ code: "custom", path: ["AWS_REGION"], message: "is required for SES" });
    }
    if (!env.AUTH_GITHUB_ID !== !env.AUTH_GITHUB_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_GITHUB_ID"],
        message: "AUTH_GITHUB_ID and AUTH_GITHUB_SECRET must be set together",
      });
    }
  });

export type Env = z.infer<typeof schema> & { MAIL_TRANSPORT: "ses" | "file" | "log" };

export function parseEnv(source: Record<string, string | undefined>): Env {
  // Treat empty strings as unset so `FOO=` in an env file falls back to the default
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== "")
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "env"}: ${i.message}`
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return { ...result.data, MAIL_TRANSPORT: result.data.MAIL_TRANSPORT ?? "log" };
}

let cached: Env | undefined;

// Validated once at server start (src/instrumentation.ts). Not read at module
// load, so `next build` works without production secrets.
export function env(): Env {
  return (cached ??= parseEnv(process.env));
}
