import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

let seq = 0;
const next = () => ++seq;

export const PASSWORD = "correct-horse-battery";

export async function createUser(overrides: { email?: string; role?: "USER" | "ADMIN"; password?: string } = {}) {
  const n = next();
  return db.user.create({
    data: {
      name: `User ${n}`,
      email: overrides.email ?? `user${n}@example.test`,
      passwordHash: await bcrypt.hash(overrides.password ?? PASSWORD, 4),
      role: overrides.role ?? "USER",
    },
  });
}

const options = [
  { id: "a", text: "Right", isCorrect: true },
  { id: "b", text: "Wrong", isCorrect: false },
];

/**
 * One subject with a module, a day (with a quiz and a task), a
 * certification with an exam, and a two-step project.
 */
export async function createCurriculum({ published = true } = {}) {
  const n = next();
  const subject = await db.subject.create({
    data: {
      slug: `subject-${n}`,
      title: `Subject ${n}`,
      description: "Fixture subject",
      isPublished: published,
    },
  });
  const mod = await db.module.create({
    data: {
      subjectId: subject.id,
      slug: "module-1",
      title: "Module 1",
      description: "Fixture module",
      weekStart: 1,
      weekEnd: 1,
      sortOrder: 1,
    },
  });
  const day = await db.day.create({
    data: { moduleId: mod.id, dayNumber: 1, title: "Day 1", summary: "Fixture day", sortOrder: 1 },
  });
  const quiz = await db.quiz.create({
    data: {
      dayId: day.id,
      title: "Quiz 1",
      passingScore: 70,
      sortOrder: 1,
      questions: {
        create: [
          { questionText: "Q1", questionType: "SINGLE_CHOICE", options, sortOrder: 1, explanation: "Because" },
          { questionText: "Q2", questionType: "SINGLE_CHOICE", options, sortOrder: 2 },
        ],
      },
    },
    include: { questions: true },
  });
  const task = await db.dailyTask.create({
    data: { dayId: day.id, title: "Task 1", description: "Do it", difficulty: "BEGINNER", xpReward: 50, sortOrder: 1 },
  });
  const certification = await db.certification.create({
    data: { subjectId: subject.id, slug: `cert-${n}`, title: "Cert", provider: "Fixture" },
  });
  const exam = await db.exam.create({
    data: {
      certificationId: certification.id,
      title: "Exam 1",
      timeLimit: 30,
      passingScore: 65,
      questionCount: 2,
      questions: {
        create: [
          { questionText: "E1", questionType: "SINGLE_CHOICE", options, sortOrder: 1 },
          { questionText: "E2", questionType: "SINGLE_CHOICE", options, sortOrder: 2 },
        ],
      },
    },
    include: { questions: true },
  });
  const project = await db.project.create({
    data: {
      subjectId: subject.id,
      title: "Project 1",
      description: "Fixture project",
      difficulty: "BEGINNER",
      xpReward: 500,
      steps: [
        { stepNumber: 1, title: "Step 1", description: "First", checkpoints: [] },
        { stepNumber: 2, title: "Step 2", description: "Second", checkpoints: [] },
      ],
    },
  });
  return { subject, module: mod, day, quiz, task, exam, project };
}

export function allCorrect(questions: { id: string }[]) {
  return questions.map((q) => ({ questionId: q.id, selectedOptionIds: ["a"] }));
}

export function allWrong(questions: { id: string }[]) {
  return questions.map((q) => ({ questionId: q.id, selectedOptionIds: ["b"] }));
}

export async function enroll(userId: string, subjectId: string) {
  return db.enrollment.create({ data: { userId, subjectId } });
}

export async function totalXp(userId: string) {
  const agg = await db.xpLedger.aggregate({ where: { userId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}
