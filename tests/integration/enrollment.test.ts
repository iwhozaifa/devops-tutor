import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isEnrolled } from "@/lib/enrollment";
import { POST as dayProgress } from "@/app/api/progress/day/route";
import { POST as submitQuiz } from "@/app/api/quizzes/[quizId]/submit/route";
import { POST as submitExam } from "@/app/api/exams/[examId]/submit/route";
import { POST as submitTask } from "@/app/api/tasks/[taskId]/submit/route";
import { POST as projectProgress } from "@/app/api/projects/[projectId]/progress/route";
import { asUser } from "../helpers/auth";
import { jsonRequest, params } from "../helpers/request";
import { allCorrect, createCurriculum, createUser, enroll, totalXp } from "../helpers/fixtures";

type Curriculum = Awaited<ReturnType<typeof createCurriculum>>;

// Every route that records progress or awards XP
const progressCalls = (c: Curriculum) => [
  () => dayProgress(jsonRequest("/x", { dayId: c.day.id, status: "COMPLETED" })),
  () => submitQuiz(jsonRequest("/x", { answers: allCorrect(c.quiz.questions) }), params({ quizId: c.quiz.id })),
  () => submitExam(jsonRequest("/x", { answers: allCorrect(c.exam.questions) }), params({ examId: c.exam.id })),
  () => submitTask(jsonRequest("/x", { status: "COMPLETED" }), params({ taskId: c.task.id })),
  () => projectProgress(jsonRequest("/x", { stepCompleted: 0 }), params({ projectId: c.project.id })),
];

describe("progress requires enrollment", () => {
  it("returns 403 Not enrolled from every progress route and records nothing", async () => {
    const c = await createCurriculum();
    const user = await createUser();
    asUser(user.id);

    for (const call of progressCalls(c)) {
      const res = await call();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Not enrolled" });
    }

    expect(await totalXp(user.id)).toBe(0);
    expect(await db.dayProgress.count()).toBe(0);
    expect(await db.quizAttempt.count()).toBe(0);
    expect(await db.examAttempt.count()).toBe(0);
    expect(await db.taskSubmission.count()).toBe(0);
    expect(await db.projectProgress.count()).toBe(0);
  });

  it("does not let enrollment in one subject unlock another", async () => {
    const enrolled = await createCurriculum();
    const other = await createCurriculum();
    const user = await createUser();
    await enroll(user.id, enrolled.subject.id);
    asUser(user.id);

    for (const call of progressCalls(other)) {
      expect((await call()).status).toBe(403);
    }
  });

  it("accepts progress once the learner is enrolled", async () => {
    const c = await createCurriculum();
    const user = await createUser();
    await enroll(user.id, c.subject.id);
    asUser(user.id);

    for (const call of progressCalls(c)) {
      expect((await call()).status).toBe(200);
    }
    expect(await totalXp(user.id)).toBeGreaterThan(0);
  });

  it("still returns 404 (not 403) for content that does not exist", async () => {
    asUser((await createUser()).id);
    const res = await dayProgress(jsonRequest("/x", { dayId: "missing", status: "COMPLETED" }));
    expect(res.status).toBe(404);
  });
});

describe("isEnrolled", () => {
  it("is true only for the learner's own enrollment in that subject", async () => {
    const c = await createCurriculum();
    const [learner, stranger] = [await createUser(), await createUser()];
    await enroll(learner.id, c.subject.id);
    expect(await isEnrolled(learner.id, c.subject.id)).toBe(true);
    expect(await isEnrolled(stranger.id, c.subject.id)).toBe(false);
  });
});
