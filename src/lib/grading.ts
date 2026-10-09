interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  options: unknown;
  explanation: string | null;
}

interface Answer {
  questionId: string;
  selectedOptionIds: string[];
}

export function gradeAnswers(questions: Question[], answers: Answer[]) {
  const results = questions.map((question) => {
    const options = question.options as Option[];
    const correctOptionIds = options
      .filter((o) => o.isCorrect)
      .map((o) => o.id)
      .sort();

    const userAnswer = answers.find((a) => a.questionId === question.id);
    const selected = userAnswer?.selectedOptionIds ?? [];
    const selectedOptionIds = [...new Set(selected)].sort();

    const correct =
      correctOptionIds.length === selectedOptionIds.length &&
      correctOptionIds.every((id, i) => id === selectedOptionIds[i]);

    return {
      questionId: question.id,
      correct,
      selectedOptionIds: selected,
      correctOptionIds,
      explanation: question.explanation,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const score =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 0;

  return { results, score };
}
