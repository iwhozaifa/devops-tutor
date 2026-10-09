// JSON-lines logger. stdout is collected by the Docker awslogs driver into
// CloudWatch, where each line is queryable with Logs Insights.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

function threshold(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  return LEVELS[configured && configured in LEVELS ? configured : "info"];
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...("digest" in err ? { digest: String(err.digest) } : {}),
    };
  }
  return { message: String(err) };
}

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (LEVELS[level] < threshold()) return;
  const { err, ...rest } = fields;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...rest,
    ...(err !== undefined ? { err: serializeError(err) } : {}),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};
