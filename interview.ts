export type InterviewType = 'hr' | 'technical' | 'project' | 'behavioral' | 'mixed';
export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
export type InterviewStyle = 'friendly' | 'professional' | 'challenging';
export type QuestionType = 'hr' | 'technical' | 'project' | 'behavioral';

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  question: string;
  skill?: string;
  topic?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  purpose?: string;
  expectedFocus?: string[];
  followUpAllowed: boolean;
  hint?: string;
}

export interface InterviewPlan {
  targetRole: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  style: InterviewStyle;
  questions: InterviewQuestion[];
  focusAreas: string[];
  estimatedDuration: number;
}

export interface InterviewEvaluation {
  score: number; // 0 - 100
  strengths: string[];
  improvementAreas: string[];
  missingPoints: string[];
  feedback: string;
  suggestedAnswerStructure?: string;
  recommendedPractice: string[];
  confidence: number;
  categoryScores?: {
    technicalCorrectness?: number;
    clarity?: number;
    structure?: number;
    specificity?: number;
    relevance?: number;
  };
}

export interface InterviewAttempt {
  id: string;
  interviewId: string;
  userId: string;
  questionId: string;
  question: string;
  questionType: QuestionType;
  skill?: string;
  topic?: string;
  answer?: string;
  evaluation?: InterviewEvaluation;
  status: 'answered' | 'skipped';
  createdAt: string;
  followUpQuestion?: string;
  followUpAnswer?: string;
  followUpEvaluation?: InterviewEvaluation;
}

export interface InterviewScoreBreakdown {
  technical?: number;
  project?: number;
  communication?: number;
  problemSolving?: number;
  behavioral?: number;
}

export interface InterviewPreparationPlanDay {
  day: number;
  focus: string;
  description: string;
  suggestedAction: string;
  relatedSkill?: string;
}

export interface InterviewPreparationPlan {
  days: InterviewPreparationPlanDay[];
  keyAdvice: string;
}

export interface WeakAreaAnalysis {
  strongAreas: string[];
  developingAreas: string[];
  needsPractice: string[];
  repeatedWeakAreas: string[];
  recommendedTopics: string[];
}

export interface MockInterview {
  id: string;
  userId: string;
  targetRole: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  style: InterviewStyle;
  questionCount: number;
  durationMinutes: number;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  overallScore?: number;
  scoreBreakdown?: InterviewScoreBreakdown;
  strengths?: string[];
  areasToImprove?: string[];
  recommendedNextSteps?: string[];
  weakAreaAnalysis?: WeakAreaAnalysis;
  preparationPlan?: InterviewPreparationPlan;
  questions: InterviewQuestion[];
  attempts: InterviewAttempt[];
  notes?: string;
}

export interface InterviewCoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}
