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
- **Admin panel with analytics** -- track learner progress, engagement, and content coverage

---

## Getting Started

### Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | 18+     |
| Docker  | 20+     |
| npm     | 9+      |

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd project

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials if needed

# 4. Start PostgreSQL via Docker
docker compose up -d

# 5. Generate Prisma client and run migrations
npx prisma generate && npx prisma migrate dev

# 6. Seed the database with curriculum data
npm run db:seed

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
project/
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed/
│       ├── index.ts             # Seed entry point
│       └── subjects/
│           └── devops/
│               ├── subject.json
│               ├── certifications.json
│               ├── modules/
│               │   ├── 01-linux-fundamentals/
│               │   │   ├── module.json
│               │   │   └── day-01.json … day-07.json
│               │   └── 02-version-control-git/
│               │       ├── module.json
│               │       └── day-08.json … day-14.json
│               ├── exams/
│               │   └── cka-practice-1.json
│               └── projects/
│                   ├── ci-cd-pipeline.json
│                   └── linux-server-setup.json
├── src/
│   ├── app/
│   │   ├── (app)/               # Authenticated app routes
│   │   │   ├── dashboard/
│   │   │   ├── leaderboard/
│   │   │   ├── profile/
│   │   │   └── subjects/
│   │   ├── (auth)/              # Login & register
│   │   ├── api/                 # API route handlers
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── lib/                     # Shared utilities (db, auth, etc.)
│   └── middleware.ts            # Security headers & rate-limit stubs
├── docker-compose.yml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
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
| TanStack Query    | Client-side data fetching and caching      |
| Zod               | Runtime schema validation                  |
| Docker Compose    | Local PostgreSQL container                 |
| Lucide React      | Icon library                               |
| next-themes       | Dark / light theme switching               |

---

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start development server (Turbopack)         |
| `npm run build`     | Create production build                      |
| `npm start`         | Start production server                      |
| `npm run lint`      | Run ESLint                                   |
| `npm run db:seed`   | Seed the database from JSON curriculum files |
| `npm run db:migrate`| Run Prisma migrations                        |
| `npm run db:studio` | Open Prisma Studio (database GUI)            |

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and ensure `npm run lint` passes
4. Commit with a clear message describing the change
5. Push to your fork and open a Pull Request

Please keep PRs focused on a single concern and include a description of what changed and why.

---

## License

This project is licensed under the [MIT License](LICENSE).
