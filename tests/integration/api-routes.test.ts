import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { POST as dayProgress } from "@/app/api/progress/day/route";
import { POST as enroll } from "@/app/api/enrollments/route";
import { POST as submitQuiz } from "@/app/api/quizzes/[quizId]/submit/route";
import { POST as submitExam } from "@/app/api/exams/[examId]/submit/route";
import { POST as submitTask } from "@/app/api/tasks/[taskId]/submit/route";
import { POST as projectProgress } from "@/app/api/projects/[projectId]/progress/route";
import { GET as subjects } from "@/app/api/subjects/route";
import { GET as health } from "@/app/api/health/route";
import { asUser } from "../helpers/auth";
import { getRequest, jsonRequest, params } from "../helpers/request";
import {
  allCorrect,
  allWrong,
  createCurriculum,
  createUser,
  enroll as enrollUser,
  totalXp,
} from "../helpers/fixtures";

async function enrolledLearner() {
  const c = await createCurriculum();
  const user = await createUser();
  await enrollUser(user.id, c.subject.id);
  asUser(user.id);
  return { c, user };
}

describe("authentication on mutating routes", () => {
  it("returns 401 without a session", async () => {
    const c = await createCurriculum();
    const responses = await Promise.all([
      dayProgress(jsonRequest("/api/progress/day", { dayId: c.day.id, status: "COMPLETED" })),
      enroll(jsonRequest("/api/enrollments", { subjectId: c.subject.id })),
      submitQuiz(jsonRequest("/x", { answers: [] }), params({ quizId: c.quiz.id })),
      submitExam(jsonRequest("/x", { answers: [] }), params({ examId: c.exam.id })),
      submitTask(jsonRequest("/x", { status: "COMPLETED" }), params({ taskId: c.task.id })),
      projectProgress(jsonRequest("/x", { stepCompleted: 0 }), params({ projectId: c.project.id })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });
});

describe("POST /api/enrollments", () => {
  it("enrolls idempotently in a published subject", async () => {
    const c = await createCurriculum();
    const user = await createUser();
    asUser(user.id);
    for (let i = 0; i < 2; i++) {
      const res = await enroll(jsonRequest("/api/enrollments", { subjectId: c.subject.id }));
      expect(res.status).toBe(201);
    }
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(1);
  });

  it("returns 404 for an unpublished subject and 400 for a bad body", async () => {
    const c = await createCurriculum({ published: false });
    asUser((await createUser()).id);
    expect((await enroll(jsonRequest("/api/enrollments", { subjectId: c.subject.id }))).status).toBe(404);
    expect((await enroll(jsonRequest("/api/enrollments", "{nope"))).status).toBe(400);
    expect((await enroll(jsonRequest("/api/enrollments", { subjectId: 42 }))).status).toBe(400);
  });
});

describe("POST /api/progress/day", () => {
  it("awards day XP once and records the streak, however often it is toggled", async () => {
    const { c, user } = await enrolledLearner();
    for (const status of ["COMPLETED", "NOT_STARTED", "COMPLETED", "COMPLETED"]) {
      const res = await dayProgress(jsonRequest("/api/progress/day", { dayId: c.day.id, status }));
      expect(res.status).toBe(200);
    }
    expect(await totalXp(user.id)).toBe(100);
    const streak = await db.streak.findUnique({ where: { userId: user.id } });
    expect(streak?.currentStreak).toBe(1);
  });

  it("rejects unknown days, unpublished subjects and invalid status", async () => {
    const hidden = await createCurriculum({ published: false });
    asUser((await createUser()).id);
    expect((await dayProgress(jsonRequest("/x", { dayId: "missing", status: "COMPLETED" }))).status).toBe(404);
    expect((await dayProgress(jsonRequest("/x", { dayId: hidden.day.id, status: "COMPLETED" }))).status).toBe(404);
    expect((await dayProgress(jsonRequest("/x", { dayId: hidden.day.id, status: "DONE" }))).status).toBe(400);
  });
});

describe("POST /api/quizzes/[quizId]/submit", () => {
  it("grades, stores the attempt, and awards pass XP only on the first pass", async () => {
    const { c, user } = await enrolledLearner();
    const first = await submitQuiz(
      jsonRequest("/x", { answers: allCorrect(c.quiz.questions) }),
      params({ quizId: c.quiz.id })
    );
    const body = await first.json();
    expect(body.score).toBe(100);
    expect(body.passed).toBe(true);
    expect(body.gamification.xpAwarded).toBeGreaterThan(0);

    const again = await submitQuiz(
      jsonRequest("/x", { answers: allCorrect(c.quiz.questions) }),
      params({ quizId: c.quiz.id })
    );
    expect((await again.json()).gamification.xpAwarded).toBe(0);
    expect(await db.quizAttempt.count({ where: { userId: user.id } })).toBe(2);
  });

  it("does not award XP for a failed attempt", async () => {
    const { c, user } = await enrolledLearner();
    const res = await submitQuiz(
      jsonRequest("/x", { answers: allWrong(c.quiz.questions) }),
      params({ quizId: c.quiz.id })
    );
    expect((await res.json()).passed).toBe(false);
    expect(await totalXp(user.id)).toBe(0);
  });

  it("stores only answers that belong to the quiz", async () => {
    const { c, user } = await enrolledLearner();
    const answers = [...allCorrect(c.quiz.questions), { questionId: "foreign", selectedOptionIds: ["a"] }];
    await submitQuiz(jsonRequest("/x", { answers }), params({ quizId: c.quiz.id }));
    const attempt = await db.quizAttempt.findFirstOrThrow({ where: { userId: user.id } });
    expect((attempt.answers as unknown[]).length).toBe(c.quiz.questions.length);
  });
});

describe("POST /api/exams/[examId]/submit", () => {
  it("awards exam XP once and clamps timeSpent to the time limit", async () => {
    const { c, user } = await enrolledLearner();
    const results = [];
    for (let i = 0; i < 2; i++) {
      const res = await submitExam(
        jsonRequest("/x", { answers: allCorrect(c.exam.questions), timeSpent: 86_400 }),
        params({ examId: c.exam.id })
      );
      expect(res.status).toBe(200);
      results.push(await res.json());
    }
    expect(results[0].gamification.xpAwarded).toBeGreaterThan(0);
    expect(results[1].gamification.xpAwarded).toBe(0);
    const attempt = await db.examAttempt.findFirstOrThrow({ where: { userId: user.id } });
    expect(attempt.timeSpent).toBe(c.exam.timeLimit * 60);
  });
});

describe("POST /api/tasks/[taskId]/submit", () => {
  it("awards task XP once on completion", async () => {
    const { c, user } = await enrolledLearner();
    for (let i = 0; i < 2; i++) {
      const res = await submitTask(
        jsonRequest("/x", { status: "COMPLETED", notes: "done" }),
        params({ taskId: c.task.id })
      );
      expect(res.status).toBe(200);
    }
    expect(await totalXp(user.id)).toBe(c.task.xpReward);
  });

  it("rejects oversized notes", async () => {
    const { c } = await enrolledLearner();
    const res = await submitTask(
      jsonRequest("/x", { status: "COMPLETED", notes: "x".repeat(5001) }),
      params({ taskId: c.task.id })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/projects/[projectId]/progress", () => {
  it("awards step XP once per step and completion XP once", async () => {
    const { c, user } = await enrolledLearner();
    for (const step of [0, 0, 1, 1]) {
      const res = await projectProgress(jsonRequest("/x", { stepCompleted: step }), params({ projectId: c.project.id }));
      expect(res.status).toBe(200);
    }
    expect(await totalXp(user.id)).toBe(50 + 50 + c.project.xpReward);
    const progress = await db.projectProgress.findFirstOrThrow({ where: { userId: user.id } });
    expect(progress.status).toBe("COMPLETED");
  });

  it("rejects a step beyond the project", async () => {
    const { c } = await enrolledLearner();
    const res = await projectProgress(jsonRequest("/x", { stepCompleted: 2 }), params({ projectId: c.project.id }));
    expect(res.status).toBe(400);
  });
});

describe("public routes", () => {
  it("lists only published subjects", async () => {
    await createCurriculum();
    await createCurriculum({ published: false });
    const list = await (await subjects()).json();
    expect(list).toHaveLength(1);
  });

  it("reports liveness and database readiness", async () => {
    expect((await health(getRequest("/api/health"))).status).toBe(200);
    const ready = await health(getRequest("/api/health?ready=1"));
    expect(ready.status).toBe(200);
    expect((await ready.json()).database).toBe("ok");
  });
});
