# Security Features & Quality Standards

## Authentication & Authorization

### Password Security
- **bcrypt hashing** with cost factor 12 — passwords are never stored in plain text
- Password length 8–72 bytes enforced at registration (bcrypt ignores bytes past 72)
- Emails are trimmed, lowercased and matched case-insensitively
- Login attempts are rate limited per IP and per email inside the `authorize` callback (also covers `/api/auth/callback/credentials`); registration is rate limited per IP. The client IP is the last `TRUSTED_PROXY_HOPS` entry of `X-Forwarded-For` (the address the ALB appended), never the client-controlled leftmost entry, so the per-IP limit cannot be bypassed by sending a fake header. The limiter is in-memory and per process; move it to Postgres or Redis before running more than one instance
- Credentials validated server-side via Auth.js `authorize` callback — no client-side password comparison

### Session Management
- **JWT-based sessions** via Auth.js v5 — stateless, no session fixation risk
- Session tokens are HTTP-only, secure cookies (set automatically by Auth.js)
- `AUTH_SECRET` environment variable required — used to sign/encrypt JWTs
- Session expiry handled by Auth.js defaults (30-day idle timeout)

### OAuth Support
- GitHub OAuth provider configured (optional) — delegates identity verification to trusted providers
- OAuth tokens stored in the `Account` table, not exposed to the client

### Route Protection
- All `/dashboard`, `/subjects/*`, `/profile`, `/leaderboard` routes check `auth()` server-side
- Unauthenticated users are redirected to `/login`
- API routes validate session before any data mutation
- User ID is always extracted from the server session — never trusted from client input

---

## API Security

### Input Validation
- All API POST handlers validate required fields before processing
- Type checking on all request body parameters
- Every request body is parsed with a Zod schema (`src/lib/validation.ts`); malformed JSON or shapes return 400 instead of 500
- Array sizes and string lengths are bounded; client-reported exam `timeSpent` is clamped to the exam time limit

### Authorization Checks
- Every mutating API route calls `auth()` and returns 401 if no session
- User ID for data operations comes from `session.user.id`, not request body
- Enrollment, progress, and submission records use `@@unique` constraints to prevent duplicates

### Data Access Control
- Users can only read/write their own progress, submissions, and enrollments
- Unique constraints (`@@unique([userId, subjectId])`, `@@unique([userId, dayId])`, etc.) enforce one-record-per-user at the database level
- Content and XP are only available for published subjects (`isPublished`)

### Admin Access
- Admin is a database role (`User.role`), not an email allowlist — emails are unverified, so matching on them would let anyone register an admin address
- Promote/demote with `npm run admin:promote -- <email> [--demote]`
- `requireAdmin()` (`src/lib/admin.ts`) is called in the admin layout **and** every admin page, and reads the role from the database so demotion is immediate

### SQL Injection Prevention
- **Prisma ORM** — all queries are parameterized by default
- No raw SQL queries anywhere in the codebase
- JSON fields use Prisma's typed JSON handling

### XSS Prevention
- React's JSX auto-escapes all rendered content by default
- No `dangerouslySetInnerHTML` usage
- External resource URLs are rendered as `href` attributes on anchor tags, not injected as HTML
- Content Security Policy, HSTS (production only) and related headers are set in `next.config.ts`; the `X-Powered-By` header is disabled
- `next/image` remote optimization is disabled (no remote patterns), so the server cannot be used as an open image proxy

---

## Data Integrity

### Database Constraints
- Foreign keys with `onDelete: Cascade` — no orphaned records
- Unique constraints on all critical pairs (user+subject, user+day, user+task, user+badge, etc.)
- Enum types for all status fields — no invalid state possible at the DB level

### XP System Integrity
- **Append-only XP ledger** — XP is never modified, only new entries are created
- Total XP is always calculated as `SUM(amount)` from the ledger — auditable and tamper-resistant
- Duplicate XP prevention: a unique index on `XpLedger(userId, source, sourceId)` means each day, task, project step, project, quiz, exam and badge awards XP at most once per user, even under concurrent requests
- Badge awards use `createMany({ skipDuplicates: true })` — no double awards or unique-violation errors
- Badge counts for quizzes/exams count distinct passed items, not repeated attempts

### Streak Integrity
- Streaks advance at most once per UTC calendar day, computed server-side in a transaction
- Missed days reset the current streak to 1; `longestStreak` is preserved

---

## Environment & Secrets

### Secret Management
- `.env` is gitignored — no secrets in version control
- `.env.example` provided with placeholder values for onboarding
- `AUTH_SECRET` must be set for JWT signing
- Database credentials isolated in `DATABASE_URL`
- OAuth client secrets stored in environment variables only
- The environment is validated at server start (`src/lib/env.ts`, called from `src/instrumentation.ts`). A missing or placeholder `AUTH_SECRET`, a malformed `DATABASE_URL`, or a missing `AUTH_URL` in production stops the server with a readable error
- In production, secrets live in SSM Parameter Store and are written to a mode-600 env file on the host at deploy time; they are never baked into the image (`.dockerignore` excludes `.env*`)

### Production Recommendations
- Generate `AUTH_SECRET` with `openssl rand -base64 32`
- RDS connections use `sslmode=verify-full` against the RDS CA bundle baked into the image (see `docs/DEPLOYMENT.md`)
- Set `AUTH_URL` to the public https origin; `AUTH_TRUST_HOST=true` is required behind the ALB
- Only the ALB security group may reach the app port, since the app trusts the last `X-Forwarded-For` hop
- Consider AWS WAF on the ALB (rate-based rules, managed bot rules) in addition to the in-app login limiter
- The bundled `docker-compose.yml` uses default Postgres credentials and binds to 127.0.0.1 — for local development only
- Add CORS headers if API is consumed by external clients

---

## Code Quality Standards

### TypeScript
- **Strict mode** enabled (`"strict": true` in tsconfig)
- Full-stack type safety from database (Prisma generated types) through API routes to UI components
- No `any` types except where required for Prisma JSON field interop (documented with eslint-disable comments)

### Architecture
- **Multi-subject by design** — subjects are data, not code. Adding a new subject requires zero code changes
- **Separation of concerns**:
  - `lib/` — business logic (auth, gamification, DB)
  - `components/` — reusable UI components
  - `app/` — routes and pages
  - `prisma/seed/` — content data as JSON files
- **Server Components by default** — client components only where interactivity is needed (`"use client"` directive)
- API routes handle mutations; server components handle data fetching — no waterfall requests

### Database
- **Prisma Migrate** for versioned, reproducible schema changes
- **Seed script** is idempotent — safe to run multiple times (uses upserts)
- All relations have explicit cascade rules
- Indexed fields for performance (`@@index([userId, createdAt])` on XpLedger)

### Frontend
- **Next.js App Router** with server-side rendering for SEO on public pages
- **Tailwind CSS** for consistent, utility-first styling
- **shadcn/ui** components — accessible, customizable, no vendor lock-in
- **Dark mode** support via `next-themes` with system preference detection
- Responsive design across all pages

### Version Control
- Conventional commit messages (`feat:`, `fix:`, etc.)
- Commits organized by feature phase — clean, reviewable history
- `.gitignore` properly configured for Next.js, Node, Prisma, and env files
- No secrets, credentials, or generated files in version control

---

## Dependencies & Supply Chain

### Dependency Choices
| Package | Purpose | Why This One |
|---------|---------|-------------|
| Next.js 16 | Framework | Industry standard, SSR, API routes |
| Auth.js v5 | Authentication | Battle-tested, OAuth + credentials |
| Prisma 7 | ORM | Type-safe, migrations, no raw SQL |
| bcryptjs | Password hashing | Pure JS, no native compilation needed |
| next-themes | Theme switching | Lightweight, SSR-compatible |
| Tailwind CSS 4 | Styling | Utility-first, small bundle |
| lucide-react | Icons | Tree-shakeable, consistent design |
| zod | Validation | TypeScript-first schema validation |

### Security Practices
- No `eval()` or dynamic code execution
- No `dangerouslySetInnerHTML`
- No client-side secret storage
- External links use `target="_blank"` with implicit `rel="noopener"` (React default)
- Form submissions use server actions — CSRF protection built into Next.js
- The production image runs as a non-root user with a read-only root filesystem and `no-new-privileges`
- Dependabot opens weekly update PRs for npm, GitHub Actions and the Docker base image; CI fails on critical `npm audit` findings

### Known audit findings (accepted)
The remaining `npm audit` findings are all in build-time tooling and do not ship in the runtime image (the standalone output only contains traced runtime files):
- `prisma` CLI → `mysql2`, `deepmerge-ts`: the CLI bundles drivers for every database; this app only uses PostgreSQL and the CLI only reads trusted config. No fixed Prisma 7 release yet
- `eslint-config-next` → `fast-glob` → `micromatch` → `braces`: lint-time only, operating on the repository's own file globs

---

## Testing Recommendations (for production readiness)

- [x] Unit tests for gamification, grading, validation, rate limiting and env parsing (`npm test`)
- [ ] Integration tests for API routes (quiz/exam submission, progress tracking)
- [ ] E2E tests for critical flows (register, enroll, complete day, take quiz)
- [ ] Load testing for leaderboard queries (aggregation performance)
- [x] Security audit: rate limiting, CSP headers, X-Forwarded-For handling
- [ ] Accessibility audit (keyboard navigation, screen readers, ARIA labels)
