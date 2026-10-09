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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.AUTH_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_URL"],
        message: "is required in production (the public https:// origin)",
      });
    }
    if (!env.AUTH_GITHUB_ID !== !env.AUTH_GITHUB_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_GITHUB_ID"],
        message: "AUTH_GITHUB_ID and AUTH_GITHUB_SECRET must be set together",
      });
    }
  });

export type Env = z.infer<typeof schema>;

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
  return result.data;
}

let cached: Env | undefined;

// Validated once at server start (src/instrumentation.ts). Not read at module
// load, so `next build` works without production secrets.
export function env(): Env {
  return (cached ??= parseEnv(process.env));
}
