# DevOps Tutor — Complete Project Report

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Planning & Architecture Decisions](#2-planning--architecture-decisions)
3. [Tech Stack Deep Dive](#3-tech-stack-deep-dive)
4. [Database Schema — Complete Breakdown](#4-database-schema--complete-breakdown)
5. [Authentication System](#5-authentication-system)
6. [Phase 1: Foundation & Curriculum (MVP)](#6-phase-1-foundation--curriculum-mvp)
7. [Phase 2: Assessments](#7-phase-2-assessments)
8. [Phase 3: Tasks & Projects](#8-phase-3-tasks--projects)
9. [Dark/Light Theme](#9-darklight-theme)
10. [Phase 4: Gamification](#10-phase-4-gamification)
11. [Phase 5: Polish & Scale](#11-phase-5-polish--scale)
12. [Security Features Summary](#12-security-features-summary)
13. [Version Control History](#13-version-control-history)
14. [File Inventory](#14-file-inventory)
15. [API Reference](#15-api-reference)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. Project Overview

### What Is DevOps Tutor?
DevOps Tutor is a structured, gamified web application that teaches DevOps engineering through curated open-source resources. Instead of requiring learners to search across scattered GitHub repos, YouTube channels, and documentation sites, DevOps Tutor organizes the best free resources into a day-by-day curriculum with quizzes, hands-on tasks, guided projects, and certification exam preparation.

### The Problem It Solves
Learning DevOps is overwhelming. There are thousands of free resources online, but learners face three critical problems:
1. **Discovery fatigue** — Spending more time searching for resources than actually learning
2. **No structure** — Random tutorials without a logical progression path
3. **No accountability** — No way to track progress, validate knowledge, or stay motivated

DevOps Tutor solves all three by curating the best open-source resources into a structured curriculum, validating knowledge through certification-aligned assessments, and keeping learners engaged with gamification.

### Target Audience
- Junior developers transitioning into DevOps
- Students preparing for DevOps certifications (CKA, AWS DevOps Professional)
- Self-learners who want a guided, structured approach
- Teams onboarding new DevOps engineers

### Core Philosophy
1. **Curated, not created** — Uses existing open-source resources rather than writing original content. This leverages the best material the community has already produced.
2. **Certification-driven** — Assessments are modeled after real certification exams (CKA, AWS), giving the curriculum tangible career value.
3. **Multi-subject architecture** — DevOps is the first subject, but the platform is designed to add any technical subject through data alone, requiring zero code changes.
4. **Gamification for habit formation** — XP, levels, badges, and streaks turn daily learning into a rewarding habit.

---

## 2. Planning & Architecture Decisions

### Requirements Gathering
The project began with an iterative Q&A process to define requirements:
- **Content source**: Open-source resources curated into a structured path (not AI-generated)
- **Assessment model**: Based on real certification exams and learning material
- **User model**: Multi-user with accounts and persistent progress
- **Scalability**: Multi-subject architecture with DevOps as the first subject
- **Gamification**: XP, badges, and streaks (not a full leaderboard/ranks system initially, but it was added)
- **Deployment**: Flexible — Docker for self-hosting or Vercel for managed hosting

### Multi-Subject Architecture
**Decision**: Subjects are defined entirely through JSON seed files, not hardcoded in application code.

**Impact**: Adding a new subject (e.g., "Cloud Engineering") requires only:
1. Creating a new directory under `prisma/seed/subjects/`
2. Adding JSON files for subject metadata, modules, days, resources, quizzes, tasks
3. Running `npm run db:seed`

No code changes, no redeployment of the application logic. This decouples content from code.

### Content-as-Data Approach
**Decision**: All curriculum content is stored as JSON files in `prisma/seed/subjects/`, loaded into the database via an idempotent seed script.

**Impact**:
- Content is version-controlled alongside code
- Content can be reviewed via pull requests
- The seed script uses upserts — safe to run multiple times
- A CMS can be added later that writes directly to the same database tables

### Append-Only XP Ledger
**Decision**: XP is never modified or deleted. Every XP award creates a new row in the `XpLedger` table. Total XP is always calculated as `SUM(amount)`.

**Impact**:
- Fully auditable — you can trace exactly when and why every XP point was earned
- Tamper-resistant — no single record can be modified to inflate scores
- Enables future features like XP history graphs without schema changes
- Debugging is trivial — just query the ledger for a user

### Badge Triggers as Data
**Decision**: Badge conditions are stored as JSON in the database (`{"type": "streak_days", "value": 7}`), not hardcoded in application logic.

**Impact**:
- New badges of existing trigger types can be added by inserting a row in the database — no code change
- New trigger types require only adding a new case in the badge evaluation engine
- Badge definitions are part of the seed data, version-controlled

---

## 3. Tech Stack Deep Dive

### Next.js 14+ (App Router)
**What it is**: A React framework with server-side rendering, API routes, and a file-system-based router.

**Why chosen over alternatives**:
- **vs. plain React (Vite)**: Needed SSR for SEO on public curriculum pages, built-in API routes eliminate a separate backend
- **vs. Remix**: Next.js has a larger ecosystem, better Vercel integration, more community resources
- **vs. separate frontend + backend**: Unified codebase reduces complexity, shared types, simpler deployment

**How it's used**:
- App Router with route groups: `(auth)` for login/register, `(app)` for authenticated pages, `(admin)` for admin panel
- Server Components by default — client components only where interactivity is required
- API routes handle all mutations (quiz submission, enrollment, progress tracking)
- Dynamic routes: `[subjectSlug]`, `[dayNumber]`, `[quizId]`, `[examId]`, `[projectId]`

**Impact**: Single codebase for frontend + backend. Server Components reduce client-side JavaScript. Route groups organize code logically without affecting URLs.

### TypeScript
**What it is**: Typed superset of JavaScript.

**Why chosen**: Non-negotiable for a project this size. Prisma generates TypeScript types from the database schema, providing end-to-end type safety from database through API routes to UI components.

**How it's used**: Strict mode enabled. All files are `.ts` or `.tsx`. Prisma-generated types are used directly in components.

**Impact**: Catches type errors at build time. Refactoring is safe. IDE autocomplete works across the entire codebase.

### Tailwind CSS 4
**What it is**: A utility-first CSS framework.

**Why chosen over alternatives**:
- **vs. CSS Modules**: Tailwind is faster to iterate, no context-switching between files
- **vs. styled-components**: No runtime CSS-in-JS overhead, better SSR compatibility
- **vs. Bootstrap**: More customizable, smaller bundle (tree-shaking), modern design

**How it's used**: All styling is done with Tailwind utility classes. CSS variables defined in `globals.css` power the shadcn/ui theme system. Dark mode uses the `.dark` class variant.

**Impact**: Consistent design system. Rapid UI development. Dark mode support via CSS variables. Small production bundle.

### shadcn/ui
**What it is**: A collection of accessible, customizable UI components built on Radix UI primitives, installed as source code (not a dependency).

**Why chosen over alternatives**:
- **vs. Material UI**: No vendor lock-in — components are owned by the project
- **vs. Chakra UI**: Lighter weight, Tailwind-native, more customizable
- **vs. building from scratch**: Saves time while maintaining full control

**How it's used**: Button component is used throughout. The theming system (CSS variables in globals.css) comes from shadcn's initialization.

**Impact**: Accessible components out of the box. No external dependency to update. Full customization control.

### PostgreSQL
**What it is**: An advanced open-source relational database.

**Why chosen over alternatives**:
- **vs. SQLite**: Need multi-user concurrent access, JSON column support
- **vs. MySQL**: Better JSON handling, better enum support, more advanced features
- **vs. MongoDB**: Data is highly relational (users -> enrollments -> subjects -> modules -> days). Relational constraints prevent data integrity issues.

**How it's used**: All application data stored in PostgreSQL. JSON columns used for flexible data (quiz options, badge triggers, project steps). Enum types for status fields.

**Impact**: ACID compliance ensures data integrity. JSON columns provide document-store flexibility where needed. Foreign keys with cascade deletes prevent orphaned records.

### Prisma 7
**What it is**: A next-generation ORM for TypeScript with auto-generated types, migrations, and a visual studio.

**Why chosen over alternatives**:
- **vs. Drizzle**: Prisma has better migration tooling, more mature ecosystem
- **vs. TypeORM**: Better TypeScript integration, declarative schema
- **vs. raw SQL**: Type safety, migration management, no SQL injection risk

**How it's used**:
- `schema.prisma` defines all 26 models with relations, enums, and constraints
- `prisma migrate dev` manages schema versions
- `prisma generate` creates a type-safe client
- The seed script uses Prisma's upsert operations for idempotent seeding

**Impact**: Type-safe database queries — impossible to query a field that doesn't exist. Migrations are versioned and reproducible. No SQL injection possible.

### Auth.js v5 (NextAuth)
**What it is**: Authentication library for Next.js with support for OAuth providers and credentials.

**Why chosen**: Native Next.js integration. Supports both OAuth (GitHub, Google) and email/password. Battle-tested in production.

**How it's used**: JWT session strategy. Credentials provider with bcrypt password verification. GitHub OAuth provider (optional). PrismaAdapter for database-backed user storage.

**Impact**: Secure authentication with minimal custom code. Session management handled automatically. Easy to add new OAuth providers.

### bcryptjs
**What it is**: Pure JavaScript implementation of bcrypt password hashing.

**Why chosen over alternatives**:
- **vs. bcrypt (native)**: No native compilation required — works everywhere without build dependencies
- **vs. argon2**: bcrypt is more widely deployed, bcryptjs is simpler to install

**How it's used**: Passwords are hashed with cost factor 12 at registration. Passwords are verified with `bcrypt.compare()` at login.

**Impact**: Passwords are never stored in plain text. Cost factor 12 means ~250ms per hash — resistant to brute force.

### next-themes
**What it is**: A lightweight theme management library for Next.js.

**Why chosen**: SSR-compatible (no flash of wrong theme). Supports system preference detection. Tiny bundle size.

**How it's used**: ThemeProvider wraps the app. ThemeToggle cycles between light/dark/system. Theme stored in localStorage.

**Impact**: Users can choose their preferred theme. System preference is respected by default. No layout shift on page load.

### lucide-react
**What it is**: A tree-shakeable icon library with 1000+ consistent icons.

**Why chosen over alternatives**:
- **vs. Font Awesome**: Tree-shakeable (only imported icons are bundled)
- **vs. Heroicons**: Larger icon set, more consistent design

**How it's used**: Icons throughout the UI — navigation (LayoutDashboard, BookOpen, User), resources (Video, FileText, Github), gamification (Flame, Trophy, Star, Zap).

**Impact**: Consistent iconography. Small bundle — only used icons are included.

### Docker
**What it is**: Containerization platform.

**How it's used**: `docker-compose.yml` runs PostgreSQL 16 Alpine for local development. Single command (`docker compose up -d`) to start the database.

**Impact**: No manual PostgreSQL installation. Consistent development environment. Easy to add additional services (Redis, etc.) later.

---

## 4. Database Schema — Complete Breakdown

### User Model
**Purpose**: Core user identity and profile.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| name | String? | Display name |
| email | String (unique) | Login credential, identity |
| emailVerified | DateTime? | Email verification timestamp (OAuth) |
| image | String? | Profile picture URL (OAuth) |
| passwordHash | String? | bcrypt hash (null for OAuth-only users) |
| createdAt | DateTime | Registration timestamp |
| updatedAt | DateTime | Last profile update |

**Relationships**: Has many Accounts, Sessions, Enrollments, DayProgress, QuizAttempts, ExamAttempts, TaskSubmissions, ProjectProgress, XpLedger entries, UserBadges. Has one Streak.

**Impact**: Central model that all features connect to. Email uniqueness prevents duplicate accounts.

### Account Model
**Purpose**: OAuth provider accounts linked to a User.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | Link to User |
| type | String | Account type (oauth, email, etc.) |
| provider | String | OAuth provider name (github, google) |
| providerAccountId | String | Provider's unique ID |
| refresh_token | String? | OAuth refresh token |
| access_token | String? | OAuth access token |
| expires_at | Int? | Token expiry |
| token_type | String? | Token type (bearer) |
| scope | String? | OAuth scopes granted |
| id_token | String? | OIDC ID token |
| session_state | String? | OAuth session state |

**Constraints**: `@@unique([provider, providerAccountId])` — one account per provider.

**Impact**: Enables OAuth login. Users can link multiple providers to one account.

### Session Model
**Purpose**: Database-backed sessions (used by Auth.js when not in JWT mode).
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| sessionToken | String (unique) | Token stored in cookie |
| userId | String | Link to User |
| expires | DateTime | Session expiry |

**Impact**: Enables database session strategy if needed. Currently unused since JWT strategy is active.

### VerificationToken Model
**Purpose**: Email verification and magic link tokens.
| Field | Type | Purpose |
|-------|------|---------|
| identifier | String | Email address |
| token | String (unique) | Verification token |
| expires | DateTime | Token expiry |

**Constraints**: `@@unique([identifier, token])`

**Impact**: Supports email verification flow if enabled.

### Subject Model
**Purpose**: A learning subject (e.g., "DevOps Engineering").
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| slug | String (unique) | URL-friendly identifier |
| title | String | Display name |
| description | String | Subject overview |
| icon | String? | Icon identifier for UI |
| isPublished | Boolean | Controls visibility |
| sortOrder | Int | Display order |
| createdAt | DateTime | Creation timestamp |

**Relationships**: Has many Modules, Enrollments, Certifications, Projects.

**Impact**: Multi-subject architecture. The slug is used in URLs (`/subjects/devops`). isPublished allows drafting subjects before making them public.

### Module Model
**Purpose**: A group of days within a subject (e.g., "Linux Fundamentals", weeks 1-2).
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| subjectId | String | Parent subject |
| slug | String | URL-friendly identifier within subject |
| title | String | Display name |
| description | String | Module overview |
| weekStart | Int | Starting week number |
| weekEnd | Int | Ending week number |
| sortOrder | Int | Display order |

**Constraints**: `@@unique([subjectId, slug])` — unique slug within a subject.

**Impact**: Organizes days into logical groups. Week range helps users understand the time commitment.

### Day Model
**Purpose**: A single day in the curriculum with learning content.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| moduleId | String | Parent module |
| dayNumber | Int | Global day number within module |
| title | String | Day topic |
| summary | String | Brief description |
| sortOrder | Int | Display order |

**Constraints**: `@@unique([moduleId, dayNumber])` — unique day number per module.

**Relationships**: Has many Resources, Quizzes, DailyTasks, DayProgress.

**Impact**: The atomic unit of learning. Each day is a complete learning session with resources, a quiz, and tasks.

### Resource Model
**Purpose**: A curated link to an open-source learning resource.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| dayId | String | Parent day |
| title | String | Resource name |
| url | String | External URL |
| type | ResourceType enum | VIDEO, ARTICLE, REPO, DOCS, COURSE, TOOL |
| source | String? | Origin (YouTube, GitHub, Official Docs) |
| duration | String? | Time estimate ("30 min", "2h video") |
| isRequired | Boolean | Required or supplementary |
| sortOrder | Int | Display order |

**Impact**: The core value proposition — curated, categorized resources with metadata. Type and source allow icon and badge display in the UI.

### Quiz Model
**Purpose**: A knowledge check associated with a day's learning.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| dayId | String | Parent day |
| title | String | Quiz title |
| description | String? | Instructions |
| passingScore | Int (default 70) | Minimum % to pass |
| sortOrder | Int | Display order |

**Relationships**: Has many QuizQuestions, QuizAttempts.

**Impact**: Validates learning. Passing score creates a clear success threshold.

### QuizQuestion Model
**Purpose**: An individual question within a quiz.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| quizId | String | Parent quiz |
| questionText | String | The question |
| explanation | String? | Post-answer explanation |
| questionType | QuestionType enum | SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE |
| options | Json | Array of {id, text, isCorrect} |
| sortOrder | Int | Display order |

**Impact**: Flexible question types. JSON options allow variable numbers of choices. Explanations enable learning from mistakes.

### Certification Model
**Purpose**: A real-world certification that the subject prepares for.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| subjectId | String | Parent subject |
| slug | String (unique) | URL-friendly identifier |
| title | String | Full certification name |
| provider | String | Certifying body (CNCF, AWS) |

**Relationships**: Has many Exams.

**Impact**: Links the curriculum to real career certifications, providing tangible learning goals.

### Exam Model
**Purpose**: A practice certification exam.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| certificationId | String | Parent certification |
| title | String | Exam title |
| description | String? | Exam instructions |
| timeLimit | Int | Duration in minutes |
| passingScore | Int (default 65) | Minimum % to pass |
| questionCount | Int | Total questions |

**Relationships**: Has many ExamQuestions, ExamAttempts.

**Impact**: Simulates real exam conditions with time pressure. Passing score matches real certification thresholds.

### ExamQuestion Model
**Purpose**: A question within a practice exam.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| examId | String | Parent exam |
| questionText | String | The question |
| explanation | String? | Post-answer explanation |
| questionType | QuestionType enum | Question format |
| options | Json | Array of {id, text, isCorrect} |
| domain | String? | Certification domain (e.g., "Cluster Architecture") |
| sortOrder | Int | Display order |

**Impact**: Domain field maps questions to certification exam domains, helping users identify weak areas.

### DailyTask Model
**Purpose**: A hands-on practice task for a day.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| dayId | String | Parent day |
| title | String | Task name |
| description | String | Markdown instructions |
| difficulty | Difficulty enum | BEGINNER, INTERMEDIATE, ADVANCED |
| xpReward | Int (default 50) | XP earned on completion |
| hints | Json? | Array of hint strings |
| solution | String? | Solution text (hidden by default) |
| sortOrder | Int | Display order |

**Relationships**: Has many TaskSubmissions.

**Impact**: Bridges theory and practice. Progressive hints encourage trying before looking. Difficulty rating sets expectations.

### Project Model
**Purpose**: A guided, multi-step project.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| subjectId | String? | Parent subject (null = cross-subject) |
| moduleId | String? | Scoped to module (null = subject-wide) |
| title | String | Project name |
| description | String | Project overview (markdown) |
| difficulty | Difficulty enum | Difficulty level |
| xpReward | Int (default 500) | XP for completion |
| steps | Json | Array of {stepNumber, title, description, checkpoints} |
| repoUrl | String? | Starter repository link |

**Relationships**: Has many ProjectProgress.

**Impact**: Portfolio-building activities. Steps provide structure without hand-holding. Checkpoints within steps ensure completeness.

### Enrollment Model
**Purpose**: Tracks which subjects a user has enrolled in.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| subjectId | String | The subject |
| enrolledAt | DateTime | When they enrolled |
| status | EnrollmentStatus enum | ACTIVE, PAUSED, COMPLETED |

**Constraints**: `@@unique([userId, subjectId])` — one enrollment per user per subject.

**Impact**: Controls access to subject content. Status enables pausing and resuming. Unique constraint prevents duplicate enrollments.

### DayProgress Model
**Purpose**: Tracks a user's completion status for each day.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| dayId | String | The day |
| status | ProgressStatus enum | NOT_STARTED, IN_PROGRESS, COMPLETED |
| completedAt | DateTime? | Completion timestamp |

**Constraints**: `@@unique([userId, dayId])` — one progress record per user per day.

**Impact**: Drives the progress bars, streak calculations, and "continue where you left off" functionality.

### QuizAttempt Model
**Purpose**: Records each quiz attempt with score and answers.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| quizId | String | The quiz |
| score | Int | Percentage score |
| answers | Json | Array of {questionId, selectedOptionIds, isCorrect} |
| passed | Boolean | Whether they met the passing score |
| completedAt | DateTime | When they finished |

**Impact**: Enables attempt history, score tracking, and retake functionality. JSON answers allow detailed review.

### ExamAttempt Model
**Purpose**: Records each exam attempt.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| examId | String | The exam |
| score | Int | Percentage score |
| answers | Json | Detailed answer data |
| passed | Boolean | Pass/fail |
| timeSpent | Int | Seconds taken |
| completedAt | DateTime | Completion timestamp |

**Impact**: Tracks exam performance including time management. Multiple attempts enable improvement tracking.

### TaskSubmission Model
**Purpose**: Records a user's interaction with a daily task.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| taskId | String | The task |
| status | TaskStatus enum | ATTEMPTED, COMPLETED, SKIPPED |
| notes | String? | User's notes or solution description |
| submittedAt | DateTime | Submission timestamp |

**Constraints**: `@@unique([userId, taskId])` — one submission per user per task.

**Impact**: Three-state tracking respects that not every task will be fully completed. Notes field encourages reflection.

### ProjectProgress Model
**Purpose**: Tracks a user's progress through a project.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| projectId | String | The project |
| currentStep | Int (default 0) | Highest completed step |
| status | ProgressStatus enum | NOT_STARTED, IN_PROGRESS, COMPLETED |
| completedAt | DateTime? | Project completion timestamp |

**Constraints**: `@@unique([userId, projectId])` — one progress record per user per project.

**Impact**: Step-by-step progress tracking enables "continue where you left off" for projects.

### XpLedger Model
**Purpose**: Append-only log of all XP awards.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| amount | Int | XP amount (can be negative) |
| source | XpSource enum | What earned this XP |
| sourceId | String? | ID of the quiz/task/badge/etc. |
| description | String? | Human-readable description |
| createdAt | DateTime | When awarded |

**Constraints**: `@@index([userId, createdAt])` — optimized for per-user time-ordered queries.

**XpSource enum values**: QUIZ_PASS, EXAM_PASS, TASK_COMPLETE, DAY_COMPLETE, PROJECT_STEP, PROJECT_COMPLETE, STREAK_BONUS, BADGE_EARNED.

**Impact**: The foundation of the entire gamification system. Append-only design ensures auditability. Index enables fast leaderboard queries.

### Badge Model
**Purpose**: Defines achievement badges with trigger conditions.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| slug | String (unique) | Machine identifier |
| title | String | Display name |
| description | String | How to earn it |
| icon | String | Icon identifier |
| category | BadgeCategory enum | STREAK, COMPLETION, QUIZ, EXAM, PROJECT, SPECIAL |
| trigger | Json | Condition: {type, value} |
| xpReward | Int (default 0) | XP bonus for earning |

**Impact**: Data-driven badge system. New badges can be added without code changes. Categories enable grouped display.

### UserBadge Model
**Purpose**: Junction table recording which badges a user has earned.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String | The user |
| badgeId | String | The badge |
| earnedAt | DateTime | When earned |

**Constraints**: `@@unique([userId, badgeId])` — prevents duplicate awards.

**Impact**: Enables badge collection display. Earned date enables timeline views.

### Streak Model
**Purpose**: Tracks a user's daily learning streak.
| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | Unique identifier |
| userId | String (unique) | One streak per user |
| currentStreak | Int (default 0) | Current consecutive days |
| longestStreak | Int (default 0) | All-time best |
| lastActiveDate | DateTime? | Last day with activity |
| updatedAt | DateTime | Last update timestamp |

**Impact**: Drives daily habit formation. Longest streak provides a personal best to beat. Last active date enables streak break detection.

---

## 5. Authentication System

### Auth.js v5 Configuration
- **Session strategy**: JWT (stateless, no database session lookups)
- **Adapter**: PrismaAdapter (stores users, accounts, sessions in PostgreSQL)
- **Custom sign-in page**: `/login` (overrides default Auth.js page)

### Credentials Provider
1. User submits email + password
2. `authorize()` callback queries the User table by email
3. If user exists and has a `passwordHash`, bcrypt compares the password
4. If valid, returns user object (id, name, email, image)
5. Auth.js creates a JWT and sets it as an HTTP-only cookie

### GitHub OAuth Provider
1. User clicks "Login with GitHub"
2. Auth.js redirects to GitHub's OAuth consent screen
3. GitHub redirects back with an authorization code
4. Auth.js exchanges the code for an access token
5. GitHub's user profile is fetched and linked to a User record
6. An Account record is created linking the GitHub provider to the User

### Password Hashing
- **Algorithm**: bcrypt via `bcryptjs`
- **Cost factor**: 12 (approximately 250ms per hash)
- **Registration**: `bcrypt.hash(password, 12)` produces the hash stored in `passwordHash`
- **Login**: `bcrypt.compare(input, storedHash)` verifies without exposing the original
- **Impact**: Even if the database is compromised, passwords cannot be reversed

### Server Actions
Three server actions in `src/lib/auth-actions.ts`:
- **registerUser**: Validates fields, checks email uniqueness, hashes password, creates User, auto-signs in
- **loginUser**: Calls `signIn("credentials")` with redirect to `/dashboard`
- **logoutUser**: Calls `signOut()` with redirect to `/`

### JWT Callbacks
- **jwt callback**: Embeds the user's database ID into the JWT token
- **session callback**: Copies the ID from the token into `session.user.id`
- **Impact**: Every server component and API route can access the authenticated user's ID via `session.user.id`

### Route Protection Pattern
Every authenticated page and API route follows the same pattern:
```typescript
const session = await auth();
if (!session?.user) redirect("/login"); // pages
if (!session?.user) return NextResponse.json({error: "Unauthorized"}, {status: 401}); // APIs
```

**Impact**: Consistent authorization. User ID always comes from the server session, never from client input.

---

## 6. Phase 1: Foundation & Curriculum (MVP)

### 6.1 Project Scaffolding
- **Next.js 16.2.1** created with `create-next-app` — TypeScript, Tailwind CSS, App Router, src directory
- **shadcn/ui** initialized with default config — Button component and CSS variables installed
- **Prisma 7** initialized with PostgreSQL datasource
- **Docker Compose** configured with PostgreSQL 16 Alpine on port 5432
- **Dependencies installed**: Auth.js, Prisma adapter, TanStack Query, bcryptjs, zod, lucide-react

**Impact**: Complete development environment in under 5 minutes with `docker compose up -d && npm run dev`.

### 6.2 Seed System
The seed system reads a directory structure:
```
prisma/seed/subjects/devops/
├── subject.json          # Subject metadata
├── certifications.json   # CKA, AWS DevOps Pro
├── modules/
│   ├── 01-linux-fundamentals/
│   │   ├── module.json   # Module metadata
│   │   ├── day-01.json   # Resources, quiz, tasks
│   │   └── ...
│   └── 02-version-control-git/
├── exams/
│   └── cka-practice-1.json
└── projects/
    ├── ci-cd-pipeline.json
    └── linux-server-setup.json
```

The seed script (`prisma/seed/index.ts`):
1. Reads all JSON files from the directory structure
2. Upserts subjects, modules, days, resources, quizzes, questions, tasks
3. Upserts certifications, exams, exam questions
4. Upserts projects
5. Upserts badge definitions

**Impact**: Idempotent — safe to run repeatedly. Adding a new subject is a file-creation task. Content is version-controlled.

### 6.3 DevOps Content (14 Days)

**Module 1: Linux Fundamentals (Days 1-7)**
| Day | Topic | Resources | Quiz Questions | Tasks |
|-----|-------|-----------|---------------|-------|
| 1 | Introduction to Linux & the Command Line | linuxjourney.com, linuxcommand.org, jlevy/the-art-of-command-line | 3-5 | 1-2 |
| 2 | File System Navigation & Permissions | Linux Journey, FHS spec | 3-5 | 1-2 |
| 3 | Text Processing (grep, sed, awk) | GNU grep manual, learnbyexample/learn_gnuawk | 3-5 | 1-2 |
| 4 | Shell Scripting Basics | dylanaraps/pure-bash-bible, shellcheck.net | 3-5 | 1-2 |
| 5 | Process Management & System Monitoring | htop-dev/htop, brendangregg.com | 3-5 | 1-2 |
| 6 | Package Management & Software Installation | Ubuntu apt docs, Fedora dnf docs | 3-5 | 1-2 |
| 7 | Networking Basics (ip, netstat, curl, ssh) | everything.curl.dev, openssh.com | 3-5 | 1-2 |

**Module 2: Version Control with Git (Days 8-14)**
| Day | Topic | Resources | Quiz Questions | Tasks |
|-----|-------|-----------|---------------|-------|
| 8 | Git Fundamentals | git-scm.com/book, learngitbranching.js.org | 3-5 | 1-2 |
| 9 | Branching & Merging | Pro Git, Atlassian tutorials | 3-5 | 1-2 |
| 10 | Remote Repositories & GitHub | GitHub docs, firstcontributions repo | 3-5 | 1-2 |
| 11 | Git Workflows (GitFlow, Trunk-based) | nvie.com, trunkbaseddevelopment.com | 3-5 | 1-2 |
| 12 | Advanced Git (Rebase, Cherry-pick, Stash) | ohshitgit.com, git-flight-rules | 3-5 | 1-2 |
| 13 | GitHub Actions — CI Basics | GitHub Actions docs, starter-workflows | 3-5 | 1-2 |
| 14 | GitHub Actions — CD & Automation | sdras/awesome-actions | 3-5 | 1-2 |

**Resource types used**: VIDEO, ARTICLE, REPO, DOCS, COURSE
**Resource sources**: linuxjourney.com, linuxcommand.org, GitHub repos, YouTube, git-scm.com, Official documentation

**Impact**: 14 complete days of structured learning with real, working URLs. Diverse resource types accommodate different learning styles.

### 6.4 Landing Page (`src/app/page.tsx`)
- **Hero section**: "Master DevOps, One Day at a Time" headline with description
- **Value proposition cards**: 4 cards with lucide-react icons
  1. Structured Curriculum — day-by-day learning path
  2. Certification Prep — practice exams for CKA, AWS
  3. Hands-on Practice — daily tasks and guided projects
  4. Gamified Progress — XP, badges, streaks
- **CTA buttons**: "Get Started" → /register, "Browse Curriculum" → /subjects
- **Navbar** with conditional auth buttons

**Impact**: Clear value proposition. Two conversion paths (register or browse).

### 6.5 Authentication Pages
- **Login** (`src/app/(auth)/login/page.tsx`): Client component with `useActionState` hook calling `loginUser` server action. Email + password fields, error display, link to register.
- **Register** (`src/app/(auth)/register/page.tsx`): Client component with `useActionState` calling `registerUser`. Name + email + password fields, validation, link to login.
- **Auth layout** (`src/app/(auth)/layout.tsx`): Centered card container for both pages.

**Impact**: Clean, minimal auth UX. Server actions handle form submission without client-side API calls.

### 6.6 Dashboard (`src/app/(app)/dashboard/page.tsx`)
- Welcome message with user's name
- Current streak display
- Enrolled subjects with progress percentages
- "Continue Learning" button linking to the next incomplete day
- ProgressOverview component showing progress bars per subject

**Impact**: The daily landing page for returning users. "Continue where you left off" reduces friction.

### 6.7 Subject Catalog & Detail
- **Catalog** (`src/app/(app)/subjects/page.tsx`): Lists all published subjects with module count, day count, and enrollment status. Enroll or Continue button per subject.
- **Detail** (`src/app/(app)/subjects/[subjectSlug]/page.tsx`): Subject header with description, overall progress bar, expandable ModuleAccordion showing all days with completion status icons (checkmark/in-progress/not-started).

**Impact**: Content discovery and navigation. Progress visualization motivates completion.

### 6.8 Day View — The Core Page (`src/app/(app)/subjects/[subjectSlug]/curriculum/[dayNumber]/page.tsx`)
The most important page in the application:
- **Breadcrumb navigation**: Subject > Module > Day X
- **Day header**: Day number, title, summary
- **Resource list**: External links with type icons (video/article/repo/docs), source badges, duration, required/optional indicator
- **Quiz section**: Links to the quiz player for this day's quiz
- **Tasks section**: Interactive TaskCard components (added in Phase 3)
- **Mark as Complete button**: DayCompleteButton component
- **Navigation**: Previous Day / Next Day buttons

**Impact**: Single page contains everything for a day's learning. External links open in new tabs. Completion tracking integrated directly.

### 6.9 Sidebar & Navbar
- **Sidebar** (`src/components/layout/Sidebar.tsx`): Logo, nav links (Dashboard, Subjects, Leaderboard, Profile), XP bar, streak counter, theme toggle, user info, logout button. Active link highlighting.
- **Navbar** (`src/components/layout/Navbar.tsx`): Logo, Home/Subjects links, theme toggle, conditional Login/Register or Dashboard button based on session.

**Impact**: Consistent navigation. Sidebar for authenticated users, navbar for public pages.

### 6.10 API Routes

**GET /api/subjects**: Returns all published subjects with module and day counts. ISR cached for 1 hour.

**POST /api/enrollments**: Enrolls the authenticated user in a subject. Upserts to be idempotent.

**POST /api/progress/day**: Marks a day as complete or in-progress. Awards 100 XP on completion. Updates the user's streak (creates if first time, increments if consecutive day, resets if gap).

---

## 7. Phase 2: Assessments

### 7.1 Quiz System

**QuizPlayer** (`src/components/quiz/QuizPlayer.tsx`):
- Shows one question at a time with a progress bar
- Previous/Next navigation between questions
- Tracks selected answers in React state
- "Submit Quiz" button appears when all questions are answered
- POSTs answers to `/api/quizzes/[quizId]/submit`
- Displays ResultsSummary after submission

**QuestionCard** (`src/components/quiz/QuestionCard.tsx`):
- Renders question text
- Radio buttons for SINGLE_CHOICE and TRUE_FALSE
- Checkboxes for MULTIPLE_CHOICE
- Selected state highlighting

**ResultsSummary** (`src/components/quiz/ResultsSummary.tsx`):
- Circular CSS progress indicator showing score percentage
- Pass/Fail status with green/red color coding
- Per-question review: user's answer (green if correct, red if wrong), correct answer, explanation
- "Retake Quiz" and "Back to Day" buttons

**Quiz page** (`src/app/(app)/subjects/[subjectSlug]/quizzes/[quizId]/page.tsx`):
- Server component fetching quiz with questions
- Strips `isCorrect` from options before passing to client (prevents cheating)
- Shows breadcrumb navigation
- Lists previous attempts below the quiz

**Impact**: Complete quiz experience from taking to reviewing results. Server-side answer stripping prevents client-side cheating. Explanations turn wrong answers into learning opportunities.

### 7.2 Exam System

**ExamPlayer** (`src/components/exam/ExamPlayer.tsx`):
- Countdown timer at the top (uses ExamTimer component)
- Question navigation sidebar with numbered buttons showing answered/unanswered/flagged status
- Flag-for-review feature on each question
- "Submit Exam" button with confirmation dialog
- Auto-submits when timer reaches zero
- Horizontal scrollable question nav on mobile

**ExamTimer** (`src/components/exam/ExamTimer.tsx`):
- Countdown from `timeLimit` minutes
- Displays in MM:SS format
- Turns red when < 5 minutes remaining
- Pulses when < 1 minute remaining
- Calls `onTimeUp` callback at zero

**Exam listing** (`src/app/(app)/subjects/[subjectSlug]/exams/page.tsx`):
- Lists all certification exams for the subject
- Shows time limit, question count, passing score
- Best attempt score if any previous attempts
- "Start Exam" button

**Impact**: Realistic exam simulation with time pressure. Flag-for-review mimics real certification exam interfaces. Auto-submit prevents overtime.

### 7.3 CKA Practice Exam
20 questions distributed across CKA domains:
| Domain | Weight | Questions |
|--------|--------|-----------|
| Cluster Architecture, Installation & Configuration | 25% | 5 |
| Workloads & Scheduling | 15% | 3 |
| Services & Networking | 20% | 4 |
| Storage | 10% | 2 |
| Troubleshooting | 30% | 6 |

Topics covered: etcd backup, static pod manifests, kubeadm, cluster upgrades, kubectl commands, deployments, nodeSelector, resource limits, RBAC, NodePort services, DNS resolution, NetworkPolicy, Ingress, PersistentVolumes, access modes, node troubleshooting, CrashLoopBackOff, ImagePullBackOff, journalctl, ephemeral storage eviction.

**Configuration**: 60-minute time limit, 66% passing score (matching real CKA).

**Impact**: Real career value. Questions test actual Kubernetes knowledge at certification level.

### 7.4 Profile Page (`src/app/(app)/profile/page.tsx`)
- User info card (name, email, joined date)
- Stats cards: Total XP, Current Level, Current Streak, Days Completed
- Quiz attempt history table (recent 10): date, quiz name, score, pass/fail
- Exam attempt history table (recent 10): date, exam name, score, pass/fail, time spent
- Badge collection (added in Phase 4)
- XP progress bar (added in Phase 4)

**Impact**: Central place for users to see their progress and history.

---

## 8. Phase 3: Tasks & Projects

### 8.1 Interactive Task System

**TaskCard** (`src/components/curriculum/TaskCard.tsx`):
- **Header**: Task title, difficulty badge (green=beginner, yellow=intermediate, red=advanced), XP reward
- **Description**: Formatted text with numbered steps
- **Hints section**: Collapsible, reveals hints one at a time ("Show Hint 1", "Show Hint 2", etc.)
- **Solution section**: Hidden by default, requires confirmation ("Are you sure? Try solving it first!")
- **Submission section**: Optional notes textarea, three buttons:
  - "Mark Complete" (primary) — awards XP
  - "Attempted" (outline) — records attempt without XP
  - "Skip" (ghost) — records skip
- **After submission**: Shows status badge, disables resubmission

**Task submission API** (`src/app/api/tasks/[taskId]/submit/route.ts`):
- Validates authentication and task existence
- Upserts TaskSubmission by userId + taskId
- If status is COMPLETED, creates XpLedger entry with task's xpReward
- Duplicate XP prevention: checks for existing ledger entry before awarding

**Day view update**: Replaced basic task display with interactive TaskCard components. Now fetches TaskSubmission data for the current user to show completion status.

**Impact**: Bridges theory and practice. Progressive hints encourage attempting before revealing answers. Three submission states respect different levels of engagement.

### 8.2 Guided Projects

**ProjectViewer** (`src/components/projects/ProjectViewer.tsx`):
- Left sidebar: Numbered step list with completion status icons
- Main area: Current step title, description, checkpoints as a toggleable checklist
- "Complete Step" button that POSTs to progress API
- Previous Step / Next Step navigation
- Celebration view when all steps complete with total XP earned

**ProjectCard** (`src/components/projects/ProjectCard.tsx`):
- Project title, difficulty badge, XP reward
- Truncated description
- Progress bar (currentStep / totalSteps)
- Contextual button: "Start Project" / "Continue" / "Completed"

**Project pages**:
- Listing (`projects/page.tsx`): Grid of ProjectCards for the subject
- Detail (`projects/[projectId]/page.tsx`): Breadcrumbs + ProjectViewer

**Project progress API** (`src/app/api/projects/[projectId]/progress/route.ts`):
- Upserts ProjectProgress with `currentStep = max(existing, stepCompleted + 1)`
- Awards 50 XP per step (source: PROJECT_STEP)
- Awards project completion XP when all steps done (source: PROJECT_COMPLETE)
- Duplicate XP prevention on both step and completion awards

**Impact**: Structured project experience that guides without hand-holding. Progress persists across sessions. XP awards per step maintain motivation throughout long projects.

### 8.3 Project Seed Data

**Build a CI/CD Pipeline with GitHub Actions** (Beginner, 500 XP, 8 steps):
1. Set Up the Repository
2. Create CI Workflow
3. Add Linting & Code Quality
4. Write a Dockerfile
5. Build Docker Image in CI
6. Push to GitHub Container Registry
7. Deploy to Staging
8. Add Notifications & Badges

**Set Up a Production Linux Server** (Intermediate, 750 XP, 8 steps):
1. Initial Server Setup
2. SSH Hardening
3. Firewall Configuration (UFW)
4. Nginx Reverse Proxy
5. SSL/TLS with Let's Encrypt
6. Application Deployment with PM2
7. Monitoring & Logging
8. Backup & Disaster Recovery

**Impact**: Two complete, real-world projects that learners can add to their portfolio. Step-by-step structure prevents overwhelm.

---

## 9. Dark/Light Theme

### Implementation
- **next-themes** library for SSR-compatible theme management
- **ThemeProvider** (`src/components/ThemeProvider.tsx`): Wraps the entire app, sets `attribute="class"` to toggle `.dark` class on `<html>`
- **ThemeToggle** (`src/components/ThemeToggle.tsx`): Cycles through light → dark → system. Shows Sun/Moon/Monitor icon for current theme.
- **Root layout**: `suppressHydrationWarning` on `<html>` to prevent hydration mismatch from theme script
- **CSS variables**: shadcn's `globals.css` already defines `:root` (light) and `.dark` color schemes

### Placement
- **Navbar**: ThemeToggle in the public navigation bar
- **Sidebar**: ThemeToggle in the authenticated sidebar (between nav and user info)

**Impact**: Respects user preference and system settings. Reduces eye strain for dark mode users. No flash of wrong theme on page load (next-themes handles this with a blocking script).

---

## 10. Phase 4: Gamification

### 10.1 XP Engine (`src/lib/gamification.ts`)

**XP Rules**:
| Action | XP Awarded | Source Enum |
|--------|-----------|-------------|
| Complete a day | 100 | DAY_COMPLETE |
| Pass a quiz | 50 + min(60, (score - passingScore) * 2) | QUIZ_PASS |
| Pass a certification exam | 1000 | EXAM_PASS |
| Complete a daily task | 30-100 (per task definition) | TASK_COMPLETE |
| Complete a project step | 50 | PROJECT_STEP |
| Complete an entire project | 500-750 (per project definition) | PROJECT_COMPLETE |
| Earn a badge | Per badge (50-500) | BADGE_EARNED |
| 7-day streak | 200 | STREAK_BONUS |
| 30-day streak | 500 | STREAK_BONUS |

**getTotalXp()**: Aggregates `SUM(amount)` from XpLedger for a user. Always computed, never cached in a mutable field.

**Duplicate prevention**: Task and project XP check for existing ledger entries before creating new ones. Badge awards check UserBadge existence.

**Impact**: Every meaningful action is rewarded. Variable XP amounts create a sense of progression. The append-only design is auditable and tamper-resistant.

### 10.2 Level System

**Formula**: `level = floor(sqrt(totalXp / 100))`

| Level | Total XP Required | XP to Reach from Previous |
|-------|------------------|--------------------------|
| 0 | 0 | - |
| 1 | 100 | 100 |
| 2 | 400 | 300 |
| 3 | 900 | 500 |
| 5 | 2,500 | 900 |
| 10 | 10,000 | 1,900 |
| 20 | 40,000 | 3,900 |

**xpProgress()**: Returns `{ level, current (XP into current level), required (XP needed for next level), percentage }`.

**Impact**: Early levels come fast (Level 1 at just 100 XP), keeping new users motivated. Later levels require sustained effort, providing long-term goals. The square root curve ensures the first day feels rewarding.

### 10.3 Badge System

**10 badge definitions** across 5 categories:

| Badge | Category | Trigger | XP Reward |
|-------|----------|---------|-----------|
| First Step | COMPLETION | 1 day completed | 50 |
| Week Warrior | COMPLETION | 7 days completed | 100 |
| Two Week Champ | COMPLETION | 14 days completed | 200 |
| Getting Started | STREAK | 3-day streak | 50 |
| On Fire | STREAK | 7-day streak | 200 |
| Unstoppable | STREAK | 30-day streak | 500 |
| Quiz Ace | QUIZ | 1 perfect score | 100 |
| Quiz Master | QUIZ | 10 quizzes passed | 200 |
| Certification Ready | EXAM | 1 exam passed | 300 |
| Builder | PROJECT | 1 project completed | 200 |

**Badge evaluation engine** (`evaluateBadges()`):
1. Fetches all badges the user hasn't earned
2. Determines which trigger types are relevant
3. Only queries the database for needed stats (optimization)
4. For each unearned badge, checks if the user meets the trigger condition
5. Awards the badge + XP if condition is met
6. Returns array of newly earned badges

**6 trigger types**: `days_completed`, `streak_days`, `quiz_perfect_score`, `quizzes_passed`, `exams_passed`, `projects_completed`

**Impact**: Milestone celebration creates dopamine hits. Badge collection drives completionist behavior. XP bonuses from badges create compound rewards.

### 10.4 Streak System

**How it works**:
1. When a user completes a day, `updateStreak()` is called
2. If `lastActiveDate` is today: no change (already counted)
3. If `lastActiveDate` is yesterday: increment `currentStreak`, update `longestStreak` if new record
4. If gap > 1 day: reset `currentStreak` to 1
5. Update `lastActiveDate` to today

**Streak bonuses**: 7-day streak awards 200 XP, 30-day streak awards 500 XP (one-time each, via badge system).

**Impact**: The most powerful engagement mechanic. Users are motivated to maintain their streak ("I can't break my 15-day streak"). Loss aversion is stronger than reward seeking.

### 10.5 Gamification Orchestrator

**processGamificationEvent()**: Called after any significant action. Single entry point that:
1. Fetches total XP
2. Fetches streak data
3. Evaluates all badge triggers
4. Re-fetches XP if badges awarded extra XP
5. Calculates level
6. Returns complete gamification state

**Where it's called**:
- After quiz pass (quiz submit API)
- After exam pass (exam submit API)
- Day completion and task completion also award XP directly

**Impact**: Centralized logic prevents inconsistencies. Every action goes through the same pipeline, ensuring badges are always evaluated.

### 10.6 UI Components

**XpBar** (`src/components/gamification/XpBar.tsx`):
- Compact progress bar showing current level, progress to next level, and total XP
- Gradient fill animation
- Placed in the sidebar for constant visibility

**LevelIndicator** (`src/components/gamification/LevelIndicator.tsx`):
- SVG circular progress ring around the level number
- Stroke-dasharray for progress animation
- Used on profile page

**StreakCounter** (`src/components/gamification/StreakCounter.tsx`):
- Flame icon with current streak number + "day streak" text
- Glowing orange effect when streak >= 7 days
- Placed in sidebar

**BadgeDisplay** (`src/components/gamification/BadgeDisplay.tsx`):
- Grid of all badges
- Earned badges in full color with earned date
- Unearned badges grayed out with lock icon
- Hover tooltips showing name, description, requirement

**XpToast** (`src/components/gamification/XpToast.tsx`):
- Animated slide-in notification from top-right
- Shows "+100 XP" with animation
- Shows badge unlock if new badges earned
- Auto-dismisses after 3 seconds

**GamificationProvider** (`src/components/gamification/GamificationProvider.tsx`):
- React context provider
- Exposes `showXpGain(amount, badges?)` function
- Manages toast visibility state
- Renders XpToast component

**Impact**: Constant visual feedback. XP bar in sidebar creates awareness. Toast notifications provide immediate reward feedback. Badge display creates collection drive.

### 10.7 Leaderboard (`src/app/(app)/leaderboard/page.tsx`)
- Aggregates XP from XpLedger grouped by userId
- Shows top 20 users
- Columns: Rank, Name, Level, Total XP, Badge Count
- Current user's row highlighted with accent color
- Links to user profiles

**Impact**: Social competition drives engagement. Seeing others' progress motivates effort.

---

## 11. Phase 5: Polish & Scale

### 11.1 Admin Panel

**Admin guard** (`src/lib/admin.ts`):
- Reads `ADMIN_EMAILS` from environment variable (comma-separated)
- `isAdmin(email)` checks if the given email is in the list
- No database role field needed — simple, secure

**Admin layout** (`src/app/(admin)/layout.tsx`):
- Checks `auth()` + `isAdmin()` — redirects to /dashboard if not admin
- Separate sidebar with admin navigation: Dashboard, Users, Analytics, Back to App
- Red "Admin Panel" badge to differentiate from regular UI
- Mobile: horizontal scrollable nav bar

**Admin Dashboard** (`src/app/(admin)/admin/page.tsx`):
- Total users count
- Total enrollments across all subjects
- Active users (completed a day in last 7 days)
- Enrollments per subject
- Recent 10 signups with name, email, join date

**User Management** (`src/app/(admin)/admin/users/page.tsx`):
- Table: name, email, joined date, enrollments count, total XP, streak
- Search by name or email (query parameter)
- Pagination (20 per page)
- Responsive — columns hide on smaller screens

**Analytics** (`src/app/(admin)/admin/analytics/page.tsx`):
- Quiz pass rate (passed / total attempts) and average score
- Exam pass rate and average score
- Daily active users for the last 30 days
- Top 10 users by XP
- Most popular subjects by enrollment count
- Average completion rate per module

**Impact**: Content managers can monitor platform health, identify popular/struggling content, and track user engagement without database access.

### 11.2 Mobile Responsiveness

**MobileNav** (`src/components/layout/MobileNav.tsx`):
- Hamburger button visible on mobile, hidden on md+ screens
- Slide-out drawer from the left with semi-transparent overlay
- Same nav items as Sidebar (Dashboard, Subjects, Leaderboard, Profile)
- XP bar and streak counter
- User info and logout at bottom
- Closes on route change and click-outside

**NavbarMobileMenu** (`src/components/layout/NavbarMobileMenu.tsx`):
- Hamburger dropdown for public pages (landing, subjects catalog)
- Home, Subjects, Login/Register links

**Layout changes**:
- Sidebar: `hidden md:flex` (desktop only)
- MobileNav: `md:hidden` (mobile only)
- Main content: reduced padding on mobile (`px-4 py-6` vs `px-6 py-8`)

**Page-specific changes**:
- Landing page: smaller heading on mobile, single-column grid for value props
- Exam player: horizontal scrollable question navigator on mobile (instead of sidebar)
- Action buttons stack vertically on small screens

**Impact**: Full functionality on mobile devices. No features lost — just reorganized for smaller screens.

### 11.3 Performance Optimization

**ISR on subjects API**:
- `export const revalidate = 3600` — subjects API rebuilds at most once per hour
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- Subject data rarely changes, making this a safe optimization

**Impact**: First request after cache expiry hits the database; all subsequent requests for the next hour are served from cache. Reduces database load significantly for the most-hit API endpoint.

### 11.4 Security Middleware (`src/middleware.ts`)

Applied to all routes except static assets:

| Header | Value | Protection |
|--------|-------|-----------|
| X-Content-Type-Options | nosniff | Prevents MIME-type sniffing attacks |
| X-Frame-Options | DENY | Prevents clickjacking by blocking iframe embedding |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter for older browsers |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer information leakage |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Blocks access to sensitive device APIs |

**Rate limiting stubs**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers are set as a contract for reverse proxy integration.

**Impact**: Defense-in-depth security layer. Protects against common web attacks regardless of application logic.

### 11.5 README & Documentation

**README.md** covers:
- Project description with tech stack badges
- Feature list
- Getting started guide (prerequisites, clone, install, env, Docker, migrate, seed, dev)
- Project structure tree
- Adding a new subject guide
- Tech stack table
- Scripts reference
- Contributing guidelines
- MIT license

**SECURITY_AND_STANDARDS.md** covers:
- Authentication security (bcrypt, JWT, OAuth)
- API security (input validation, authorization, SQL injection prevention, XSS prevention)
- Data integrity (constraints, append-only ledger, streak integrity)
- Environment/secret management
- Code quality standards
- Dependency choices and justifications
- Testing recommendations

**Impact**: New developers can set up the project in minutes. Security practices are documented for auditing.

---

## 12. Security Features Summary

### Authentication Security
- Passwords hashed with bcrypt (cost factor 12) — never stored in plain text
- JWT sessions with signed tokens — stateless, no session fixation
- HTTP-only cookies — JavaScript cannot access session tokens
- OAuth via GitHub — delegates identity verification to trusted provider
- Server-side session validation on every protected route

### API Security
- All mutations require authentication (`auth()` check)
- User ID always from server session, never from request body
- Prisma ORM — all queries parameterized, no SQL injection possible
- No raw SQL anywhere in the codebase
- Input validation on all POST handlers

### XSS Prevention
- React JSX auto-escapes all rendered content
- No `dangerouslySetInnerHTML` usage
- External URLs are `href` attributes, not injected HTML
- Security headers (X-XSS-Protection, X-Content-Type-Options)

### Data Integrity
- Foreign keys with `onDelete: Cascade` — no orphaned records
- Unique constraints on all critical pairs (user+subject, user+day, etc.)
- Enum types for all status fields — invalid states impossible at DB level
- Append-only XP ledger — auditable, tamper-resistant
- Duplicate XP prevention checks before every award

### Environment Security
- `.env` gitignored — no secrets in version control
- `.env.example` provided with placeholder values
- `AUTH_SECRET` required for JWT signing
- Admin access controlled by `ADMIN_EMAILS` environment variable

---

## 13. Version Control History

| Commit | Hash | Description | Files Changed |
|--------|------|-------------|---------------|
| 1 | b561ab1 | Initial commit from Create Next App | Scaffolding |
| 2 | c708d8d | feat: initial commit | Next.js defaults |
| 3 | e1d5dce | feat: Phase 1 foundation — Prisma schema, auth, Docker, seed data | 39 files — schema, Docker, auth, 14 day JSON files, seed script, badges |
| 4 | 11228c9 | feat: Phase 1 UI — landing, auth, dashboard, curriculum day view | 21 files — pages, components, API routes, button |
| 5 | 1c88441 | feat: Phase 2 — quiz player, exam player with timer, profile page | 11 files — quiz/exam components, submission APIs, profile |
| 6 | bd31019 | feat: Phase 3 — interactive tasks with hints, guided projects | 7 files — TaskCard, ProjectViewer, ProjectCard, task/project APIs |
| 7 | b1d0b7b | feat: dark/light/system theme switching with next-themes | 2 files — ThemeProvider, ThemeToggle |
| 8 | c59d26e | feat: Phase 4 — XP engine, badges, streaks, leaderboard, gamification UI | 14 files — gamification.ts, 6 UI components, leaderboard, API updates |
| 9 | 1a2272e | docs: add security features and quality standards documentation | 1 file — SECURITY_AND_STANDARDS.md |
| 10 | ad2f790 | feat: admin panel with dashboard, user management, and analytics | 5 files — admin layout, 3 admin pages, admin helper |
| 11 | ee73fc9 | feat: mobile-responsive navigation and layout polish | 7 files — MobileNav, NavbarMobileMenu, responsive updates |
| 12 | 112d4a4 | feat: security headers, ISR caching, and comprehensive README | 4 files — middleware, next.config, subjects API cache, README |

---

## 14. File Inventory

### Configuration Files (Root)
| File | Purpose |
|------|---------|
| `docker-compose.yml` | PostgreSQL 16 Alpine database service |
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore rules for Node, Next.js, Prisma, env files |
| `next.config.ts` | Next.js config with turbopack root, image optimization, security headers |
| `package.json` | Dependencies and scripts (dev, build, db:seed, db:migrate, db:studio) |
| `prisma.config.ts` | Prisma config with datasource URL from environment |
| `tsconfig.json` | TypeScript strict mode config with path aliases |
| `postcss.config.mjs` | PostCSS config for Tailwind |
| `components.json` | shadcn/ui configuration |

### Prisma (`prisma/`)
| File | Purpose |
|------|---------|
| `schema.prisma` | 26 models, 8 enums, all relations and constraints |
| `migrations/20260326141746_init/migration.sql` | Initial database migration |
| `seed/index.ts` | Idempotent seed script reading JSON files |
| `seed/badges.json` | 10 badge definitions with triggers and XP rewards |

### Seed Data — DevOps Subject (`prisma/seed/subjects/devops/`)
| File | Purpose |
|------|---------|
| `subject.json` | DevOps Engineering subject metadata |
| `certifications.json` | CKA and AWS DevOps Professional certifications |
| `modules/01-linux-fundamentals/module.json` | Linux Fundamentals module (weeks 1-2) |
| `modules/01-linux-fundamentals/day-01.json` through `day-07.json` | 7 days of Linux content |
| `modules/02-version-control-git/module.json` | Version Control with Git module (weeks 3-4) |
| `modules/02-version-control-git/day-08.json` through `day-14.json` | 7 days of Git content |
| `exams/cka-practice-1.json` | 20-question CKA practice exam |
| `projects/ci-cd-pipeline.json` | 8-step CI/CD Pipeline project |
| `projects/linux-server-setup.json` | 8-step Linux Server Setup project |

### Library Files (`src/lib/`)
| File | Purpose |
|------|---------|
| `db.ts` | Prisma client singleton with PrismaPg adapter |
| `auth.ts` | Auth.js v5 config — providers, callbacks, adapter |
| `auth-actions.ts` | Server actions: registerUser, loginUser, logoutUser |
| `gamification.ts` | XP engine, level calculator, badge evaluator, streak manager, orchestrator |
| `admin.ts` | Admin role check via ADMIN_EMAILS env var |
| `utils.ts` | `cn()` utility for className merging |

### Middleware
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Security headers and rate-limit stubs on all routes |

### Type Definitions
| File | Purpose |
|------|---------|
| `src/types/next-auth.d.ts` | Extends Auth.js Session type with user.id |

### Pages — Public (`src/app/`)
| File | Purpose |
|------|---------|
| `layout.tsx` | Root layout: fonts, ThemeProvider, globals.css |
| `page.tsx` | Landing page: hero, value props, CTAs |

### Pages — Auth (`src/app/(auth)/`)
| File | Purpose |
|------|---------|
| `layout.tsx` | Centered card layout for auth pages |
| `login/page.tsx` | Login form with useActionState |
| `register/page.tsx` | Registration form with validation |

### Pages — Authenticated (`src/app/(app)/`)
| File | Purpose |
|------|---------|
| `layout.tsx` | Sidebar + MobileNav + GamificationProvider |
| `dashboard/page.tsx` | Welcome, streak, progress, continue learning |
| `subjects/page.tsx` | Subject catalog with enrollment buttons |
| `subjects/[subjectSlug]/page.tsx` | Subject detail with module accordion |
| `subjects/[subjectSlug]/curriculum/[dayNumber]/page.tsx` | Day view: resources, quizzes, tasks |
| `subjects/[subjectSlug]/quizzes/[quizId]/page.tsx` | Quiz player page |
| `subjects/[subjectSlug]/exams/page.tsx` | Exam catalog |
| `subjects/[subjectSlug]/exams/[examId]/page.tsx` | Exam player page |
| `subjects/[subjectSlug]/projects/page.tsx` | Project listing |
| `subjects/[subjectSlug]/projects/[projectId]/page.tsx` | Project viewer page |
| `profile/page.tsx` | User profile with stats, badges, history |
| `leaderboard/page.tsx` | Top 20 users by XP |

### Pages — Admin (`src/app/(admin)/`)
| File | Purpose |
|------|---------|
| `layout.tsx` | Admin layout with auth + admin guard |
| `admin/page.tsx` | Admin dashboard: user counts, enrollments, signups |
| `admin/users/page.tsx` | User management with search and pagination |
| `admin/analytics/page.tsx` | Analytics: pass rates, DAU, top users, completion rates |

### API Routes (`src/app/api/`)
| File | Purpose |
|------|---------|
| `auth/[...nextauth]/route.ts` | Auth.js route handler |
| `subjects/route.ts` | GET published subjects (ISR cached) |
| `enrollments/route.ts` | POST enroll in subject |
| `progress/day/route.ts` | POST mark day complete + XP + streak |
| `quizzes/[quizId]/submit/route.ts` | POST grade quiz + XP + badges |
| `exams/[examId]/submit/route.ts` | POST grade exam + XP + badges |
| `tasks/[taskId]/submit/route.ts` | POST submit task + XP |
| `projects/[projectId]/progress/route.ts` | POST update project step + XP |

### Components — UI (`src/components/ui/`)
| File | Purpose |
|------|---------|
| `button.tsx` | shadcn Button with asChild support |

### Components — Layout (`src/components/layout/`)
| File | Purpose |
|------|---------|
| `Sidebar.tsx` | Authenticated sidebar: nav, XP bar, streak, theme, user |
| `Navbar.tsx` | Public navbar: logo, links, theme, auth buttons |
| `MobileNav.tsx` | Mobile slide-out drawer navigation |
| `NavbarMobileMenu.tsx` | Mobile hamburger dropdown for public pages |

### Components — Curriculum (`src/components/curriculum/`)
| File | Purpose |
|------|---------|
| `ResourceList.tsx` | Resource cards with type icons, source, duration |
| `ModuleAccordion.tsx` | Expandable module with day completion status |
| `DayCompleteButton.tsx` | Mark day as complete button |
| `TaskCard.tsx` | Interactive task with hints, solution, submission |

### Components — Quiz (`src/components/quiz/`)
| File | Purpose |
|------|---------|
| `QuizPlayer.tsx` | One-question-at-a-time quiz with navigation |
| `QuestionCard.tsx` | Single question with radio/checkbox options |
| `ResultsSummary.tsx` | Score display, pass/fail, per-question review |

### Components — Exam (`src/components/exam/`)
| File | Purpose |
|------|---------|
| `ExamPlayer.tsx` | Timed exam with question sidebar and flagging |
| `ExamTimer.tsx` | MM:SS countdown with color changes |

### Components — Projects (`src/components/projects/`)
| File | Purpose |
|------|---------|
| `ProjectCard.tsx` | Project card with progress bar |
| `ProjectViewer.tsx` | Step-by-step project with checkpoints |

### Components — Gamification (`src/components/gamification/`)
| File | Purpose |
|------|---------|
| `XpBar.tsx` | Level + progress bar for sidebar |
| `LevelIndicator.tsx` | SVG circular progress ring |
| `StreakCounter.tsx` | Flame icon + streak count |
| `BadgeDisplay.tsx` | Badge grid with earned/unearned states |
| `XpToast.tsx` | Animated XP gain notification |
| `GamificationProvider.tsx` | Context provider for toast triggers |

### Components — Dashboard (`src/components/dashboard/`)
| File | Purpose |
|------|---------|
| `ProgressOverview.tsx` | Enrolled subjects with progress bars |

### Components — Other (`src/components/`)
| File | Purpose |
|------|---------|
| `ThemeProvider.tsx` | next-themes provider wrapper |
| `ThemeToggle.tsx` | Light/dark/system cycle button |
| `EnrollButton.tsx` | Subject enrollment button |

---

## 15. API Reference

### GET /api/subjects
- **Auth required**: No
- **Caching**: ISR, revalidates every 3600 seconds
- **Response**: Array of subjects with modules and day counts
```json
[{
  "id": "...", "slug": "devops", "title": "DevOps Engineering",
  "modules": [{"id": "...", "title": "...", "_count": {"days": 7}}]
}]
```

### POST /api/enrollments
- **Auth required**: Yes
- **Request body**: `{ "subjectId": "string" }`
- **Response**: `{ "enrollment": {...} }`
- **Side effects**: Creates Enrollment record (upsert)

### POST /api/progress/day
- **Auth required**: Yes
- **Request body**: `{ "dayId": "string", "status": "COMPLETED" | "IN_PROGRESS" }`
- **Response**: `{ "progress": {...} }`
- **Side effects**: Upserts DayProgress. On COMPLETED: awards 100 XP (DAY_COMPLETE), updates streak

### POST /api/quizzes/[quizId]/submit
- **Auth required**: Yes
- **Request body**: `{ "answers": [{"questionId": "string", "selectedOptionIds": ["string"]}] }`
- **Response**: `{ "score": 85, "passed": true, "results": [...], "gamification": {...} }`
- **Side effects**: Creates QuizAttempt. If passed: awards XP (50 + score bonus), evaluates badges

### POST /api/exams/[examId]/submit
- **Auth required**: Yes
- **Request body**: `{ "answers": [...], "timeSpent": 3600 }`
- **Response**: `{ "score": 72, "passed": true, "timeSpent": 3600, "results": [...], "gamification": {...} }`
- **Side effects**: Creates ExamAttempt. If passed: awards 1000 XP, evaluates badges

### POST /api/tasks/[taskId]/submit
- **Auth required**: Yes
- **Request body**: `{ "status": "COMPLETED" | "ATTEMPTED" | "SKIPPED", "notes": "string?" }`
- **Response**: `{ "success": true, "submission": {...} }`
- **Side effects**: Upserts TaskSubmission. If COMPLETED: awards task's XP reward

### POST /api/projects/[projectId]/progress
- **Auth required**: Yes
- **Request body**: `{ "stepCompleted": 0 }`
- **Response**: `{ "success": true, "progress": {...}, "projectComplete": false }`
- **Side effects**: Upserts ProjectProgress. Awards 50 XP per step. Awards project XP on completion.

---

## 16. Future Roadmap

### More DevOps Modules
- Docker & Containerization (Days 15-21)
- Kubernetes Fundamentals (Days 22-35)
- Terraform & Infrastructure as Code (Days 36-42)
- AWS Cloud Services (Days 43-56)
- Monitoring & Observability (Days 57-63)
- CI/CD Deep Dive (Days 64-70)
- Security & Compliance (Days 71-77)
- Site Reliability Engineering (Days 78-90)

### More Certification Exams
- AWS Certified DevOps Engineer Professional (full practice exam)
- Terraform Associate
- Docker Certified Associate
- CKA additional practice exams

### Additional Features
- **Email notifications**: Streak reminders, weekly progress digest, badge unlock emails
- **Full CMS**: Admin interface for creating/editing subjects, modules, days without JSON files
- **AI-powered quiz generation**: Use an LLM to generate quiz questions from learning material
- **Discussion forums**: Per-day discussion threads for learners to ask questions
- **Mentor matching**: Connect beginners with experienced DevOps engineers
- **Mobile app**: React Native wrapper for the web app
- **Internationalization (i18n)**: Multi-language support
- **Team features**: Organization accounts, team progress dashboards, assigned learning paths
- **Spaced repetition**: Resurface quiz questions based on forgetting curves
- **Code playground**: In-browser terminal for practicing Linux commands
- **Certificate generation**: PDF certificates for completing subjects or passing exams

---

*This report documents the complete development of DevOps Tutor from initial planning through Phase 5 delivery. Every component, API route, database model, and design decision has been documented with its purpose and impact on the application.*
