import { PrismaClient, ResourceType, QuestionType, Difficulty, BadgeCategory } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Types for seed data ─────────────────────────────────

interface SubjectData {
  slug: string;
  title: string;
  description: string;
  icon?: string;
  isPublished: boolean;
}

interface CertificationData {
  slug: string;
  title: string;
  provider: string;
  description?: string;
  examUrl?: string;
  cost?: string;
  duration?: string;
  passingScore?: number;
  format?: string;
  prerequisites?: string[];
  domains?: { name: string; weight: number }[];
  sortOrder: number;
}

interface ResourceData {
  title: string;
  url: string;
  type: ResourceType;
  source?: string;
  duration?: string;
  isRequired: boolean;
  sortOrder: number;
}

interface QuizOptionData {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestionData {
  questionText: string;
  questionType: QuestionType;
  explanation?: string;
  options: QuizOptionData[];
  sortOrder: number;
}

interface QuizData {
  title: string;
  passingScore: number;
  questions: QuizQuestionData[];
}

interface TaskData {
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  hints?: string[];
  sortOrder: number;
}

interface DayData {
  dayNumber: number;
  title: string;
  summary: string;
  resources: ResourceData[];
  quiz: QuizData;
  tasks: TaskData[];
}

interface ModuleData {
  slug: string;
  title: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  sortOrder: number;
}

interface BadgeData {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  trigger: { type: string; value: number };
  xpReward: number;
}

interface ExamQuestionData {
  questionText: string;
  questionType: QuestionType;
  explanation?: string;
  domain?: string;
  options: QuizOptionData[];
  sortOrder: number;
}

interface ExamData {
  certificationSlug: string;
  title: string;
  description?: string;
  timeLimit: number;
  passingScore: number;
  questionCount: number;
  questions: ExamQuestionData[];
}

interface ProjectStepData {
  stepNumber: number;
  title: string;
  description: string;
  checkpoints: string[];
}

interface ProjectData {
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  repoUrl?: string;
  steps: ProjectStepData[];
}

// ─── Helpers ─────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function getSubjectDirs(seedDir: string): string[] {
  const subjectsDir = path.join(seedDir, "subjects");
  if (!fs.existsSync(subjectsDir)) return [];
  return fs
    .readdirSync(subjectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(subjectsDir, d.name));
}

function getModuleDirs(subjectDir: string): string[] {
  const modulesDir = path.join(subjectDir, "modules");
  if (!fs.existsSync(modulesDir)) return [];
  return fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => path.join(modulesDir, d.name));
}

function getDayFiles(moduleDir: string): string[] {
  return fs
    .readdirSync(moduleDir)
    .filter((f) => f.match(/^day-\d+\.json$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0]);
      const numB = parseInt(b.match(/\d+/)![0]);
      return numA - numB;
    })
    .map((f) => path.join(moduleDir, f));
}

function getExamFiles(subjectDir: string): string[] {
  const examsDir = path.join(subjectDir, "exams");
  if (!fs.existsSync(examsDir)) return [];
  return fs
    .readdirSync(examsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(examsDir, f));
}

function getProjectFiles(subjectDir: string): string[] {
  const projectsDir = path.join(subjectDir, "projects");
  if (!fs.existsSync(projectsDir)) return [];
  return fs
    .readdirSync(projectsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(projectsDir, f));
}

// ─── Seed functions ──────────────────────────────────────

async function seedBadges(seedDir: string) {
  const badgesFile = path.join(seedDir, "badges.json");
  if (!fs.existsSync(badgesFile)) {
    console.log("  No badges.json found, skipping.");
    return;
  }

  const badges = readJson<BadgeData[]>(badgesFile);
  console.log(`  Seeding ${badges.length} badges...`);

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        trigger: badge.trigger,
        xpReward: badge.xpReward,
      },
      create: {
        slug: badge.slug,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        trigger: badge.trigger,
        xpReward: badge.xpReward,
      },
    });
  }

  console.log(`  ✓ ${badges.length} badges seeded.`);
}

async function seedDay(dayFile: string, moduleId: string) {
  const dayData = readJson<DayData>(dayFile);

  // Upsert the day
  const day = await prisma.day.upsert({
    where: {
      moduleId_dayNumber: {
        moduleId,
        dayNumber: dayData.dayNumber,
      },
    },
    update: {
      title: dayData.title,
      summary: dayData.summary,
      sortOrder: dayData.dayNumber,
    },
    create: {
      moduleId,
      dayNumber: dayData.dayNumber,
      title: dayData.title,
      summary: dayData.summary,
      sortOrder: dayData.dayNumber,
    },
  });

  // Delete existing resources, quizzes, tasks for this day to avoid duplicates
  await prisma.resource.deleteMany({ where: { dayId: day.id } });
  await prisma.dailyTask.deleteMany({ where: { dayId: day.id } });

  // Delete quiz questions first (via cascade), then quizzes
  const existingQuizzes = await prisma.quiz.findMany({
    where: { dayId: day.id },
    select: { id: true },
  });
  for (const quiz of existingQuizzes) {
    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
  }
  await prisma.quiz.deleteMany({ where: { dayId: day.id } });

  // Seed resources
  for (const resource of dayData.resources) {
    await prisma.resource.create({
      data: {
        dayId: day.id,
        title: resource.title,
        url: resource.url,
        type: resource.type as ResourceType,
        source: resource.source ?? null,
        duration: resource.duration ?? null,
        isRequired: resource.isRequired,
        sortOrder: resource.sortOrder,
      },
    });
  }

  // Seed quiz
  if (dayData.quiz) {
    const quiz = await prisma.quiz.create({
      data: {
        dayId: day.id,
        title: dayData.quiz.title,
        passingScore: dayData.quiz.passingScore,
        sortOrder: 1,
      },
    });

    for (const question of dayData.quiz.questions) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionText: question.questionText,
          questionType: question.questionType as QuestionType,
          explanation: question.explanation ?? null,
          options: question.options,
          sortOrder: question.sortOrder,
        },
      });
    }
  }

  // Seed tasks
  for (const task of dayData.tasks) {
    await prisma.dailyTask.create({
      data: {
        dayId: day.id,
        title: task.title,
        description: task.description,
        difficulty: task.difficulty as Difficulty,
        xpReward: task.xpReward,
        hints: task.hints ?? null,
        sortOrder: task.sortOrder,
      },
    });
  }

  return day;
}

async function seedModule(moduleDir: string, subjectId: string) {
  const moduleFile = path.join(moduleDir, "module.json");
  if (!fs.existsSync(moduleFile)) {
    console.log(`  Skipping ${moduleDir} — no module.json found.`);
    return;
  }

  const moduleData = readJson<ModuleData>(moduleFile);

  // Upsert the module
  const mod = await prisma.module.upsert({
    where: {
      subjectId_slug: {
        subjectId,
        slug: moduleData.slug,
      },
    },
    update: {
      title: moduleData.title,
      description: moduleData.description,
      weekStart: moduleData.weekStart,
      weekEnd: moduleData.weekEnd,
      sortOrder: moduleData.sortOrder,
    },
    create: {
      subjectId,
      slug: moduleData.slug,
      title: moduleData.title,
      description: moduleData.description,
      weekStart: moduleData.weekStart,
      weekEnd: moduleData.weekEnd,
      sortOrder: moduleData.sortOrder,
    },
  });

  // Seed days
  const dayFiles = getDayFiles(moduleDir);
  console.log(`    Seeding ${dayFiles.length} days in module "${moduleData.title}"...`);

  for (const dayFile of dayFiles) {
    const day = await seedDay(dayFile, mod.id);
    console.log(`      ✓ Day ${day.dayNumber}: ${day.title}`);
  }

  return mod;
}

async function seedExams(subjectDir: string) {
  const examFiles = getExamFiles(subjectDir);
  if (examFiles.length === 0) return;

  console.log(`  Seeding ${examFiles.length} exam(s)...`);

  for (const examFile of examFiles) {
    const examData = readJson<ExamData>(examFile);

    // Find the certification by slug
    const certification = await prisma.certification.findUnique({
      where: { slug: examData.certificationSlug },
    });

    if (!certification) {
      console.log(`    ⚠ Certification "${examData.certificationSlug}" not found, skipping exam "${examData.title}".`);
      continue;
    }

    // Upsert exam: find existing by title + certificationId, or create
    let exam = await prisma.exam.findFirst({
      where: {
        certificationId: certification.id,
        title: examData.title,
      },
    });

    if (exam) {
      exam = await prisma.exam.update({
        where: { id: exam.id },
        data: {
          description: examData.description ?? null,
          timeLimit: examData.timeLimit,
          passingScore: examData.passingScore,
          questionCount: examData.questionCount,
        },
      });
    } else {
      exam = await prisma.exam.create({
        data: {
          certificationId: certification.id,
          title: examData.title,
          description: examData.description ?? null,
          timeLimit: examData.timeLimit,
          passingScore: examData.passingScore,
          questionCount: examData.questionCount,
        },
      });
    }

    // Delete existing questions and recreate
    await prisma.examQuestion.deleteMany({ where: { examId: exam.id } });

    for (const question of examData.questions) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionText: question.questionText,
          questionType: question.questionType as QuestionType,
          explanation: question.explanation ?? null,
          domain: question.domain ?? null,
          options: question.options,
          sortOrder: question.sortOrder,
        },
      });
    }

    console.log(`    ✓ Exam: "${examData.title}" (${examData.questions.length} questions)`);
  }
}

async function seedProjects(subjectDir: string, subjectId: string) {
  const projectFiles = getProjectFiles(subjectDir);
  if (projectFiles.length === 0) return;

  console.log(`  Seeding ${projectFiles.length} project(s)...`);

  for (const projectFile of projectFiles) {
    const projectData = readJson<ProjectData>(projectFile);

    // Find existing by title + subjectId
    let project = await prisma.project.findFirst({
      where: {
        title: projectData.title,
        subjectId,
      },
    });

    if (project) {
      project = await prisma.project.update({
        where: { id: project.id },
        data: {
          description: projectData.description,
          difficulty: projectData.difficulty,
          xpReward: projectData.xpReward,
          repoUrl: projectData.repoUrl ?? null,
          steps: projectData.steps,
        },
      });
    } else {
      project = await prisma.project.create({
        data: {
          subjectId,
          title: projectData.title,
          description: projectData.description,
          difficulty: projectData.difficulty,
          xpReward: projectData.xpReward,
          repoUrl: projectData.repoUrl ?? null,
          steps: projectData.steps,
        },
      });
    }

    console.log(`    ✓ Project: "${projectData.title}" (${projectData.steps.length} steps)`);
  }
}

async function seedSubject(subjectDir: string) {
  const subjectFile = path.join(subjectDir, "subject.json");
  if (!fs.existsSync(subjectFile)) {
    console.log(`  Skipping ${subjectDir} — no subject.json found.`);
    return;
  }

  const subjectData = readJson<SubjectData>(subjectFile);
  console.log(`\nSeeding subject: "${subjectData.title}"...`);

  // Upsert the subject
  const subject = await prisma.subject.upsert({
    where: { slug: subjectData.slug },
    update: {
      title: subjectData.title,
      description: subjectData.description,
      icon: subjectData.icon ?? null,
      isPublished: subjectData.isPublished,
    },
    create: {
      slug: subjectData.slug,
      title: subjectData.title,
      description: subjectData.description,
      icon: subjectData.icon ?? null,
      isPublished: subjectData.isPublished,
    },
  });

  // Seed certifications
  const certsFile = path.join(subjectDir, "certifications.json");
  if (fs.existsSync(certsFile)) {
    const certs = readJson<CertificationData[]>(certsFile);
    console.log(`  Seeding ${certs.length} certifications...`);

    for (const cert of certs) {
      await prisma.certification.upsert({
        where: { slug: cert.slug },
        update: {
          title: cert.title,
          provider: cert.provider,
          subjectId: subject.id,
        },
        create: {
          slug: cert.slug,
          title: cert.title,
          provider: cert.provider,
          subjectId: subject.id,
        },
      });
      console.log(`    ✓ Certification: ${cert.title}`);
    }
  }

  // Seed modules
  const moduleDirs = getModuleDirs(subjectDir);
  console.log(`  Found ${moduleDirs.length} modules.`);

  for (const moduleDir of moduleDirs) {
    await seedModule(moduleDir, subject.id);
  }

  // Seed exams
  await seedExams(subjectDir);

  // Seed projects
  await seedProjects(subjectDir, subject.id);

  return subject;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const seedDir = path.resolve(__dirname);

  console.log("╔══════════════════════════════════════════╗");
  console.log("║       DevOps Tutor — Seed Script        ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nSeed directory: ${seedDir}`);

  // Seed badges
  console.log("\n── Badges ──────────────────────────────────");
  await seedBadges(seedDir);

  // Seed subjects
  console.log("\n── Subjects ────────────────────────────────");
  const subjectDirs = getSubjectDirs(seedDir);

  if (subjectDirs.length === 0) {
    console.log("  No subject directories found.");
  }

  for (const subjectDir of subjectDirs) {
    await seedSubject(subjectDir);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  Seed complete!");
  console.log("══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
