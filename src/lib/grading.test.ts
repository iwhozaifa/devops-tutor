import { describe, expect, it } from "vitest";
import { gradeAnswers } from "./grading";

const questions = [
  {
    id: "q1",
    explanation: null,
    options: [
      { id: "a", text: "A", isCorrect: true },
      { id: "b", text: "B", isCorrect: false },
    ],
  },
  {
    id: "q2",
    explanation: "multi",
    options: [
      { id: "a", text: "A", isCorrect: true },
      { id: "b", text: "B", isCorrect: true },
      { id: "c", text: "C", isCorrect: false },
    ],
  },
];

describe("gradeAnswers", () => {
  it("scores all-correct answers as 100", () => {
    const { score } = gradeAnswers(questions, [
      { questionId: "q1", selectedOptionIds: ["a"] },
      { questionId: "q2", selectedOptionIds: ["b", "a"] },
    ]);
    expect(score).toBe(100);
  });

  it("requires the exact set for multiple choice", () => {
    const { results, score } = gradeAnswers(questions, [
      { questionId: "q1", selectedOptionIds: ["a"] },
      { questionId: "q2", selectedOptionIds: ["a"] },
    ]);
    expect(results[1].correct).toBe(false);
    expect(score).toBe(50);
  });

  it("ignores duplicated option ids", () => {
    const { results } = gradeAnswers(questions, [
      { questionId: "q2", selectedOptionIds: ["a", "a", "b"] },
    ]);
    expect(results[1].correct).toBe(true);
  });

  it("treats missing answers as wrong", () => {
    expect(gradeAnswers(questions, []).score).toBe(0);
  });

  it("returns 0 instead of NaN when there are no questions", () => {
    expect(gradeAnswers([], []).score).toBe(0);
  });
});
