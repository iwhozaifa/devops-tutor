# Security Features & Quality Standards

## Authentication & Authorization

### Password Security
- **bcrypt hashing** with cost factor 12 — passwords are never stored in plain text
- Minimum 6-character password enforcement at registration
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
- Zod available for schema validation on complex inputs

### Authorization Checks
- Every mutating API route calls `auth()` and returns 401 if no session
- User ID for data operations comes from `session.user.id`, not request body
- Enrollment, progress, and submission records use `@@unique` constraints to prevent duplicates

### Data Access Control
- Users can only read/write their own progress, submissions, and enrollments
- Unique constraints (`@@unique([userId, subjectId])`, `@@unique([userId, dayId])`, etc.) enforce one-record-per-user at the database level
- No admin endpoints exposed without authentication (admin panel is Phase 5 future work)

### SQL Injection Prevention
- **Prisma ORM** — all queries are parameterized by default
- No raw SQL queries anywhere in the codebase
- JSON fields use Prisma's typed JSON handling

### XSS Prevention
- React's JSX auto-escapes all rendered content by default
- No `dangerouslySetInnerHTML` usage
- External resource URLs are rendered as `href` attributes on anchor tags, not injected as HTML
- Content Security Policy can be added via Next.js middleware (recommended for production)

---

## Data Integrity

### Database Constraints
- Foreign keys with `onDelete: Cascade` — no orphaned records
- Unique constraints on all critical pairs (user+subject, user+day, user+task, user+badge, etc.)
- Enum types for all status fields — no invalid state possible at the DB level

### XP System Integrity
- **Append-only XP ledger** — XP is never modified, only new entries are created
- Total XP is always calculated as `SUM(amount)` from the ledger — auditable and tamper-resistant
- Duplicate XP prevention: task completion and project step XP check for existing ledger entries before awarding
- Badge awards check `UserBadge` existence before creating — no double awards

### Streak Integrity
- Streak logic uses date comparison (not trusting client timestamps)
- `lastActiveDate` is set server-side using `new Date()`
- Missed days reset streak to 1 — no client-side manipulation possible

---

## Environment & Secrets

### Secret Management
- `.env` is gitignored — no secrets in version control
- `.env.example` provided with placeholder values for onboarding
- `AUTH_SECRET` must be set for JWT signing
- Database credentials isolated in `DATABASE_URL`
- OAuth client secrets stored in environment variables only

### Production Recommendations
- Generate `AUTH_SECRET` with `openssl rand -base64 32`
- Use managed PostgreSQL (Neon, Supabase, RDS) with SSL connections
- Enable `AUTH_TRUST_HOST=false` and set explicit `NEXTAUTH_URL` in production
- Add rate limiting via middleware or reverse proxy (nginx, Cloudflare)
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

---

## Testing Recommendations (for production readiness)

- [ ] Unit tests for gamification logic (XP calculations, badge evaluation, streak management)
- [ ] Integration tests for API routes (quiz/exam submission, progress tracking)
- [ ] E2E tests for critical flows (register, enroll, complete day, take quiz)
- [ ] Load testing for leaderboard queries (aggregation performance)
- [ ] Security audit: rate limiting, CORS, CSP headers
- [ ] Accessibility audit (keyboard navigation, screen readers, ARIA labels)
