import { LearnerProfile, SkillLevel } from './learner';
import { CareerProfileAnalysisResult, SkillGapAnalysis } from './analysis';
import { LearningPath } from './learningPath';
import { MockInterview } from './interview';
import {
  LearnerLearningState,
  NextBestAction,
  ProgressStrength,
  ProgressWeakness,
  SkillTrend,
  LearningLoadDetail,
  AdaptiveLearningChange,
} from './progress';

export type UserIntent =
  | 'PROFILE'
  | 'RESUME'
  | 'SKILL_GAP'
  | 'LEARNING_PATH'
  | 'RESOURCE'
  | 'PRACTICE'
  | 'PROJECT'
  | 'COMMUNICATION'
  | 'INTERVIEW'
  | 'PROGRESS'
  | 'ADAPTATION'
  | 'NEXT_BEST_ACTION'
  | 'GENERAL_CAREER';

export interface SpecializedAgentDef {
  id: string;
  name: string;
  shortName: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  availableActions: string[];
  targetView: string;
  iconName: string;
}

export interface MentorContext {
  userId: string;
  profile: LearnerProfile;
  targetRole: string;
  resumeAnalysis?: CareerProfileAnalysisResult | null;
  currentSkills: Array<{ name: string; level: string }>;
  skillGaps: any[];
  learningPath?: LearningPath | null;
  currentWeek: number;
  completedActivities: string[];
  practicePerformance?: {
    totalQuestions: number;
    accuracy: number;
    topSkill: string;
    weakestSkill: string;
  };
  projects: any[];
  communicationProgress?: {
    attemptsCount: number;
    averageScore: number;
  };
  interviewHistory: MockInterview[];
  progressSummary?: string;
  strengths: ProgressStrength[];
  weakAreas: ProgressWeakness[];
  skillTrends: SkillTrend[];
  learningLoad: LearningLoadDetail;
  adaptiveChanges: AdaptiveLearningChange[];
  nextBestAction?: NextBestAction;
  learningStreak: number;
  hasInsufficientData: boolean;
}

export interface MentorStructuredResponse {
  answer: string;
  why: string;
  evidence: string[] | string;
  nextStep: string;
  intent: UserIntent;
  agentsConsulted: string[];
  actionButton?: {
    label: string;
    targetView: string;
    actionData?: any;
  };
  isFallback?: boolean;
}

export interface OrchestrationResult {
  intent: UserIntent;
  confidence: number;
  primaryAgent: string;
  supportingAgents: string[];
  mentorResponse: MentorStructuredResponse;
  updatedNextBestAction?: NextBestAction;
}

export type TimeAllowance = '15m' | '30m' | '1h' | '2h';
