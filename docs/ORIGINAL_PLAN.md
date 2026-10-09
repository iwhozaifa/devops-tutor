# DevOps Tutor Web App — Implementation Plan

## Context
Learners waste time searching across scattered GitHub repos, docs, and free courses to learn DevOps. This app curates open-source resources into a structured, day-by-day curriculum with certification-driven assessments, hands-on tasks, guided projects, and gamification — making learning feel effortless. DevOps is the first subject; the architecture supports adding more subjects via data alone.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14+ (App Router) | SSR, API routes, layouts |
| Language | TypeScript | Full-stack type safety |
| UI | Tailwind CSS + shadcn/ui | Fast, customizable, no lock-in |
| Database | PostgreSQL | Relational data, JSON columns |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | Auth.js v5 (NextAuth) | OAuth + credentials |
| Data Fetching | TanStack Query | Server-state caching |
| Deployment | Docker / Vercel | Flexible hosting |

---

## Database Schema (Key Models)

- **User** — accounts, auth, profile
- **Subject** — slug, title, description, isPublished (multi-subject ready)
- **Module** — belongs to Subject, has weekStart/weekEnd, sortOrder
- **Day** — belongs to Module, dayNumber, title, summary
- **Resource** — belongs to Day, url, type (VIDEO/ARTICLE/REPO/DOCS/COURSE), source, duration
- **Quiz / QuizQuestion** — belongs to Day, options as JSON, passingScore
- **Certification** — belongs to Subject (e.g., CKA, AWS DevOps Professional)
- **Exam / ExamQuestion** — belongs to Certification, timeLimit, domain tags
- **DailyTask** — belongs to Day, markdown description, hints, difficulty, xpReward
- **Project** — belongs to Subject/Module, steps as JSON, starter repo link
- **Enrollment** — User ↔ Subject (ACTIVE/PAUSED/COMPLETED)
- **DayProgress** — User ↔ Day (NOT_STARTED/IN_PROGRESS/COMPLETED)
- **QuizAttempt / ExamAttempt** — score, answers, passed
- **TaskSubmission** — User ↔ DailyTask (ATTEMPTED/COMPLETED/SKIPPED)
- **ProjectProgress** — User ↔ Project, currentStep
- **XpLedger** — append-only log: userId, amount, source, sourceId
- **Badge / UserBadge** — trigger conditions as JSON, category
- **Streak** — currentStreak, longestStreak, lastActiveDate

---

## Multi-Subject Architecture

Subjects are defined entirely through **JSON seed files** under `prisma/seed/subjects/`:

```
prisma/seed/subjects/devops/
├── subject.json
├── certifications.json
├── modules/
│   ├── 01-linux-fundamentals/
│   │   ├── module.json
│   │   ├── day-01.json    ← resources, quiz, tasks all in one file
│   │   └── day-02.json
│   └── 02-networking/
├── exams/
└── projects/
```

**Adding a new subject = creating a new directory + running seed.** No code changes required.

---

## Gamification System

### XP Rules
| Action | XP |
|--------|----|
| Complete a day | 100 |
| Pass a quiz | 50 + bonus for high scores |
| Complete daily task | 30-100 (per task) |
| Complete project step | 50 |
| Complete entire project | 500 |
| Pass certification exam | 1000 |
| 7-day streak | 200 bonus |
| 30-day streak | 500 bonus |

### Level Formula
`level = floor(sqrt(totalXp / 100))` — early levels come fast, later levels require sustained effort.

### Badges
Trigger conditions stored as JSON (e.g., `{"type": "streak_days", "value": 7}`). Categories: STREAK, COMPLETION, QUIZ, EXAM, PROJECT, SPECIAL.

### Streaks
Updated on any day completion. Consecutive days increment streak; missed day resets to 1.

### Orchestrator
Every action → `processGamificationEvent()` → awards XP, updates streak, evaluates badges → returns results for UI notifications (XP toast, badge unlock).

---

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, value prop, CTA |
| `/login`, `/register` | Auth pages |
| `/dashboard` | Today's tasks, streak, XP summary, continue learning |
| `/subjects/[slug]` | Subject overview, module list, progress |
| `/subjects/[slug]/curriculum/[dayNumber]` | **Core page** — resources, quiz, tasks for the day |
| `/subjects/[slug]/exams/[examId]` | Timed certification practice exam |
| `/subjects/[slug]/projects/[projectId]` | Step-by-step guided project |
| `/profile` | Stats, badges, streak history, level |
| `/leaderboard` | Top users by XP |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/login, register
│   ├── (marketing)/landing, subjects catalog
│   ├── (app)/dashboard, subjects/[slug]/curriculum/[day], quizzes, exams, projects, profile, leaderboard
│   └── api/auth, subjects, progress, quizzes, exams, tasks, projects, xp, badges
├── lib/
│   ├── db.ts, auth.ts
│   ├── gamification.ts (orchestrator)
│   ├── xp.ts, badges.ts, streaks.ts
│   └── validators/
├── components/
│   ├── ui/ (shadcn primitives)
│   ├── curriculum/ (DayCard, ModuleAccordion, ResourceList, ProgressTimeline)
│   ├── quiz/ (QuizPlayer, QuestionCard, ResultsSummary)
│   ├── exam/ (ExamPlayer, ExamTimer, ExamResults)
│   ├── gamification/ (XpBar, BadgeDisplay, StreakCounter, LevelIndicator, XpToast)
│   └── dashboard/ (ProgressOverview, TodayPanel, StatsCards)
├── hooks/ (useProgress, useXp, useStreak)
└── types/
prisma/
├── schema.prisma
└── seed/subjects/devops/...
```

---

## Implementation Phases

### Phase 1: Foundation + Curriculum (MVP)
1. Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
2. Set up PostgreSQL + Docker Compose + Prisma schema (User, Subject, Module, Day, Resource, Enrollment, DayProgress)
3. Auth.js integration (GitHub OAuth + email/password)
4. Seed script + DevOps subject data (2 modules, ~14 days of curated content)
5. Pages: Landing, Login, Register, Dashboard, Subject Overview, Day View
6. Day view: title, summary, resource list with external links, mark complete
7. Basic progress tracking + responsive sidebar layout

### Phase 2: Assessments
1. Add Quiz, QuizQuestion, QuizAttempt, Certification, Exam, ExamQuestion, ExamAttempt to schema
2. Quiz player component + submission API with scoring + results with explanations
3. Exam player with timer + question navigation
4. Seed: quizzes for existing days, 1 CKA practice exam
5. Attempt history on profile page

### Phase 3: Tasks & Projects
1. Add DailyTask, TaskSubmission, Project, ProjectProgress to schema
2. Daily task component (markdown description, progressive hints, solution reveal)
3. Task self-report submission
4. Project list + step-by-step project viewer with progress
5. Seed: tasks for existing days, 2 guided projects

### Phase 4: Gamification
1. Add XpLedger, Badge, UserBadge, Streak to schema
2. XP awarding engine + streak logic + badge trigger evaluator
3. Gamification orchestrator (single entry point for all actions)
4. UI: XP bar in header, streak counter, badge shelf, animated XP toast, level indicator
5. Leaderboard page + profile stats
6. Seed: badge definitions

### Phase 5: Polish & Scale
1. Full DevOps curriculum (60-90 days)
2. Multiple certification exams (CKA, AWS DevOps Pro, Terraform Associate)
3. Dark mode, mobile optimization
4. Performance: ISR for curriculum pages, caching
5. Admin panel for content management
6. Prepare second subject addition

---

## Verification Plan
1. **Auth**: Register with email, login, logout, login with GitHub OAuth
2. **Curriculum**: Enroll in DevOps → browse modules → open day → see resources with working links → mark day complete
3. **Quiz**: Take a quiz → submit answers → see score + explanations → verify attempt saved
4. **Exam**: Start timed exam → answer questions → submit → see pass/fail result
5. **Tasks**: View daily task → reveal hints → mark complete
6. **Projects**: Open project → complete steps → verify progress saves
7. **Gamification**: Complete actions → verify XP appears in ledger → check streak updates → earn a badge → see toast notification
8. **Multi-subject**: Add a second subject's JSON files → run seed → verify it appears in the app without code changes
9. **Responsive**: Test all pages on mobile viewport
