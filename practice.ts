export type PracticeMode = 'multiple_choice' | 'short_answer' | 'coding' | 'case_study' | 'flashcards' | 'quick_quiz';

export type QuestionSubtype = 'concept' | 'scenario' | 'technical' | 'interview';

export type PracticeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Adaptive';

export interface PracticeOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  type: PracticeMode | 'Quiz' | 'Coding' | 'Concept' | 'Case Study';
  subtype?: QuestionSubtype;
  skill: string;
  topic?: string;
  difficulty: PracticeDifficulty | string;
  options?: string[]; // for multiple choice
  correctAnswer?: number; // 0-based index
  explanation: string;
  starterCode?: string;
  codeSnippet?: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    description?: string;
  }>;
  hints?: string[];
  backgroundScenario?: string;
  rubric?: string[];
  expectedPoints?: string[];
}

export interface PracticeEvaluation {
  questionId: string;
  score: number; // 0 to 100
  passed: boolean;
  verdict: 'Correct' | 'Partially Correct' | 'Incorrect' | 'Needs Work';
  whatWentWell: string[];
  whatWasMissing: string[];
  correctExplanation: string;
  suggestedImprovements: string[];
  codeReview?: {
    syntaxAndLogicScore: number;
    timeComplexity?: string;
    spaceComplexity?: string;
    potentialBugs: string[];
    styleAndReadability: string;
    suggestedRefactoring?: string;
  };
}

export interface FlashcardItem {
  id: string;
  skill: string;
  topic: string;
  front: string;
  back: string;
  hint?: string;
  codeSnippet?: string;
  status: 'new' | 'know' | 'need_practice' | 'review_later';
  lastReviewed?: string;
}

export interface PracticeAttempt {
  id: string;
  userId: string;
  practiceType: PracticeMode;
  skill: string;
  topic?: string;
  difficulty: string;
  timestamp: string;
  totalQuestions: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  scorePercentage: number;
  durationSeconds: number;
  questionSummaries: Array<{
    questionId: string;
    question: string;
    type: string;
    userAnswer: string | number;
    correctAnswer?: string | number;
    score: number;
    verdict: string;
    feedbackSummary?: string;
  }>;
  weakTopicsIdentified: string[];
  strengthsIdentified: string[];
}

export interface PracticePerformanceReport {
  overallScore: number;
  totalAttempts: number;
  streakDays: number;
  skillsMastery: Array<{
    skill: string;
    accuracyPercentage: number;
    status: 'Strong' | 'Developing' | 'Needs Review';
    attemptsCount: number;
  }>;
  weakAreas: Array<{
    topic: string;
    skill: string;
    frequency: number;
    recommendation: string;
  }>;
  recentAttempts: PracticeAttempt[];
  recommendedNextPractice: {
    skill: string;
    topic: string;
    difficulty: PracticeDifficulty;
    type: PracticeMode;
    reason: string;
  };
}
