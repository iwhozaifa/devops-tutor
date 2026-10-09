// Loaded from src/instrumentation.ts in the Node.js runtime only.
import { parseEnv, type Env } from "./lib/env";
import { logger } from "./lib/logger";

// Fail at boot with a readable message instead of on the first request
let env: Env;
try {
  env = parseEnv(process.env);
} catch (err) {
  logger.error("startup aborted", { err });
  process.exit(1);
}

logger.info("server starting", {
  version: env.APP_VERSION,
  nodeEnv: env.NODE_ENV,
  githubAuth: Boolean(env.AUTH_GITHUB_ID),
  trustedProxyHops: env.TRUSTED_PROXY_HOPS,
  dbPoolMax: env.DB_POOL_MAX,
});
