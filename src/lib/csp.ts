/**
 * Content Security Policy for HTML responses, built per request by
 * src/proxy.ts. Scripts run only with the request's nonce ('strict-dynamic'
 * lets those scripts load the chunks they need), so injected inline scripts
 * are blocked. Styles still allow inline: React style attributes cannot
 * carry a nonce, and style injection is far less dangerous than script.
 */
export function buildCsp(nonce: string, { isDev }: { isDev: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://github.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
