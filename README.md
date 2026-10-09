# DevOps Tutor

A structured, gamified learning platform that guides you through DevOps concepts day-by-day with curated resources, hands-on tasks, certification prep, and guided projects.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

---

## Features

- **Day-by-day curriculum** -- structured modules with curated open-source resources (articles, videos, docs) for each day
- **Certification-driven quizzes** -- topic quizzes after each day plus timed practice exams (CKA and more)
- **Daily hands-on tasks** -- practical exercises with hints and full solutions
- **Guided projects** -- real-world projects with step-by-step checkpoints (e.g. CI/CD pipeline, Linux server setup)
- **Gamification** -- earn XP, level up, collect badges, maintain streaks, and climb the leaderboard
- **Dark / light theme** -- toggle between themes with `next-themes`
- **Multi-subject architecture** -- add new subjects entirely via JSON seed files, no code changes required
- **Admin panel with analytics** -- track learner progress, engagement, and content coverage, with an audit log of admin actions
- **Accounts** -- email verification, password reset, data export and self-service account deletion
- **Production-ready on AWS** -- Terraform for EC2, RDS, ALB, WAF, SES and CloudWatch alarms; CI/CD with GitHub Actions; a monthly automated backup-restore drill

---

## Getting Started

### Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | 20.9+ (22 recommended, see `.nvmrc`) |
| Docker  | 20+     |
| npm     | 9+      |

### Installation

```bash
# 1. Clone the repository
git clone git@github.com:iwhozaifa/devops-tutor.git
cd devops-tutor

# 2. Install dependencies (also generates the Prisma client)
npm install

# 3. Set up environment variables
cp .env.example .env
# Replace AUTH_SECRET with the output of: openssl rand -base64 32

# 4. Start PostgreSQL via Docker
docker compose up -d

# 5. Run migrations
npm run db:migrate

# 6. Seed the database with curriculum data
npm run db:seed

# 7. Start the development server
npm run dev
```

To give an account access to the admin panel, register it and then run:

```bash
npm run admin:promote -- you@example.com
```

Before pushing, run the same checks CI runs: `npm run lint && npm run typecheck && npm test`.

### Tests

| Suite | Command | Needs |
| --- | --- | --- |
| Unit | `npm test` | nothing |
| Integration (route handlers and server actions on a real Postgres) | `TEST_DATABASE_URL=… npm run test:integration` | a disposable database; every test truncates it |
| Coverage floor (unit + integration) | `TEST_DATABASE_URL=… npm run test:coverage` | same |
| E2E (Playwright, against the production build) | `npm run build && E2E_DATABASE_URL=… npm run test:e2e` | a disposable database; Chromium (`npx playwright install chromium`, or `PW_CHROMIUM_PATH`) |
| Infrastructure (offline, mocked providers) | `cd infra/terraform && terraform init -backend=false && terraform test` | Terraform 1.9+ |

`npx prisma dev -d` prints a disposable local Postgres URL that works for both database suites.

### Contributing workflow

Changes reach `main` only through pull requests that pass the required checks: lint, typecheck, unit, integration, E2E, build, Docker build, and **Tests required**, which fails a PR that changes application code without changing a test. PRs are squash-merged and must be up to date with `main`. Write the failing test first, commit it, then make it pass.

The server validates its environment at startup (`src/lib/env.ts`). If something is missing or still the placeholder, it exits with a message naming the variable.

### Dev server memory

`npm run dev` starts `next dev` in its own memory-limited systemd scope (`scripts/dev.sh`). Turbopack peaks above 2 GB while compiling routes; on a machine with little free RAM, an uncapped dev server pushes the system into swap thrashing and the desktop freezes. With the cap, only the dev server is throttled (`MemoryHigh`, default 2G) or, at worst, killed (`MemoryMax`, default 3G).

Adjust per machine with `DEV_MEMORY_HIGH`, `DEV_MEMORY_MAX`, `DEV_SWAP_MAX` and `DEV_NODE_HEAP_MB`, e.g. `DEV_MEMORY_MAX=4G npm run dev`. Use `npm run dev:uncapped` to run plain `next dev`. Without a systemd user session (e.g. macOS), the script falls back to an uncapped `next dev`.

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
devops-tutor/
├── .github/
│   ├── workflows/ci.yml         # Lint, typecheck, test, audit, build against Postgres, Docker build
│   ├── workflows/deploy.yml     # Build → ECR → deploy to EC2 via SSM
│   └── dependabot.yml
├── deploy/                      # Runs on the EC2 host (compose file, SSM env fetch, deploy + rollback)
├── docs/
│   ├── DEPLOYMENT.md            # AWS setup and operations runbook
│   └── PROJECT_REPORT.md
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Versioned SQL migrations
│   └── seed/                    # Curriculum data (JSON) and the seed script
├── scripts/
│   ├── dev.sh                   # Memory-capped `next dev`
│   └── promote-admin.ts         # Grant or revoke the admin role
├── src/
│   ├── app/
│   │   ├── (app)/               # Authenticated app routes
│   │   ├── (admin)/             # Admin panel (role-gated)
│   │   ├── (auth)/              # Login & register
│   │   ├── api/                 # Route handlers, including /api/health
│   │   ├── error.tsx, not-found.tsx, global-error.tsx
│   │   └── robots.ts, sitemap.ts
│   ├── components/
│   ├── instrumentation.ts       # Startup env validation, server error logging
│   └── lib/                     # db, auth, env, logger, rate limiting, validation, gamification
├── Dockerfile                   # runner and migrate targets
├── docker-compose.yml           # Local PostgreSQL only
└── next.config.ts               # Standalone output, security headers
```

---

## Adding a New Subject

No code changes are needed. The entire curriculum is data-driven:

1. Create a new directory under `prisma/seed/subjects/` (e.g. `prisma/seed/subjects/cloud-engineering/`)
2. Add the required JSON files following the existing structure:
   - `subject.json` -- subject metadata (name, slug, description, icon)
   - `modules/` -- one sub-directory per module, each containing a `module.json` and `day-NN.json` files
   - `exams/` -- practice exam definitions
   - `projects/` -- guided project definitions
3. Run the seed script:
   ```bash
   npm run db:seed
   ```
4. The new subject will appear automatically in the app.

---

## Tech Stack

| Technology        | Purpose                                    |
| ----------------- | ------------------------------------------ |
| Next.js 16        | React framework with App Router and ISR    |
| TypeScript 5      | Type-safe development                      |
| Tailwind CSS 4    | Utility-first styling                      |
| PostgreSQL        | Relational database                        |
| Prisma 7          | Type-safe ORM and migrations               |
| NextAuth.js v5    | Authentication (credentials + adapters)    |
| Zod               | Runtime schema validation                  |
| Vitest            | Unit tests                                 |
| Docker            | Local PostgreSQL; production image         |
| AWS               | EC2, RDS, ALB, ECR, SSM, CloudWatch        |
| Lucide React      | Icon library                               |
| next-themes       | Dark / light theme switching               |

---

## Scripts

| Command                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Development server (Turbopack, memory-capped)       |
| `npm run dev:uncapped`  | Plain `next dev`                                    |
| `npm run build`         | Production build (standalone output)                |
| `npm start`             | Start the production build                          |
| `npm run lint`          | ESLint, fails on warnings                           |
| `npm run typecheck`     | TypeScript without emitting                         |
| `npm test`              | Unit tests (Vitest)                                 |
| `npm run db:migrate`    | Create/apply migrations in development              |
| `npm run db:deploy`     | Apply pending migrations (CI, production)           |
| `npm run db:seed`       | Seed the database from the JSON curriculum files    |
| `npm run db:studio`     | Prisma Studio (database GUI)                        |
| `npm run admin:promote` | `-- <email> [--demote]` grant or revoke admin       |

---

## Deployment

Production runs on AWS: a Docker container on EC2 behind an Application Load Balancer, with RDS PostgreSQL, secrets in SSM Parameter Store and logs in CloudWatch. Pushes to `main` run CI, then build and deploy automatically. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the one-time AWS setup, first deploy, rollback and log queries.

Health checks: `GET /api/health` (liveness) and `GET /api/health?ready=1` (checks the database; used by the ALB).

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write a failing test, then the change that makes it pass; ensure the test suites above pass
4. Commit with a clear message describing the change
5. Push to your fork and open a Pull Request

Please keep PRs focused on a single concern and include a description of what changed and why.

---

## License

This project is licensed under the [MIT License](LICENSE).
