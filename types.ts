import { SkillLevel } from './types/learner';
import { LearningResource } from './types/resource';
import { ProjectMilestone } from './types/project';
export * from './types/learner';
export * from './types/analysis';
export * from './types/learningPath';
export * from './types/resource';
export * from './types/auth';
export * from './types/practice';
export * from './types/project';
export * from './types/communication';
export * from './types/progress';

// Aliases for legacy component compatibility
export type Certification = {
  id: string;
  name: string;
  issuer: string;
  year?: string;
  date?: string;
  verified?: boolean;
};

export type PortfolioProject = {
  id: string;
  name?: string;
  title: string;
  tech: string[];
  description: string;
  url?: string;
  stars?: number;
};

export interface TodayPlanItem {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  skill: string;
  type: 'practice' | 'video' | 'reading' | 'quiz';
}

export interface LearningPhase {
  id: number;
  title: string;
  description: string;
  skills: string[];
  objectives: string[];
  estimatedTime: string;
  completion: number;
  status: 'completed' | 'in-progress' | 'upcoming';
  current: boolean;
  practiceTasks: Array<{
    id: string;
    title: string;
    duration: string;
    completed: boolean;
  }>;
  project: {
    title: string;
    summary: string;
  };
}

export type ResourceItem = LearningResource;

export interface ProjectRecommendation {
  id: string;
  title: string;
  skillsDeveloped: string[];
  difficulty: SkillLevel;
  estimatedDuration: string;
  estimatedHours?: string;
  description: string;
  requiredTools: string[];
  learningOutcomes: string[];
  deliverables?: string[];
  milestones?: string[];
  stepByStep?: ProjectMilestone[];
}

export interface CommunicationFeedback {
  overallScore: number;
  clarityScore: number;
  grammarScore: number;
  professionalToneScore?: number;
  toneScore?: number;
  vocabularyScore?: number;
  grammarIssues?: Array<{ issue: string; suggestion: string }>;
  vocabularyUpgrades?: Array<{ original: string; upgrade: string; reason: string }>;
  suggestedRewrite?: string;
  executiveTips?: string;
  strengths?: string[];
  improvements?: string[];
  improvedVersion?: string;
  vocabularySuggestions?: Array<{ original: string; replacement: string }>;
}

export interface MockInterviewTurn {
  id: string;
  role?: 'interviewer' | 'candidate';
  content?: string;
  question?: string;
  userResponse?: string;
  feedback?: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    tip: string;
  };
  readinessScore?: number;
  weakAreasToTrack?: string[];
}

export interface ProgressReport {
  summary?: string;
  overallSummary?: string;
  whatImproved: string[];
  whatNeedsAttention: string[];
  needsAttention?: string[];
  skillsAcquiredCount?: number;
  skillsAcquired?: string[];
  skillsInProgressCount?: number;
  remainingSkillGapsCount?: number;
  persistentWeaknesses: string[];
  recommendedNextSteps: string[];
  generatedAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  structuredResponse?: any;
  actionButton?: {
    label: string;
    targetView: string;
    actionData?: any;
  };
  agentsConsulted?: string[];
}

export * from './types/interview';
export * from './types/orchestrator';

